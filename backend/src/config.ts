import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}. Copy .env.example to .env and fill it.`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  adminToken: process.env.ADMIN_TOKEN || crypto.randomBytes(32).toString('hex'),
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  inviteCode: process.env.INVITE_CODE || 'letmein2024',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
  dbPath: path.resolve('./database.db'),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()),
  demoEnabled: process.env.DEMO_ENABLED !== 'false',
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
  vapidEmail: process.env.VAPID_EMAIL || 'mailto:admin@echocat.local',
  // Federation
  federationEnabled: process.env.FEDERATION_ENABLED !== 'false',
  federationDomain: process.env.FEDERATION_DOMAIN || 'localhost',
  federationName: process.env.FEDERATION_NAME || 'EchoChat',
  seedPeers: (process.env.SEED_PEERS || '').split(',').filter(s => s.trim()),
};

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv',
  '.zip', '.rar', '.7z',
  '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac',
  '.webm', '.mp4', '.mov', '.avi', '.mkv',
  '.json', '.xml',
];

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.js', '.php', '.html', '.dll'];

export function isAllowedFileType(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) return false;
  return ALLOWED_EXTENSIONS.includes(ext);
}
