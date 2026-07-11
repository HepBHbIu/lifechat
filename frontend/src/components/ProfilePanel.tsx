import { useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';
import { usePushNotifications } from '../hooks/usePushNotifications';

const ACCENT_COLORS = [
  { name: 'Красный', value: '#e94560', gradient: 'linear-gradient(135deg, #e94560, #ff6b81)' },
  { name: 'Синий', value: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)' },
  { name: 'Зелёный', value: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
  { name: 'Фиолетовый', value: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
  { name: 'Оранжевый', value: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  { name: 'Розовый', value: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #f472b6)' },
  { name: 'Бирюзовый', value: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)' },
  { name: 'Индиго', value: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
  { name: 'Лайм', value: '#84cc16', gradient: 'linear-gradient(135deg, #84cc16, #a3e635)' },
  { name: 'Коралл', value: '#f87171', gradient: 'linear-gradient(135deg, #f87171, #fca5a5)' },
  { name: 'Серый', value: '#6b7280', gradient: 'linear-gradient(135deg, #6b7280, #9ca3af)' },
  { name: 'Белый', value: '#e5e7eb', gradient: 'linear-gradient(135deg, #e5e7eb, #f3f4f6)' },
];

const BG_COLORS = [
  { name: 'Космос', value: '#050508', secondary: '#0a0a10' },
  { name: 'Тёмный', value: '#08080f', secondary: '#0c0c16' },
  { name: 'Индиго', value: '#0a0a1a', secondary: '#0e0e20' },
  { name: 'Синий', value: '#060d1a', secondary: '#0a1428' },
  { name: 'Зелёный', value: '#050d0a', secondary: '#0a1610' },
  { name: 'Фиолетовый', value: '#0d0818', secondary: '#140f25' },
  { name: 'Светлый', value: '#f0f2f5', secondary: '#ffffff' },
  { name: 'Сепия', value: '#0d0a06', secondary: '#14100a' },
  { name: 'Ледяной', value: '#060d14', secondary: '#0a141e' },
];

interface Props {
  user: User;
  token: string;
  onClose: () => void;
}

export default function ProfilePanel({ user, token, onClose }: Props) {
  const [bio, setBio] = useState('');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'theme' | 'notifications' | 'privacy'>('profile');
  const { supported, subscribed, subscribe, unsubscribe } = usePushNotifications(token);

  useEffect(() => {
    api.getUserSettings().then((data: any) => {
      if (data.bio) setBio(data.bio);
      if (data.settings) setSettings(data.settings);
      // Apply saved theme
      if (data.settings?.accent_color) applyAccent(data.settings.accent_color);
      if (data.settings?.bg_color) applyBg(data.settings.bg_color);
    }).catch(() => {});
  }, []);

  const applyAccent = (color: string) => {
    document.documentElement.style.setProperty('--accent', color);
    // Generate hover color (lighter)
    const hover = color + 'cc';
    document.documentElement.style.setProperty('--accent-hover', hover);
    document.documentElement.style.setProperty('--accent-glow', color + '40');
  };

  const applyBg = (value: string) => {
    const bg = BG_COLORS.find(b => b.value === value);
    if (bg) {
      document.documentElement.style.setProperty('--bg-primary', bg.value);
      document.documentElement.style.setProperty('--bg-secondary', bg.secondary);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      await api.updateUserSettings({ settings: { [key]: value } });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {}
  };

  const saveProfile = async () => {
    try {
      await api.updateUserSettings({ bio });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {}
  };

  const formatDate = (d?: string) => d ? new Date(d + 'Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  const formatDateTime = (d?: string) => d ? new Date(d + 'Z').toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  const sections = [
    { key: 'profile' as const, label: 'Профиль', icon: '👤' },
    { key: 'theme' as const, label: 'Тема', icon: '🎨' },
    { key: 'notifications' as const, label: 'Звуки', icon: '🔔' },
    { key: 'privacy' as const, label: 'Приватность', icon: '🔒' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <button onClick={onClose} className="p-2 -ml-1 rounded-xl hover:bg-white/5 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="font-semibold text-sm">Настройки</h2>
        {saved && <span className="text-xs ml-auto" style={{ color: '#22c55e' }}>✓ Сохранено</span>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile */}
        {activeSection === 'profile' && (
          <div className="p-4 space-y-4 animate-fade-in-up">
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-white"
                style={{ background: settings.accent_color ? `linear-gradient(135deg, ${settings.accent_color}, ${settings.accent_color}cc)` : 'linear-gradient(135deg, #e94560, #ff6b81)', boxShadow: `0 4px 20px ${settings.accent_color || '#e94560'}40` }}>
                {user.username[0].toUpperCase()}
              </div>
              <h3 className="text-lg font-bold">{user.username}</h3>
              <span className="inline-flex items-center gap-1 mt-1 px-3 py-1 rounded-full text-[11px] font-medium"
                style={{ background: user.role === 'admin' ? 'rgba(233,69,96,0.15)' : 'rgba(255,255,255,0.05)', color: user.role === 'admin' ? '#ff6b81' : 'var(--text-secondary)' }}>
                {user.role === 'admin' ? '👑 Администратор' : '👤 Пользователь'}
              </span>
            </div>

            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>О себе</div>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Расскажите о себе..."
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none" rows={2} />
              <button onClick={saveProfile} className="mt-2 w-full py-2 rounded-xl text-xs font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}>Сохранить</button>
            </div>

            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Информация</div>
              <div className="space-y-2 text-sm">
                <Row l="Имя" v={user.username} />
                <Row l="Роль" v={user.role === 'admin' ? 'Администратор' : 'Пользователь'} />
                <Row l="Регистрация" v={formatDate(user.created_at)} />
                <Row l="Последний вход" v={formatDateTime(user.last_seen_at)} />
              </div>
            </div>
          </div>
        )}

        {/* Theme */}
        {activeSection === 'theme' && (
          <div className="p-4 space-y-4 animate-fade-in-up">
            <h3 className="font-semibold text-sm">Цвет акцента</h3>
            <div className="grid grid-cols-4 gap-2">
              {ACCENT_COLORS.map(c => (
                <button key={c.value} onClick={() => { saveSetting('accent_color', c.value); applyAccent(c.value); }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:scale-105"
                  style={{ background: settings.accent_color === c.value ? 'rgba(255,255,255,0.08)' : 'transparent', border: settings.accent_color === c.value ? `2px solid ${c.value}` : '2px solid transparent' }}>
                  <div className="w-8 h-8 rounded-full" style={{ background: c.gradient, boxShadow: `0 2px 8px ${c.value}40` }} />
                  <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                </button>
              ))}
            </div>

            <h3 className="font-semibold text-sm mt-4">Фон</h3>
            <div className="grid grid-cols-3 gap-2">
              {BG_COLORS.map(c => (
                <button key={c.value} onClick={() => { saveSetting('bg_color', c.value); applyBg(c.value); }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:scale-105"
                  style={{ background: settings.bg_color === c.value ? 'rgba(255,255,255,0.08)' : 'transparent', border: settings.bg_color === c.value ? '2px solid var(--accent)' : '2px solid transparent' }}>
                  <div className="w-full h-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${c.value}, ${c.secondary})`, border: '1px solid rgba(255,255,255,0.1)' }} />
                  <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                </button>
              ))}
            </div>

            <h3 className="font-semibold text-sm mt-4">Размер текста</h3>
            <div className="space-y-2">
              <input type="range" min="12" max="20" step="2"
                value={parseInt(settings.font_size || '15')}
                onChange={(e) => { const v = e.target.value + 'px'; saveSetting('font_size', v); document.documentElement.style.setProperty('--msg-font-size', v); }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent) ' + ((parseInt(settings.font_size || '15') - 12) / 8 * 100) + '%, rgba(255,255,255,0.1) ' + ((parseInt(settings.font_size || '15') - 12) / 8 * 100) + '%)' }} />
              <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                <span>12</span>
                <span>14</span>
                <span style={{ color: 'var(--accent)' }}>16</span>
                <span>18</span>
                <span>20</span>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeSection === 'notifications' && (
          <div className="p-4 space-y-3 animate-fade-in-up">
            <h3 className="font-semibold text-sm mb-2">Звуки и уведомления</h3>
            <Toggle label="Звук отправки" value={settings.sound_send !== 'off'} onChange={v => saveSetting('sound_send', v ? 'on' : 'off')} />
            <Toggle label="Звук получения" value={settings.sound_receive !== 'off'} onChange={v => saveSetting('sound_receive', v ? 'on' : 'off')} />
            <Toggle label="Звук реакции" value={settings.sound_reaction !== 'off'} onChange={v => saveSetting('sound_reaction', v ? 'on' : 'off')} />
            <Toggle label="Звук набора" value={settings.sound_typing !== 'off'} onChange={v => saveSetting('sound_typing', v ? 'on' : 'off')} />
            {supported && (
              <Toggle
                label="Push-уведомления"
                value={subscribed}
                onChange={async (v) => {
                  if (v) await subscribe();
                  else await unsubscribe();
                }}
              />
            )}
            <Toggle label="Показывать текст" value={settings.notify_preview !== 'off'} onChange={v => saveSetting('notify_preview', v ? 'on' : 'off')} />
          </div>
        )}

        {/* Privacy */}
        {activeSection === 'privacy' && (
          <div className="p-4 space-y-3 animate-fade-in-up">
            <h3 className="font-semibold text-sm mb-2">Приватность</h3>
            <Toggle label="Показывать «в сети»" value={settings.show_online !== 'off'} onChange={v => saveSetting('show_online', v ? 'on' : 'off')} />
            <Toggle label="Показывать время входа" value={settings.show_last_seen !== 'off'} onChange={v => saveSetting('show_last_seen', v ? 'on' : 'off')} />
            <Toggle label="Отправлять read-ceipts" value={settings.read_receipts !== 'off'} onChange={v => saveSetting('read_receipts', v ? 'on' : 'off')} />
            <Toggle label="Показывать статус «печатает»" value={settings.show_typing !== 'off'} onChange={v => saveSetting('show_typing', v ? 'on' : 'off')} />
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="border-t border-white/[0.03] p-2">
        <div className="flex gap-1">
          {sections.map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] transition-all ${activeSection === s.key ? 'text-[var(--accent)]' : ''}`}
              style={{ background: activeSection === s.key ? 'rgba(233,69,96,0.1)' : 'transparent' }}>
              <span className="text-base">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return <div className="flex justify-between items-center"><span style={{ color: 'var(--text-secondary)' }}>{l}</span><span>{v}</span></div>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <span className="text-sm">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-all relative`}
        style={{ background: value ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }}>
        <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all"
          style={{ left: value ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
      </button>
    </div>
  );
}
