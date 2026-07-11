import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { authMiddleware, adminMiddleware } from '../auth';
import {
  getLocalIdentity,
  getPeers,
  addPeer,
  removePeer,
  updatePeerStatus,
  sign,
  verify,
  registerFederatedUser,
  storeFederatedMessage,
} from '../federation';

const router = Router();

// GET /federation/info - Server info for discovery
router.get('/info', (req: Request, res: Response) => {
  const identity = getLocalIdentity();
  if (!identity) {
    res.status(500).json({ error: 'Federation not initialized' });
    return;
  }

  res.json({
    id: identity.id,
    name: identity.name,
    domain: identity.domain,
    publicKey: identity.publicKey,
    version: '1.0.0',
  });
});

// GET /federation/peers - List all known peers
router.get('/peers', (req: Request, res: Response) => {
  const peers = getPeers();
  res.json(peers);
});

// POST /federation/register - Register a new peer
router.post('/register', (req: Request, res: Response) => {
  const { url, name, publicKey } = req.body;

  if (!url) {
    res.status(400).json({ error: 'URL required' });
    return;
  }

  // Normalize URL
  const normalizedUrl = url.replace(/\/$/, '');

  // Add peer
  const peer = addPeer(normalizedUrl, name);

  // Respond with our info
  const identity = getLocalIdentity();
  res.json({
    ok: true,
    server: {
      id: identity?.id,
      name: identity?.name,
      domain: identity?.domain,
      publicKey: identity?.publicKey,
    },
    peers: getPeers(),
  });
});

// POST /federation/message - Receive a message from another server
router.post('/message', (req: Request, res: Response) => {
  const { from_server, from_user, to_chat_id, message, signature } = req.body;

  if (!from_server || !from_user || !message) {
    res.status(400).json({ error: 'Invalid message' });
    return;
  }

  // Verify signature (simplified - in production verify against peer's public key)
  // For now, just store the message

  const db = getDb();

  // Find or create federated chat
  let chat = db.prepare('SELECT id FROM chats WHERE id = ?').get(to_chat_id) as any;
  if (!chat) {
    const chatId = to_chat_id || uuidv4();
    db.prepare('INSERT OR IGNORE INTO chats (id, type, title, created_by) VALUES (?, ?, ?, ?)').run(
      chatId,
      'federated',
      `Federated: ${from_user}`,
      'system'
    );
  }

  // Store message
  const msgId = storeFederatedMessage(
    to_chat_id || uuidv4(),
    from_user,
    message.type || 'text',
    message.text,
    message.file_url
  );

  // Broadcast to local WebSocket clients if they're in this chat
  // (handled by websocket.ts)

  res.json({ ok: true, message_id: msgId });
});

// POST /federation/sync - Full sync with a peer
router.post('/sync', (req: Request, res: Response) => {
  const { since } = req.body;

  const db = getDb();

  // Get recent federated messages
  const messages = db.prepare(`
    SELECT * FROM federation_messages
    WHERE created_at > COALESCE(?, '1970-01-01')
    ORDER BY created_at DESC
    LIMIT 100
  `).all(since || null);

  // Get federated users
  const users = db.prepare('SELECT * FROM federation_users').all();

  res.json({
    messages: messages.reverse(),
    users,
    server_time: new Date().toISOString(),
  });
});

// POST /federation/heartbeat - Check if peer is alive
router.post('/heartbeat', (req: Request, res: Response) => {
  const { url } = req.body;

  if (url) {
    updatePeerStatus(url, true);
  }

  const identity = getLocalIdentity();
  res.json({
    ok: true,
    server_id: identity?.id,
    timestamp: new Date().toISOString(),
  });
});

// GET /federation/users - List all known users (federated + local)
router.get('/users', (req: Request, res: Response) => {
  const db = getDb();

  const localUsers = db.prepare('SELECT id, username FROM users WHERE is_active = 1').all();
  const federatedUsers = db.prepare('SELECT * FROM federation_users').all();

  const identity = getLocalIdentity();

  const allUsers = [
    ...localUsers.map((u: any) => ({
      id: u.id,
      username: u.username,
      full_id: `${u.username}@${identity?.domain || 'local'}`,
      is_local: true,
    })),
    ...federatedUsers.map((u: any) => ({
      id: u.user_id,
      username: u.username,
      full_id: u.full_id,
      is_local: false,
      server_id: u.server_id,
    })),
  ];

  res.json(allUsers);
});

// POST /federation/discover - Discover peers from a known peer
router.post('/discover', async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url) {
    res.status(400).json({ error: 'URL required' });
    return;
  }

  try {
    const response = await fetch(`${url}/federation/peers`);
    const peers = await response.json();

    // Add discovered peers
    for (const peer of peers as any[]) {
      if (peer.url) {
        addPeer(peer.url, peer.name);
      }
    }

    res.json({ ok: true, discovered: peers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to discover peers' });
  }
});

export default router;
