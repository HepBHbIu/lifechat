import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [inviteCode, setInviteCode] = useState('');
  const [maxFileSize, setMaxFileSize] = useState('50');
  const [serverName, setServerName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getServerSettings().then(s => {
      setSettings(s);
      setInviteCode(s.invite_code || 'letmein2024');
      setMaxFileSize(String(Math.round(parseInt(s.max_file_size || '52428800') / 1048576)));
      setServerName(s.server_name || '');
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      await api.updateServerSettings({
        invite_code: inviteCode,
        max_file_size: String(Number(maxFileSize) * 1048576),
        server_name: serverName,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  return (
    <div className="p-3 space-y-4">
      <h3 className="font-semibold text-sm">Серверные настройки</h3>

      {/* Server name */}
      <div className="space-y-1">
        <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Название сервера</label>
        <input type="text" value={serverName} onChange={e => setServerName(e.target.value)} placeholder="Мой чат"
          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]" />
      </div>

      {/* Invite code */}
      <div className="space-y-1">
        <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Инвайт-код для регистрации</label>
        <div className="flex gap-2">
          <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]" />
          <button onClick={() => { setInviteCode(crypto.randomUUID().slice(0, 8)); }}
            className="px-3 py-2 rounded-xl text-xs bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-secondary)] transition-all">
            Сгенерировать
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-secondary)]">Для регистрации новый пользователь должен ввести этот код</p>
      </div>

      {/* Max file size */}
      <div className="space-y-1">
        <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">Макс. размер файла (МБ)</label>
        <input type="number" value={maxFileSize} onChange={e => setMaxFileSize(e.target.value)} min="1" max="200"
          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]" />
      </div>

      {/* Stats */}
      <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-2">Информация</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[var(--text-secondary)]">Инвайт-код</div>
            <div className="font-mono mt-0.5">{settings.invite_code || '—'}</div>
          </div>
          <div>
            <div className="text-[var(--text-secondary)]">Макс. файл</div>
            <div className="mt-0.5">{Math.round(parseInt(settings.max_file_size || '52428800') / 1048576)} МБ</div>
          </div>
        </div>
      </div>

      <button onClick={handleSave}
        className="w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-all"
        style={{ background: saved ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #e94560, #ff6b81)' }}>
        {saved ? 'Сохранено!' : 'Сохранить'}
      </button>
    </div>
  );
}
