import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from './password';

interface PendingUser {
  chatId: number;
  username: string;
  firstName: string;
  token: string;
  createdAt: Date;
}

const pendingUsers = new Map<number, PendingUser>();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export function isTelegramBotEnabled(): boolean {
  return !!BOT_TOKEN;
}

export function getTelegramBotToken(): string {
  return BOT_TOKEN;
}

// Generate activation token for a Telegram user
export function generateActivationToken(telegramChatId: number, username: string, firstName: string): string {
  const token = uuidv4().slice(0, 8).toUpperCase();
  pendingUsers.set(telegramChatId, { chatId: telegramChatId, username, firstName, token, createdAt: new Date() });
  return token;
}

// Activate user with token
export function activateUser(activationToken: string): { success: boolean; username?: string; password?: string; error?: string } {
  const db = getDb();

  // Find pending user
  let pendingUser: PendingUser | null = null;
  for (const [chatId, user] of pendingUsers) {
    if (user.token === activationToken) {
      pendingUser = user;
      break;
    }
  }

  if (!pendingUser) {
    return { success: false, error: 'Токен не найден или истёк' };
  }

  // Check if user already exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(pendingUser.username);
  if (existing) {
    return { success: false, error: 'Пользователь уже существует' };
  }

  // Create user with random password
  const id = uuidv4();
  const password = uuidv4().slice(0, 12);
  const passwordHash = hashPassword(password);

  db.prepare('INSERT INTO users (id, username, role, is_active, password_hash) VALUES (?, ?, ?, 1, ?)').run(
    id, pendingUser.username, 'user', passwordHash
  );

  // Cleanup
  pendingUsers.delete(pendingUser.chatId);

  return { success: true, username: pendingUser.username, password };
}

// Cleanup old pending users (older than 1 hour)
export function cleanupPendingUsers(): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [chatId, user] of pendingUsers) {
    if (user.createdAt < oneHourAgo) {
      pendingUsers.delete(chatId);
    }
  }
}

// Telegram Bot API helpers
export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch {}
}

export function getPendingUsersCount(): number {
  return pendingUsers.size;
}
