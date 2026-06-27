import { useState, useEffect } from 'react';
import { Poll } from '../types';
import { api } from '../api/client';

export default function PollBubble({ messageId, currentUserId }: { messageId: string; currentUserId: string }) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch poll data from message context
    // Poll is embedded in the message's text as JSON for now
    api.getMessages(messageId.split('-')[0]).catch(() => {}).finally(() => setLoading(false));
  }, [messageId]);

  if (loading) {
    return (
      <div className="p-3 rounded-xl min-w-[200px]" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex gap-1.5">
          {[0, 0.1, 0.2].map((d, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)', animation: `pulse 1s infinite ${d}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="p-3 rounded-xl min-w-[200px]" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="text-sm font-medium mb-2">Опрос</div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Нет данных</div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl min-w-[220px]" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="text-sm font-medium mb-3">{poll.question}</div>
      <div className="space-y-2">
        {poll.choices.map((choice) => {
          const pct = poll.total_votes > 0 ? (choice.vote_count / poll.total_votes) * 100 : 0;
          const isSelected = choice.voters.includes(currentUserId);
          return (
            <button key={choice.id} onClick={() => api.votePoll(poll.id, choice.id).then(setPoll)}
              className={`w-full text-left p-2.5 rounded-xl text-xs relative overflow-hidden transition-all ${isSelected ? 'ring-1 ring-[var(--accent)]' : 'hover:bg-white/5'}`}
              style={{ background: isSelected ? 'rgba(233, 69, 96, 0.1)' : 'rgba(255,255,255,0.03)' }}>
              <div className="absolute inset-0 rounded-xl transition-all" style={{ width: `${pct}%`, background: 'rgba(233, 69, 96, 0.08)' }} />
              <div className="relative flex items-center justify-between">
                <span>{choice.text}</span>
                <span style={{ color: 'var(--text-secondary)' }} className="tabular-nums">{Math.round(pct)}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
        {poll.total_votes} голосов · {poll.is_anonymous ? 'Анонимный' : 'Открытый'}
      </div>
    </div>
  );
}
