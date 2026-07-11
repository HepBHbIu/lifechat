import { Router, Request, Response } from 'express';
import { authMiddleware } from '../auth';

const router = Router();
router.use(authMiddleware);

const TENOR_KEY = process.env.TENOR_API_KEY || '';

router.get('/search', async (req: Request, res: Response) => {
  if (!TENOR_KEY) {
    res.status(500).json({ error: 'TENOR_API_KEY not configured' });
    return;
  }

  const { q = 'trending', limit = '20' } = req.query;
  try {
    const url = q === 'trending'
      ? `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=${limit}&media_filter=gif`
      : `https://tenor.googleapis.com/v2/search?key=${TENOR_KEY}&q=${encodeURIComponent(q as string)}&limit=${limit}&media_filter=gif`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch GIFs' });
  }
});

export default router;
