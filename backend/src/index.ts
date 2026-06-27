import express from 'express';
import cors from 'cors';
import multer from 'multer';
import http from 'http';
import fs from 'fs';
import { config } from './config';
import { initializeDatabase, getDb, cleanupAutoDeleteMessages } from './database';
import { upload } from './upload';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import adminRoutes from './routes/admin';
import chatsRoutes from './routes/chats';
import messagesRoutes from './routes/messages';
import filesRoutes from './routes/files';
import pollsRoutes from './routes/polls';
import settingsRoutes from './routes/settings';
import demoRoutes from './routes/demo';
import { setupWebSocket } from './websocket';

const app = express();
const server = http.createServer(app);

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(config.uploadDir));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/polls', pollsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/demo', demoRoutes);

// Auto-delete cleanup every 30 seconds
setInterval(cleanupAutoDeleteMessages, 30000);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: 'Файл слишком большой' });
      return;
    }
  }
  if (err.message === 'File type not allowed') {
    res.status(400).json({ error: 'Тип файла не разрешён' });
    return;
  }
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

initializeDatabase();

const db = getDb();
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const { v4: uuidv4 } = require('uuid');
  const adminId = uuidv4();
  db.prepare('INSERT INTO users (id, username, role, is_active) VALUES (?, ?, ?, ?)').run(adminId, 'admin', 'admin', 1);
  console.log('=================================');
  console.log('Admin user created!');
  console.log(`Admin token: ${config.adminToken}`);
  console.log('=================================');
}

setupWebSocket(server);

server.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`WebSocket available at ws://localhost:${config.port}/ws`);
});
