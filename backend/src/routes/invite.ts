import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { authMiddleware } from '../auth';

const router = Router();

// POST /invite/create - Create invite link (admin only)
router.post('/create', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }

  const { max_uses, expires_in_days } = req.body;
  const db = getDb();
  const code = uuidv4().slice(0, 8);
  const expires_at = expires_in_days
    ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
    : null;

  db.prepare(`
    INSERT INTO invite_links (id, code, created_by, max_uses, uses, expires_at, created_at)
    VALUES (?, ?, ?, ?, 0, ?, datetime('now'))
  `).run(uuidv4(), code, req.user.id, max_uses || null, expires_at);

  res.json({ code, url: `/invite/${code}` });
});

// GET /invite/:code - Get invite info
router.get('/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const db = getDb();

  const invite = db.prepare('SELECT * FROM invite_links WHERE code = ?').get(code) as any;
  if (!invite) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    res.status(410).json({ error: 'Invite expired' });
    return;
  }

  if (invite.max_uses && invite.uses >= invite.max_uses) {
    res.status(410).json({ error: 'Invite limit reached' });
    return;
  }

  const identity = require('../federation').getLocalIdentity();

  res.json({
    code: invite.code,
    server: {
      name: identity?.name || 'EchoChat',
      domain: identity?.domain || 'localhost',
    },
    expires_at: invite.expires_at,
    uses_left: invite.max_uses ? invite.max_uses - invite.uses : null,
  });
});

// POST /invite/:code/use - Use invite link
router.post('/:code/use', (req: Request, res: Response) => {
  const { code } = req.params;
  const db = getDb();

  const invite = db.prepare('SELECT * FROM invite_links WHERE code = ?').get(code) as any;
  if (!invite) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    res.status(410).json({ error: 'Invite expired' });
    return;
  }

  if (invite.max_uses && invite.uses >= invite.max_uses) {
    res.status(410).json({ error: 'Invite limit reached' });
    return;
  }

  // Increment uses
  db.prepare('UPDATE invite_links SET uses = uses + 1 WHERE code = ?').run(code);

  res.json({ ok: true, invite_code: code });
});

// GET /invite/list - List all invites (admin only)
router.get('/list/all', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }

  const db = getDb();
  const invites = db.prepare('SELECT * FROM invite_links ORDER BY created_at DESC').all();
  res.json(invites);
});

// DELETE /invite/:code - Delete invite
router.delete('/:code', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }

  const { code } = req.params;
  const db = getDb();
  db.prepare('DELETE FROM invite_links WHERE code = ?').run(code);
  res.json({ ok: true });
});

export default router;
