import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware } from '../auth';
import { getRetentionConfig, updateRetentionConfig, getStorageStats } from '../retention';

const router = Router();
router.use(authMiddleware);

// GET /retention/stats - Get storage statistics
router.get('/stats', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }

  const stats = getStorageStats();
  res.json(stats);
});

// GET /retention/config - Get retention config
router.get('/config', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }

  const config = getRetentionConfig();
  res.json(config);
});

// PUT /retention/config - Update retention config
router.put('/config', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  if (req.user.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return; }

  const { key, value } = req.body;

  if (!key || value === undefined) {
    res.status(400).json({ error: 'key and value required' });
    return;
  }

  updateRetentionConfig(key, value);
  res.json({ ok: true, config: getRetentionConfig() });
});

export default router;
