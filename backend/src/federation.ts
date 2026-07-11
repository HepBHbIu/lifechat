import crypto from 'crypto';
import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';

export interface ServerIdentity {
  id: string;
  name: string;
  domain: string;
  publicKey: string;
  privateKey: string;
}

export interface Peer {
  id: string;
  url: string;
  name?: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

let localIdentity: ServerIdentity | null = null;

export function initFederation(serverName: string, domain: string): ServerIdentity {
  const db = getDb();

  // Create federation tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS federation_servers (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      name TEXT,
      is_online INTEGER DEFAULT 1,
      last_seen TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS federation_users (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      server_id TEXT NOT NULL,
      username TEXT NOT NULL,
      full_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS federation_messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      sender_full_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      text TEXT,
      file_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_federation_users_full_id ON federation_users(full_id);
    CREATE INDEX IF NOT EXISTS idx_federation_messages_chat ON federation_messages(chat_id);
  `);

  // Get or create server identity
  const existing = db.prepare('SELECT * FROM settings WHERE key = ?').get('federation_identity') as any;

  if (existing) {
    localIdentity = JSON.parse(existing.value);
  } else {
    const keyPair = crypto.generateKeyPairSync('ed25519');
    const publicKey = keyPair.publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
    const privateKey = keyPair.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');

    localIdentity = {
      id: uuidv4(),
      name: serverName,
      domain: domain,
      publicKey,
      privateKey,
    };

    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(
      'federation_identity',
      JSON.stringify(localIdentity)
    );
  }

  return localIdentity;
}

export function getLocalIdentity(): ServerIdentity | null {
  return localIdentity;
}

export function sign(data: string): string {
  if (!localIdentity) throw new Error('Federation not initialized');
  const key = crypto.createPrivateKey({
    key: Buffer.from(localIdentity.privateKey, 'hex'),
    format: 'der',
    type: 'pkcs8',
  });
  const sign = crypto.sign(null, Buffer.from(data), key);
  return sign.toString('hex');
}

export function verify(data: string, signature: string, publicKeyHex: string): boolean {
  try {
    const key = crypto.createPublicKey({
      key: Buffer.from(publicKeyHex, 'hex'),
      format: 'der',
      type: 'spki',
    });
    return crypto.verify(null, Buffer.from(data), key, Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

export function addPeer(url: string, name?: string): Peer {
  const db = getDb();
  const id = uuidv4();

  try {
    db.prepare('INSERT OR IGNORE INTO federation_servers (id, url, name) VALUES (?, ?, ?)').run(id, url, name);
  } catch {}

  const peer = db.prepare('SELECT * FROM federation_servers WHERE url = ?').get(url) as any;
  return peer;
}

export function removePeer(url: string): void {
  const db = getDb();
  db.prepare('DELETE FROM federation_servers WHERE url = ?').run(url);
}

export function getPeers(): Peer[] {
  const db = getDb();
  return db.prepare('SELECT * FROM federation_servers ORDER BY last_seen DESC').all() as Peer[];
}

export function updatePeerStatus(url: string, isOnline: boolean): void {
  const db = getDb();
  db.prepare('UPDATE federation_servers SET is_online = ?, last_seen = datetime(\'now\') WHERE url = ?').run(
    isOnline ? 1 : 0,
    url
  );
}

export function registerFederatedUser(userId: string, serverId: string, username: string): string {
  const db = getDb();
  const fullId = `${username}@${localIdentity?.domain || 'unknown'}`;
  const id = uuidv4();

  db.prepare(`
    INSERT OR REPLACE INTO federation_users (id, user_id, server_id, username, full_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, serverId, username, fullId);

  return fullId;
}

export function getFederatedUsers(): any[] {
  const db = getDb();
  return db.prepare('SELECT * FROM federation_users ORDER BY created_at DESC').all();
}

export function storeFederatedMessage(chatId: string, senderFullId: string, type: string, text?: string, fileUrl?: string): string {
  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO federation_messages (id, chat_id, sender_full_id, type, text, file_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, chatId, senderFullId, type, text || null, fileUrl || null);

  return id;
}
