import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('Set TEST_DATABASE_URL to an isolated PostgreSQL test database.');
const appPort = Number(process.env.TEST_PORT || 5180);
const base = `http://127.0.0.1:${appPort}`;
const adminPassword = 'PgIntegrationAdmin2026!';
let app;
let appOutput = '';
let uploads = 0;
let destroys = 0;

const mockCloudinary = http.createServer(async (req, res) => {
  for await (const _chunk of req) { /* Consume the multipart/API request. */ }
  if (req.url.endsWith('/upload')) {
    uploads += 1;
    const publicId = `usell/listings/integration-${uploads}`;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ secure_url: `https://res.cloudinary.com/testcloud/image/upload/v1/${publicId}.jpg`, public_id: publicId }));
    return;
  }
  if (req.url.endsWith('/destroy')) {
    destroys += 1;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result: 'ok' }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: `Unexpected mock path: ${req.url}` } }));
});
await new Promise((resolve) => mockCloudinary.listen(0, '127.0.0.1', resolve));
const cloudPort = mockCloudinary.address().port;

function startApp() {
  const cloudinaryUrl = `cloudinary://testkey:testsecret@testcloud?upload_prefix=${encodeURIComponent(`http://127.0.0.1:${cloudPort}`)}`;
  app = spawn(process.execPath, ['server/index.js'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(appPort),
      DATABASE_URL: databaseUrl,
      DEMO_MODE: 'false',
      SEED_SAMPLE_DATA: 'false',
      ADMIN_PASSWORD: adminPassword,
      JWT_SECRET: 'postgres-integration-test-secret-with-32-plus-characters',
      CLOUDINARY_URL: cloudinaryUrl,
      CLOUDINARY_CLOUD_NAME: 'testcloud',
      CLOUDINARY_API_KEY: 'testkey',
      CLOUDINARY_API_SECRET: 'testsecret',
      OPENAI_API_KEY: '',
      WHATSAPP_ACCESS_TOKEN: '',
      WHATSAPP_PHONE_NUMBER_ID: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  app.stdout.on('data', (chunk) => { appOutput += chunk; });
  app.stderr.on('data', (chunk) => { appOutput += chunk; });
}

async function stopApp() {
  if (!app || app.exitCode !== null) return;
  const child = app;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
  app = undefined;
}

async function api(route, { method = 'GET', token, body, expected = 200 } = {}) {
  const isForm = body instanceof FormData;
  const response = await fetch(`${base}/api${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {})
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${route}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const health = await api('/health');
      assert.equal(health.database, 'postgres');
      assert.equal(health.imageStorage, 'cloudinary');
      return health;
    } catch {
      if (app?.exitCode !== null && app?.exitCode !== undefined) throw new Error(`Server exited early:\n${appOutput}`);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`Server did not become healthy:\n${appOutput}`);
}

const uploadDir = path.join(root, 'public', 'uploads');
const tempFilesBefore = new Set(fs.readdirSync(uploadDir));
let seller;
let buyer;
let admin;
let listing;
let conversation;

try {
  startApp();
  await waitForHealth();
  admin = (await api('/auth/login', { method: 'POST', body: { email: 'admin@usell.app', password: adminPassword } })).token;
  await api('/auth/login', { method: 'POST', body: { email: 'demo@usell.app', password: 'demo123' }, expected: 401 });

  seller = await api('/auth/register', { method: 'POST', expected: 201, body: { name: 'Postgres Seller', email: 'pg.seller@example.com', password: 'seller123', location: 'Lahore' } });
  buyer = await api('/auth/register', { method: 'POST', expected: 201, body: { name: 'Postgres Buyer', email: 'pg.buyer@example.com', password: 'buyer123', location: 'Karachi' } });

  const form = new FormData();
  const fields = {
    title: 'PostgreSQL integration jacket',
    description: 'A durable integration-test listing with a complete description, clear condition details and permanent cloud photo storage.',
    category: 'Men', subcategory: 'Jackets', brand: 'Usell Test', size: 'M', condition: 'Excellent',
    color: 'Black', price: '4200', originalPrice: '9000', location: 'Lahore', shipping: 'Nationwide delivery'
  };
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  const photo = fs.readFileSync(path.join(root, 'public', 'images', 'denim-jacket.jpg'));
  form.append('images', new Blob([photo], { type: 'image/jpeg' }), 'integration-jacket.jpg');
  listing = (await api('/listings', { method: 'POST', token: seller.token, body: form, expected: 201 })).listing;
  assert.match(listing.images[0], /^https:\/\/res\.cloudinary\.com\//);
  assert.equal(uploads, 1);

  await api(`/listings/${listing.id}/favorite`, { method: 'POST', token: buyer.token });
  const favourites = await api('/favorites', { token: buyer.token });
  assert.equal(favourites.listings.length, 1);

  conversation = (await api('/conversations', { method: 'POST', token: buyer.token, expected: 201, body: { listingId: listing.id, message: 'Is this jacket still available?' } })).conversation;
  await api(`/conversations/${conversation.id}/messages`, { method: 'POST', token: seller.token, expected: 201, body: { message: 'Yes, it is available.' } });

  const support = await api('/support/chat', { method: 'POST', token: buyer.token, body: { message: 'How do I contact the seller?' } });
  assert.match(support.answer, /Chat with seller|conversation/i);
  await api('/newsletter', { method: 'POST', expected: 201, body: { email: 'pg.newsletter@example.com' } });
  await api('/contact', { method: 'POST', expected: 201, body: { name: 'Integration Tester', email: 'pg.contact@example.com', message: 'Testing durable contact storage.' } });
  await api('/analytics/event', { method: 'POST', body: { type: 'page_view', path: '/integration-test' } });

  const analytics = await api('/admin/analytics', { token: admin });
  assert.equal(analytics.metrics.totalUsers, 2);
  assert.equal(analytics.metrics.activeListings, 1);
  assert.equal(analytics.metrics.conversations, 1);
  assert.ok(analytics.recentUsers.every((user) => !user.email && !user.passwordHash));
  const report = await api('/admin/whatsapp-report', { method: 'POST', token: admin });
  assert.equal(report.sent, false);
  assert.match(report.whatsappLink, /923347323999/);

  await stopApp();
  startApp();
  await waitForHealth();

  seller = await api('/auth/login', { method: 'POST', body: { email: 'pg.seller@example.com', password: 'seller123' } });
  buyer = await api('/auth/login', { method: 'POST', body: { email: 'pg.buyer@example.com', password: 'buyer123' } });
  admin = (await api('/auth/login', { method: 'POST', body: { email: 'admin@usell.app', password: adminPassword } })).token;
  const search = await api('/listings?q=PostgreSQL%20integration');
  assert.equal(search.total, 1);
  assert.equal(search.listings[0].id, listing.id);
  assert.equal((await api('/favorites', { token: buyer.token })).listings.length, 1);
  const conversations = await api('/conversations', { token: buyer.token });
  assert.equal(conversations.conversations.length, 1);
  assert.equal(conversations.conversations[0].messages.length, 2);

  await api(`/listings/${listing.id}`, { method: 'DELETE', token: seller.token });
  assert.equal(destroys, 1);
  assert.equal((await api('/listings?q=PostgreSQL%20integration')).total, 0);
  await api(`/listings/${listing.id}`, { expected: 404 });
  assert.deepEqual(fs.readdirSync(uploadDir).filter((file) => !tempFilesBefore.has(file)), [], 'Cloudinary flow must remove temporary files.');

  await stopApp();
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  const counts = {};
  for (const table of ['usell_users', 'usell_listings', 'usell_conversations', 'usell_support_logs', 'usell_newsletter', 'usell_contact_messages']) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = result.rows[0].count;
  }
  const storedListing = await client.query('SELECT data FROM usell_listings WHERE id = $1', [listing.id]);
  await client.end();
  assert.equal(counts.usell_users, 3);
  assert.equal(counts.usell_listings, 1);
  assert.equal(counts.usell_conversations, 1);
  assert.equal(counts.usell_support_logs, 1);
  assert.equal(counts.usell_newsletter, 1);
  assert.equal(counts.usell_contact_messages, 1);
  assert.equal(storedListing.rows[0].data.status, 'removed');

  console.log(JSON.stringify({ ok: true, restartPersistence: true, cloudinaryUploadFlow: true, cloudinaryCleanup: true, counts }, null, 2));
} catch (error) {
  console.error(error);
  console.error(appOutput);
  process.exitCode = 1;
} finally {
  await stopApp();
  await new Promise((resolve) => mockCloudinary.close(resolve));
}
