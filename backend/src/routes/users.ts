import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { getDb } from '../database';
import { authMiddleware } from '../auth';

const router = Router();

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar-${uuidv4()}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

router.get('/', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const db = getDb();
  if (req.user.role === 'admin') {
    const users = db.prepare('SELECT id, username, role, is_active, created_at, last_seen_at, avatar_url FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } else {
    const hiddenLastSeen = db.prepare("SELECT user_id FROM user_settings WHERE key = 'show_last_seen' AND value = 'off'").all() as any[];
    const hiddenIds = new Set(hiddenLastSeen.map((r: any) => r.user_id));
    const users = db.prepare('SELECT id, username, role, is_active, last_seen_at, avatar_url FROM users WHERE is_active = 1 AND id != ? ORDER BY username ASC').all(req.user.id);
    const result = (users as any[]).map(u => ({
      ...u,
      last_seen_at: hiddenIds.has(u.id) ? null : u.last_seen_at,
    }));
    res.json(result);
  }
});

router.post('/avatar', authMiddleware, uploadAvatar.single('avatar'), (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  const avatarUrl = `/api/files/avatar/${req.file.filename}`;
  const db = getDb();
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.user.id);
  res.json({ avatar_url: avatarUrl });
});

router.delete('/avatar', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const db = getDb();
  db.prepare('UPDATE users SET avatar_url = NULL WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
});

export default router;
