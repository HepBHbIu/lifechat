import { useState, useEffect, useRef } from 'react';

const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    searchGifs('trending');
  }, []);

  const searchGifs = async (q: string) => {
    setLoading(true);
    try {
      const url = q === 'trending'
        ? `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=20&media_filter=gif`
        : `https://tenor.googleapis.com/v2/search?key=${TENOR_KEY}&q=${encodeURIComponent(q)}&limit=20&media_filter=gif`;
      const res = await fetch(url);
      const data = await res.json();
      setGifs(data.results || []);
    } catch { setGifs([]); }
    setLoading(false);
  };

  const handleSearch = () => {
    if (query.trim()) searchGifs(query.trim());
    else searchGifs('trending');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in-up" onClick={onClose}>
      <div className="glass-strong rounded-3xl max-w-md w-full max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-white/[0.03]">
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="Поиск GIF..." className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]" />
            <button onClick={handleSearch} className="p-2 rounded-xl bg-[var(--accent)]/20 text-[var(--accent)]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gifs.map((gif) => (
                <button key={gif.id} onClick={() => { onSelect(gif.media_formats.gif.url); onClose(); }}
                  className="rounded-xl overflow-hidden hover:ring-2 hover:ring-[var(--accent)] transition-all">
                  <img src={gif.media_formats.tinygif?.url || gif.media_formats.gif?.url} alt="" className="w-full h-24 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-white/[0.03]">
          <button onClick={onClose} className="w-full py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-white/5">Закрыть</button>
        </div>
      </div>
    </div>
  );
}
