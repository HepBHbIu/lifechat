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
      '#050508': { primary: '#050508', secondary: '#0a0a10' },
      '#08080f': { primary: '#08080f', secondary: '#0c0c16' },
      '#0a0a1a': { primary: '#0a0a1a', secondary: '#0e0e20' },
      '#060d1a': { primary: '#060d1a', secondary: '#0a1428' },
      '#050d0a': { primary: '#050d0a', secondary: '#0a1610' },
      '#0d0818': { primary: '#0d0818', secondary: '#140f25' },
      '#f0f2f5': { primary: '#f0f2f5', secondary: '#ffffff' },
      '#0d0a06': { primary: '#0d0a06', secondary: '#14100a' },
      '#060d14': { primary: '#060d14', secondary: '#0a141e' },
    };
    const bg = bgs[settings.bg_color];
    if (bg) {
      document.documentElement.style.setProperty('--bg-primary', bg.primary);
      document.documentElement.style.setProperty('--bg-secondary', bg.secondary);
    }
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
            <span className="text-3xl font-bold text-white">L</span>
          </div>
          <h1 className="text-xl font-bold mb-3">EchoChat</h1>
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
