import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { v2 as cloudinary } from 'cloudinary';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initStore, getDb, saveDb, publicUser, addEvent, storageMode } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uploadDir = process.env.USELL_UPLOAD_DIR ? path.resolve(process.env.USELL_UPLOAD_DIR) : path.join(root, 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const cloudinaryEnabled = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}
if (process.env.DEMO_MODE === 'false') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Public mode requires a JWT_SECRET with at least 32 characters.');
  if (!process.env.DATABASE_URL) throw new Error('Public mode requires DATABASE_URL so customer data is never stored on temporary hosting disks.');
  if (!cloudinaryEnabled) throw new Error('Public mode requires Cloudinary credentials so uploaded photos are permanent.');
}
await initStore();

const app = express();
const PORT = Number(process.env.PORT || 5173);
const JWT_SECRET = process.env.JWT_SECRET || 'usell-local-development-secret-change-in-production';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '+923347323999';
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();

app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Please wait a few minutes and try again.' } }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many account attempts. Please wait before trying again.' } }));
app.use('/api/support/chat', rateLimit({ windowMs: 60 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Support chat limit reached. Please try again later.' } }));
app.use('/uploads', express.static(uploadDir, { maxAge: '7d' }));
app.use('/images', express.static(path.join(root, 'public', 'images'), { maxAge: '7d' }));

const sign = (user) => jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
const emailOk = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');

function optionalAuth(req, _res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = getDb().users.find((u) => u.id === payload.sub);
    } catch { /* Treat an invalid optional token as a guest. */ }
  }
  next();
}

function auth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
    next();
  });
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Administrator access is required.' });
  next();
}

function listingWithMeta(listing, user) {
  const db = getDb();
  return {
    ...listing,
    seller: publicUser(db.users.find((u) => u.id === listing.ownerId)),
    favoriteCount: listing.likedBy?.length || 0,
    isFavorite: Boolean(user && listing.likedBy?.includes(user.id))
  };
}

function conversationWithMeta(conversation, userId) {
  const db = getDb();
  const otherId = conversation.participants.find((participant) => participant !== userId);
  const listing = db.listings.find((item) => item.id === conversation.listingId);
  return {
    ...conversation,
    listing: listing ? { id: listing.id, title: listing.title, price: listing.price, images: listing.images, status: listing.status } : null,
    otherUser: publicUser(db.users.find((u) => u.id === otherId)),
    lastMessage: conversation.messages.at(-1) || null,
    unreadCount: conversation.messages.filter((m) => m.senderId !== userId && !m.readBy.includes(userId)).length
  };
}

// Health and marketplace metadata
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Usell marketplace', database: storageMode(), imageStorage: cloudinaryEnabled ? 'cloudinary' : 'local', time: now() }));
app.get('/api/meta', (_req, res) => res.json({
  categories: ['Women', 'Men', 'Traditional', 'Shoes', 'Bags', 'Accessories'],
  conditions: ['New with tags', 'Like new', 'Excellent', 'Good', 'Fair'],
  sizes: ['One size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'EU 36', 'EU 37', 'EU 38', 'EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44'],
  demoMode: process.env.DEMO_MODE !== 'false',
  whatsappConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}));

// Authentication
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, location = '' } = req.body;
  if (!name?.trim() || name.trim().length < 2) return res.status(400).json({ error: 'Please enter your full name.' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const db = getDb();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = {
    id: id('u'), name: name.trim(), email: email.toLowerCase().trim(),
    passwordHash: await bcrypt.hash(password, 10), location: location.trim(),
    whatsapp: '', avatar: '', verified: false, role: 'user', joinedAt: now(), bio: ''
  };
  db.users.push(user);
  await saveDb();
  await addEvent('signup', { userId: user.id });
  res.status(201).json({ token: sign(user), user: publicUser(user, true) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = getDb().users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  await addEvent('login', { userId: user.id });
  res.json({ token: sign(user), user: publicUser(user, true) });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user, true) }));
