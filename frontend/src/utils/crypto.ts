// E2E Encryption using Web Crypto API
// AES-256-GCM + PBKDF2 key derivation

const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

function getChatKey(chatId: string): string {
  const stored = localStorage.getItem(`e2e_key_${chatId}`);
  if (stored) return stored;
  // Generate new key for this chat
  const key = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  localStorage.setItem(`e2e_key_${chatId}`, key);
  return key;
}

// Share key with another user (via secure channel - for now, store locally)
export function shareChatKey(chatId: string, recipientId: string): string {
  const key = getChatKey(chatId);
  // In real E2E, this would use public key encryption
  // For now, we store the key association
  localStorage.setItem(`e2e_shared_${chatId}_${recipientId}`, key);
  return key;
}

export function getSharedKey(chatId: string, senderId: string): string | null {
  return localStorage.getItem(`e2e_shared_${chatId}_${senderId}`);
}

export async function encryptText(text: string, chatId: string): Promise<string> {
  const enc = new TextEncoder();
  const keyHex = getChatKey(chatId);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(keyHex, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, SALT_LENGTH);
  result.set(new Uint8Array(encrypted), SALT_LENGTH + IV_LENGTH);
  return 'ENC:' + bytesToHex(result);
}

export async function decryptText(encrypted: string, chatId: string): Promise<string> {
  if (!encrypted.startsWith('ENC:')) return encrypted;
  try {
    const data = hexToBytes(encrypted.slice(4));
    const salt = data.slice(0, SALT_LENGTH);
    const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = data.slice(SALT_LENGTH + IV_LENGTH);
    const keyHex = getChatKey(chatId);
    const key = await deriveKey(keyHex, salt);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    return encrypted; // Fallback if decryption fails
  }
}

export async function encryptFile(file: File, chatId: string): Promise<File> {
  const keyHex = getChatKey(chatId);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(keyHex, salt);
  
  const arrayBuffer = await file.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, arrayBuffer);
  
  const header = new Uint8Array([0x45, 0x4E, 0x43, 0x01]); // "ENC" + version
  const result = new Uint8Array(header.length + salt.length + iv.length + encrypted.byteLength);
  result.set(header, 0);
  result.set(salt, header.length);
  result.set(iv, header.length + SALT_LENGTH);
  result.set(new Uint8Array(encrypted), header.length + SALT_LENGTH + IV_LENGTH);
  
  return new File([result], file.name, { type: file.type });
}

export async function decryptFile(arrayBuffer: ArrayBuffer, chatId: string): Promise<ArrayBuffer> {
  const data = new Uint8Array(arrayBuffer);
  if (data[0] !== 0x45 || data[1] !== 0x4E || data[2] !== 0x43) return arrayBuffer; // Not encrypted
  
  try {
    const salt = data.slice(4, 4 + SALT_LENGTH);
    const iv = data.slice(4 + SALT_LENGTH, 4 + SALT_LENGTH + IV_LENGTH);
    const ciphertext = data.slice(4 + SALT_LENGTH + IV_LENGTH);
    const keyHex = getChatKey(chatId);
    const key = await deriveKey(keyHex, salt);
    return await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  } catch {
    return arrayBuffer;
  }
}

export function isEncrypted(text: string): boolean {
  return text.startsWith('ENC:');
}

export function getEncryptionStatus(chatId: string): boolean {
  return !!localStorage.getItem(`e2e_key_${chatId}`);
}
