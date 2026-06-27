import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { User, Token, Chat, Message } from '../types';
import AdminSettings from './AdminSettings';

type Tab = 'users' | 'tokens' | 'groups' | 'messages' | 'settings';

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [newUsername, setNewUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [createdToken, setCreatedToken] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showGroupForm, setShowGroupForm] = useState(false);

  const [messageFilter, setMessageFilter] = useState('');

  const loadUsers = async () => { try { setUsers(await api.adminGetUsers()); } catch {} };
  const loadTokens = async () => { try { setTokens(await api.adminGetTokens()); } catch {} };
  const loadChats = async () => { try { setChats(await api.adminGetChats()); } catch {} };
  const loadMessages = async () => { try { setMessages(await api.adminGetMessages(messageFilter || undefined)); } catch {} };

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'tokens') loadTokens();
    if (tab === 'groups') loadChats();
    if (tab === 'messages') loadMessages();
  }, [tab, messageFilter]);

  const handleCreateUser = async () => {
    if (!newUsername.trim()) return;
    try {
      const res = await api.adminCreateUser(newUsername.trim(), newUserRole);
      setCreatedToken(res.token);
      setShowTokenModal(true);
      setNewUsername('');
      loadUsers();
    } catch (err: any) { alert(err.message); }
  };

  const handleToggleUser = async (user: User) => {
    try { await api.adminUpdateUser(user.id, { is_active: user.is_active ? 0 : 1 }); loadUsers(); } catch {}
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Удалить пользователя?')) return;
    try { await api.adminDeleteUser(id); loadUsers(); } catch {}
  };

  const handleCreateToken = async () => {
    try {
      const res = await api.adminCreateToken();
      setCreatedToken(res.token);
      setShowTokenModal(true);
      loadTokens();
    } catch (err: any) { alert(err.message); }
  };

  const handleDisableToken = async (id: string) => {
    try { await api.adminDisableToken(id); loadTokens(); } catch {}
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    try {
      await api.adminCreateGroup(groupName.trim(), selectedMembers);
      setGroupName(''); setSelectedMembers([]); setShowGroupForm(false); loadChats();
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteChat = async (id: string) => {
    if (!confirm('Удалить группу?')) return;
    try { await api.adminDeleteChat(id); loadChats(); } catch {}
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Удалить сообщение?')) return;
    try { await api.adminDeleteMessage(id); loadMessages(); } catch {}
  };

  const copyToken = (token: string) => navigator.clipboard.writeText(token);

  const tabs: { key: Tab; label: string; icon: JSX.Element }[] = [
    { key: 'users', label: 'Пользователи', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
    { key: 'tokens', label: 'Токены', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg> },
    { key: 'groups', label: 'Группы', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg> },
    { key: 'messages', label: 'Сообщения', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg> },
    { key: 'settings', label: 'Настройки', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-medium transition-all ${
              tab === t.key
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/3'
            }`}
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tab === 'users' && (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Имя пользователя"
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <option value="user">Юзер</option>
                <option value="admin">Админ</option>
              </select>
              <button
                onClick={handleCreateUser}
                disabled={!newUsername.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition-all"
                style={{ background: 'linear-gradient(135deg, #e94560, #ff6b81)' }}
              >
                Создать
              </button>
            </div>

            <div className="space-y-1.5">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/3 transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: u.role === 'admin' ? 'linear-gradient(135deg, #e94560, #ff6b81)' : 'linear-gradient(135deg, #0f3460, #533483)' }}>
                      {u.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{u.username}</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {u.role === 'admin' ? 'Администратор' : 'Пользователь'} · {u.is_active ? 'Активен' : 'Отключён'}
      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggleUser(u)}
                      className="px-2.5 py-1 text-[10px] rounded-lg font-medium transition-all"
                      style={{
                        background: u.is_active ? 'rgba(251, 191, 36, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        color: u.is_active ? '#fbbf24' : '#22c55e',
                      }}
                    >
                      {u.is_active ? 'Блок' : 'Разблок'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="px-2.5 py-1 text-[10px] rounded-lg font-medium transition-all"
                      style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'tokens' && (
          <>
            <button
              onClick={handleCreateToken}
              className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #e94560, #ff6b81)' }}
            >
              + Сгенерировать токен
            </button>

            <div className="space-y-1.5">
              {tokens.map((t) => (
                <div key={t.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] truncate max-w-[180px]">{t.token}</span>
                    <button onClick={() => copyToken(t.token)} className="text-[10px] text-[var(--accent)] hover:underline font-medium">Копировать</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {t.username || 'Не привязан'} · {t.is_active ? (t.is_used ? 'Использован' : 'Активен') : 'Отключён'}
                    </span>
                    {t.is_active === 1 && (
                      <button
                        onClick={() => handleDisableToken(t.id)}
                        className="px-2 py-0.5 text-[9px] rounded-md font-medium"
                        style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}
                      >
                        Отключить
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'groups' && (
          <>
            <button
              onClick={() => setShowGroupForm(!showGroupForm)}
              className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #1a936f, #52b788)' }}
            >
              {showGroupForm ? 'Скрыть' : '+ Создать группу'}
            </button>

            {showGroupForm && (
              <div className="p-4 rounded-xl space-y-3 animate-fade-in-up" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Название группы"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <div>
                  <div className="text-[10px] text-[var(--text-secondary)] mb-2">Участники:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {users.filter((u) => u.is_active && u.role === 'user').map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(u.id)}
                          onChange={(e) => {
                            setSelectedMembers(e.target.checked
                              ? [...selectedMembers, u.id]
                              : selectedMembers.filter((id) => id !== u.id));
                          }}
                          className="accent-[var(--accent)]"
                        />
                        {u.username}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim()}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #1a936f, #52b788)' }}
                  >
                    Создать
                  </button>
                  <button
                    onClick={() => setShowGroupForm(false)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-white/5"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {chats.filter((c) => c.type === 'group').map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #1a936f, #52b788)' }}>
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{c.title}</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">Групповой чат</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteChat(c.id)}
                    className="px-2.5 py-1 text-[10px] rounded-lg font-medium"
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'messages' && (
          <>
            <select
              value={messageFilter}
              onChange={(e) => setMessageFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">Все чаты</option>
              {chats.map((c) => (
                <option key={c.id} value={c.id}>{c.title || c.id}</option>
              ))}
            </select>

            <div className="space-y-1.5">
              {messages.map((m) => (
                <div key={m.id} className="p-3 rounded-xl flex items-start justify-between"
                  style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-xs">{m.sender_name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md"
                        style={{ background: 'rgba(233, 69, 96, 0.15)', color: '#ff6b81' }}>
                        {m.type}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {new Date(m.created_at + 'Z').toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{m.text || `[${m.type}]`}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMessage(m.id)}
                    className="ml-2 p-1 rounded-lg hover:bg-white/5 transition-all"
                    style={{ color: '#ef4444' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'settings' && (
          <AdminSettings />
        )}
      </div>
      {/* Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="glass-strong rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #e94560, #ff6b81)' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center mb-2">Токен создан</h3>
            <div className="p-3 rounded-xl mb-4 break-all" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] text-[var(--text-secondary)] mb-1">Скопируйте токен:</p>
              <p className="font-mono text-xs text-white select-all">{createdToken}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { copyToken(createdToken); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #e94560, #ff6b81)' }}
              >
                Копировать
              </button>
              <button
                onClick={() => { setShowTokenModal(false); setCreatedToken(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5 transition-all"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