app.patch('/api/auth/me', auth, async (req, res) => {
  const allowed = ['name', 'location', 'bio', 'whatsapp'];
  allowed.forEach((key) => {
    if (typeof req.body[key] === 'string') req.user[key] = req.body[key].trim().slice(0, key === 'bio' ? 300 : 120);
  });
  if (!req.user.name) return res.status(400).json({ error: 'Name cannot be empty.' });
  await saveDb();
  res.json({ user: publicUser(req.user, true) });
});

// Public seller profiles, listings, search and favourites
app.get('/api/users/:userId', (req, res) => {
  const user = getDb().users.find((item) => item.id === req.params.userId && item.role !== 'admin');
  if (!user) return res.status(404).json({ error: 'Seller profile not found.' });
  res.json({ user: publicUser(user) });
});

app.get('/api/listings', optionalAuth, async (req, res) => {
  const db = getDb();
  const { q = '', category = '', condition = '', size = '', city = '', minPrice, maxPrice, sort = 'newest', owner = '', featured = '', limit = '60' } = req.query;
  let items = db.listings.filter((listing) => listing.status === 'active');
  if (owner) items = db.listings.filter((listing) => listing.ownerId === owner && (req.user?.id === owner ? listing.status !== 'removed' : listing.status === 'active'));
  if (q) {
    const terms = q.toLowerCase().trim().split(/\s+/);
    items = items.filter((listing) => {
      const haystack = [listing.title, listing.brand, listing.category, listing.subcategory, listing.description, listing.color, listing.location, listing.size, listing.condition].join(' ').toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }
  if (category) items = items.filter((listing) => listing.category.toLowerCase() === category.toLowerCase());
  if (condition) items = items.filter((listing) => listing.condition === condition);
  if (size) items = items.filter((listing) => listing.size === size);
  if (city) items = items.filter((listing) => listing.location.toLowerCase().includes(city.toLowerCase()));
  if (minPrice && !Number.isNaN(Number(minPrice))) items = items.filter((listing) => listing.price >= Number(minPrice));
  if (maxPrice && !Number.isNaN(Number(maxPrice))) items = items.filter((listing) => listing.price <= Number(maxPrice));
  if (featured === 'true') items = items.filter((listing) => listing.featured);
  const sorters = {
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    'price-low': (a, b) => a.price - b.price,
    'price-high': (a, b) => b.price - a.price,
    popular: (a, b) => b.views - a.views
  };
  items.sort(sorters[sort] || sorters.newest);
  const total = items.length;
  items = items.slice(0, Math.min(Number(limit) || 60, 100)).map((listing) => listingWithMeta(listing, req.user));
  if (q) await addEvent('search', { userId: req.user?.id, meta: { query: String(q).slice(0, 100), results: total } });
  res.json({ listings: items, total });
});

app.get('/api/listings/:listingId', optionalAuth, async (req, res) => {
  const listing = getDb().listings.find((item) => item.id === req.params.listingId && item.status !== 'removed');
  if (!listing) return res.status(404).json({ error: 'This listing is no longer available.' });
  listing.views = (listing.views || 0) + 1;
  await saveDb();
  await addEvent('listing_view', { userId: req.user?.id, listingId: listing.id });
  const similar = getDb().listings.filter((item) => item.id !== listing.id && item.status === 'active' && item.category === listing.category).slice(0, 4).map((item) => listingWithMeta(item, req.user));
  res.json({ listing: listingWithMeta(listing, req.user), similar });
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase().slice(0, 8)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => cb(file.mimetype.startsWith('image/') ? null : new Error('Only image files are allowed.'), file.mimetype.startsWith('image/'))
});

function removeTempFiles(files = []) {
  files.forEach((file) => { if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path); });
}

async function storeListingImages(files, ownerId) {
  if (!cloudinaryEnabled) return { urls: files.map((file) => `/uploads/${file.filename}`), publicIds: [] };
  const uploaded = [];
  try {
    for (const file of files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: process.env.CLOUDINARY_FOLDER || 'usell/listings',
        public_id: `${ownerId}-${crypto.randomUUID()}`,
        resource_type: 'image',
        overwrite: false,
        transformation: [{ width: 1600, height: 2000, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
      });
      uploaded.push({ url: result.secure_url, publicId: result.public_id });
    }
    return { urls: uploaded.map((item) => item.url), publicIds: uploaded.map((item) => item.publicId) };
  } catch (error) {
    await Promise.allSettled(uploaded.map((item) => cloudinary.uploader.destroy(item.publicId)));
    throw error;
  } finally {
    removeTempFiles(files);
  }
}

app.post('/api/listings', auth, upload.array('images', 5), async (req, res) => {
  const { title, description, category, subcategory = '', brand = '', size, condition, color = '', price, originalPrice = '', location, shipping = 'Nationwide delivery' } = req.body;
  if (!title?.trim() || !description?.trim() || !category || !size || !condition || !location?.trim()) {
    req.files?.forEach((file) => fs.unlinkSync(file.path));
    return res.status(400).json({ error: 'Please complete all required listing details.' });
  }
  if (!Number(price) || Number(price) < 1) {
    req.files?.forEach((file) => fs.unlinkSync(file.path));
    return res.status(400).json({ error: 'Please enter a valid price.' });
  }
  if (!req.files?.length) return res.status(400).json({ error: 'Add at least one clear photo of your item.' });
  let uploadedImages;
  try {
    uploadedImages = await storeListingImages(req.files, req.user.id);
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    return res.status(502).json({ error: 'The photo storage service could not save your images. Please try again.' });
  }
  const db = getDb();
  const listing = {
    id: id('l'), ownerId: req.user.id, title: title.trim().slice(0, 90), description: description.trim().slice(0, 1500),
    category, subcategory: subcategory.trim(), brand: brand.trim().slice(0, 60), size, condition,
    color: color.trim().slice(0, 50), price: Number(price), originalPrice: Number(originalPrice) || null,
    images: uploadedImages.urls, imagePublicIds: uploadedImages.publicIds, location: location.trim().slice(0, 100),
    country: 'Pakistan', shipping, status: 'active', featured: false, views: 0, likedBy: [], createdAt: now(), updatedAt: now()
  };
  db.listings.unshift(listing);
  await saveDb();
  await addEvent('listing_created', { userId: req.user.id, listingId: listing.id });
  res.status(201).json({ listing: listingWithMeta(listing, req.user) });
});

app.patch('/api/listings/:listingId', auth, async (req, res) => {
  const listing = getDb().listings.find((item) => item.id === req.params.listingId);
  if (!listing || listing.ownerId !== req.user.id) return res.status(404).json({ error: 'Listing not found in your account.' });
  const allowed = ['title', 'description', 'price', 'originalPrice', 'condition', 'size', 'location', 'shipping', 'status'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) listing[key] = ['price', 'originalPrice'].includes(key) ? Number(req.body[key]) : req.body[key];
  });
  if (!['active', 'sold', 'draft'].includes(listing.status)) return res.status(400).json({ error: 'Invalid listing status.' });
  listing.updatedAt = now();
  await saveDb();
  await addEvent('listing_updated', { userId: req.user.id, listingId: listing.id, meta: { status: listing.status } });
  res.json({ listing: listingWithMeta(listing, req.user) });
});

