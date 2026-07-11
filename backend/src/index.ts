import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import http from 'http';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { initializeDatabase, getDb, cleanupAutoDeleteMessages } from './database';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import adminRoutes from './routes/admin';
import chatsRoutes, { sendScheduledMessages } from './routes/chats';
import messagesRoutes from './routes/messages';
import filesRoutes from './routes/files';
import pollsRoutes from './routes/polls';
import settingsRoutes from './routes/settings';
import demoRoutes from './routes/demo';
import gifRoutes from './routes/gif';
import linkPreviewRoutes from './routes/linkpreview';
import pushRoutes from './routes/push';
import roomsRoutes from './routes/rooms';
import federationRoutes from './routes/federation';
import e2eeRoutes from './routes/e2ee';
import inviteRoutes from './routes/invite';
import registryRoutes from './routes/registry';
import retentionRoutes from './routes/retention';
import { setupWebSocket } from './websocket';
import { initFederation } from './federation';
import { initE2EE } from './e2ee';
import { initDiscovery } from './discovery';
import { initRetention, runCleanup } from './retention';

const app = express();
const server = http.createServer(app);

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(config.uploadDir));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/polls', pollsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/gif', gifRoutes);
app.use('/api/linkpreview', linkPreviewRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/federation', federationRoutes);
app.use('/api/e2ee', e2eeRoutes);
app.use('/api/invite', inviteRoutes);
app.use('/registry', registryRoutes);
app.use('/api/retention', retentionRoutes);

// Periodic cleanup
setInterval(cleanupAutoDeleteMessages, 30000);
setInterval(cleanupPendingUsers, 60000);
setInterval(sendScheduledMessages, 30000);
setInterval(runCleanup, 3600000); // Run retention cleanup every hour

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') { res.status(413).json({ error: 'Файл слишком большой' }); return; }
  }
  if (err.message === 'File type not allowed') { res.status(400).json({ error: 'Тип файла не разрешён' }); return; }
  res.status(500).json({ error: err.message || 'Внутренняя ошибка' });
});

initializeDatabase();

// Initialize E2EE
initE2EE();

// Initialize retention
initRetention();

// Initialize federation
if (config.federationEnabled) {
  const identity = initFederation(config.federationName, config.federationDomain);
  console.log('=================================');
  console.log('Federation ENABLED');
  console.log(`Server: ${identity.name} (${identity.domain})`);
  console.log(`ID: ${identity.id}`);
  if (config.seedPeers.length > 0) {
    console.log(`Seed peers: ${config.seedPeers.join(', ')}`);
  }
  console.log('=================================');

  // Initialize network discovery
  const localUrl = `http://localhost:${config.port}`;
  initDiscovery(localUrl, identity).catch(console.error);
}

const db = getDb();
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const adminId = uuidv4();
  db.prepare('INSERT INTO users (id, username, role, is_active) VALUES (?, ?, ?, ?)').run(adminId, 'admin', 'admin', 1);
  console.log('=================================');
  console.log('Admin user created!');
  console.log('Set ADMIN_TOKEN in .env and use it for admin API access.');
  if (isTelegramBotEnabled()) console.log('Telegram bot: ENABLED');
  console.log('=================================');
}

setupWebSocket(server);

server.listen(config.port, () => {
  console.log(`EchoChat server running on http://localhost:${config.port}`);
  console.log(`WebSocket: ws://localhost:${config.port}/ws`);
});
