import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  url: string;
}

interface Props {
  url: string;
}

export default function LinkPreview({ url }: Props) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getLinkPreview(url)
      .then((data) => {
        if (!cancelled) {
          setPreview(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-2 p-3 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-3 w-24 rounded bg-white/10 mb-2" />
        <div className="h-2 w-full rounded bg-white/5 mb-1" />
        <div className="h-2 w-3/4 rounded bg-white/5" />
      </div>
    );
  }

  if (!preview || (!preview.title && !preview.description && !preview.image)) {
    return null;
  }

  const hostname = (() => { try { return new URL(url).hostname.replace('www.', ''); } catch { return url; } })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block rounded-xl overflow-hidden transition-all hover:brightness-110"
      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {preview.image && (
        <div className="w-full h-32 overflow-hidden">
          <img src={preview.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="p-3">
        <div className="text-[10px] opacity-40 mb-1 truncate">{hostname}</div>
        {preview.title && <div className="text-sm font-medium truncate mb-1">{preview.title}</div>}
        {preview.description && <div className="text-xs opacity-60 line-clamp-2">{preview.description}</div>}
      </div>
    </a>
  );
}
