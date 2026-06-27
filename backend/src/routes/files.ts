import { Router, Request, Response } from 'express';
import fs from 'fs';
import { getDb } from '../database';

const router = Router();

// Serve files WITHOUT auth — audio/video/image elements can't send headers
// Security: UUIDs are 128-bit random, hard to guess
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as any;
  if (!file) { res.status(404).json({ error: 'File not found' }); return; }

  if (!fs.existsSync(file.path)) {
    res.status(404).json({ error: 'File not found on disk' });
    return;
  }

  const mime = file.mime_type || 'application/octet-stream';
  const isInline = mime.startsWith('audio/') || mime.startsWith('image/') || mime.startsWith('video/');

  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Length', file.size);
  res.setHeader('Content-Disposition', isInline ? 'inline' : `attachment; filename="${encodeURIComponent(file.original_name)}"`);
  res.setHeader('Cache-Control', 'public, max-age=31536000');

  const stream = fs.createReadStream(file.path);
  stream.pipe(res);
});

// Info endpoint — still requires auth
router.get('/:id/info', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { id } = req.params;
  const db = getDb();
  const file = db.prepare('SELECT id, original_name, mime_type, size, created_at FROM files WHERE id = ?').get(id);
  if (!file) { res.status(404).json({ error: 'File not found' }); return; }
  res.json(file);
});

export default router;