app.delete('/api/listings/:listingId', auth, async (req, res) => {
  const db = getDb();
  const listing = db.listings.find((item) => item.id === req.params.listingId);
  if (!listing || listing.ownerId !== req.user.id) return res.status(404).json({ error: 'Listing not found in your account.' });
  listing.status = 'removed';
  listing.updatedAt = now();
  await saveDb();
  await addEvent('listing_removed', { userId: req.user.id, listingId: listing.id });
  if (cloudinaryEnabled && listing.imagePublicIds?.length) {
    const results = await Promise.allSettled(listing.imagePublicIds.map((publicId) => cloudinary.uploader.destroy(publicId)));
    results.filter((result) => result.status === 'rejected').forEach((result) => console.error('Cloudinary cleanup:', result.reason));
  }
  res.json({ ok: true });
});

app.post('/api/listings/:listingId/favorite', auth, async (req, res) => {
  const listing = getDb().listings.find((item) => item.id === req.params.listingId && item.status === 'active');
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  listing.likedBy ||= [];
  const exists = listing.likedBy.includes(req.user.id);
  listing.likedBy = exists ? listing.likedBy.filter((userId) => userId !== req.user.id) : [...listing.likedBy, req.user.id];
  await saveDb();
  if (!exists) await addEvent('favourite', { userId: req.user.id, listingId: listing.id });
  res.json({ isFavorite: !exists, favoriteCount: listing.likedBy.length });
});

