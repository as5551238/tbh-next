import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth, demoLogin, supabaseLogin, supabaseSignup, supabaseResetPassword } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useLocale } from '@/lib/i18n';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
  const { user, login, isAuthenticated: authed } = useAuth();
  const { t } = useLocale();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const hasSupabase = isSupabaseConfigured();

  // Already authenticated
  if (authed || user) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError(t('login.errorEmailPassword'));
      setLoading(false);
      return;
    }

    try {
      if (mode === 'register') {
        if (hasSupabase) {
          await supabaseSignup(email, password, name || email.split('@')[0]);
        }
        await login(email, password);
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('login.errorLoginFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setLoading(true);
    try {
      await demoLogin('Demo User', 'demo@tbh-next.app', 'member');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('login.errorDemoLoginFailed'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError(t('login.errorEnterEmail')); return; }
    setLoading(true);
    setError('');
    try {
      await supabaseResetPassword(email);
      setResetSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('login.errorSendResetFailed'));
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-center text-2xl font-extrabold text-text mb-1">{t('login.title')}</h1>
        <p className="text-center text-sm text-text-3 mb-8">{t('login.subtitle')}</p>

        {/* Mode Tabs */}
        <div className="flex rounded-xl bg-surface p-1 mb-6">
          <button onClick={() => { setMode('login'); setError(''); setResetSent(false); }} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition-all', mode === 'login' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-3 hover:text-text')}>{t('login.login')}</button>
          <button onClick={() => { setMode('register'); setError(''); setResetSent(false); }} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition-all', mode === 'register' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-3 hover:text-text')}>{t('login.register')}</button>
          {hasSupabase && (
            <button onClick={() => { setMode('reset'); setError(''); setResetSent(false); }} className={cn('flex-1 rounded-lg py-2 text-sm font-semibold transition-all', mode === 'reset' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-3 hover:text-text')}>{t('login.reset')}</button>
          )}
        </div>

        {/* Reset Password */}
        {mode === 'reset' ? (
          resetSent ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-success/10 px-4 py-3 text-xs text-success text-center">{t('login.resetEmailSent', { email })}</div>
              <button onClick={() => setMode('login')} className="w-full rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-text-2 hover:border-primary/30">{t('login.backToLogin')}</button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="mb-1.5 block text-xs font-semibold text-text-2">{t('login.email')}</label>
                <input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login.emailPlaceholder')}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-3 focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
              <button type="submit" disabled={loading}
                className={cn('w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-white transition-all', loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-primary/20')}>
                {loading ? t('login.sending') : t('login.sendResetEmail')}
              </button>
            </form>
          )
        ) : (
        /* Login/Register Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="login-name" className="mb-1.5 block text-xs font-semibold text-text-2">{t('login.name')}</label>
              <input id="login-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('login.namePlaceholder')}
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-3 focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
          )}
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-text-2">{t('login.email')}</label>
            <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login.emailPlaceholder')}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-3 focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-text-2">{t('login.password')}</label>
            <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('login.passwordPlaceholder')}
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-3 focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>

          {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}

          <button type="submit" disabled={loading}
            className={cn('w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-white transition-all', loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5')}>
            {loading ? t('login.processing') : mode === 'login' ? t('login.submitLogin') : t('login.submitRegister')}
          </button>
        </form>
        )}

        {mode !== 'reset' && (
          <button onClick={handleDemoLogin}
            className="mt-3 w-full rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-text-2 transition-all hover:border-primary/30 hover:text-text">
            {t('login.demoMode')}
          </button>
        )}

        <p className="mt-4 text-center text-[11px] text-text-3">
          {hasSupabase ? t('login.supabaseConnected') : t('login.supabaseNotConfigured')}
        </p>
      </div>
    </div>
  );
}
