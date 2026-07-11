// Public Server Registry
// This is a simple way for servers to discover each other

import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /registry/servers - List all registered servers
router.get('/servers', (req: Request, res: Response) => {
  const db = getDb();
  const servers = db.prepare('SELECT * FROM federation_servers WHERE is_online = 1 ORDER BY last_seen DESC').all();
  res.json(servers);
});

// POST /registry/register - Register a server
router.post('/register', (req: Request, res: Response) => {
  const { url, name, publicKey } = req.body;

  if (!url) {
    res.status(400).json({ error: 'URL required' });
    return;
  }

  const db = getDb();

  // Check if already registered
  const existing = db.prepare('SELECT id FROM federation_servers WHERE url = ?').get(url);

  if (existing) {
    // Update existing
    db.prepare('UPDATE federation_servers SET name = ?, is_online = 1, last_seen = datetime(\'now\') WHERE url = ?').run(name || url, url);
  } else {
    // Add new
    db.prepare('INSERT INTO federation_servers (id, url, name, is_online) VALUES (?, ?, ?, 1)').run(uuidv4(), url, name || url);
  }

  // Return all servers
  const servers = db.prepare('SELECT * FROM federation_servers WHERE is_online = 1').all();
  res.json({ ok: true, servers });
});

// POST /registry/heartbeat - Server heartbeat
router.post('/heartbeat', (req: Request, res: Response) => {
  const { url } = req.body;

  if (url) {
    const db = getDb();
    db.prepare('UPDATE federation_servers SET is_online = 1, last_seen = datetime(\'now\') WHERE url = ?').run(url);
  }

  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// DELETE /registry/deregister - Remove a server
router.delete('/deregister', (req: Request, res: Response) => {
  const { url } = req.body;

  if (url) {
    const db = getDb();
    db.prepare('UPDATE federation_servers SET is_online = 0 WHERE url = ?').run(url);
  }

  res.json({ ok: true });
});

export default router;
