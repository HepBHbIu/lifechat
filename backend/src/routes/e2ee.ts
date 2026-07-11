import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { authMiddleware } from '../auth';
import { generateUserKeyPair, storePublicKey, getPublicKey } from '../e2ee';

const router = Router();
router.use(authMiddleware);

// POST /e2ee/keys/generate - Generate and store user keypair
router.post('/keys/generate', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const keyPair = generateUserKeyPair();
  storePublicKey(req.user.id, keyPair.publicKey);

  res.json({
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  });
});

// GET /e2ee/keys/:userId - Get user's public key
router.get('/keys/:userId', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const { userId } = req.params;
  const publicKey = getPublicKey(userId);

  if (!publicKey) {
    res.status(404).json({ error: 'Public key not found' });
    return;
  }

  res.json({ userId, publicKey });
});

// POST /e2ee/keys/upload - Upload public key
router.post('/keys/upload', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const { publicKey } = req.body;
  if (!publicKey) {
    res.status(400).json({ error: 'Public key required' });
    return;
  }

  storePublicKey(req.user.id, publicKey);
  res.json({ ok: true });
});

// GET /e2ee/keys - Get all known public keys
router.get('/keys', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const db = getDb();
  const keys = db.prepare(`
    SELECT uk.user_id, uk.public_key, u.username
    FROM user_keys uk
    JOIN users u ON uk.user_id = u.id
  `).all();

  res.json(keys);
});

export default router;
