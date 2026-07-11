import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { config } from '../config';

const router = Router();

// GET /qr/:text - Generate QR code for any text
router.get('/:text', async (req: Request, res: Response) => {
  const { text } = req.params;

  try {
    const qr = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    res.json({ qr, text });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

// GET /qr/user/:username/:server - Generate QR for user address
router.get('/user/:username/:server', async (req: Request, res: Response) => {
  const { username, server } = req.params;
  const address = `${username}@${server}`;

  try {
    const qr = await QRCode.toDataURL(address, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    res.json({ qr, address });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

// GET /qr/chat/:chatId - Generate QR for chat
router.get('/chat/:chatId', async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const url = `${config.corsOrigins[0]}/chat/${chatId}`;

  try {
    const qr = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    res.json({ qr, url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

export default router;
