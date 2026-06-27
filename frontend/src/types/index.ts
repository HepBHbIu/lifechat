export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  is_active: number;
  created_at: string;
  last_seen_at?: string;
}

export interface Token {
  id: string;
  token: string;
  user_id: string | null;
  role: string;
  is_active: number;
  is_used: number;
  created_at: string;
  used_at: string | null;
  expires_at: string | null;
  username?: string;
}

export interface Chat {
  id: string;
  type: 'private' | 'group' | 'channel';
  title: string | null;
  description?: string;
  created_by: string;
  pinned_message_id?: string | null;
  slow_mode_seconds?: number;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
  last_message_sender?: string;
  unread_count?: number;
  pinned_message?: { id: string; text: string; sender_name: string } | null;
  is_pinned?: number;
}

export interface Reaction {
  emoji: string;
  user_id: string;
  username: string;
}

export interface ReplyTo {
  id: string;
  text: string;
  sender_name: string;
  type: string;
}

export interface ForwardedFrom {
  username: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'voice' | 'video_note' | 'poll' | 'gif' | 'sticker';
  text: string | null;
  file_id: string | null;
  reply_to_id: string | null;
  forwarded_from_id: string | null;
  thread_id: string | null;
  is_spoiler: number;
  auto_delete_seconds: number | null;
  auto_delete_at: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  sender_name: string;
  original_name?: string;
  file_path?: string;
  mime_type?: string;
  file_size?: number;
  reactions?: Reaction[];
  reply_to?: ReplyTo | null;
  forwarded_from?: ForwardedFrom | null;
}

export interface PollChoice {
  id: string;
  text: string;
  sort_order: number;
  vote_count: number;
  voters: string[];
}

export interface Poll {
  id: string;
  message_id: string;
  question: string;
  is_anonymous: number;
  allows_multiple: number;
  choices: PollChoice[];
  total_votes: number;
}

export interface FileUpload {
  id: string;
  original_name: string;
  mime_type: string;
  size: number;
}

export interface ChatMember {
  id: string;
  username: string;
  role: string;
  role_in_chat: string;
  joined_at: string;
}
