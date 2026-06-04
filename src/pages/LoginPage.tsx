import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isAuthenticated, setAuth } from '@/lib/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasSupabase = isSupabaseConfigured();

  if (isAuthenticated()) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('请输入邮箱和密码');
      setLoading(false);
      return;
    }

    try {
      if (hasSupabase && supabase) {
        if (mode === 'login') {
          const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
          if (authError) throw authError;
        } else {
          const { error: authError } = await supabase.auth.signUp({ email, password });
          if (authError) throw authError;
        }
      }
      // Always set local auth flag (Supabase session handled by listener)
      setAuth(true);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? '登录失败');
    } finally {
      setLoading(false);
    }
  }

  function handleDemoLogin() {
    setAuth(true);
    navigate('/', { replace: true });
  }

  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-2xl font-extrabold text-white shadow-lg shadow-primary/20">T</div>
        </div>
        <h1 className="text-center text-2xl font-extrabold text-text mb-1">TBH Next</h1>
        <p className="text-center text-sm text-text-3 mb-8">AI 原生团队管理平台</p>

        {/* Mode Tabs */}
        <div className="flex rounded-xl bg-surface p-1 mb-6">
          <button onClick={() => setMode('login')} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition-all', mode === 'login' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-3 hover:text-text')}>登录</button>
          <button onClick={() => setMode('register')} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition-all', mode === 'register' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-3 hover:text-text')}>注册</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-2">邮箱</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-3 focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-2">密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-3 focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>

          {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

          <button type="submit" disabled={loading}
            className={cn('w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-white transition-all', loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5')}>
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        {!hasSupabase && (
          <button onClick={handleDemoLogin}
            className="mt-3 w-full rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-text-2 transition-all hover:border-primary/30 hover:text-text">
            体验 Demo 模式
          </button>
        )}

        <p className="mt-4 text-center text-[11px] text-text-3">
          {hasSupabase ? 'Supabase 已连接 · 真实数据模式' : 'Supabase 未配置 · Demo 模式'}
        </p>
      </div>
    </div>
  );
}
