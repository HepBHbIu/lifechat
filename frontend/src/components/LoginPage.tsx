import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const { loginWithPassword, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(username.trim(), password, '');
      } else {
        await loginWithPassword(username.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #08080f 0%, #0c0c16 30%, #12121e 60%, #08080f 100%)' }}>

      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #e94560, transparent 70%)', filter: 'blur(80px)', animation: 'pulse 8s infinite' }} />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #533483, transparent 70%)', filter: 'blur(100px)', animation: 'pulse 10s infinite 2s' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #0f3460, transparent 70%)', filter: 'blur(60px)', animation: 'pulse 6s infinite 1s' }} />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="rounded-[2rem] p-8 sm:p-10"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-[1.25rem] flex items-center justify-center mx-auto mb-5 relative"
              style={{ background: 'linear-gradient(135deg, #e94560, #ff6b81)' }}>
              <div className="absolute inset-0 rounded-[1.25rem] opacity-50" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2), transparent)' }} />
              <span className="text-3xl font-bold text-white relative z-10">L</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #fff, #a0a0b0)' }}>EchoChat</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isRegister ? 'Создайте аккаунт' : 'Войдите в аккаунт'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Логин" autoFocus
              className="w-full px-5 py-4 rounded-2xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль"
              className="w-full px-5 py-4 rounded-2xl text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
            {isRegister && (
              <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                Просто введите логин и пароль
              </p>
            )}
            {error && (
              <div className="px-4 py-3 rounded-2xl text-sm animate-fade-in-up"
                style={{ background: 'rgba(233,69,96,0.12)', border: '1px solid rgba(233,69,96,0.2)', color: '#ff6b81' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading || !username.trim() || !password.trim()}
              className="w-full py-4 rounded-2xl font-semibold text-white transition-all disabled:opacity-30 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #e94560, #d63851)', boxShadow: '0 4px 15px rgba(233,69,96,0.3)' }}>
              {loading ? '...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </form>

          <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="w-full mt-3 py-3 rounded-2xl text-sm transition-all"
            style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)' }}>
          Децентрализованный мессенджер
        </p>
      </div>
    </div>
  );
}
