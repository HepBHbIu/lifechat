import { useState, useRef, useEffect } from 'react';

const EMOJI_CATEGORIES = [
  { name: 'Частые', emojis: ['😀', '😂', '😍', '🤔', '👍', '❤️', '🔥', '💯', '🎉', '💪', '👀', '🙌', '😢', '😮', '👏', '🥳'] },
  { name: 'Животные', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐔', '🐧', '🐦'] },
  { name: 'Еда', emojis: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧀', '🥚', '🍳', '🥓', '🍗', '🍖', '🥩', '🥗', '🍱', '🍜', '🍣'] },
  { name: 'Работа', emojis: ['💻', '📱', '⌨️', '🖥️', '🖨️', '📷', '🎥', '📞', '📧', '📝', '📊', '📈', '🔑', '📦', '🔧', '⚙️'] },
];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full mb-2 left-0 w-72 rounded-2xl overflow-hidden animate-fade-in-up glass-card z-50">
      {/* Category tabs */}
      <div className="flex border-b border-white/[0.03]">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button key={i} onClick={() => setActiveCategory(i)}
            className={`flex-1 py-2 text-[10px] font-medium transition-all ${activeCategory === i ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
            {cat.name}
          </button>
        ))}
      </div>
      {/* Emojis */}
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
          <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all text-lg active:scale-90">
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
