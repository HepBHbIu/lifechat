import { getDb } from './database';
import fs from 'fs';
import path from 'path';
import { config } from './config';

export interface RetentionConfig {
  // Local data
  local_messages: number;      // days, -1 = forever
  local_files: number;         // days, -1 = forever

  // Federated data
  federated_messages: number;  // days
  federated_files: number;     // days

  // System data
  federation_peers: number;    // days (inactive peers cleanup)
  invite_links: number;        // days
  read_receipts: number;       // days
  user_keys: number;           // days (inactive users)

  // File size limits
  max_file_size: number;       // bytes
  max_storage_per_server: number; // bytes
}

const DEFAULT_RETENTION: RetentionConfig = {
  local_messages: -1,          // forever
  local_files: 30,             // 30 days
  federated_messages: 7,       // 7 days
  federated_files: 3,          // 3 days
  federation_peers: 30,        // 30 days
  invite_links: 90,            // 90 days
  read_receipts: 30,           // 30 days
  user_keys: 365,              // 1 year
  max_file_size: 50 * 1024 * 1024,  // 50MB
  max_storage_per_server: 5 * 1024 * 1024 * 1024,  // 5GB
};

let retentionConfig: RetentionConfig = DEFAULT_RETENTION;

export function initRetention(): void {
  const db = getDb();

  // Create retention config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS retention_config (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    );
  `);

  // Load or create config
  const rows = db.prepare('SELECT * FROM retention_config').all() as any[];
  if (rows.length > 0) {
    for (const row of rows) {
      (retentionConfig as any)[row.key] = row.value;
    }
  } else {
    // Insert defaults
    for (const [key, value] of Object.entries(DEFAULT_RETENTION)) {
      db.prepare('INSERT OR IGNORE INTO retention_config (key, value) VALUES (?, ?)').run(key, value);
    }
  }

  console.log('[Retention] Config loaded:', retentionConfig);
}

export function getRetentionConfig(): RetentionConfig {
  return { ...retentionConfig };
}

export function updateRetentionConfig(key: string, value: number): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO retention_config (key, value) VALUES (?, ?)').run(key, value);
  (retentionConfig as any)[key] = value;
}

// Cleanup old messages
export function cleanupOldMessages(): void {
  const db = getDb();
  const now = new Date();

  // Cleanup federated messages
  if (retentionConfig.federated_messages > 0) {
    const cutoff = new Date(now.getTime() - retentionConfig.federated_messages * 86400000);
    const result = db.prepare(`
      DELETE FROM messages
      WHERE chat_id IN (SELECT id FROM chats WHERE type = 'federated')
      AND created_at < ?
    `).run(cutoff.toISOString());
    if (result.changes > 0) {
      console.log(`[Retention] Cleaned ${result.changes} old federated messages`);
    }
  }

  // Cleanup local messages (if configured)
  if (retentionConfig.local_messages > 0) {
    const cutoff = new Date(now.getTime() - retentionConfig.local_messages * 86400000);
    const result = db.prepare(`
      DELETE FROM messages
      WHERE chat_id NOT IN (SELECT id FROM chats WHERE type = 'federated')
      AND created_at < ?
    `).run(cutoff.toISOString());
    if (result.changes > 0) {
      console.log(`[Retention] Cleaned ${result.changes} old local messages`);
    }
  }
}

// Cleanup old files
export function cleanupOldFiles(): void {
  const db = getDb();
  const now = new Date();

  // Cleanup federated files
  if (retentionConfig.federated_files > 0) {
    const cutoff = new Date(now.getTime() - retentionConfig.federated_files * 86400000);
    const files = db.prepare(`
      SELECT f.* FROM files f
      JOIN messages m ON f.id = m.file_id
      WHERE m.chat_id IN (SELECT id FROM chats WHERE type = 'federated')
      AND f.created_at < ?
    `).all(cutoff.toISOString()) as any[];

    for (const file of files) {
      // Delete physical file
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      // Delete from DB
      db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
    }

    if (files.length > 0) {
      console.log(`[Retention] Cleaned ${files.length} old federated files`);
    }
  }

  // Cleanup local files (if configured)
  if (retentionConfig.local_files > 0) {
    const cutoff = new Date(now.getTime() - retentionConfig.local_files * 86400000);
    const files = db.prepare(`
      SELECT f.* FROM files f
      WHERE f.created_at < ?
    `).all(cutoff.toISOString()) as any[];

    for (const file of files) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
    }

    if (files.length > 0) {
      console.log(`[Retention] Cleaned ${files.length} old local files`);
    }
  }
}

// Cleanup old federation data
export function cleanupOldFederationData(): void {
  const db = getDb();
  const now = new Date();

  // Cleanup inactive peers
  if (retentionConfig.federation_peers > 0) {
    const cutoff = new Date(now.getTime() - retentionConfig.federation_peers * 86400000);
    const result = db.prepare(`
      DELETE FROM federation_servers
      WHERE is_online = 0 AND last_seen < ?
    `).run(cutoff.toISOString());
    if (result.changes > 0) {
      console.log(`[Retention] Cleaned ${result.changes} inactive peers`);
    }
  }

  // Cleanup expired invite links
  if (retentionConfig.invite_links > 0) {
    const cutoff = new Date(now.getTime() - retentionConfig.invite_links * 86400000);
    const result = db.prepare(`
      DELETE FROM invite_links
      WHERE created_at < ? AND (expires_at IS NULL OR expires_at < ?)
    `).run(cutoff.toISOString(), now.toISOString());
    if (result.changes > 0) {
      console.log(`[Retention] Cleaned ${result.changes} old invite links`);
    }
  }

  // Cleanup old read receipts
  if (retentionConfig.read_receipts > 0) {
    const cutoff = new Date(now.getTime() - retentionConfig.read_receipts * 86400000);
    const result = db.prepare(`
      DELETE FROM read_receipts
      WHERE read_at < ?
    `).run(cutoff.toISOString());
    if (result.changes > 0) {
      console.log(`[Retention] Cleaned ${result.changes} old read receipts`);
    }
  }
}

// Get storage statistics
export function getStorageStats(): {
  total_messages: number;
  total_files: number;
  total_file_size: number;
  local_messages: number;
  federated_messages: number;
  storage_used: number;
  storage_limit: number;
} {
  const db = getDb();

  const totalMessages = (db.prepare('SELECT COUNT(*) as count FROM messages').get() as any).count;
  const totalFiles = (db.prepare('SELECT COUNT(*) as count FROM files').get() as any).count;
  const totalFileSize = (db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM files').get() as any).total;

  const localMessages = (db.prepare(`
    SELECT COUNT(*) as count FROM messages
    WHERE chat_id NOT IN (SELECT id FROM chats WHERE type = 'federated')
  `).get() as any).count;

  const federatedMessages = (db.prepare(`
    SELECT COUNT(*) as count FROM messages
    WHERE chat_id IN (SELECT id FROM chats WHERE type = 'federated')
  `).get() as any).count;

  return {
    total_messages: totalMessages,
    total_files: totalFiles,
    total_file_size: totalFileSize,
    local_messages: localMessages,
    federated_messages: federatedMessages,
    storage_used: totalFileSize,
    storage_limit: retentionConfig.max_storage_per_server,
  };
}

// Full cleanup (run periodically)
export function runCleanup(): void {
  console.log('[Retention] Running cleanup...');
  cleanupOldMessages();
  cleanupOldFiles();
  cleanupOldFederationData();
  console.log('[Retention] Cleanup complete');
}
