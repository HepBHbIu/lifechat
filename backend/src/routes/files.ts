import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { getDb } from '../database';
import { authMiddleware } from '../auth';

const router = Router();

// Helper to verify token from query string (for media elements that can't send headers)
function verifyQueryToken(token: string): any {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

// Serve files WITH auth — supports both header and query token for media elements
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const token = req.query.token as string;

  // Try header auth first, then query token
  let userId: string | null = null;
  if (req.user) {
    userId = req.user.id;
  } else if (token) {
    const decoded = verifyQueryToken(token);
    if (decoded) userId = decoded.id;
  }

  if (!userId) {
    res.status(401).json({ error: 'Не авторизован' });
    return;
  }

  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as any;
  if (!file) { res.status(404).json({ error: 'Файл не найден' }); return; }

  if (!fs.existsSync(file.path)) {
    res.status(404).json({ error: 'Файл не найден на диске' });
    return;
  }

  const mime = file.mime_type || 'application/octet-stream';
  const isInline = mime.startsWith('audio/') || mime.startsWith('image/') || mime.startsWith('video/');

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Length', file.size);
  res.setHeader('Content-Disposition', isInline ? 'inline' : `attachment; filename="${encodeURIComponent(file.original_name)}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');

  const stream = fs.createReadStream(file.path);
  stream.pipe(res);
});

// Info endpoint — requires auth
router.get('/:id/info', authMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const file = db.prepare('SELECT id, original_name, mime_type, size, created_at FROM files WHERE id = ?').get(id);
  if (!file) { res.status(404).json({ error: 'Файл не найден' }); return; }
  res.json(file);
});

// Serve avatar files (public for display)
router.get('/avatar/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(config.uploadDir, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(filePath).pipe(res);
});

export default router;