app.get('/api/favorites', auth, (req, res) => {
  const listings = getDb().listings.filter((listing) => listing.status === 'active' && listing.likedBy?.includes(req.user.id)).map((listing) => listingWithMeta(listing, req.user));
  res.json({ listings });
});

// Buyer–seller messaging
app.get('/api/conversations', auth, (req, res) => {
  const conversations = getDb().conversations
    .filter((conversation) => conversation.participants.includes(req.user.id))
    .map((conversation) => conversationWithMeta(conversation, req.user.id))
    .sort((a, b) => new Date(b.lastMessage?.createdAt || b.createdAt) - new Date(a.lastMessage?.createdAt || a.createdAt));
  res.json({ conversations });
});

app.post('/api/conversations', auth, async (req, res) => {
  const { listingId, message } = req.body;
  const db = getDb();
  const listing = db.listings.find((item) => item.id === listingId && item.status === 'active');
  if (!listing) return res.status(404).json({ error: 'This listing is not available for messages.' });
  if (listing.ownerId === req.user.id) return res.status(400).json({ error: 'This is your own listing.' });
  if (!message?.trim()) return res.status(400).json({ error: 'Write a short message to the seller.' });
  let conversation = db.conversations.find((item) => item.listingId === listing.id && item.participants.includes(req.user.id) && item.participants.includes(listing.ownerId));
  if (!conversation) {
    conversation = { id: id('c'), listingId: listing.id, participants: [req.user.id, listing.ownerId], createdAt: now(), messages: [] };
    db.conversations.push(conversation);
  }
  conversation.messages.push({ id: id('m'), senderId: req.user.id, text: message.trim().slice(0, 1000), createdAt: now(), readBy: [req.user.id] });
  await saveDb();
  await addEvent('message', { userId: req.user.id, listingId: listing.id });
  res.status(201).json({ conversation: conversationWithMeta(conversation, req.user.id) });
});

app.get('/api/conversations/:conversationId', auth, async (req, res) => {
  const conversation = getDb().conversations.find((item) => item.id === req.params.conversationId && item.participants.includes(req.user.id));
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
  conversation.messages.forEach((message) => {
    if (!message.readBy.includes(req.user.id)) message.readBy.push(req.user.id);
  });
  await saveDb();
  res.json({ conversation: conversationWithMeta(conversation, req.user.id) });
});

app.post('/api/conversations/:conversationId/messages', auth, async (req, res) => {
  const conversation = getDb().conversations.find((item) => item.id === req.params.conversationId && item.participants.includes(req.user.id));
  if (!conversation) return res.status(404).json({ error: 'Conversation not found.' });
  if (!req.body.message?.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });
  conversation.messages.push({ id: id('m'), senderId: req.user.id, text: req.body.message.trim().slice(0, 1000), createdAt: now(), readBy: [req.user.id] });
  await saveDb();
  await addEvent('message', { userId: req.user.id, listingId: conversation.listingId });
  res.status(201).json({ conversation: conversationWithMeta(conversation, req.user.id) });
});

// Site-limited support assistant. Set OPENAI_API_KEY to use an LLM; the local guide remains as a safe fallback.
const SITE_RULES = `Usell is a peer-to-peer marketplace for preloved clothes and fashion. People can create an account, upload up to five photos, list an item with size/condition/price/location, search and filter public listings, save favourites, and contact the owner through on-site buyer-seller chat. Listing is currently free. Usell does not process payments, provide courier delivery, guarantee items, or manage returns; buyers and sellers agree on those details directly. Users should inspect items, meet in public, avoid sharing OTPs/passwords, and report suspicious behaviour. Sellers can mark listings sold or remove them from Account > My listings. Admin analytics and WhatsApp reports are only for administrators. Do not answer questions unrelated to Usell, fashion resale, account usage, buying, selling, safety, or marketplace policies.`;

