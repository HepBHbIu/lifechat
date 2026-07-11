import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AccessToken } from 'livekit-server-sdk';
import { getDb } from '../database';
import { authMiddleware } from '../auth';
import { config } from '../config';

const router = Router();
router.use(authMiddleware);

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret_devkey_livekit';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'http://localhost:7880';

router.post('/token', async (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const { roomName, metadata } = req.body;
  if (!roomName) { res.status(400).json({ error: 'roomName required' }); return; }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: req.user.id,
    name: req.user.username,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
  });

  const token = await at.toJwt();

  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO rooms (id, name, created_by, is_active, created_at)
    VALUES (?, ?, ?, 1, datetime('now'))
  `).run(uuidv4(), roomName, req.user.id);

  res.json({ token, url: LIVEKIT_URL });
});

router.get('/list', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const db = getDb();
  const rooms = db.prepare('SELECT * FROM rooms WHERE is_active = 1 ORDER BY created_at DESC').all();
  res.json(rooms);
});

router.post('/leave', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const { roomName } = req.body;
  if (!roomName) { res.status(400).json({ error: 'roomName required' }); return; }

  const db = getDb();
  db.prepare('UPDATE rooms SET is_active = 0 WHERE name = ?').run(roomName);
  res.json({ ok: true });
});

export default router;
