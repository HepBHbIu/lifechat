import { useState } from 'react';

export default function SpoilerText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);

  // Parse ||spoiler|| syntax
  const parts = text.split(/(\|\|.*?\|\|)/g);

  return (
    <div style={{ fontSize: 'var(--msg-font-size)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) => {
        if (part.startsWith('||') && part.endsWith('||')) {
          const spoilerText = part.slice(2, -2);
          return (
            <span key={i}
              onClick={() => setRevealed(!revealed)}
              className="cursor-pointer inline-block transition-all duration-300"
              style={{
                background: revealed ? 'rgba(233, 69, 96, 0.2)' : 'rgba(255,255,255,0.15)',
                color: revealed ? 'inherit' : 'transparent',
                borderRadius: '4px',
                padding: '0 4px',
                userSelect: 'none',
                filter: revealed ? 'none' : 'blur(6px)',
              }}
              title={revealed ? 'Нажмите чтобы скрыть' : 'Нажмите чтобы показать'}>
              {spoilerText}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