const guides = [
  { keys: ['sell', 'upload', 'list an', 'listing', 'photos'], answer: 'To sell an item: sign in, tap “Sell an item”, add 1–5 clear photos, then enter the title, category, size, condition, price and location. Publish it and your listing becomes visible in search. You can manage it later from Account → My listings.', link: '/sell', label: 'Start a listing' },
  { keys: ['buy', 'purchase', 'contact', 'seller', 'owner'], answer: 'Open any listing to see its photos, condition, size and seller details. Tap “Chat with seller” to ask questions or agree on delivery and payment. The conversation is saved in your Messages.', link: '/shop', label: 'Browse fashion' },
  { keys: ['account', 'sign up', 'signup', 'register', 'login', 'log in'], answer: 'Tap the account icon to sign in or create a free account. You only need your name, a valid email and a password of at least 6 characters. Your account holds your listings, favourites, messages and profile settings.', link: '/auth', label: 'Open account access' },
  { keys: ['search', 'filter', 'find', 'size'], answer: 'Use Shop or the search icon to search by item, brand, colour or location. You can narrow results by category, condition, size and price, then sort by newest, popularity or price.', link: '/shop', label: 'Search Usell' },
  { keys: ['fee', 'free', 'commission', 'charge', 'cost'], answer: 'Creating an account and publishing listings on Usell is currently free. Any delivery or payment charges are separate and must be agreed between the buyer and seller.' },
  { keys: ['delivery', 'shipping', 'courier', 'international', 'world'], answer: 'Listings are publicly visible worldwide. Delivery is arranged directly between buyer and seller; Usell does not provide a courier service. Check the delivery note on each listing and confirm the destination, cost and timing in chat before paying.' },
  { keys: ['payment', 'pay', 'cash', 'bank'], answer: 'Usell does not currently process payments. Buyers and sellers agree on payment directly. Never share a password, PIN or OTP, and verify the item before sending money.' },
  { keys: ['return', 'refund', 'exchange'], answer: 'Because Usell is a peer-to-peer marketplace, returns and refunds are not automatically managed by the platform. Ask about the item carefully and agree on any return terms with the seller before completing your purchase.' },
  { keys: ['safe', 'scam', 'fraud', 'otp', 'report'], answer: 'Stay safe: use on-site chat, check all photos and details, meet in a public place when possible, inspect before paying, and never share passwords, card PINs or OTPs. If something feels wrong, stop the transaction and contact Usell support.', link: '/safety', label: 'Read safety guide' },
  { keys: ['sold', 'delete', 'remove', 'edit'], answer: 'Go to Account → My listings to mark an item as sold, move it back to active, or remove it. Sold items stay in your selling history but no longer appear in public search.', link: '/account?tab=listings', label: 'Manage my listings' },
  { keys: ['favourite', 'favorite', 'save', 'heart'], answer: 'Tap the heart on any item to save it. You must be signed in. Find all saved pieces under Account → Favourites.', link: '/account?tab=favorites', label: 'View favourites' },
  { keys: ['condition', 'like new', 'excellent'], answer: 'Condition guide: “New with tags” means unused with tags; “Like new” means barely used; “Excellent” means minimal signs of wear; “Good” means normal visible wear; “Fair” means noticeable wear. Always read the seller’s description and ask for detail photos.' },
  { keys: ['whatsapp', 'analytics', 'report'], answer: 'Site analytics and improvement reports are available to authorised administrators in the Admin dashboard. WhatsApp delivery uses the Meta Cloud API and requires valid API credentials; visitors and sellers do not receive these private reports.' },
  { keys: ['human', 'support', 'help', 'email'], answer: 'You can reach the Usell team through the Contact page. For a transaction question, include the listing title—but never send your password, PIN or OTP.', link: '/contact', label: 'Contact Usell' }
];

