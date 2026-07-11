import { useState } from 'react';

interface Props {
  onSelect: (sticker: string) => void;
  onClose: () => void;
}

const STICKER_PACKS = {
  'Эмодзи': [
    '😀', '😂', '🥰', '😎', '🤔', '😴', '🤯', '🥳',
    '👍', '👎', '👏', '🙌', '🤝', '💪', '❤️', '🔥',
    '✨', '🎉', '🎊', '💯', '⭐', '🌟', '💫', '🌈',
    '🚀', '🎯', '🏆', '💎', '🎨', '🎬', '📸', '🎵',
  ],
  'Животные': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
    '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
    '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞',
  ],
  'Еда': [
    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
    '🍑', '🍒', '🥝', '🍍', '🥭', '🥑', '🍆', '🥕',
    '🌽', '🌶️', '🥒', '🥦', '🧀', '🍖', '🍗', '🥩',
    '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🍜',
  ],
};

export default function StickerPicker({ onSelect, onClose }: Props) {
  const [activePack, setActivePack] = useState('Эмодзи');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-strong rounded-3xl max-w-sm w-full max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-white/[0.03]">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Стикеры</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex gap-1 px-4 pt-3">
          {Object.keys(STICKER_PACKS).map(pack => (
            <button
              key={pack}
              onClick={() => setActivePack(pack)}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all ${activePack === pack ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-white/5'}`}
            >
              {pack}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-6 gap-2">
            {STICKER_PACKS[activePack as keyof typeof STICKER_PACKS].map((sticker, i) => (
              <button
                key={i}
                onClick={() => { onSelect(sticker); onClose(); }}
                className="w-12 h-12 flex items-center justify-center rounded-xl text-2xl hover:bg-white/10 hover:scale-110 active:scale-95 transition-all"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
