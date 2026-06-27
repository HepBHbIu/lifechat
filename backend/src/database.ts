import Database from 'better-sqlite3';
import path from 'path';
import { config } from './config';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initializeDatabase(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      user_id TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      is_used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      used_at TEXT,
      expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('private', 'group', 'channel')),
      title TEXT,
      description TEXT,
      created_by TEXT NOT NULL,
      pinned_message_id TEXT,
      slow_mode_seconds INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS chat_members (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role_in_chat TEXT NOT NULL DEFAULT 'member',
      is_pinned INTEGER DEFAULT 0,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      removed_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(chat_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text', 'image', 'file', 'audio', 'voice', 'video_note', 'poll', 'gif', 'sticker')),
      text TEXT,
      file_id TEXT,
      reply_to_id TEXT,
      forwarded_from_id TEXT,
      thread_id TEXT,
      is_spoiler INTEGER DEFAULT 0,
      auto_delete_seconds INTEGER,
      auto_delete_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      edited_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
      FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(message_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL UNIQUE,
      question TEXT NOT NULL,
      is_anonymous INTEGER DEFAULT 1,
      allows_multiple INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS poll_choices (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      text TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      choice_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
      FOREIGN KEY (choice_id) REFERENCES poll_choices(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(poll_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS read_receipts (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      read_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(message_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_auto_delete ON messages(auto_delete_at);
    CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON chat_members(chat_id);
    CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens(token);
    CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions(message_id);
    CREATE INDEX IF NOT EXISTS idx_polls_message_id ON polls(message_id);
    CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
  `);

  // Migrations
  const addColumn = (table: string, column: string, definition: string) => {
    try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`); } catch {}
  };
  addColumn('messages', 'reply_to_id', 'TEXT');
  addColumn('messages', 'forwarded_from_id', 'TEXT');
  addColumn('messages', 'thread_id', 'TEXT');
  addColumn('messages', 'is_spoiler', 'INTEGER DEFAULT 0');
  addColumn('messages', 'auto_delete_seconds', 'INTEGER');
  addColumn('messages', 'auto_delete_at', 'TEXT');
  addColumn('chats', 'description', 'TEXT');
  addColumn('chats', 'pinned_message_id', 'TEXT');
  addColumn('chats', 'slow_mode_seconds', 'INTEGER DEFAULT 0');
  addColumn('chat_members', 'is_pinned', 'INTEGER DEFAULT 0');
  addColumn('messages', 'scheduled_at', 'TEXT');
  addColumn('users', 'password_hash', 'TEXT');
  addColumn('users', 'bio', 'TEXT');
  addColumn('users', 'avatar_url', 'TEXT');
}

// Auto-delete expired messages (call periodically)
export function cleanupAutoDeleteMessages(): void {
  const db = getDb();
  const expired = db.prepare("SELECT id FROM messages WHERE auto_delete_at IS NOT NULL AND auto_delete_at <= datetime('now') AND deleted_at IS NULL").all() as any[];
  if (expired.length > 0) {
    const ids = expired.map((m: any) => m.id);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE messages SET deleted_at = datetime('now'), text = NULL, file_id = NULL WHERE id IN (${placeholders})`).run(...ids);
  }
}
