import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  username?: string;
  role?: string;
  chatId?: string;
  isAlive?: boolean;
}

const clients = new Map<string, Set<AuthenticatedSocket>>();

export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedSocket, req) => {
    ws.isAlive = true;

    const authTimeout = setTimeout(() => {
      if (!ws.userId) {
        ws.close(4002, 'Auth timeout');
      }
    }, 10000);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (!ws.userId) {
          if (msg.type === 'auth' && msg.token) {
            try {
              const decoded = jwt.verify(msg.token, config.jwtSecret) as any;
              const db = getDb();
              const user = db.prepare('SELECT id, username, role, is_active FROM users WHERE id = ?').get(decoded.id) as any;
              if (!user || !user.is_active) {
                ws.close(4001, 'User not found or inactive');
                clearTimeout(authTimeout);
                return;
              }
              ws.userId = user.id;
              ws.username = user.username;
              ws.role = user.role;
              clearTimeout(authTimeout);

              if (!clients.has(user.id)) {
                clients.set(user.id, new Set());
              }
              clients.get(user.id)!.add(ws);

              const showOnline = db.prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'show_online'").get(user.id) as any;
              if (!showOnline || showOnline.value !== 'off') {
                broadcastToAll({ type: 'user_online', userId: user.id, username: user.username });
              }

              ws.send(JSON.stringify({ type: 'auth_ok', userId: user.id }));
            } catch {
              ws.close(4001, 'Invalid token');
            }
          } else {
            ws.close(4003, 'Expected auth message');
          }
          return;
        }

        handleMessage(ws, msg);
      } catch {}
    });

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      if (!ws.userId) return;
      const userClients = clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          clients.delete(ws.userId);
          const db = getDb();
          const showOnline = db.prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'show_online'").get(ws.userId) as any;
          if (!showOnline || showOnline.value !== 'off') {
            broadcastToAll({ type: 'user_offline', userId: ws.userId, username: ws.username });
          }
        }
      }
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedSocket) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
}

