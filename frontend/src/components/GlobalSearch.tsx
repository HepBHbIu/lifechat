import { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { Message } from '../types';

interface Props {
  onSelectChat: (chatId: string) => void;
  onClose: () => void;
}

export default function GlobalSearch({ onSelectChat, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Message & { chat_title?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      api.globalSearch(query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-[var(--accent)]/30 text-white rounded px-0.5">$1</mark>');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 pt-20 px-4" onClick={onClose}>
      <div className="glass-strong rounded-3xl max-w-lg w-full max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-white/[0.03]">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск по всем чатам..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
            {loading && <div className="animate-spin w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full" />}
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {results.length === 0 && query && !loading ? (
            <div className="text-center py-8 text-sm opacity-40">Ничего не найдено</div>
          ) : (
            <div className="p-2 space-y-1">
              {results.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => { onSelectChat(msg.chat_id); onClose(); }}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/[0.03] transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium text-[var(--accent)]">{msg.sender_name}</span>
                    <span className="text-[10px] opacity-30">в</span>
                    <span className="text-[11px] opacity-60">{msg.chat_title || 'Чат'}</span>
                    <span className="text-[10px] opacity-20 ml-auto">{new Date(msg.created_at + 'Z').toLocaleDateString()}</span>
                  </div>
                  <p
                    className="text-xs opacity-70 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: highlightMatch(msg.text || '', query) }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