function localGuide(message) {
  const text = message.toLowerCase();
  if (/^(hi|hello|hey|salam|assalam|good morning|good evening)\b/.test(text)) return { answer: 'Hello! I’m the Usell assistant. I can help with buying, selling, accounts, search, messages, delivery, payments and safety. What would you like to do?', link: '/shop', label: 'Explore Usell' };
  let best = null;
  let bestScore = 0;
  for (const guide of guides) {
    const score = guide.keys.reduce((sum, key) => sum + (text.includes(key) ? key.split(' ').length : 0), 0);
    if (score > bestScore) { best = guide; bestScore = score; }
  }
  return best || { answer: 'I can only help with Usell and fashion resale. Try asking how to sell an item, contact a seller, search by size, arrange delivery, or stay safe while buying.', link: '/help', label: 'View help centre' };
}

app.post('/api/support/chat', optionalAuth, async (req, res) => {
  const message = String(req.body.message || '').trim().slice(0, 500);
  if (!message) return res.status(400).json({ error: 'Please type a question.' });
  let result;
  if (process.env.OPENAI_API_KEY) {
    try {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.2, max_tokens: 250,
          messages: [{ role: 'system', content: `${SITE_RULES}\nBe concise, warm and practical. If outside scope, politely redirect to Usell topics.` }, { role: 'user', content: message }]
        })
      });
      if (!aiResponse.ok) throw new Error('AI provider unavailable');
      const data = await aiResponse.json();
      result = { answer: data.choices[0].message.content, source: 'ai' };
    } catch { result = { ...localGuide(message), source: 'guide' }; }
  } else result = { ...localGuide(message), source: 'guide' };
  getDb().supportLogs.push({ id: id('support'), userId: req.user?.id || null, message, answer: result.answer, createdAt: now() });
  await saveDb();
  await addEvent('support_chat', { userId: req.user?.id });
  res.json(result);
});

// Analytics and WhatsApp admin reports
function analyticsSnapshot() {
  const db = getDb();
  const active = db.listings.filter((listing) => listing.status === 'active');
  const weekAgo = Date.now() - 7 * 86400000;
  const newUsers = db.users.filter((user) => new Date(user.joinedAt).getTime() >= weekAgo);
  const categoryCounts = Object.entries(active.reduce((acc, item) => ({ ...acc, [item.category]: (acc[item.category] || 0) + 1 }), {}))
    .map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (6 - index));
    const next = new Date(date); next.setDate(next.getDate() + 1);
    const events = db.events.filter((event) => new Date(event.createdAt) >= date && new Date(event.createdAt) < next);
    return { date: date.toISOString(), label: date.toLocaleDateString('en', { weekday: 'short' }), views: events.filter((e) => ['page_view', 'listing_view'].includes(e.type)).length, searches: events.filter((e) => e.type === 'search').length, messages: events.filter((e) => e.type === 'message').length };
  });
  const totalViews = db.listings.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalFavourites = db.listings.reduce((sum, item) => sum + (item.likedBy?.length || 0), 0);
  const emptyImages = active.filter((item) => !item.images.length).length;
  const thinDescriptions = active.filter((item) => item.description.length < 80).length;
  const suggestions = [
    categoryCounts[0] ? `${categoryCounts[0].name} is currently the largest active category. Feature it on the homepage and recruit sellers in smaller categories for a more balanced catalogue.` : 'Add more listings to unlock category-level insights.',
    `${thinDescriptions} active listing${thinDescriptions === 1 ? ' has' : 's have'} a short description. Prompt sellers for measurements, flaws and fabric details to reduce repetitive buyer questions.`,
    `${newUsers.length} new account${newUsers.length === 1 ? '' : 's'} joined in the last 7 days. A first-listing reminder could help turn new members into active sellers.`,
    emptyImages ? `${emptyImages} listings need photos.` : 'All active listings include photos. Next, encourage sellers to add multiple angles and close-ups of any wear.'
  ];
  return {
    generatedAt: now(),
    metrics: { totalUsers: db.users.filter((u) => u.role !== 'admin').length, activeListings: active.length, soldListings: db.listings.filter((l) => l.status === 'sold').length, totalViews, totalFavourites, conversations: db.conversations.length, newUsers7d: newUsers.length, supportQuestions: db.supportLogs.length },
    categoryCounts, days, suggestions,
    recentUsers: [...db.users].filter((u) => u.role !== 'admin').sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt)).slice(0, 6).map((member) => publicUser(member)),
    recentListings: [...active].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6).map((l) => ({ id: l.id, title: l.title, price: l.price, category: l.category, images: l.images, views: l.views, createdAt: l.createdAt })),
    whatsapp: { configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID), recipient: `${ADMIN_WHATSAPP.slice(0, 5)}•••••${ADMIN_WHATSAPP.slice(-3)}` }
  };
}

