import { useState, useEffect } from 'react';
import { t } from '@/lib/i18nCore';

export default function NotificationTab() {
  const [notifPrefs, setNotifPrefs] = useState<{ email: boolean; push: boolean; im: boolean; digest: 'none' | 'daily' | 'weekly' }>(() => {
    try { const raw = localStorage.getItem('tbh-notif-prefs'); return raw ? JSON.parse(raw) : { email: true, push: true, im: false, digest: 'daily' as const }; } catch { return { email: true, push: true, im: false, digest: 'daily' as const }; }
  });
  useEffect(() => { try { localStorage.setItem('tbh-notif-prefs', JSON.stringify(notifPrefs)); } catch { /* quota */ } }, [notifPrefs]);

  return (
    <div className="space-y-3">
      {([
        { key: 'email' as const, label: t('admin.notifEmail'), desc: t('admin.notifEmailDesc') },
        { key: 'push' as const, label: t('admin.notifPush'), desc: t('admin.notifPushDesc') },
        { key: 'im' as const, label: t('admin.notifIM'), desc: t('admin.notifIMDesc') },
      ]).map((item) => (
        <div key={item.key} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
          <div>
            <div className="text-xs font-medium text-text">{item.label}</div>
            <div className="text-[10px] text-text-3">{item.desc}</div>
          </div>
          <button onClick={() => setNotifPrefs((p) => ({ ...p, [item.key]: !p[item.key] }))} className={`relative h-5 w-9 rounded-full transition-colors ${notifPrefs[item.key] ? 'bg-brand-accent' : 'bg-white/10'}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${notifPrefs[item.key] ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
        <div>
          <div className="text-xs font-medium text-text">{t('admin.digestFreq')}</div>
          <div className="text-[10px] text-text-3">{t('admin.digestFreqDesc')}</div>
        </div>
        <select value={notifPrefs.digest} onChange={(e) => setNotifPrefs((p) => ({ ...p, digest: e.target.value as 'none' | 'daily' | 'weekly' }))} className="h-7 rounded-md border border-border bg-bg px-2 text-xs text-text">
          <option value="none">{t('admin.digestNone')}</option>
          <option value="daily">{t('admin.digestDaily')}</option>
          <option value="weekly">{t('admin.digestWeekly')}</option>
        </select>
      </div>
    </div>
  );
}
