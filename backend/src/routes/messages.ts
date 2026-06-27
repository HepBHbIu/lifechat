import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { authMiddleware } from '../auth';
import { upload } from '../upload';

const router = Router();
router.use(authMiddleware);

const MSG_SELECT = `
  SELECT m.*, u.username as sender_name,
    f.original_name, f.path as file_path, f.mime_type, f.size as file_size,
    (SELECT json_group_array(json_object('emoji', r.emoji, 'user_id', r.user_id, 'username', ru.username))
     FROM reactions r LEFT JOIN users ru ON r.user_id = ru.id WHERE r.message_id = m.id) as reactions_json,
    (SELECT json_object('id', rm.id, 'text', rm.text, 'sender_name', rmu.username, 'type', rm.type)
     FROM messages rm LEFT JOIN users rmu ON rm.sender_id = rmu.id WHERE rm.id = m.reply_to_id) as reply_to_json,
    (SELECT json_object('username', fmu.username) FROM users fmu WHERE fmu.id = m.forwarded_from_id) as forwarded_from_json
`;

function parseMsgReactions(msg: any) {
  if (!msg) return msg;
  try { msg.reactions = JSON.parse(msg.reactions_json || '[]').filter((r: any) => r.emoji); } catch { msg.reactions = []; }
  delete msg.reactions_json;
  try { msg.reply_to = JSON.parse(msg.reply_to_json || 'null'); } catch { msg.reply_to = null; }
  delete msg.reply_to_json;
  try { msg.forwarded_from = JSON.parse(msg.forwarded_from_json || 'null'); } catch { msg.forwarded_from = null; }
  delete msg.forwarded_from_json;
  return msg;
}

// GET messages
router.get('/:chatId/messages', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { chatId } = req.params;
  const { before, limit = '50' } = req.query;
  const db = getDb();

  const isMember = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(chatId, req.user.id);
  if (!isMember) { res.status(403).json({ error: 'Not a member of this chat' }); return; }

  let query = `${MSG_SELECT} FROM messages m LEFT JOIN users u ON m.sender_id = u.id LEFT JOIN files f ON m.file_id = f.id WHERE m.chat_id = ? AND m.deleted_at IS NULL`;
  const params: any[] = [chatId];
  if (before) { query += ' AND m.created_at < ?'; params.push(before); }
  query += ' ORDER BY m.created_at DESC LIMIT ?';
  params.push(parseInt(limit as string, 10));

  const messages = db.prepare(query).all(...params).map(parseMsgReactions);
  res.json(messages.reverse());
});

// Search messages
router.get('/:chatId/search', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { chatId } = req.params;
  const { q } = req.query;
  if (!q || typeof q !== 'string') { res.status(400).json({ error: 'Query required' }); return; }
  const db = getDb();

  const isMember = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(chatId, req.user.id);
  if (!isMember) { res.status(403).json({ error: 'Not a member' }); return; }

  const messages = db.prepare(`${MSG_SELECT} FROM messages m LEFT JOIN users u ON m.sender_id = u.id LEFT JOIN files f ON m.file_id = f.id WHERE m.chat_id = ? AND m.deleted_at IS NULL AND m.text LIKE ? ORDER BY m.created_at DESC LIMIT 50`)
    .all(chatId, `%${q}%`).map(parseMsgReactions);
  res.json(messages);
});

// POST text message
router.post('/:chatId/messages', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { chatId } = req.params;
  const { text, reply_to_id, is_spoiler, auto_delete_seconds } = req.body;
  if (!text || !text.trim()) { res.status(400).json({ error: 'Text is required' }); return; }

  const db = getDb();
  const isMember = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(chatId, req.user.id);
  if (!isMember) { res.status(403).json({ error: 'Not a member' }); return; }

  // Slow mode check
  const chat = db.prepare('SELECT slow_mode_seconds FROM chats WHERE id = ?').get(chatId) as any;
  if (chat && chat.slow_mode_seconds > 0) {
    const lastMsg = db.prepare("SELECT created_at FROM messages WHERE chat_id = ? AND sender_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1").get(chatId, req.user.id) as any;
    if (lastMsg) {
      const diff = (Date.now() - new Date(lastMsg.created_at + 'Z').getTime()) / 1000;
      if (diff < chat.slow_mode_seconds) {
        const wait = Math.ceil(chat.slow_mode_seconds - diff);
        res.status(429).json({ error: `Медленный режим. Подождите ${wait}с` });
        return;
      }
    }
  }

  const id = uuidv4();
  const autoDeleteAt = auto_delete_seconds ? new Date(Date.now() + auto_delete_seconds * 1000).toISOString().replace('T', ' ').replace('Z', '') : null;
  db.prepare('INSERT INTO messages (id, chat_id, sender_id, type, text, reply_to_id, is_spoiler, auto_delete_seconds, auto_delete_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, chatId, req.user.id, 'text', text.trim(), reply_to_id || null, is_spoiler ? 1 : 0, auto_delete_seconds || null, autoDeleteAt
  );
  db.prepare(`UPDATE chats SET updated_at = datetime('now') WHERE id = ?`).run(chatId);

  const message = parseMsgReactions(db.prepare(`${MSG_SELECT} FROM messages m LEFT JOIN users u ON m.sender_id = u.id LEFT JOIN files f ON m.file_id = f.id WHERE m.id = ?`).get(id));
  res.json(message);
});

