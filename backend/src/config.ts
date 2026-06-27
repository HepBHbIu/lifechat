import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  adminToken: process.env.ADMIN_TOKEN || 'admin-secret-token-change-me',
  jwtSecret: process.env.JWT_SECRET || 'jwt-secret-change-me-in-production',
  inviteCode: process.env.INVITE_CODE || 'letmein2024',
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
  dbPath: path.resolve('./database.db'),
};

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
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

export function isImageFile(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}

export function isAudioFile(mimetype: string): boolean {
  return mimetype.startsWith('audio/');
}
