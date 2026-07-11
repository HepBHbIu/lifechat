import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { authMiddleware } from '../auth';

const router = Router();

// ===== Server settings (admin only) =====
router.get('/server', authMiddleware, (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as any[];
  const settings: Record<string, string> = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

router.put('/server', authMiddleware, (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }
  const db = getDb();
  const upsert = db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`);
  const entries = Object.entries(req.body);
  const tx = db.transaction(() => {
    for (const [key, value] of entries) {
      upsert.run(key, String(value));
    }
  });
  tx();
  res.json({ ok: true });
});

// ===== User settings =====
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Не авторизован' }); return; }
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM user_settings WHERE user_id = ?').all(req.user.id) as any[];
  const settings: Record<string, string> = {};
  rows.forEach(r => { settings[r.key] = r.value; });

  const user = db.prepare('SELECT id, username, role, bio, avatar_url, is_active, created_at, last_seen_at FROM users WHERE id = ?').get(req.user.id) as any;
  res.json({ ...user, settings });
});

router.put('/me', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Не авторизован' }); return; }
  const db = getDb();
  const { bio, avatar_url, username } = req.body;

  if (bio !== undefined || avatar_url !== undefined || username) {
    const updates: string[] = [];
    const params: any[] = [];
    if (username) { updates.push('username = ?'); params.push(username); }
    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    if (avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(avatar_url); }
    if (updates.length > 0) {
      params.push(req.user.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
  }

  const settings = req.body.settings;
  if (settings && typeof settings === 'object') {
    const upsert = db.prepare(`INSERT INTO user_settings (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`);
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(req.user.id, key, String(value));
    }
  }

  const user = db.prepare('SELECT id, username, role, bio, avatar_url, is_active, created_at, last_seen_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ===== Chat settings =====
router.get('/chat/:chatId', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Не авторизован' }); return; }
  const db = getDb();
  const chat = db.prepare('SELECT id, type, title, description, slow_mode_seconds, pinned_message_id, created_by FROM chats WHERE id = ?').get(req.params.chatId) as any;
  if (!chat) { res.status(404).json({ error: 'Чат не найден' }); return; }
  res.json(chat);
});

router.put('/chat/:chatId', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Не авторизован' }); return; }
  const db = getDb();
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.chatId) as any;
  if (!chat) { res.status(404).json({ error: 'Чат не найден' }); return; }
  if (chat.created_by !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Нет доступа' }); return;
  }

  const { title, description, slow_mode_seconds, avatar_url } = req.body;
  const updates: string[] = [];
  const params: any[] = [];
  if (title !== undefined) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (slow_mode_seconds !== undefined) { updates.push('slow_mode_seconds = ?'); params.push(slow_mode_seconds); }
  if (avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(avatar_url); }

  if (updates.length > 0) {
    params.push(req.params.chatId);
    db.prepare(`UPDATE chats SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  res.json({ ok: true });
});

export default router;
