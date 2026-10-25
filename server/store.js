import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createSeed } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const dbPath = process.env.USELL_DB_PATH || path.join(dataDir, 'db.json');
const clone = (value) => JSON.parse(JSON.stringify(value));
const emptyData = () => ({ version: 1, users: [], listings: [], conversations: [], events: [], supportLogs: [], messages: [], newsletter: [], contactMessages: [], reports: [] });
const tables = {
  users: 'usell_users',
  listings: 'usell_listings',
  conversations: 'usell_conversations',
  events: 'usell_events',
  supportLogs: 'usell_support_logs',
  newsletter: 'usell_newsletter',
  contactMessages: 'usell_contact_messages',
  reports: 'usell_reports'
};

let db;
let pool;
let lastSaved = null;
let writeQueue = Promise.resolve();

export function storageMode() {
  return pool ? 'postgres' : 'json';
}

export async function initStore() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (process.env.DATABASE_URL) {
    const connectionString = process.env.DATABASE_URL;
    const localConnection = /localhost|127\.0\.0\.1/.test(connectionString);
    const sslDisabled = localConnection || process.env.PGSSL === 'disable' || /sslmode=disable/.test(connectionString);
    pool = new pg.Pool({
      connectionString,
      ssl: sslDisabled ? undefined : { rejectUnauthorized: false },
      enableChannelBinding: !sslDisabled,
      max: 3,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 10000
    });
    pool.on('error', (error) => console.error('PostgreSQL pool error:', error));
    await pool.query('SELECT 1');
    for (const table of Object.values(tables)) {
      await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    }
    db = emptyData();
    for (const [key, table] of Object.entries(tables)) {
      const result = await pool.query(`SELECT id, data FROM ${table}`);
      db[key] = result.rows.map((row) => ({ ...row.data, id: row.id }));
    }
    // A completely empty database is initialised with the public admin and catalogue.
    if (!db.users.length) {
      db = createSeed();
      await persistSnapshot(clone(db));
    }
    lastSaved = clone(db);
    console.log('Usell storage: PostgreSQL');
  } else {
    if (!fs.existsSync(dbPath)) {
      db = createSeed();
      await saveDb();
    } else {
      db = { ...emptyData(), ...JSON.parse(fs.readFileSync(dbPath, 'utf8')) };
    }
    lastSaved = clone(db);
    console.log('Usell storage: local JSON');
  }
  return db;
}

export function getDb() {
  if (!db) throw new Error('The data store has not been initialised.');
  return db;
}

function changedRecords(key, snapshot) {
  const previous = lastSaved?.[key] || [];
  const current = snapshot[key] || [];
  const previousMap = new Map(previous.map((item) => [item.id, item]));
  const currentIds = new Set(current.map((item) => item.id));
  const removedIds = previous.map((item) => item.id).filter((recordId) => !currentIds.has(recordId));
  const changed = current.filter((item) => JSON.stringify(previousMap.get(item.id)) !== JSON.stringify(item));
  return { removedIds, changed };
}

async function persistSnapshot(snapshot) {
  const work = Object.entries(tables).map(([key, table]) => ({ key, table, ...changedRecords(key, snapshot) }));
  if (!work.some((item) => item.removedIds.length || item.changed.length)) {
    lastSaved = clone(snapshot);
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of work) {
      if (item.removedIds.length) {
        await client.query(`DELETE FROM ${item.table} WHERE id = ANY($1::text[])`, [item.removedIds]);
      }
      if (item.changed.length) {
        const ids = item.changed.map((record) => record.id);
        const records = item.changed.map((record) => JSON.stringify(record));
        await client.query(
          `INSERT INTO ${item.table} (id, data, updated_at)
           SELECT id, data, NOW() FROM UNNEST($1::text[], $2::jsonb[]) AS records(id, data)
           ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
          [ids, records]
        );
      }
    }
    await client.query('COMMIT');
    lastSaved = clone(snapshot);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function saveDb() {
  if (!db) return;
  if (!pool) {
    const temp = `${dbPath}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(db, null, 2));
    fs.renameSync(temp, dbPath);
    lastSaved = clone(db);
    return;
  }
  // Serialise snapshots so concurrent API requests cannot overwrite one another.
  const snapshot = clone(db);
  const operation = writeQueue.catch(() => {}).then(() => persistSnapshot(snapshot));
  writeQueue = operation;
  return operation;
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

export async function addEvent(type, data = {}) {
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
  await saveDb();
}

export async function closeStore() {
  if (pool) await pool.end();
}
