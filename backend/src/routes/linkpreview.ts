import { Router, Request, Response } from 'express';
import { authMiddleware } from '../auth';

const router = Router();
router.use(authMiddleware);

async function fetchUrlPreview(url: string): Promise<{ title?: string; description?: string; image?: string; url: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EchoChat/1.0)',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return { url };

    const html = await response.text();
    const result: { title?: string; description?: string; image?: string; url: string } = { url };

    const getMetaContent = (pattern: RegExp): string | undefined => {
      const match = html.match(pattern);
      return match?.[1]?.trim();
    };

    result.title = getMetaContent(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i)
      || getMetaContent(/<meta[^>]*name="title"[^>]*content="([^"]*)"/i)
      || getMetaContent(/<title>([^<]*)<\/title>/i);

    result.description = getMetaContent(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i)
      || getMetaContent(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i);

    result.image = getMetaContent(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i)
      || getMetaContent(/<meta[^>]*name="twitter:image"[^>]*content="([^"]*)"/i);

    if (result.image && !result.image.startsWith('http')) {
      const baseUrl = new URL(url);
      result.image = `${baseUrl.origin}${result.image.startsWith('/') ? '' : '/'}${result.image}`;
    }

    return result;
  } catch {
    return { url };
  }
}

router.post('/preview', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'URL required' });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  const preview = await fetchUrlPreview(url);
  res.json(preview);
});

export default router;
