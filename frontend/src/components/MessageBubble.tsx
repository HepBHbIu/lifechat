import { useState, useRef, useEffect, useMemo } from 'react';
import { Message } from '../types';
import { api } from '../api/client';
import SpoilerText from './SpoilerText';
import MediaViewer from './MediaViewer';
import Avatar from './Avatar';
import LinkPreview from './LinkPreview';
import Waveform from './Waveform';

const EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '👏', '🎉', '💯', '🤔', '👀', '💪'];
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

interface Props {
  message: Message;
  isOwn: boolean;
  currentUserId: string;
  onDelete: (id: string) => void;
  onReply: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onEdit: (msg: Message) => void;
}

export default function MessageBubble({ message, isOwn, currentUserId, onDelete, onReply, onForward, onEdit }: Props) {
  const [showPanel, setShowPanel] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [localReactions, setLocalReactions] = useState(message.reactions || []);
  const [mediaViewer, setMediaViewer] = useState<{ src: string; type: 'image' | 'video' } | null>(null);
  const selfRef = useRef<HTMLDivElement>(null);

  // Sync with prop when parent updates
  useEffect(() => {
    setLocalReactions(message.reactions || []);
  }, [message.reactions]);

  // Close on outside click
  useEffect(() => {
    if (!showPanel && !showEmojiBar) return;
    const h = (e: MouseEvent) => {
      if (selfRef.current && !selfRef.current.contains(e.target as Node)) {
        setShowPanel(false);
        setShowEmojiBar(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showPanel, showEmojiBar]);

  const handleReaction = async (emoji: string) => {
    try {
      const res = await api.toggleReaction(message.id, emoji);
      setLocalReactions(res.reactions);
      setShowEmojiBar(false);
      setShowPanel(false);
    } catch {}
  };

  const reactions = localReactions;
  const grouped: Record<string, { count: number; me: boolean }> = {};
  reactions.forEach((r) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, me: false };
    grouped[r.emoji].count++;
    if (r.user_id === currentUserId) grouped[r.emoji].me = true;
  });

  const fmt = (d: string) => new Date(d + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtSize = (b?: number) => { if (!b) return ''; if (b < 1024) return b + ' Б'; if (b < 1048576) return (b / 1024).toFixed(1) + ' КБ'; return (b / 1048576).toFixed(1) + ' МБ'; };

  const urls = useMemo(() => {
    if (!message.text) return [];
    const matches = message.text.match(URL_REGEX);
    return matches ? [...new Set(matches)].slice(0, 3) : [];
  }, [message.text]);

  const text = message.text ? (
    message.is_spoiler ? <SpoilerText text={message.text} /> : <p style={{ fontSize: 'var(--msg-font-size)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>{message.text}</p>
  ) : null;

  const content = (() => {
    switch (message.type) {
      case 'image': return <div>{message.file_id && <div onClick={() => setMediaViewer({ src: api.getFileUrl(message.file_id), type: 'image' })} className="cursor-pointer rounded-xl overflow-hidden hover:brightness-110 transition-all"><img src={api.getFileUrl(message.file_id)} alt="" className="max-w-full rounded-xl" style={{ maxHeight: 280 }} loading="lazy" /></div>}{text}</div>;
      case 'video_note': return <div onClick={() => message.file_id && setMediaViewer({ src: api.getFileUrl(message.file_id), type: 'video' })} className="cursor-pointer hover:brightness-110 transition-all" style={{ width: 180, height: 180, border: '3px solid var(--accent)', boxShadow: '0 0 20px var(--accent-glow)', borderRadius: 16, overflow: 'hidden' }}>{message.file_id && <video src={api.getFileUrl(message.file_id)} className="w-full h-full object-cover" />}</div>;
      case 'audio': case 'voice': return <div style={{ minWidth: 220, maxWidth: 340 }}><Waveform src={api.getFileUrl(message.file_id)} isOwn={isOwn} />{text}</div>;
      case 'file': return <a href={api.getFileUrl(message.file_id)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:brightness-110 transition-all" style={{ background: 'rgba(0,0,0,0.15)' }}><div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(233,69,96,0.2)' }}><svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg></div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{message.original_name || 'Файл'}</p><p className="text-xs opacity-50">{fmtSize(message.file_size)}</p></div></a>;
      default: return <div>{text}{urls.length > 0 && <div className="mt-1">{urls.map((url, i) => <LinkPreview key={i} url={url} />)}</div>}</div>;
    }
  })();

  if (message.deleted_at) {
    return (
      <div className="flex justify-start py-1 px-1">
        <div className="px-4 py-2 rounded-2xl text-xs italic" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', border: '1px dashed rgba(255,255,255,0.05)' }}>
          ✉️ Сообщение удалено
        </div>
      </div>
    );
  }

  return (
    <div ref={selfRef} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative`}
      style={{ padding: '3px 0' }}>

      {!isOwn && (
        <div className="mr-2 mt-1 flex-shrink-0">
          <Avatar url={null} username={message.sender_name || ''} size={32} />
        </div>
      )}

      <div style={{ maxWidth: '75%', minWidth: 80 }}>
        {/* Bubble */}
        <div className={`px-4 py-2.5 ${isOwn ? 'rounded-2xl rounded-br-lg' : 'rounded-2xl rounded-bl-lg'} transition-all duration-200`}
          style={{
            background: isOwn ? `linear-gradient(135deg, var(--accent), var(--accent-hover))` : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
            boxShadow: isOwn ? '0 2px 12px var(--accent-glow)' : '0 1px 8px rgba(0,0,0,0.15)',
            wordWrap: 'break-word', overflowWrap: 'break-word', overflow: 'hidden',
            cursor: 'pointer',
          }}
          onClick={() => { setShowPanel(!showPanel); setShowEmojiBar(false); }}>

          {message.reply_to && <div className="mb-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(0,0,0,0.2)', borderLeft: '3px solid var(--accent)' }}><div className="font-semibold text-[var(--accent)] text-[11px]">{message.reply_to.sender_name}</div><div className="opacity-70 truncate mt-0.5">{message.reply_to.text || `[${message.reply_to.type}]`}</div></div>}
          {message.forwarded_from && <div className="mb-1 text-[11px] text-[var(--accent)] font-medium">↪️ Переслано от {message.forwarded_from.username}</div>}
          {!isOwn && message.sender_name && <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--accent)' }}>{message.sender_name}</div>}
          {content}
          <div className={`flex items-center justify-end gap-1.5 mt-1.5 ${isOwn ? 'text-white/40' : 'text-white/25'}`}>
            {message.edited_at && <span className="text-[10px] italic">ред.</span>}
            <span className="text-[10px] tabular-nums">{fmt(message.created_at)}</span>
            {isOwn && (
              message.is_read
                ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2 12l5 5L20 4M7 12l5 5L23 4" /></svg>
                : <svg className="w-4 h-4 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12l5 5L20 7" /></svg>
            )}
          </div>
        </div>

        {/* Reactions — below bubble */}
        {Object.keys(grouped).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(grouped).map(([emoji, data]) => (
              <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all hover:scale-105 active:scale-95"
                style={{ background: data.me ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.06)', border: data.me ? '1px solid rgba(233,69,96,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-sm">{emoji}</span>
                <span className="text-[10px] tabular-nums" style={{ color: data.me ? 'var(--accent)' : 'var(--text-secondary)' }}>{data.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action bar — appears below reactions when clicked */}
        {showPanel && (
          <div className={`flex items-center gap-0.5 mt-1 p-1 rounded-xl transition-all ${isOwn ? 'justify-end' : 'justify-start'}`}
            style={{ background: 'rgba(12,12,22,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
            <P onClick={() => setShowEmojiBar(!showEmojiBar)} active={showEmojiBar}>😊</P>
            <P onClick={() => { onReply(message); setShowPanel(false); }}>↩️</P>
            <P onClick={() => { onForward(message); setShowPanel(false); }}>↪️</P>
            {isOwn && <P onClick={() => { onEdit(message); setShowPanel(false); }}>✏️</P>}
            {isOwn && <P onClick={() => { onDelete(message.id); setShowPanel(false); }} danger>🗑️</P>}
          </div>
        )}

        {/* Emoji bar — appears below action bar */}
        {showEmojiBar && (
          <div className={`flex items-center gap-0.5 mt-1 p-1.5 rounded-2xl ${isOwn ? 'justify-end' : 'justify-start'}`}
            style={{ background: 'rgba(12,12,22,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
            {EMOJIS.map((emoji, i) => (
              <button key={emoji} onClick={(ev) => { ev.stopPropagation(); handleReaction(emoji); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 active:scale-90"
                style={{ animation: `fadeInUp 0.2s ease-out ${i * 0.03}s both` }}>
                <span className="text-xl hover:scale-125 transition-transform">{emoji}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Media viewer modal */}
      {mediaViewer && <MediaViewer src={mediaViewer.src} type={mediaViewer.type} onClose={() => setMediaViewer(null)} />}
    </div>
  );
}

function P({ onClick, children, active, danger }: { onClick: () => void; children: React.ReactNode; active?: boolean; danger?: boolean }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${active ? 'bg-[var(--accent)]/20' : danger ? 'hover:bg-red-400/15' : 'hover:bg-white/10'}`}>
      {children}
    </button>
  );
}
