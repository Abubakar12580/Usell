import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSeed } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const dbPath = process.env.USELL_DB_PATH || path.join(dataDir, 'db.json');
let db;

export function initStore() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) {
    db = createSeed();
    saveDb();
  } else {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }
  return db;
}

export function getDb() {
  if (!db) initStore();
  return db;
}

export function saveDb() {
  if (!db) return;
  const temp = `${dbPath}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2));
  fs.renameSync(temp, dbPath);
}

export function publicUser(user, includePrivate = false) {
  if (!user) return null;
  const safe = { ...user };
  delete safe.passwordHash;
  if (!includePrivate) {
    delete safe.email;
    delete safe.whatsapp;
  }
  return safe;
}

export function addEvent(type, data = {}) {
  const database = getDb();
  database.events.push({
    id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    userId: data.userId || null,
    listingId: data.listingId || null,
    createdAt: new Date().toISOString(),
    meta: data.meta || {}
  });
  if (database.events.length > 5000) database.events = database.events.slice(-5000);
  saveDb();
}
