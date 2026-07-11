import crypto from 'crypto';
import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

// Generate user keypair for E2EE
export function generateUserKeyPair(): KeyPair {
  const keyPair = crypto.generateKeyPairSync('x25519');
  const publicKey = keyPair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const privateKey = keyPair.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
  return { publicKey, privateKey };
}

// Store user's public key
export function storePublicKey(userId: string, publicKey: string): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO user_keys (user_id, public_key, created_at)
    VALUES (?, ?, datetime('now'))
  `).run(userId, publicKey);
}

// Get user's public key
export function getPublicKey(userId: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT public_key FROM user_keys WHERE user_id = ?').get(userId) as any;
  return row?.public_key || null;
}

// Encrypt message for recipient using X25519 + AES-256-GCM
export function encryptMessage(plaintext: string, recipientPublicKeyB64: string, senderPrivateKeyB64: string): {
  ciphertext: string;
  iv: string;
  ephemeralPublicKey: string;
} {
  // Generate ephemeral keypair
  const ephemeral = crypto.generateKeyPairSync('x25519');

  // Import keys
  const recipientKey = crypto.createPublicKey({
    key: Buffer.from(recipientPublicKeyB64, 'base64'),
    format: 'der',
    type: 'spki',
  });

  const senderKey = crypto.createPrivateKey({
    key: Buffer.from(senderPrivateKeyB64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });

  // ECDH to derive shared secret
  const sharedSecret = crypto.diffieHellman({
    privateKey: senderKey,
    publicKey: recipientKey,
  });

  // Derive AES key from shared secret
  const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();

  // Encrypt with AES-256-GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext + ':' + authTag.toString('hex'),
    iv: iv.toString('hex'),
    ephemeralPublicKey: ephemeral.publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
  };
}

// Decrypt message using private key
export function decryptMessage(encrypted: {
  ciphertext: string;
  iv: string;
  ephemeralPublicKey: string;
}, recipientPrivateKeyB64: string): string {
  const recipientKey = crypto.createPrivateKey({
    key: Buffer.from(recipientPrivateKeyB64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });

  const ephemeralKey = crypto.createPublicKey({
    key: Buffer.from(encrypted.ephemeralPublicKey, 'base64'),
    format: 'der',
    type: 'spki',
  });

  // ECDH to derive shared secret
  const sharedSecret = crypto.diffieHellman({
    privateKey: recipientKey,
    publicKey: ephemeralKey,
  });

  // Derive AES key
  const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();

  // Split ciphertext and auth tag
  const [ciphertextHex, authTagHex] = encrypted.ciphertext.split(':');

  // Decrypt
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, Buffer.from(encrypted.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let plaintext = decipher.update(ciphertextHex, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

// Initialize E2EE tables
export function initE2EE(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_keys (
      user_id TEXT PRIMARY KEY,
      public_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS encrypted_messages (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL UNIQUE,
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      ephemeral_public_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );
  `);
}
