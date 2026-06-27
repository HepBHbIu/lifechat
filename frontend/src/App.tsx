import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import ChatLayout from './components/ChatLayout';
import { api } from './api/client';

function applyTheme(settings: Record<string, string>) {
  if (settings.accent_color) {
    document.documentElement.style.setProperty('--accent', settings.accent_color);
    document.documentElement.style.setProperty('--accent-hover', settings.accent_color + 'cc');
    document.documentElement.style.setProperty('--accent-glow', settings.accent_color + '40');
  }
  if (settings.bg_color) {
    const bgs: Record<string, { primary: string; secondary: string }> = {
      '#08080f': { primary: '#08080f', secondary: '#0c0c16' },
      '#0f0f1a': { primary: '#0f0f1a', secondary: '#141425' },
      '#0a1628': { primary: '#0a1628', secondary: '#0f1f35' },
      '#0a1a15': { primary: '#0a1a15', secondary: '#0f251c' },
      '#120a20': { primary: '#120a20', secondary: '#1a1030' },
      '#f0f2f5': { primary: '#f0f2f5', secondary: '#ffffff' },
    };
    const bg = bgs[settings.bg_color];
    if (bg) {
      document.documentElement.style.setProperty('--bg-primary', bg.primary);
      document.documentElement.style.setProperty('--bg-secondary', bg.secondary);
    }
  }
  if (settings.font_size) {
    document.documentElement.style.setProperty('--msg-font-size', settings.font_size);
  }
}

function AppContent() {
  const { user, loading } = useAuth();

  useEffect(() => {
    const theme = localStorage.getItem('chat_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    if (user) {
      api.getUserSettings().then((data: any) => {
        if (data.settings) applyTheme(data.settings);
      }).catch(() => {});
    }
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #e94560, #ff6b81)', boxShadow: '0 8px 30px rgba(233,69,96,0.3)' }}>
            <svg className="w-10 h-10 text-white animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.142.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-3">LifeChat</h1>
          <div className="flex gap-2 justify-center">
            {[0, 0.15, 0.3].map((d, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)', animation: `pulse 1.2s infinite ${d}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return user ? <ChatLayout /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
