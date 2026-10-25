import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const ago = (days, hours = 0) => new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString();
const img = (name) => `/images/${name}.jpg`;

export function createSeed() {
  const demoMode = process.env.DEMO_MODE !== 'false';
  if (!demoMode && (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12)) {
    throw new Error('Public mode requires ADMIN_PASSWORD with at least 12 characters before the first server start.');
  }
  // Sample community accounts become inaccessible in public mode; the admin gets the owner's strong password.
  const userPassword = demoMode ? (process.env.DEMO_PASSWORD || 'demo123') : crypto.randomBytes(32).toString('hex');
  const adminPassword = demoMode ? (process.env.ADMIN_PASSWORD || 'admin123') : process.env.ADMIN_PASSWORD;
  const passwordHash = bcrypt.hashSync(userPassword, 10);
  const adminHash = bcrypt.hashSync(adminPassword, 10);
  const users = [
    { id: 'u_demo', name: 'Hamza Ahmed', email: 'demo@usell.app', passwordHash, location: 'Rahim Yar Khan, Punjab', whatsapp: '+923001234567', avatar: '', verified: true, role: 'user', joinedAt: ago(18), bio: 'Minimal style, quality pieces, quick replies.' },
    { id: 'u_ayesha', name: 'Ayesha Khan', email: 'ayesha@example.com', passwordHash, location: 'Lahore, Punjab', whatsapp: '', avatar: '', verified: true, role: 'user', joinedAt: ago(42), bio: 'Making more room for pieces I truly love.' },
    { id: 'u_zara', name: 'Zara Malik', email: 'zara@example.com', passwordHash, location: 'Karachi, Sindh', whatsapp: '', avatar: '', verified: true, role: 'user', joinedAt: ago(30), bio: 'Dresses, bags and beautiful preloved finds.' },
    { id: 'u_daniyal', name: 'Daniyal Raza', email: 'daniyal@example.com', passwordHash, location: 'Islamabad, ICT', whatsapp: '', avatar: '', verified: false, role: 'user', joinedAt: ago(12), bio: 'Streetwear and everyday essentials.' },
    { id: 'u_maham', name: 'Maham Noor', email: 'maham@example.com', passwordHash, location: 'Multan, Punjab', whatsapp: '', avatar: '', verified: true, role: 'user', joinedAt: ago(3), bio: 'Traditional wear, lovingly kept.' },
    { id: 'u_admin', name: 'Usell Team', email: 'admin@usell.app', passwordHash: adminHash, location: 'Pakistan', whatsapp: '+923347323999', avatar: '', verified: true, role: 'admin', joinedAt: ago(90), bio: 'Official Usell marketplace administrator.' }
  ];

  const base = [
    ['l_jacket', 'u_daniyal', 'Midnight leather jacket', 'Men', 'Jackets', 'Mango', 'M', 'Excellent', 'Black', 4500, 12000, 'denim-jacket', 'Islamabad, ICT', 4, 214, true, 'Soft faux-leather jacket with a clean, structured fit. Worn only a few times and always stored on a hanger. No peeling or scratches.'],
    ['l_shirt', 'u_demo', 'Classic chambray shirt', 'Men', 'Shirts', 'Uniqlo', 'M', 'Like new', 'Denim blue', 2200, 6500, 'white-shirt', 'Rahim Yar Khan, Punjab', 7, 98, false, 'Easy everyday chambray shirt in a breathable cotton blend. Bought the wrong size and only tried it on indoors.'],
    ['l_dress', 'u_zara', 'Scarlet evening dress', 'Women', 'Dresses', 'Zara', 'S', 'Excellent', 'Scarlet', 5800, 18000, 'black-dress', 'Karachi, Sindh', 3, 341, true, 'A beautiful flowing statement dress worn once for a wedding. Professionally cleaned, no pulls, stains or alterations.'],
    ['l_sneakers', 'u_daniyal', 'Nike Air running shoes', 'Shoes', 'Sneakers', 'Nike', 'EU 42', 'Good', 'Red', 6500, 18500, 'sneakers', 'Islamabad, ICT', 2, 287, true, 'Comfortable Nike runners with plenty of life left. Light signs of use on the sole; uppers are in excellent shape.'],
    ['l_bag', 'u_zara', 'Coral top-handle bag', 'Bags', 'Handbags', 'Charles & Keith', 'One size', 'Like new', 'Coral', 4800, 14500, 'handbag', 'Karachi, Sindh', 5, 176, true, 'Structured top-handle bag with detachable shoulder strap. Interior is spotless. Comes with its original dust bag.'],
    ['l_tee', 'u_demo', 'Essential white cotton tee', 'Men', 'T-shirts', 'H&M', 'L', 'Good', 'White', 1200, 3200, 'tshirt', 'Rahim Yar Khan, Punjab', 8, 74, false, 'Classic heavyweight white tee. Freshly washed and ready for a new rotation. Slight relaxed fit.'],
    ['l_saree', 'u_maham', 'Embellished navy saree', 'Traditional', 'Sarees', 'Independent', 'One size', 'Excellent', 'Navy & gold', 9500, 26000, 'traditional', 'Multan, Punjab', 6, 229, true, 'Elegant navy saree with a detailed gold border. Worn once for a family event. Includes matching unstitched blouse fabric.'],
    ['l_blazer', 'u_ayesha', 'Navy tailored three-piece suit', 'Men', 'Formal', 'Next', 'M', 'Like new', 'Navy', 7900, 24000, 'blazer', 'Lahore, Punjab', 9, 133, false, 'Sharp three-piece tailored suit, worn once for a nikkah. Jacket, waistcoat and trousers included. Dry-cleaned.'],
    ['l_watch', 'u_ayesha', 'Minimal silver dress watch', 'Accessories', 'Watches', 'Fossil', 'One size', 'Good', 'Silver', 3800, 13500, 'watch', 'Lahore, Punjab', 12, 86, false, 'Classic stainless-steel watch with a brown leather strap. Working perfectly; minor signs of normal wear on the strap.'],
    ['l_hoodie', 'u_daniyal', 'Everyday grey hoodie', 'Men', 'Hoodies', 'Adidas', 'M', 'Good', 'Heather grey', 2400, 7800, 'hoodie', 'Islamabad, ICT', 1, 193, false, 'Cosy mid-weight hoodie with a relaxed fit. No stains or holes. Perfect for travel and everyday layering.'],
    ['l_heels', 'u_maham', 'Floral embroidered block heels', 'Shoes', 'Heels', 'Stylo', 'EU 38', 'Excellent', 'Blue floral', 3200, 8900, 'heels', 'Multan, Punjab', 10, 117, false, 'Statement floral heels with a comfortable block heel. Worn twice indoors. Original box included.'],
    ['l_coord', 'u_ayesha', 'Black denim street co-ord', 'Women', 'Co-ords', 'Pull & Bear', 'M', 'Good', 'Black', 3600, 11000, 'street-style', 'Lahore, Punjab', 0, 42, false, 'Relaxed black denim co-ord with an easy street-style silhouette. Selling both pieces together.']
  ];

  const listings = base.map(([id, ownerId, title, category, subcategory, brand, size, condition, color, price, originalPrice, image, location, days, views, featured, description], index) => ({
    id, ownerId, title, category, subcategory, brand, size, condition, color, price, originalPrice, description,
    images: [img(image)], location, country: 'Pakistan', shipping: index % 3 === 0 ? 'Nationwide & international' : 'Nationwide delivery',
    status: 'active', featured, views, likedBy: index % 2 === 0 ? ['u_demo', 'u_zara'] : ['u_zara'],
    createdAt: ago(days, index), updatedAt: ago(days, index)
  }));

  const conversations = [{
    id: 'c_demo_dress', listingId: 'l_dress', participants: ['u_demo', 'u_zara'], createdAt: ago(1, 3),
    messages: [
      { id: 'm_1', senderId: 'u_demo', text: 'Hi! Is the dress still available?', createdAt: ago(1, 3), readBy: ['u_demo', 'u_zara'] },
      { id: 'm_2', senderId: 'u_zara', text: 'Yes, it is. It has only been worn once and is freshly dry-cleaned.', createdAt: ago(1, 2), readBy: ['u_demo', 'u_zara'] },
      { id: 'm_3', senderId: 'u_demo', text: 'Great. Could you share the length when you get a moment?', createdAt: ago(0, 4), readBy: ['u_demo'] }
    ]
  }];

  const types = ['page_view', 'search', 'listing_view', 'favourite', 'message'];
  const events = Array.from({ length: 180 }, (_, i) => ({
    id: `e_seed_${i}`, type: types[i % types.length], userId: null,
    listingId: listings[i % listings.length]?.id,
    createdAt: ago(i % 14, i % 20), meta: {}
  }));

  const includeSamples = demoMode || process.env.SEED_SAMPLE_DATA === 'true';
  return {
    version: 1,
    users: includeSamples ? users : users.filter((user) => user.role === 'admin'),
    listings: includeSamples ? listings : [],
    conversations: includeSamples ? conversations : [],
    events: includeSamples ? events : [],
    supportLogs: [], messages: [], newsletter: [], contactMessages: [], reports: []
  };
}
