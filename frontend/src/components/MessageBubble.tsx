import { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { api } from '../api/client';
import SpoilerText from './SpoilerText';

const EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '👏', '🎉', '💯', '🤔', '👀', '💪'];

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
  const [showReactions, setShowReactions] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPanel) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setShowPanel(false);
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showPanel]);

  if (message.deleted_at) {
    return (
      <div className="flex justify-start py-1">
        <div className="px-4 py-2 rounded-2xl text-xs italic"
          style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px dashed rgba(255,255,255,0.06)' }}>
          ✉️ Сообщение удалено
        </div>
      </div>
    );
  }

  const fmt = (d: string) => new Date(d + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtSize = (b?: number) => { if (!b) return ''; if (b < 1024) return b + ' Б'; if (b < 1048576) return (b / 1024).toFixed(1) + ' КБ'; return (b / 1048576).toFixed(1) + ' МБ'; };

  const handleReaction = async (emoji: string) => {
    try { const res = await api.toggleReaction(message.id, emoji); message.reactions = res.reactions; setShowReactions(false); setShowPanel(false); } catch {}
  };

  const reactions = message.reactions || [];
  const grouped: Record<string, { count: number; me: boolean }> = {};
  reactions.forEach((r) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, me: false };
    grouped[r.emoji].count++;
    if (r.user_id === currentUserId) grouped[r.emoji].me = true;
  });

  const text = message.text ? (
    message.is_spoiler ? <SpoilerText text={message.text} /> : <p className="text-[15px] leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.text}</p>
  ) : null;

  const content = (() => {
    switch (message.type) {
      case 'video_note': return <div className="rounded-full overflow-hidden border-2 border-white/10" style={{ width: 180, height: 180 }}>{message.file_id && <video src={`/api/files/${message.file_id}`} controls className="w-full h-full object-cover" />}</div>;
      case 'image': return <div>{message.file_id && <a href={`/api/files/${message.file_id}`} target="_blank" rel="noopener noreferrer"><img src={`/api/files/${message.file_id}`} alt="" className="max-w-full rounded-xl mb-1 cursor-pointer hover:opacity-90 transition-opacity" style={{ maxHeight: 280 }} loading="lazy" /></a>}{text}</div>;
      case 'audio': case 'voice': return <div style={{ minWidth: 240, maxWidth: 340 }}><audio controls preload="auto" className="w-full" style={{ height: 48, borderRadius: 12, background: 'rgba(0,0,0,0.25)' }}><source src={`/api/files/${message.file_id}`} />Аудио не поддерживается</audio>{text}</div>;
      case 'file': return <a href={`/api/files/${message.file_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl hover:brightness-110" style={{ background: 'rgba(0,0,0,0.15)' }}><div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(233,69,96,0.2)' }}><svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg></div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{message.original_name || 'Файл'}</p><p className="text-xs opacity-50">{fmtSize(message.file_size)}</p></div></a>;
      default: return text;
    }
  })();

  return (
    <div ref={rowRef} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative`}
      style={{ padding: '3px 0' }}
      onMouseEnter={() => setShowPanel(true)}
      onMouseLeave={() => { if (!showReactions) setShowPanel(false); }}>

      {/* Main column: bubble + reactions */}
      <div style={{ maxWidth: '75%', minWidth: 80 }}>
        {/* Bubble */}
        <div className={`px-4 py-2.5 ${isOwn ? 'rounded-2xl rounded-br-lg' : 'rounded-2xl rounded-bl-lg'}`}
          style={{
            background: isOwn ? 'linear-gradient(135deg, #e94560, #d63851, #c22d46)' : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
            boxShadow: isOwn ? '0 2px 12px rgba(233,69,96,0.25)' : '0 1px 8px rgba(0,0,0,0.15)',
            wordWrap: 'break-word', overflowWrap: 'break-word', overflow: 'hidden',
          }}>

          {message.reply_to && <div className="mb-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(0,0,0,0.2)', borderLeft: '3px solid var(--accent)' }}><div className="font-semibold text-[var(--accent)] text-[11px]">{message.reply_to.sender_name}</div><div className="opacity-70 truncate mt-0.5">{message.reply_to.text || `[${message.reply_to.type}]`}</div></div>}
          {message.forwarded_from && <div className="mb-1 text-[11px] text-[var(--accent)] font-medium">↪️ Переслано от {message.forwarded_from.username}</div>}
          {!isOwn && message.sender_name && <div className="text-[11px] font-semibold mb-1" style={{ color: '#ff6b81' }}>{message.sender_name}</div>}

          {content}

          <div className={`flex items-center justify-end gap-1.5 mt-1.5 ${isOwn ? 'text-white/40' : 'text-white/25'}`}>
            {message.edited_at && <span className="text-[10px] italic">ред.</span>}
            <span className="text-[10px] tabular-nums">{fmt(message.created_at)}</span>
            {isOwn && <svg className="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2 12l5 5L20 4M7 12l5 5L23 4" /></svg>}
          </div>
        </div>

        {/* Reactions — directly below bubble, same alignment */}
        {Object.keys(grouped).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(grouped).map(([emoji, data]) => (
              <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all hover:scale-105 active:scale-95"
                style={{ background: data.me ? 'rgba(233,69,96,0.2)' : 'rgba(255,255,255,0.06)', border: data.me ? '1px solid rgba(233,69,96,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-sm">{emoji}</span>
                <span className="text-[10px] tabular-nums" style={{ color: data.me ? '#ff6b81' : 'var(--text-secondary)' }}>{data.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action panel — NEXT TO the message */}
      {showPanel && (
        <div ref={panelRef}
          className={`absolute z-30 flex items-center gap-0.5 p-1.5 rounded-xl ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-0`}
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.5)', background: 'rgba(12,12,22,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' }}
          onMouseEnter={() => setShowPanel(true)}
          onMouseLeave={() => { setShowPanel(false); setShowReactions(false); }}>
          <Btn onClick={() => setShowReactions(!showReactions)} active={showReactions}>😊</Btn>
          <Btn onClick={() => { onReply(message); setShowPanel(false); }}>↩️</Btn>
          <Btn onClick={() => { onForward(message); setShowPanel(false); }}>↪️</Btn>
          {isOwn && <Btn onClick={() => { onEdit(message); setShowPanel(false); }}>✏️</Btn>}
          {isOwn && <Btn onClick={() => { onDelete(message.id); setShowPanel(false); }} danger>🗑️</Btn>}

          {showReactions && (
            <div className={`absolute bottom-full mb-2 ${isOwn ? 'right-0' : 'left-0'} flex items-center gap-1 p-2 rounded-xl animate-fade-in-up`}
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.5)', background: 'rgba(12,12,22,0.98)', border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}>
              {EMOJIS.map((e) => (
                <button key={e} onClick={(ev) => { ev.stopPropagation(); handleReaction(e); }}
                  className="text-xl hover:scale-125 active:scale-90 transition-all p-1 rounded-lg hover:bg-white/10">{e}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Btn({ onClick, children, active, danger }: { onClick: () => void; children: React.ReactNode; active?: boolean; danger?: boolean }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded-lg text-sm transition-all active:scale-90 ${active ? 'bg-[var(--accent)]/20' : danger ? 'hover:bg-red-400/15' : 'hover:bg-white/10'}`}>
      {children}
    </button>
  );
}
