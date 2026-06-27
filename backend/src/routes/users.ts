import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { authMiddleware } from '../auth';

const router = Router();

router.get('/', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const db = getDb();
  if (req.user.role === 'admin') {
    const users = db.prepare('SELECT id, username, role, is_active, created_at, last_seen_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } else {
    // Check which users hide their last seen
    const hiddenLastSeen = db.prepare("SELECT user_id FROM user_settings WHERE key = 'show_last_seen' AND value = 'off'").all() as any[];
    const hiddenIds = new Set(hiddenLastSeen.map((r: any) => r.user_id));
    const users = db.prepare('SELECT id, username, role, is_active, last_seen_at FROM users WHERE is_active = 1 AND id != ? ORDER BY username ASC').all(req.user.id);
    const result = (users as any[]).map(u => ({
      ...u,
      last_seen_at: hiddenIds.has(u.id) ? null : u.last_seen_at,
    }));
    res.json(result);
  }
});

export default router;