function handleMessage(ws: AuthenticatedSocket, msg: any): void {
  const db = getDb();

  switch (msg.type) {
    case 'join_chat': {
      ws.chatId = msg.chatId;
      const isMember = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(msg.chatId, ws.userId);
      if (isMember) {
        ws.send(JSON.stringify({ type: 'joined_chat', chatId: msg.chatId }));
      }
      break;
    }
    case 'leave_chat': {
      ws.chatId = undefined;
      break;
    }
    case 'send_message': {
      const { chatId, text, reply_to_id, is_spoiler, auto_delete_seconds } = msg;
      if (!chatId || !text || !text.trim()) break;
      const isMember = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(chatId, ws.userId);
      if (!isMember) break;

      const id = uuidv4();
      const autoDeleteAt = auto_delete_seconds ? new Date(Date.now() + auto_delete_seconds * 1000).toISOString().replace('T', ' ').replace('Z', '') : null;
      db.prepare('INSERT INTO messages (id, chat_id, sender_id, type, text, reply_to_id, is_spoiler, auto_delete_seconds, auto_delete_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, chatId, ws.userId, 'text', text.trim(), reply_to_id || null, is_spoiler ? 1 : 0, auto_delete_seconds || null, autoDeleteAt);
      db.prepare(`UPDATE chats SET updated_at = datetime('now') WHERE id = ?`).run(chatId);

      const message = db.prepare(`
        SELECT m.*, u.username as sender_name,
          (SELECT json_object('id', rm.id, 'text', rm.text, 'sender_name', rmu.username, 'type', rm.type)
           FROM messages rm LEFT JOIN users rmu ON rm.sender_id = rmu.id WHERE rm.id = m.reply_to_id) as reply_to_json,
          (SELECT json_object('username', fmu.username) FROM users fmu WHERE fmu.id = m.forwarded_from_id) as forwarded_from_json
        FROM messages m LEFT JOIN users u ON m.sender_id = u.id WHERE m.id = ?
      `).get(id) as any;
      if (message) {
        try { message.reply_to = JSON.parse(message.reply_to_json || 'null'); } catch { message.reply_to = null; }
        try { message.forwarded_from = JSON.parse(message.forwarded_from_json || 'null'); } catch { message.forwarded_from = null; }
        delete message.reply_to_json;
        delete message.forwarded_from_json;
        message.reactions = [];
      }

      broadcastToChat(chatId, { type: 'new_message', message });
      break;
    }
    case 'send_file_message': {
      const { chatId: cid, messageId } = msg;
      if (!cid || !messageId) break;
      const isMember = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(cid, ws.userId);
      if (!isMember) break;
      const message = db.prepare(`
        SELECT m.*, u.username as sender_name,
          f.original_name, f.path as file_path, f.mime_type, f.size as file_size,
          (SELECT json_group_array(json_object('emoji', r.emoji, 'user_id', r.user_id, 'username', ru.username))
           FROM reactions r LEFT JOIN users ru ON r.user_id = ru.id WHERE r.message_id = m.id) as reactions_json,
          (SELECT json_object('id', rm.id, 'text', rm.text, 'sender_name', rmu.username, 'type', rm.type)
           FROM messages rm LEFT JOIN users rmu ON rm.sender_id = rmu.id WHERE rm.id = m.reply_to_id) as reply_to_json
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        LEFT JOIN files f ON m.file_id = f.id
        WHERE m.id = ?
      `).get(messageId) as any;
      if (message) {
        try { message.reactions = JSON.parse(message.reactions_json || '[]').filter((r: any) => r.emoji); } catch { message.reactions = []; }
        try { message.reply_to = JSON.parse(message.reply_to_json || 'null'); } catch { message.reply_to = null; }
        delete message.reactions_json;
        delete message.reply_to_json;
        broadcastToChat(cid, { type: 'new_message', message });
      }
      break;
    }
    case 'typing': {
      const { chatId: tChatId } = msg;
      if (!tChatId) break;
      broadcastToChat(tChatId, { type: 'user_typing', userId: ws.userId, username: ws.username, chatId: tChatId }, ws.userId);
      break;
    }
    case 'read_messages': {
      const { chatId: rChatId } = msg;
      if (!rChatId) break;
      const lastMsg = db.prepare('SELECT id FROM messages WHERE chat_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1').get(rChatId) as any;
      if (lastMsg) {
        db.prepare(`INSERT OR REPLACE INTO read_receipts (id, message_id, user_id, read_at) VALUES (?, ?, ?, datetime('now'))`).run(
          uuidv4(), lastMsg.id, ws.userId
        );
      }
      break;
    }
  }
}

function sendPushNotification(userId: string, payload: { title: string; body: string; tag?: string; icon?: string; url?: string }): void {
  if (!config.vapidPublicKey || !config.vapidPrivateKey) return;

  const db = getDb();
  const subscriptions = db.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?').all(userId) as any[];

  const webPush = require('web-push');
  webPush.setVapidDetails(config.vapidEmail, config.vapidPublicKey, config.vapidPrivateKey);

  for (const sub of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      webPush.sendNotification(pushSubscription, JSON.stringify(payload)).catch((err: any) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
        }
      });
    } catch {}
  }
}

function broadcastToChat(chatId: string, message: any, excludeUserId?: string): void {
  const db = getDb();
  const members = db.prepare('SELECT user_id FROM chat_members WHERE chat_id = ? AND is_active = 1').all(chatId) as any[];

  const chat = db.prepare('SELECT title, type FROM chats WHERE id = ?').get(chatId) as any;
  const chatTitle = chat?.title || chatId;

  for (const member of members) {
    if (excludeUserId && member.user_id === excludeUserId) continue;
    const sockets = clients.get(member.user_id);

    if (sockets && sockets.size > 0) {
      for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(message));
        }
      }
    } else {
      sendPushNotification(member.user_id, {
        title: chatTitle,
        body: message.message?.text || message.type === 'new_message' ? (message.message?.text || 'Новое сообщение') : 'Новое событие',
        tag: `chat-${chatId}`,
        icon: '/icon-192.png',
        url: '/',
      });
    }
  }
}

function broadcastToAll(message: any): void {
  for (const [, sockets] of clients) {
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    }
  }
}

export { broadcastToChat };
