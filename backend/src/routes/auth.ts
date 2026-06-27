import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { getDb } from '../database';
import { authMiddleware } from '../auth';
import { hashPassword, verifyPassword } from '../password';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  const { username, password, invite_code } = req.body;
  if (!username || !password) { res.status(400).json({ error: 'Введите логин и пароль' }); return; }
  if (password.length < 4) { res.status(400).json({ error: 'Пароль минимум 4 символа' }); return; }
  if (invite_code !== config.inviteCode) { res.status(403).json({ error: 'Неверный инвайт-код' }); return; }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) { res.status(409).json({ error: 'Логин уже занят' }); return; }

  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  const passwordHash = hashPassword(password);
  db.prepare('INSERT INTO users (id, username, role, is_active, password_hash) VALUES (?, ?, ?, 1, ?)').run(id, username, 'user', passwordHash);

  const jwtToken = jwt.sign({ id, username, role: 'user' }, config.jwtSecret, { expiresIn: '30d' });
  res.json({ token: jwtToken, user: { id, username, role: 'user', is_active: 1 } });
});

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) { res.status(400).json({ error: 'Введите логин и пароль' }); return; }

  const db = getDb();
  const user = db.prepare('SELECT id, username, role, is_active, password_hash FROM users WHERE username = ?').get(username) as any;

  if (!user) { res.status(401).json({ error: 'Неверный логин или пароль' }); return; }
  if (!user.is_active) { res.status(403).json({ error: 'Аккаунт отключён' }); return; }

  if (!user.password_hash) {
    if (password.length < 4) { res.status(400).json({ error: 'Пароль минимум 4 символа' }); return; }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), user.id);
  } else {
    if (!verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Неверный логин или пароль' }); return;
    }
  }

  db.prepare(`UPDATE users SET last_seen_at = datetime('now') WHERE id = ?`).run(user.id);
  const jwtToken = jwt.sign({ id: user.id, username: user.username, role: user.role }, config.jwtSecret, { expiresIn: '30d' });
  res.json({ token: jwtToken, user: { id: user.id, username: user.username, role: user.role, is_active: user.is_active } });
});

router.post('/refresh', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const jwtToken = jwt.sign({ id: req.user.id, username: req.user.username, role: req.user.role }, config.jwtSecret, { expiresIn: '30d' });
  res.json({ token: jwtToken });
});

router.post('/logout', (_req: Request, res: Response) => { res.json({ ok: true }); });

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const db = getDb();
  const user = db.prepare('SELECT id, username, role, is_active, created_at, last_seen_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

export default router;
