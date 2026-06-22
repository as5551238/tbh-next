import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured, saveSupabaseConfig } from '@/lib/supabase';
import { t } from '@/lib/i18n';

export default function SupabaseSetupPage() {
  const navigate = useNavigate();
  const navigateTo = useAppStore((s) => s.navigateTo);
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  async function handleTest() {
    if (!url.trim() || !anonKey.trim()) return;
    setStatus('testing');
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(url.trim(), anonKey.trim());
      const { error } = await client.from('members').select('id').limit(1);
      if (error && error.code !== 'PGRST116') throw error;
      setStatus('ok');
    } catch {
      setStatus('fail');
    }
  }

  function handleSave() {
    saveSupabaseConfig(url.trim(), anonKey.trim());
    // Reload to reinitialize supabase client with new credentials
    window.location.href = '/';
  }

  return (
    <div className="flex h-screen items-center justify-center bg-bg p-3 md:p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <h1 className="text-xl font-bold text-text mb-1">{t('setup.title')}</h1>
        <p className="text-sm text-text-3 mb-6">{t('setup.subtitle')}</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="supabase-url" className="mb-1.5 block text-xs font-semibold text-text-2">Supabase URL</label>
            <input
              id="supabase-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xxxx.supabase.co"
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-3 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label htmlFor="supabase-anon-key" className="mb-1.5 block text-xs font-semibold text-text-2">Anon Key</label>
            <input
              id="supabase-anon-key"
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none transition-all placeholder:text-text-3 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={handleTest} disabled={status === 'testing'} className={cn('rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-2 transition-all hover:bg-surface-2',
              status === 'testing' && 'opacity-50 cursor-not-allowed'
            )}>
              {status === 'testing' ? t('setup.testing') : t('setup.testConnection')}
            </button>
            {status === 'ok' && (
              <span className="flex items-center text-sm text-success font-semibold">✅ {t('setup.connectSuccess')}</span>
            )}
            {status === 'fail' && (
              <span className="flex items-center text-sm text-danger font-semibold">❌ {t('setup.connectFail')}</span>
            )}
          </div>

          <button onClick={handleSave} className="w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-primary/20">
            {t('setup.saveAndEnter')}
          </button>

          <button onClick={() => navigate('/workspace/overview')} className="w-full text-center text-xs text-text-3 hover:text-text transition-colors">
            {t('setup.skipOffline')}
          </button>
        </div>
      </div>
    </div>
  );
}
