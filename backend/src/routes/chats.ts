import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { authMiddleware } from '../auth';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const db = getDb();
  const chats = db.prepare(`
    SELECT c.*,
      (SELECT m.text FROM messages m WHERE m.chat_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) as last_message,
      (SELECT m.created_at FROM messages m WHERE m.chat_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) as last_message_at,
      (SELECT u.username FROM messages m LEFT JOIN users u ON m.sender_id = u.id WHERE m.chat_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) as last_message_sender,
      (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.created_at > COALESCE(
        (SELECT rr.read_at FROM read_receipts rr WHERE rr.message_id = m.id AND rr.user_id = ?), '1970-01-01'
      ) AND m.sender_id != ? AND m.deleted_at IS NULL) as unread_count,
      (SELECT json_object('id', pm.id, 'text', pm.text, 'sender_name', pmu.username)
       FROM messages pm LEFT JOIN users pmu ON pm.sender_id = pmu.id WHERE pm.id = c.pinned_message_id) as pinned_message_json,
      cm.is_pinned
    FROM chats c
    INNER JOIN chat_members cm ON c.id = cm.chat_id AND cm.is_active = 1
    WHERE cm.user_id = ?
    ORDER BY cm.is_pinned DESC, last_message_at DESC NULLS LAST, c.created_at DESC
  `).all(req.user.id, req.user.id, req.user.id);

  const result = chats.map((c: any) => {
    try { c.pinned_message = JSON.parse(c.pinned_message_json || 'null'); } catch { c.pinned_message = null; }
    delete c.pinned_message_json;
    return c;
  });

  res.json(result);
});

router.post('/private', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { user_id } = req.body;
  if (!user_id) { res.status(400).json({ error: 'user_id is required' }); return; }
  if (user_id === req.user.id) { res.status(400).json({ error: 'Нельзя создать чат с собой' }); return; }
  const db = getDb();

  const targetUser = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(user_id);
  if (!targetUser) { res.status(404).json({ error: 'Пользователь не найден' }); return; }

  const existing = db.prepare(`
    SELECT c.id FROM chats c
    WHERE c.type = 'private'
    AND EXISTS (SELECT 1 FROM chat_members cm WHERE cm.chat_id = c.id AND cm.user_id = ? AND cm.is_active = 1)
    AND EXISTS (SELECT 1 FROM chat_members cm WHERE cm.chat_id = c.id AND cm.user_id = ? AND cm.is_active = 1)
  `).get(req.user.id, user_id) as any;

  if (existing) { res.json({ id: existing.id, type: 'private' }); return; }

  const chatId = uuidv4();
  db.prepare('INSERT INTO chats (id, type, created_by) VALUES (?, ?, ?)').run(chatId, 'private', req.user.id);
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), chatId, req.user.id);
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), chatId, user_id);
  res.json({ id: chatId, type: 'private' });
});

// Pin message
router.post('/:chatId/pin/:messageId', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { chatId, messageId } = req.params;
  const db = getDb();
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as any;
  if (!chat) { res.status(404).json({ error: 'Chat not found' }); return; }
  if (chat.created_by !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Only creator can pin' }); return;
  }
  db.prepare('UPDATE chats SET pinned_message_id = ? WHERE id = ?').run(messageId, chatId);
  res.json({ ok: true });
});

router.delete('/:chatId/pin', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { chatId } = req.params;
  const db = getDb();
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as any;
  if (!chat) { res.status(404).json({ error: 'Chat not found' }); return; }
  if (chat.created_by !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Only creator can unpin' }); return;
  }
  db.prepare('UPDATE chats SET pinned_message_id = NULL WHERE id = ?').run(chatId);
  res.json({ ok: true });
});

// Set slow mode
router.post('/:chatId/slow-mode', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { chatId } = req.params;
  const { seconds } = req.body;
  const db = getDb();
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as any;
  if (!chat) { res.status(404).json({ error: 'Chat not found' }); return; }
  if (chat.created_by !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Only creator can set slow mode' }); return;
  }
  db.prepare('UPDATE chats SET slow_mode_seconds = ? WHERE id = ?').run(seconds || 0, chatId);
  res.json({ ok: true });
});

router.get('/:chatId/members', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { chatId } = req.params;
  const db = getDb();
  const isMember = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(chatId, req.user.id);
  if (!isMember) { res.status(403).json({ error: 'Not a member' }); return; }
  const members = db.prepare(`
    SELECT u.id, u.username, u.role, cm.role_in_chat, cm.joined_at
    FROM chat_members cm JOIN users u ON cm.user_id = u.id
    WHERE cm.chat_id = ? AND cm.is_active = 1
  `).all(chatId);
  res.json(members);
});

// Pin/unpin chat
router.post('/:chatId/pin-chat', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { chatId } = req.params;
  const db = getDb();
  db.prepare('UPDATE chat_members SET is_pinned = 1 WHERE chat_id = ? AND user_id = ?').run(chatId, req.user.id);
  res.json({ ok: true });
});

router.delete('/:chatId/pin-chat', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { chatId } = req.params;
  const db = getDb();
  db.prepare('UPDATE chat_members SET is_pinned = 0 WHERE chat_id = ? AND user_id = ?').run(chatId, req.user.id);
  res.json({ ok: true });
});

// Schedule message
router.post('/:chatId/schedule', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { chatId } = req.params;
  const { text, scheduled_at } = req.body;
  if (!text || !scheduled_at) { res.status(400).json({ error: 'text and scheduled_at required' }); return; }

  const db = getDb();
  const isMember = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(chatId, req.user.id);
  if (!isMember) { res.status(403).json({ error: 'Not a member' }); return; }

  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  db.prepare('INSERT INTO messages (id, chat_id, sender_id, type, text, scheduled_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, chatId, req.user.id, 'text', text.trim(), scheduled_at);
  res.json({ ok: true, id, scheduled_at });
});

// Send scheduled messages (called periodically)
export function sendScheduledMessages(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const scheduled = db.prepare("SELECT id, chat_id FROM messages WHERE scheduled_at IS NOT NULL AND scheduled_at <= ? AND deleted_at IS NULL").all(now) as any[];
  for (const msg of scheduled) {
    db.prepare("UPDATE chats SET updated_at = datetime('now') WHERE id = ?").run(msg.chat_id);
  }
}

export default router;
