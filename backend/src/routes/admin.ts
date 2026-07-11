import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../database';
import { authMiddleware, adminMiddleware } from '../auth';
import { hashPassword } from '../password';

const router = Router();
router.use(authMiddleware, adminMiddleware);

// --- Users ---
router.get('/users', (req: Request, res: Response) => {
  const db = getDb();
  const users = db.prepare('SELECT id, username, role, is_active, created_at, last_seen_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.post('/users', (req: Request, res: Response) => {
  const { username, role, password } = req.body;
  if (!username) { res.status(400).json({ error: 'Username is required' }); return; }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) { res.status(409).json({ error: 'Логин уже занят' }); return; }
  const id = uuidv4();
  const generatedPassword = password || crypto.randomBytes(4).toString('hex');
  const passwordHash = hashPassword(generatedPassword);
  db.prepare('INSERT INTO users (id, username, role, is_active, password_hash) VALUES (?, ?, ?, 1, ?)').run(id, username, role || 'user', passwordHash);
  const user = db.prepare('SELECT id, username, role, is_active, created_at FROM users WHERE id = ?').get(id);
  res.json({ user, password: generatedPassword });
});

router.patch('/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { is_active } = req.body;
  const db = getDb();
  db.prepare(`UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`).run(is_active ? 1 : 0, id);
  const user = db.prepare('SELECT id, username, role, is_active, created_at FROM users WHERE id = ?').get(id);
  res.json(user);
});

router.delete('/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (req.user && req.user.id === id) {
    res.status(400).json({ error: 'Нельзя удалить себя' });
    return;
  }
  const db = getDb();
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

// --- Tokens ---
router.get('/tokens', (_req: Request, res: Response) => {
  const db = getDb();
  const tokens = db.prepare(`
    SELECT t.id, t.token, t.user_id, t.role, t.is_active, t.is_used, t.created_at, t.used_at, t.expires_at, u.username
    FROM tokens t LEFT JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `).all();
  res.json(tokens);
});

router.post('/tokens', (req: Request, res: Response) => {
  const { user_id, role } = req.body;
  const db = getDb();
  const id = uuidv4();
  const tokenValue = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO tokens (id, token, user_id, role, is_active) VALUES (?, ?, ?, ?, 1)').run(id, tokenValue, user_id || null, role || 'user');
  res.json({ id, token: tokenValue, user_id, role: role || 'user', is_active: 1, is_used: 0, created_at: new Date().toISOString() });
});

router.patch('/tokens/:id/disable', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  db.prepare('UPDATE tokens SET is_active = 0 WHERE id = ?').run(id);
  res.json({ ok: true });
});

// --- Chats ---
router.get('/chats', (_req: Request, res: Response) => {
  const db = getDb();
  const chats = db.prepare('SELECT * FROM chats ORDER BY updated_at DESC').all();
  res.json(chats);
});

router.post('/chats/group', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Не авторизован' }); return; }
  const { title, member_ids } = req.body;
  if (!title) { res.status(400).json({ error: 'Title is required' }); return; }
  const db = getDb();
  const chatId = uuidv4();
  db.prepare('INSERT INTO chats (id, type, title, created_by) VALUES (?, ?, ?, ?)').run(chatId, 'group', title, req.user.id);
  const memberId = uuidv4();
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id, role_in_chat) VALUES (?, ?, ?, ?)').run(memberId, chatId, req.user.id, 'admin');
  if (member_ids && Array.isArray(member_ids)) {
    const insertMember = db.prepare('INSERT OR IGNORE INTO chat_members (id, chat_id, user_id) VALUES (?, ?, ?)');
    for (const uid of member_ids) {
      if (uid !== req.user.id) {
        insertMember.run(uuidv4(), chatId, uid);
      }
    }
  }
  res.json({ id: chatId, type: 'group', title, created_by: req.user.id });
});

// Create channel
router.post('/chats/channel', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Не авторизован' }); return; }
  const { title, description } = req.body;
  if (!title) { res.status(400).json({ error: 'Title required' }); return; }
  const db = getDb();
  const chatId = uuidv4();
  db.prepare('INSERT INTO chats (id, type, title, description, created_by) VALUES (?, ?, ?, ?, ?)').run(chatId, 'channel', title, description || null, req.user.id);
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id, role_in_chat) VALUES (?, ?, ?, ?)').run(uuidv4(), chatId, req.user.id, 'admin');
  res.json({ id: chatId, type: 'channel', title, created_by: req.user.id });
});

router.patch('/chats/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title } = req.body;
  const db = getDb();
  db.prepare(`UPDATE chats SET title = ?, updated_at = datetime('now') WHERE id = ?`).run(title, id);
  res.json({ ok: true });
});

router.delete('/chats/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  db.prepare('DELETE FROM chats WHERE id = ?').run(id);
  res.json({ ok: true });
});

router.post('/chats/:id/members', (req: Request, res: Response) => {
  const { id } = req.params;
  const { user_id } = req.body;
  if (!user_id) { res.status(400).json({ error: 'user_id is required' }); return; }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(id, user_id);
  if (existing) {
    db.prepare('UPDATE chat_members SET is_active = 1, removed_at = NULL WHERE chat_id = ? AND user_id = ?').run(id, user_id);
  } else {
    db.prepare('INSERT INTO chat_members (id, chat_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), id, user_id);
  }
  res.json({ ok: true });
});

router.delete('/chats/:id/members/:userId', (req: Request, res: Response) => {
  const { id, userId } = req.params;
  const db = getDb();
  db.prepare(`UPDATE chat_members SET is_active = 0, removed_at = datetime('now') WHERE chat_id = ? AND user_id = ?`).run(id, userId);
  res.json({ ok: true });
});

// --- Messages ---
router.get('/messages', (req: Request, res: Response) => {
  const db = getDb();
  const { chat_id, limit = '100' } = req.query;
  let query = 'SELECT m.*, u.username as sender_name FROM messages m LEFT JOIN users u ON m.sender_id = u.id';
  const params: any[] = [];
  if (chat_id) {
    query += ' WHERE m.chat_id = ?';
    params.push(chat_id);
  }
  query += ' ORDER BY m.created_at DESC LIMIT ?';
  params.push(parseInt(limit as string, 10));
  const messages = db.prepare(query).all(...params);
  res.json(messages);
});

router.delete('/messages/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  db.prepare(`UPDATE messages SET deleted_at = datetime('now'), text = NULL, file_id = NULL WHERE id = ?`).run(id);
  res.json({ ok: true });
});

export default router;
