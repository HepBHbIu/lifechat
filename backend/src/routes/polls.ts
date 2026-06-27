import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { authMiddleware } from '../auth';

const router = Router();
router.use(authMiddleware);

// Create poll (as a message)
router.post('/:chatId/polls', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { chatId } = req.params;
  const { question, choices, is_anonymous, allows_multiple } = req.body;
  if (!question || !choices || !Array.isArray(choices) || choices.length < 2) {
    res.status(400).json({ error: 'Вопрос и минимум 2 варианта ответа' }); return;
  }

  const db = getDb();
  const isMember = db.prepare('SELECT id FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1').get(chatId, req.user.id);
  if (!isMember) { res.status(403).json({ error: 'Not a member' }); return; }

  const msgId = uuidv4();
  const pollId = uuidv4();

  db.prepare('INSERT INTO messages (id, chat_id, sender_id, type, text) VALUES (?, ?, ?, ?, ?)').run(msgId, chatId, req.user.id, 'poll', question);
  db.prepare('INSERT INTO polls (id, message_id, question, is_anonymous, allows_multiple) VALUES (?, ?, ?, ?, ?)').run(pollId, msgId, question, is_anonymous ? 1 : 0, allows_multiple ? 1 : 0);

  const insertChoice = db.prepare('INSERT INTO poll_choices (id, poll_id, text, sort_order) VALUES (?, ?, ?, ?)');
  choices.forEach((text: string, i: number) => {
    insertChoice.run(uuidv4(), pollId, text, i);
  });

  db.prepare(`UPDATE chats SET updated_at = datetime('now') WHERE id = ?`).run(chatId);

  const poll = getPollData(db, pollId);
  res.json({ message_id: msgId, poll });
});

// Vote
router.post('/:pollId/vote', (req: Request, res: Response) => {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
  const { pollId } = req.params;
  const { choice_id } = req.body;
  if (!choice_id) { res.status(400).json({ error: 'choice_id required' }); return; }

  const db = getDb();
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as any;
  if (!poll) { res.status(404).json({ error: 'Poll not found' }); return; }

  if (!poll.allows_multiple) {
    db.prepare('DELETE FROM poll_votes WHERE poll_id = ? AND user_id = ?').run(pollId, req.user.id);
  }

  const existing = db.prepare('SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ? AND choice_id = ?').get(pollId, req.user.id, choice_id);
  if (existing) {
    db.prepare('DELETE FROM poll_votes WHERE id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO poll_votes (id, poll_id, choice_id, user_id) VALUES (?, ?, ?, ?)').run(uuidv4(), pollId, choice_id, req.user.id);
  }

  const updated = getPollData(db, pollId);
  res.json(updated);
});

function getPollData(db: any, pollId: string) {
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as any;
  if (!poll) return null;
  const choices = db.prepare('SELECT * FROM poll_choices WHERE poll_id = ? ORDER BY sort_order').all(pollId) as any[];
  const votes = db.prepare('SELECT pv.choice_id, pv.user_id, u.username FROM poll_votes pv LEFT JOIN users u ON pv.user_id = u.id WHERE pv.poll_id = ?').all(pollId) as any[];

  return {
    ...poll,
    choices: choices.map(c => ({
      ...c,
      vote_count: votes.filter(v => v.choice_id === c.id).length,
      voters: votes.filter(v => v.choice_id === c.id).map(v => v.username),
    })),
    total_votes: votes.length,
  };
}

export { getPollData };
export default router;
