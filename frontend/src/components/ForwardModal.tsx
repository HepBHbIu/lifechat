import { useState, useEffect } from 'react';
import { Chat } from '../types';
import { api } from '../api/client';

interface ForwardModalProps {
  onClose: () => void;
  onForward: (chatId: string) => void;
}

export default function ForwardModal({ onClose, onForward }: ForwardModalProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getChats().then(setChats).catch(() => {});
  }, []);

  const filtered = chats.filter(c => {
    const title = c.title || 'Личный чат';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={onClose}>
      <div className="glass-strong rounded-3xl max-w-md w-full max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-white/[0.03]">
          <h3 className="font-semibold text-sm">Переслать в...</h3>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск чата..."
            className="w-full mt-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]" autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.map(chat => (
            <button key={chat.id} onClick={() => onForward(chat.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all text-left">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: chat.type === 'group' ? 'linear-gradient(135deg, #1a936f, #52b788)' : 'linear-gradient(135deg, #1a1a30, #2a2a40)' }}>
                {(chat.title || '?')[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{chat.title || 'Личный чат'}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{chat.type === 'group' ? 'Группа' : 'Личный чат'}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-white/[0.03]">
          <button onClick={onClose} className="w-full py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-white/5 transition-all">Отмена</button>
        </div>
      </div>
    </div>
  );
}
