import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import AdminPanel from './AdminPanel';
import { SoundEffects } from '../utils/sounds';
import ProfilePanel from './ProfilePanel';
import { Chat, User } from '../types';
import { api } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { showNotification } from '../utils/notifications';

type SidebarView = 'chats' | 'admin' | 'profile' | 'newchat';
type ChatFolder = 'all' | 'private' | 'groups';

export default function ChatLayout() {
  const { user, token, logout } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sidebarView, setSidebarView] = useState<SidebarView>('chats');
  const [chatFolder, setChatFolder] = useState<ChatFolder>('all');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const { connected, send, on } = useWebSocket(token);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const chatsRef = useRef(chats);
  chatsRef.current = chats;
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadChats = async () => { try { setChats(await api.getChats()); } catch {} };
  const loadUsers = async () => { try { setUsers(await api.getUsers()); } catch {} };

  useEffect(() => { loadChats(); loadUsers(); }, []);
  useEffect(() => { localStorage.setItem('sidebar_collapsed', String(collapsed)); }, [collapsed]);
  useEffect(() => {
    return () => { typingTimeoutsRef.current.forEach(t => clearTimeout(t)); };
  }, []);

  useEffect(() => {
    const unsub1 = on('new_message', (msg) => {
      const message = msg.message;
      if (!message) return;
      const isActive = activeChat?.id === message.chat_id;
      if (message.sender_id !== user?.id) {
        SoundEffects.messageIn();
      }
      if (!isActive && message.sender_id !== user?.id) {
        showNotification(
          message.sender_name || 'Новое сообщение',
          message.text || `[${message.type}]`,
          undefined,
          () => { const chat = chatsRef.current.find(c => c.id === message.chat_id); if (chat) handleSelectChat(chat); }
        );
      }
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === message.chat_id);
        const updated = { id: message.chat_id, last_message: message.text || `[${message.type}]`, last_message_at: message.created_at, last_message_sender: message.sender_name };
        if (idx >= 0) {
          const chat = prev[idx];
          const newUnread = isActive ? (chat.unread_count || 0) : ((chat.unread_count || 0) + (message.sender_id !== user?.id ? 1 : 0));
          const newArr = [...prev];
          newArr[idx] = { ...chat, ...updated, unread_count: newUnread };
          newArr.sort((a, b) => new Date((b.last_message_at || b.created_at) + 'Z').getTime() - new Date((a.last_message_at || a.created_at) + 'Z').getTime());
          return newArr;
        }
        return prev;
      });
    });
    const unsub2 = on('user_typing', (msg) => {
      if (msg.userId === user?.id) return;
      const key = `${msg.chatId}:${msg.username}`;
      setTypingUsers((prev) => ({ ...prev, [msg.chatId]: [...(prev[msg.chatId] || []).filter((u: string) => u !== msg.username), msg.username] }));
      const existing = typingTimeoutsRef.current.get(key);
      if (existing) clearTimeout(existing);
      typingTimeoutsRef.current.set(key, setTimeout(() => {
        setTypingUsers((prev) => ({ ...prev, [msg.chatId]: (prev[msg.chatId] || []).filter((u: string) => u !== msg.username) }));
        typingTimeoutsRef.current.delete(key);
      }, 3000));
    });
    const unsub3 = on('chat_updated', () => loadChats());
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [on, activeChat, user]);

  const handleSelectChat = (chat: Chat) => {
    setActiveChat(chat); setSidebarView('chats');
    send({ type: 'join_chat', chatId: chat.id }); send({ type: 'read_messages', chatId: chat.id });
    setChats((prev) => prev.map((c) => c.id === chat.id ? { ...c, unread_count: 0 } : c));
  };

  const handleNewPrivateChat = async (userId: string) => {
    try {
      const chat = await api.createPrivateChat(userId);
      await loadChats(); setSidebarView('chats');
      const target = users.find((u) => u.id === userId);
      setActiveChat({ ...chat, title: target?.username || 'Чат', type: 'private', created_by: user!.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      send({ type: 'join_chat', chatId: chat.id });
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="h-screen h-[100dvh] flex" style={{ background: 'var(--bg-primary)' }}>

      {/* ===== SIDEBAR ===== */}
      <div className={`flex flex-col h-full glass-strong transition-all duration-300 ease-out
        ${activeChat ? 'hidden md:flex' : 'flex'}
        ${collapsed ? 'w-[72px]' : 'w-full md:w-72 lg:w-80'}`}>

        {/* Header */}
        <div className={`flex items-center ${collapsed ? 'flex-col py-3 px-2 gap-3' : 'px-4 py-3 justify-between'}`}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarView(sidebarView === 'profile' ? 'chats' : 'profile')} className="group">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #e94560, #ff6b81)', boxShadow: '0 4px 15px rgba(233,69,96,0.3)' }}>
                    <span className="text-white font-bold text-sm">{user?.username?.[0]?.toUpperCase()}</span>
                  </div>
                </button>
                <div>
                  <div className="font-semibold text-sm">{user?.username}</div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-yellow-400'}`}
                      style={connected ? { boxShadow: '0 0 6px rgba(74,222,128,0.5)' } : { animation: 'pulse 2s infinite' }} />
                    <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{connected ? 'В сети' : 'Подключение'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconBtn onClick={() => setSidebarView(sidebarView === 'newchat' ? 'chats' : 'newchat')} active={sidebarView === 'newchat'} title="Новый чат">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </IconBtn>
                <IconBtn onClick={() => setSidebarView(sidebarView === 'profile' ? 'chats' : 'profile')} active={sidebarView === 'profile'} title="Настройки">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </IconBtn>
                {user?.role === 'admin' && (
                  <IconBtn onClick={() => setSidebarView(sidebarView === 'admin' ? 'chats' : 'admin')} active={sidebarView === 'admin'} title="Админ">
                    <AdminIcon />
                  </IconBtn>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setSidebarView('profile')} className="group">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #e94560, #ff6b81)' }}>
                  <span className="text-white font-bold text-sm">{user?.username?.[0]?.toUpperCase()}</span>
                </div>
              </button>
              <IconBtn onClick={() => setSidebarView('newchat')} title="Новый чат">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </IconBtn>
              <IconBtn onClick={() => setSidebarView('profile')} title="Настройки">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </IconBtn>
              {user?.role === 'admin' && (
                <IconBtn onClick={() => setSidebarView(sidebarView === 'admin' ? 'chats' : 'admin')} title="Админ">
                  <AdminIcon />
                </IconBtn>
              )}
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {sidebarView === 'profile' && <ProfilePanel user={user!} token={token!} onClose={() => setSidebarView('chats')} />}
          {sidebarView === 'newchat' && <NewChatPanel users={users} currentUserId={user?.id} onSelect={handleNewPrivateChat} onClose={() => setSidebarView('chats')} />}
          {sidebarView === 'admin' && <AdminPanel />}
          {sidebarView === 'chats' && !collapsed && (
            <div className="flex border-b border-white/[0.03]">
              {([['all', 'Все'], ['private', 'Личные'], ['groups', 'Группы']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setChatFolder(key)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-all relative ${chatFolder === key ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-white'}`}>
                  {label}
                  {chatFolder === key && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {sidebarView === 'chats' && (
              collapsed ? (
                <CollapsedChatList chats={chats} activeChat={activeChat} onSelectChat={handleSelectChat} />
              ) : (
                <ChatList chats={chats.filter(c => chatFolder === 'all' || (chatFolder === 'private' ? c.type === 'private' : c.type === 'group'))} activeChat={activeChat} onSelectChat={handleSelectChat} currentUser={user} onRefresh={loadChats} />
              )
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className={`flex items-center ${collapsed ? 'flex-col py-2 px-2 gap-1' : 'px-3 py-2.5 justify-between'}`}
          style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
          <BottomBtn onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Развернуть' : 'Свернуть'}
            icon={collapsed
              ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>}
          />
          <BottomBtn onClick={logout} title="Выйти"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>}
          />
        </div>
      </div>

      {/* ===== MAIN AREA ===== */}
      <div className={`flex-1 flex-col h-full ${activeChat ? 'flex' : 'hidden md:flex'}`}>
        {activeChat ? (
          <ChatWindow chat={activeChat} currentUser={user!} onSendMessage={(cid, text, rid, spoiler, autoDel) => {
            const ok = send({ type: 'send_message', chatId: cid, text, reply_to_id: rid, is_spoiler: spoiler, auto_delete_seconds: autoDel });
            if (!ok) api.sendMessage(cid, text, rid).catch(() => {});
          }}
            onFileUploaded={(cid, mid) => {
              const ok = send({ type: 'send_file_message', chatId: cid, messageId: mid });
              if (!ok) loadChats();
            }}
            onTyping={(cid) => send({ type: 'typing', chatId: cid })} wsOn={on} typingUsers={typingUsers[activeChat.id] || []} />
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
            <div className="text-center animate-fade-in-up">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(233, 69, 96, 0.06)' }}>
                <svg className="w-12 h-12 text-[var(--accent)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Выберите чат</h2>
              <p className="text-[var(--text-secondary)] text-sm">или начните новый разговор</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile */}
      {activeChat && (
        <div className="md:hidden fixed inset-0 z-50 animate-slide-left" style={{ background: 'var(--bg-primary)' }}>
          <ChatWindow chat={activeChat} currentUser={user!} onSendMessage={(cid, text, rid, spoiler, autoDel) => {
            const ok = send({ type: 'send_message', chatId: cid, text, reply_to_id: rid, is_spoiler: spoiler, auto_delete_seconds: autoDel });
            if (!ok) api.sendMessage(cid, text, rid).catch(() => {});
          }}
            onFileUploaded={(cid, mid) => {
              const ok = send({ type: 'send_file_message', chatId: cid, messageId: mid });
              if (!ok) loadChats();
            }}
            onTyping={(cid) => send({ type: 'typing', chatId: cid })} wsOn={on} typingUsers={typingUsers[activeChat.id] || []}
            onBack={() => setActiveChat(null)} />
        </div>
      )}
    </div>
  );
}

function AdminIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconBtn({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-2 rounded-xl transition-all ${active ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'hover:bg-white/5 text-[var(--text-secondary)] hover:text-white'}`}>
      {children}
    </button>
  );
}

function BottomBtn({ active, onClick, title, icon }: { active?: boolean; onClick: () => void; title: string; icon: JSX.Element }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-2.5 rounded-xl transition-all ${active ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'hover:bg-white/5 text-[var(--text-secondary)] hover:text-white'}`}>
      {icon}
    </button>
  );
}

function NewChatPanel({ users, currentUserId, onSelect, onClose }: { users: User[]; currentUserId?: string; onSelect: (userId: string) => void; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col animate-fade-in-up">
      <div className="px-4 py-3 border-b border-white/[0.03] flex items-center gap-3">
        <button onClick={onClose} className="p-1 -ml-1 rounded-lg hover:bg-white/5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h3 className="font-semibold text-sm">Новый чат</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {users.filter((u) => u.is_active && u.id !== currentUserId).length === 0 ? (
          <p className="text-[var(--text-secondary)] text-xs text-center py-6">Нет доступных пользователей</p>
        ) : users.filter((u) => u.is_active && u.id !== currentUserId).map((u) => (
          <button key={u.id} onClick={() => onSelect(u.id)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-all text-left">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1a1a30, #2a2a40)' }}>
              {u.username[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{u.username}</div>
              <div className="text-[10px] text-[var(--text-secondary)]">Написать сообщение</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CollapsedChatList({ chats, activeChat, onSelectChat }: { chats: Chat[]; activeChat: Chat | null; onSelectChat: (chat: Chat) => void }) {
  const gradients = [
    'linear-gradient(135deg, #e94560, #ff6b81)',
    'linear-gradient(135deg, #1a1a30, #2a2a40)',
    'linear-gradient(135deg, #1a936f, #52b788)',
    'linear-gradient(135deg, #7209b7, #b5179e)',
    'linear-gradient(135deg, #f77f00, #fcbf49)',
  ];
  const getGradient = (id: string) => {
    let h = 0; for (let i = 0; i < id.length; i++) { h = ((h << 5) - h) + id.charCodeAt(i); h |= 0; }
    return gradients[Math.abs(h) % gradients.length];
  };
  return (
    <div className="flex-1 overflow-y-auto py-2 space-y-1 px-2">
      {chats.map((chat) => (
        <button key={chat.id} onClick={() => onSelectChat(chat)}
          className={`relative w-full flex items-center justify-center p-2 rounded-xl transition-all ${activeChat?.id === chat.id ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}
          title={chat.title || 'Личный чат'}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center relative"
            style={{ background: chat.type === 'group' ? 'linear-gradient(135deg, #1a936f, #52b788)' : getGradient(chat.id) }}>
            {chat.type === 'group' ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            ) : (
              <span className="text-white font-bold text-sm">{(chat.title || '?')[0]?.toUpperCase()}</span>
            )}
            {(chat.unread_count || 0) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, #e94560, #ff6b81)' }}>{chat.unread_count}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