// POST file message
router.post('/:chatId/messages/file', upload.single('file'), (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  const { chatId } = req.params;
  const { text } = req.body;
  const db = getDb();

  const isMember = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(chatId, req.user.id);
  if (!isMember) { res.status(403).json({ error: 'Not a member' }); return; }

  const fileId = uuidv4();
  db.prepare('INSERT INTO files (id, original_name, stored_name, path, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    fileId, req.file.originalname, req.file.filename, req.file.path, req.file.mimetype, req.file.size, req.user.id
  );

  let msgType = 'file';
  if (req.file.mimetype.startsWith('image/')) msgType = 'image';
  else if (req.file.mimetype.startsWith('audio/')) msgType = 'audio';

  const id = uuidv4();
  db.prepare('INSERT INTO messages (id, chat_id, sender_id, type, text, file_id) VALUES (?, ?, ?, ?, ?, ?)').run(id, chatId, req.user.id, msgType, text || null, fileId);
  db.prepare(`UPDATE chats SET updated_at = datetime('now') WHERE id = ?`).run(chatId);

  const message = parseMsgReactions(db.prepare(`${MSG_SELECT} FROM messages m LEFT JOIN users u ON m.sender_id = u.id LEFT JOIN files f ON m.file_id = f.id WHERE m.id = ?`).get(id));
  res.json(message);
});

// PATCH edit message
router.patch('/:messageId', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { messageId } = req.params;
  const { text } = req.body;
  if (!text || !text.trim()) { res.status(400).json({ error: 'Text required' }); return; }

  const db = getDb();
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as any;
  if (!msg) { res.status(404).json({ error: 'Not found' }); return; }
  if (msg.sender_id !== req.user.id) { res.status(403).json({ error: 'Cannot edit' }); return; }

  db.prepare(`UPDATE messages SET text = ?, edited_at = datetime('now') WHERE id = ?`).run(text.trim(), messageId);
  const message = parseMsgReactions(db.prepare(`${MSG_SELECT} FROM messages m LEFT JOIN users u ON m.sender_id = u.id LEFT JOIN files f ON m.file_id = f.id WHERE m.id = ?`).get(messageId));
  res.json(message);
});

// POST forward message
router.post('/:messageId/forward', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { messageId } = req.params;
  const { to_chat_id } = req.body;
  if (!to_chat_id) { res.status(400).json({ error: 'to_chat_id required' }); return; }

  const db = getDb();
  const original = db.prepare('SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL').get(messageId) as any;
  if (!original) { res.status(404).json({ error: 'Not found' }); return; }

  const isMember = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(to_chat_id, req.user.id);
  if (!isMember) { res.status(403).json({ error: 'Not a member of target chat' }); return; }

  const id = uuidv4();
  db.prepare('INSERT INTO messages (id, chat_id, sender_id, type, text, file_id, forwarded_from_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, to_chat_id, req.user.id, original.type, original.text, original.file_id, original.sender_id
  );
  db.prepare(`UPDATE chats SET updated_at = datetime('now') WHERE id = ?`).run(to_chat_id);

  const message = parseMsgReactions(db.prepare(`${MSG_SELECT} FROM messages m LEFT JOIN users u ON m.sender_id = u.id LEFT JOIN files f ON m.file_id = f.id WHERE m.id = ?`).get(id));
  res.json(message);
});

// POST toggle reaction
router.post('/:messageId/reactions', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { messageId } = req.params;
  const { emoji } = req.body;
  if (!emoji) { res.status(400).json({ error: 'emoji required' }); return; }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM reactions WHERE message_id = ? AND user_id = ?').get(messageId, req.user.id) as any;

  if (existing && existing.emoji === emoji) {
    db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
  } else if (existing) {
    db.prepare('UPDATE reactions SET emoji = ? WHERE id = ?').run(emoji, existing.id);
  } else {
    db.prepare('INSERT INTO reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)').run(uuidv4(), messageId, req.user.id, emoji);
  }

  const reactions = db.prepare(`SELECT r.emoji, r.user_id, u.username FROM reactions r LEFT JOIN users u ON r.user_id = u.id WHERE r.message_id = ?`).all(messageId);
  res.json({ reactions });
});

// DELETE message
router.delete('/:messageId', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { messageId } = req.params;
  const db = getDb();
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as any;
  if (!msg) { res.status(404).json({ error: 'Not found' }); return; }
  if (msg.sender_id !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Cannot delete' }); return;
  }
  db.prepare(`UPDATE messages SET deleted_at = datetime('now'), text = NULL, file_id = NULL WHERE id = ?`).run(messageId);
  res.json({ ok: true });
});

export default router;
