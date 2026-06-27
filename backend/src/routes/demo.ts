import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { getDb } from '../database';
import { hashPassword } from '../password';

const router = Router();

router.post('/demo', (req: Request, res: Response) => {
  const db = getDb();

  // Find or create demo user
  let demoUser = db.prepare('SELECT id, username, role, is_active FROM users WHERE username = ?').get('demo') as any;

  if (!demoUser) {
    const id = uuidv4();
    const hash = hashPassword('demo1234');
    db.prepare('INSERT INTO users (id, username, role, is_active, password_hash) VALUES (?, ?, ?, 1, ?)').run(id, 'demo', 'user', hash);
    demoUser = { id, username: 'demo', role: 'user', is_active: 1 };

    // Create demo data
    setupDemoData(db, id);
  }

  const jwtToken = jwt.sign({ id: demoUser.id, username: demoUser.username, role: demoUser.role }, config.jwtSecret, { expiresIn: '1d' });
  res.json({ token: jwtToken, user: demoUser });
});

function createDemoWavFile(filePath: string, freq: number = 440, duration: number = 1.5): void {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.min(t * 10, 1) * Math.max(0, (duration - t) * 10);
    const sample = Math.max(-32768, Math.min(32767, Math.floor(12000 * env * Math.sin(2 * Math.PI * freq * t))));
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

function setupDemoData(db: any, demoUserId: string) {
  // Create demo bot user
  const botId = uuidv4();
  const botHash = hashPassword('bot1234');
  db.prepare('INSERT OR IGNORE INTO users (id, username, role, is_active, password_hash) VALUES (?, ?, ?, 1, ?)').run(botId, 'Бот Макс', 'user', botHash);

  // Create second user
  const user2Id = uuidv4();
  const user2Hash = hashPassword('user1234');
  db.prepare('INSERT OR IGNORE INTO users (id, username, role, is_active, password_hash) VALUES (?, ?, ?, 1, ?)').run(user2Id, 'Алиса', 'user', user2Hash);

  // Create third user
  const user3Id = uuidv4();
  const user3Hash = hashPassword('user1234');
  db.prepare('INSERT OR IGNORE INTO users (id, username, role, is_active, password_hash) VALUES (?, ?, ?, 1, ?)').run(user3Id, 'Дима', 'user', user3Hash);

  // Create private chat with bot
  const chat1Id = uuidv4();
  db.prepare('INSERT INTO chats (id, type, created_by) VALUES (?, ?, ?)').run(chat1Id, 'private', botId);
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), chat1Id, demoUserId);
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), chat1Id, botId);

  // Create private chat with Алиса
  const chat2Id = uuidv4();
  db.prepare('INSERT INTO chats (id, type, created_by) VALUES (?, ?, ?)').run(chat2Id, 'private', user2Id);
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), chat2Id, demoUserId);
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id) VALUES (?, ?, ?)').run(uuidv4(), chat2Id, user2Id);

  // Create group chat
  const chat3Id = uuidv4();
  db.prepare('INSERT INTO chats (id, type, title, created_by) VALUES (?, ?, ?, ?)').run(chat3Id, 'group', 'Рабочий чат', user3Id);
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id, role_in_chat) VALUES (?, ?, ?, ?)').run(uuidv4(), chat3Id, demoUserId, 'member');
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id, role_in_chat) VALUES (?, ?, ?, ?)').run(uuidv4(), chat3Id, botId, 'member');
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id, role_in_chat) VALUES (?, ?, ?, ?)').run(uuidv4(), chat3Id, user2Id, 'member');
  db.prepare('INSERT INTO chat_members (id, chat_id, user_id, role_in_chat) VALUES (?, ?, ?, ?)').run(uuidv4(), chat3Id, user3Id, 'admin');

  const now = new Date();

  // Demo messages for chat1 (with bot)
  const msgs1 = [
    { sender: botId, text: 'Привет! Я бот-помощник 👋', minAgo: 120 },
    { sender: demoUserId, text: 'Привет! Расскажи что умеешь', minAgo: 118 },
    { sender: botId, text: 'Я могу отвечать на вопросы и помогать с задачами. Задавай любые вопросы!', minAgo: 115 },
    { sender: demoUserId, text: 'Супер! А что по проекту?', minAgo: 60 },
    { sender: botId, text: 'Проект идёт по плану. Основные фичи готовы:\n\n✅ Личные чаты\n✅ Групповые чаты\n✅ Отправка файлов\n✅ Голосовые сообщения\n✅ Реакции на сообщения', minAgo: 55 },
    { sender: botId, text: 'Также добавлены: спойлеры, опросы, закреплённые сообщения и медленный режим 🔥', minAgo: 50 },
    { sender: demoUserId, text: 'Отлично! Спасибо за инфо', minAgo: 45 },
    { sender: botId, text: 'Рад помочь! Обращайся если что 😊', minAgo: 40 },
  ];

  // Demo messages for chat2 (with Алиса)
  const msgs2 = [
    { sender: user2Id, text: 'Привет! Как дела?', minAgo: 90 },
    { sender: demoUserId, text: 'Привет! Всё отлично, работаю над проектом', minAgo: 88 },
    { sender: user2Id, text: 'Круто! Покажешь потом?', minAgo: 85 },
    { sender: demoUserId, text: 'Конечно! Зайди завтра, покажу все фичи', minAgo: 80 },
    { sender: user2Id, text: 'Договорились! 👍', minAgo: 75 },
    { sender: user2Id, text: 'Кстати, я видела что добавили опросы — классная штука!', minAgo: 30 },
    { sender: demoUserId, text: 'Да, и还有很多 планов на будущее', minAgo: 25 },
  ];

  // Demo messages for chat3 (group)
  const msgs3 = [
    { sender: user3Id, text: 'Всем привет! Создал группу для обсуждения проекта', minAgo: 200 },
    { sender: botId, text: 'Отлично! Тут удобно будет обсуждать задачи', minAgo: 195 },
    { sender: user2Id, text: 'Согласна! Можно тут скидывать идеи', minAgo: 190 },
    { sender: demoUserId, text: 'Привет всем! Рад что мы собрались 👋', minAgo: 185 },
    { sender: user3Id, text: 'Так, по плану на сегодня:\n\n1. Доделать авторизацию\n2. Добавить звуки\n3. Проверить мобильную версию', minAgo: 100 },
    { sender: user2Id, text: 'Я могу взять мобильную версию на проверку', minAgo: 95 },
    { sender: botId, text: 'А я помогу с тестированием авторизации', minAgo: 90 },
    { sender: demoUserId, text: 'Супер, команда! Давайте 🚀', minAgo: 85 },
    { sender: user3Id, text: 'Кстати, добавил опрос по срокам. Голосуйте!', minAgo: 20 },
    { sender: botId, text: 'Проголосовал! Сроки реалистичные', minAgo: 15 },
  ];

  const insertMsg = db.prepare('INSERT INTO messages (id, chat_id, sender_id, type, text, created_at) VALUES (?, ?, ?, ?, ?, ?)');

  for (const m of msgs1) {
    const t = new Date(now.getTime() - m.minAgo * 60000);
    insertMsg.run(uuidv4(), chat1Id, m.sender, 'text', m.text, t.toISOString().replace('T', ' ').slice(0, 19));
  }
  for (const m of msgs2) {
    const t = new Date(now.getTime() - m.minAgo * 60000);
    insertMsg.run(uuidv4(), chat2Id, m.sender, 'text', m.text, t.toISOString().replace('T', ' ').slice(0, 19));
  }
  for (const m of msgs3) {
    const t = new Date(now.getTime() - m.minAgo * 60000);
    insertMsg.run(uuidv4(), chat3Id, m.sender, 'text', m.text, t.toISOString().replace('T', ' ').slice(0, 19));
  }

  // Add audio messages
  const insertFile = db.prepare('INSERT INTO files (id, original_name, stored_name, path, mime_type, size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertAudio = db.prepare('INSERT INTO messages (id, chat_id, sender_id, type, text, file_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');

  // Create demo audio files
  const audio1Path = path.join(config.uploadDir, 'demo-voice-1.wav');
  const audio2Path = path.join(config.uploadDir, 'demo-voice-2.wav');
  createDemoWavFile(audio1Path, 440, 1.5);
  createDemoWavFile(audio2Path, 660, 2);

  const audio1Id = uuidv4();
  const audio2Id = uuidv4();
  const audio1Stat = fs.statSync(audio1Path);
  const audio2Stat = fs.statSync(audio2Path);

  insertFile.run(audio1Id, 'voice-message.wav', path.basename(audio1Path), audio1Path, 'audio/wav', audio1Stat.size, botId);
  insertFile.run(audio2Id, 'voice-message.wav', path.basename(audio2Path), audio2Path, 'audio/wav', audio2Stat.size, demoUserId);

  const audio1Time = new Date(now.getTime() - 35 * 60000);
  const audio2Time = new Date(now.getTime() - 10 * 60000);
  insertAudio.run(uuidv4(), chat1Id, botId, 'audio', null, audio1Id, audio1Time.toISOString().replace('T', ' ').slice(0, 19));
  insertAudio.run(uuidv4(), chat1Id, demoUserId, 'audio', null, audio2Id, audio2Time.toISOString().replace('T', ' ').slice(0, 19));

  // Add some reactions
  const msgIds1 = db.prepare('SELECT id FROM messages WHERE chat_id = ? ORDER BY created_at').all(chat1Id) as any[];
  if (msgIds1.length > 2) {
    db.prepare('INSERT INTO reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)').run(uuidv4(), msgIds1[0].id, demoUserId, '👍');
    db.prepare('INSERT INTO reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)').run(uuidv4(), msgIds1[msgIds1.length - 2].id, demoUserId, '❤️');
    db.prepare('INSERT INTO reactions (id, message_id, user_id, emoji) VALUES (?, ?, ?, ?)').run(uuidv4(), msgIds1[msgIds1.length - 2].id, user2Id, '🔥');
  }

  // Update chat timestamps
  db.prepare("UPDATE chats SET updated_at = datetime('now') WHERE id = ?").run(chat1Id);
  db.prepare("UPDATE chats SET updated_at = datetime('now') WHERE id = ?").run(chat2Id);
  db.prepare("UPDATE chats SET updated_at = datetime('now') WHERE id = ?").run(chat3Id);
}

export default router;