function buildReport(snapshot) {
  const m = snapshot.metrics;
  return `📊 *Usell analytics report*\n${new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}\n\n*Marketplace*\n• Users: ${m.totalUsers} (+${m.newUsers7d} this week)\n• Active listings: ${m.activeListings}\n• Listing views: ${m.totalViews.toLocaleString()}\n• Favourites: ${m.totalFavourites}\n• Conversations: ${m.conversations}\n• Support questions: ${m.supportQuestions}\n\n*Suggested improvements*\n${snapshot.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nGenerated by Usell Analytics.`;
}

async function deliverWhatsApp(report) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_REPORT_TEMPLATE;
  if (!token || !phoneNumberId) return { sent: false, configured: false };
  const base = { messaging_product: 'whatsapp', to: ADMIN_WHATSAPP.replace(/\D/g, '') };
  const payload = templateName ? {
    ...base,
    type: 'template',
    template: {
      name: templateName,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: report.replace(/\n+/g, ' | ').slice(0, 1000) }] }]
    }
  } : { ...base, type: 'text', text: { preview_url: false, body: report } };
  const response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'WhatsApp API rejected the report.');
  return { sent: true, configured: true, delivery: templateName ? 'template' : 'session', messageId: data.messages?.[0]?.id };
}

app.get('/api/admin/analytics', auth, adminOnly, (_req, res) => res.json(analyticsSnapshot()));
app.post('/api/admin/whatsapp-report', auth, adminOnly, async (req, res) => {
  const snapshot = analyticsSnapshot();
  const report = buildReport(snapshot);
  try {
    const result = await deliverWhatsApp(report);
    getDb().reports.push({ id: id('r'), createdAt: now(), sent: result.sent, requestedBy: req.user.id });
    await saveDb();
    await addEvent('analytics_report', { userId: req.user.id, meta: { sent: result.sent } });
    res.json({ ...result, report, whatsappLink: `https://wa.me/${ADMIN_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(report)}`, message: result.sent ? 'Report delivered to WhatsApp.' : 'Report generated. Add Meta WhatsApp Cloud API credentials on the server to enable automatic delivery.' });
  } catch (error) { res.status(502).json({ error: error.message, report }); }
});

// Newsletter and contact
app.post('/api/newsletter', async (req, res) => {
  if (!emailOk(req.body.email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  const db = getDb();
  if (!db.newsletter.some((item) => item.email === req.body.email.toLowerCase())) db.newsletter.push({ id: id('n'), email: req.body.email.toLowerCase(), createdAt: now() });
  await saveDb();
  res.status(201).json({ message: 'You’re on the list. Welcome to the Usell community!' });
});
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name?.trim() || !emailOk(email) || !message?.trim()) return res.status(400).json({ error: 'Please complete your name, email and message.' });
  getDb().contactMessages.push({ id: id('contact'), name: name.trim(), email: email.trim(), message: message.trim().slice(0, 1500), createdAt: now() });
  await saveDb();
  res.status(201).json({ message: 'Thanks — your message has been sent to the Usell team.' });
});
app.post('/api/analytics/event', optionalAuth, async (req, res) => {
  if (['page_view', 'sell_started'].includes(req.body.type)) await addEvent(req.body.type, { userId: req.user?.id, meta: { path: String(req.body.path || '').slice(0, 150) } });
  res.json({ ok: true });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const clientError = error.name === 'MulterError' || error.type === 'entity.parse.failed' || error.message === 'Only image files are allowed.';
  res.status(clientError ? 400 : 500).json({
    error: clientError ? error.message : 'We could not complete that securely. Please try again.',
  });
});

// Vite middleware in development; the same Express app serves the built app in production.
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true, host: '0.0.0.0', allowedHosts: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => console.log(`Usell is running at http://0.0.0.0:${PORT}`));
