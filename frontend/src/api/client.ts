const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('chat_token');
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  request,
  loginWithPassword: (username: string, password: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username: string, password: string, inviteCode: string) => request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, invite_code: inviteCode }) }),
  refreshToken: () => request('/auth/refresh', { method: 'POST' }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  getUsers: () => request('/users'),
  getChats: () => request('/chats'),
  createPrivateChat: (userId: string) => request('/chats/private', { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  getChatMembers: (chatId: string) => request(`/chats/${chatId}/members`),

  getMessages: (chatId: string, before?: string) => {
    const params = before ? `?before=${before}` : '';
    return request(`/messages/${chatId}/messages${params}`);
  },
  searchMessages: (chatId: string, q: string) => request(`/messages/${chatId}/search?q=${encodeURIComponent(q)}`),
  markAsRead: (chatId: string) => request(`/messages/${chatId}/read`, { method: 'POST' }),
  sendMessage: (chatId: string, text: string, replyToId?: string) => request(`/messages/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ text, reply_to_id: replyToId }) }),
  editMessage: (messageId: string, text: string) => request(`/messages/${messageId}`, { method: 'PATCH', body: JSON.stringify({ text }) }),
  forwardMessage: (messageId: string, toChatId: string) => request(`/messages/${messageId}/forward`, { method: 'POST', body: JSON.stringify({ to_chat_id: toChatId }) }),
  toggleReaction: (messageId: string, emoji: string) => request(`/messages/${messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),
  deleteMessage: (messageId: string) => request(`/messages/${messageId}`, { method: 'DELETE' }),

  uploadFile: async (chatId: string, file: File, text?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    if (text) formData.append('text', text);
    const token = getToken();
    const res = await fetch(`${API_BASE}/messages/${chatId}/messages/file`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error);
    }
    return res.json();
  },

  getFileInfo: (fileId: string) => request(`/files/${fileId}/info`),

  getFileUrl: (fileId: string): string => {
    const token = getToken();
    return `/api/files/${fileId}?token=${token}`;
  },

  getLinkPreview: (url: string) => request('/linkpreview/preview', { method: 'POST', body: JSON.stringify({ url }) }),

  // Rooms
  getRoomToken: (roomName: string) => request('/rooms/token', { method: 'POST', body: JSON.stringify({ roomName }) }),
  getRooms: () => request('/rooms/list'),
  leaveRoom: (roomName: string) => request('/rooms/leave', { method: 'POST', body: JSON.stringify({ roomName }) }),

  // Global search
  globalSearch: (q: string) => request(`/messages/global/search?q=${encodeURIComponent(q)}`),

  // Settings
  getServerSettings: () => request('/settings/server'),
  updateServerSettings: (settings: Record<string, string>) => request('/settings/server', { method: 'PUT', body: JSON.stringify(settings) }),
  getUserSettings: () => request('/settings/me'),
  updateUserSettings: (data: any) => request('/settings/me', { method: 'PUT', body: JSON.stringify(data) }),
  getChatSettings: (chatId: string) => request(`/settings/chat/${chatId}`),
  updateChatSettings: (chatId: string, data: any) => request(`/settings/chat/${chatId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Polls
  createPoll: (chatId: string, question: string, choices: string[], isAnonymous?: boolean) =>
    request(`/polls/${chatId}/polls`, { method: 'POST', body: JSON.stringify({ question, choices, is_anonymous: isAnonymous }) }),
  votePoll: (pollId: string, choiceId: string) =>
    request(`/polls/${pollId}/vote`, { method: 'POST', body: JSON.stringify({ choice_id: choiceId }) }),

  // Channels
  createChannel: (title: string, description?: string) =>
    request('/admin/chats/channel', { method: 'POST', body: JSON.stringify({ title, description }) }),

  // Pin
  pinMessage: (chatId: string, messageId: string) => request(`/chats/${chatId}/pin/${messageId}`, { method: 'POST' }),
  unpinMessage: (chatId: string) => request(`/chats/${chatId}/pin`, { method: 'DELETE' }),

  // Slow mode
  setSlowMode: (chatId: string, seconds: number) => request(`/chats/${chatId}/slow-mode`, { method: 'POST', body: JSON.stringify({ seconds }) }),

  // Pin/unpin chat
  pinChat: (chatId: string) => request(`/chats/${chatId}/pin-chat`, { method: 'POST' }),
  unpinChat: (chatId: string) => request(`/chats/${chatId}/pin-chat`, { method: 'DELETE' }),

  // Schedule message
  scheduleMessage: (chatId: string, text: string, scheduledAt: string) =>
    request(`/chats/${chatId}/schedule`, { method: 'POST', body: JSON.stringify({ text, scheduled_at: scheduledAt }) }),

  // Admin
  adminGetUsers: () => request('/admin/users'),
  adminCreateUser: (username: string, role: string) => request('/admin/users', { method: 'POST', body: JSON.stringify({ username, role }) }),
  adminUpdateUser: (id: string, data: any) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  adminDeleteUser: (id: string) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  adminGetTokens: () => request('/admin/tokens'),
  adminCreateToken: (userId?: string, role?: string) => request('/admin/tokens', { method: 'POST', body: JSON.stringify({ user_id: userId, role }) }),
  adminDisableToken: (id: string) => request(`/admin/tokens/${id}/disable`, { method: 'PATCH' }),

  adminGetChats: () => request('/admin/chats'),
  adminCreateGroup: (title: string, memberIds: string[]) => request('/admin/chats/group', { method: 'POST', body: JSON.stringify({ title, member_ids: memberIds }) }),
  adminDeleteChat: (id: string) => request(`/admin/chats/${id}`, { method: 'DELETE' }),
  adminAddMember: (chatId: string, userId: string) => request(`/admin/chats/${chatId}/members`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  adminRemoveMember: (chatId: string, userId: string) => request(`/admin/chats/${chatId}/members/${userId}`, { method: 'DELETE' }),

  adminGetMessages: (chatId?: string) => {
    const params = chatId ? `?chat_id=${chatId}` : '';
    return request(`/admin/messages${params}`);
  },
  adminDeleteMessage: (id: string) => request(`/admin/messages/${id}`, { method: 'DELETE' }),
};
