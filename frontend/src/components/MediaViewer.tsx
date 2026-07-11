import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  type: 'image' | 'video';
  alt?: string;
  onClose: () => void;
}

export default function MediaViewer({ src, type, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleDoubleClick = () => {
    setScale(prev => prev === 1 ? 1.8 : 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>

      {/* Close button */}
      <button onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Media content */}
      <div className="max-w-[90vw] max-h-[85vh] animate-scale-in transition-transform duration-300"
        style={{ transform: `scale(${scale})` }}
        onClick={e => e.stopPropagation()}
        onDoubleClick={handleDoubleClick}>
        {type === 'image' ? (
          <img src={src} alt="" className="max-w-full max-h-[85vh] object-contain rounded-2xl cursor-pointer"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
        ) : (
          <video ref={videoRef} src={src} controls autoPlay
            className="max-w-full max-h-[85vh] rounded-2xl"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
        )}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs text-white/40"
        style={{ background: 'rgba(255,255,255,0.05)' }}>
        {scale > 1 ? 'Двойной клик — уменьшить' : 'Двойной клик — увеличить'}
      </div>
    </div>
  );
}
