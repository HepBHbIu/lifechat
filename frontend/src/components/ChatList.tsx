import { useState } from 'react';
import { Chat, User } from '../types';
import { api } from '../api/client';

interface ChatListProps {
  chats: Chat[];
  activeChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  currentUser: User | null;
  onRefresh: () => void;
}

export default function ChatList({ chats, activeChat, onSelectChat, currentUser, onRefresh }: ChatListProps) {
  const [contextMenu, setContextMenu] = useState<{ chatId: string; x: number; y: number } | null>(null);

  const getChatTitle = (c: Chat) => c.title || 'Личный чат';
  const getAvatar = (c: Chat) => (c.title || '?')[0]?.toUpperCase() || '?';

  const formatTime = (d?: string) => {
    if (!d) return '';
    const date = new Date(d + 'Z');
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const gradients = ['linear-gradient(135deg, #e94560, #ff6b81)', 'linear-gradient(135deg, #1a1a30, #2a2a40)', 'linear-gradient(135deg, #1a936f, #52b788)', 'linear-gradient(135deg, #7209b7, #b5179e)', 'linear-gradient(135deg, #f77f00, #fcbf49)'];
  const getGrad = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) { h = ((h << 5) - h) + id.charCodeAt(i); h |= 0; } return gradients[Math.abs(h) % gradients.length]; };

  const handlePin = async (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat?.is_pinned) await api.unpinChat(chatId);
    else await api.pinChat(chatId);
    setContextMenu(null);
    onRefresh();
  };

  return (
    <div className="flex-1 overflow-y-auto relative" onClick={() => { setContextMenu(null); }}>
      {chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-6 animate-fade-in-up">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(233,69,96,0.1), rgba(233,69,96,0.03))' }}>
            <svg className="w-10 h-10" style={{ color: 'var(--accent)', opacity: 0.4 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-1">Нет чатов</h3>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Начните новый разговор</p>
        </div>
      ) : (
        <div className="py-1">
          {chats.map((chat, i) => (
            <button key={chat.id} onClick={() => onSelectChat(chat)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ chatId: chat.id, x: e.clientX, y: e.clientY }); }}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left group/item ${activeChat?.id === chat.id ? '' : 'hover:bg-white/[0.02]'}`}
              style={{
                background: activeChat?.id === chat.id ? 'rgba(233,69,96,0.06)' : 'transparent',
              }}>
              {/* Avatar */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover/item:scale-105"
                style={{ background: chat.type === 'group' ? 'linear-gradient(135deg, #1a936f, #52b788)' : getGrad(chat.id), boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                {chat.type === 'group' ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                ) : (
                  <span className="text-white font-bold text-sm">{getAvatar(chat)}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 border-b border-white/[0.03] py-1">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {chat.is_pinned ? <svg className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent)' }} fill="currentColor" viewBox="0 0 24 24"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/></svg> : null}
                    <span className="font-semibold text-sm truncate">{getChatTitle(chat)}</span>
                  </div>
                  <span className="text-[10px] tabular-nums flex-shrink-0 ml-2" style={{ color: 'var(--text-secondary)' }}>{formatTime(chat.last_message_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {chat.last_message_sender && chat.type === 'group' && <span style={{ color: 'var(--accent)' }}>{chat.last_message_sender}: </span>}
                    {chat.last_message || 'Нет сообщений'}
                  </span>
                  {(chat.unread_count || 0) > 0 && (
                    <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                      style={{ background: 'linear-gradient(135deg, #e94560, #ff6b81)', boxShadow: '0 2px 8px rgba(233,69,96,0.3)' }}>
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div className="fixed z-50 animate-fade-in-up" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
          <div className="rounded-xl py-1 min-w-[140px] glass-card">
            <button onClick={() => handlePin(contextMenu.chatId)}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 flex items-center gap-2 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z"/></svg>
              {chats.find(c => c.id === contextMenu.chatId)?.is_pinned ? 'Открепить' : 'Закрепить'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
