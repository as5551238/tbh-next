import { useState, useEffect } from 'react';

export default function EmailSettingsTab() {
  const [emailSettings, setEmailSettings] = useState<{ address: string }>(() => {
    try { const raw = localStorage.getItem('tbh-email-settings'); return raw ? JSON.parse(raw) : { address: '' }; } catch { return { address: '' }; }
  });
  const [emailTestSending, setEmailTestSending] = useState(false);

  useEffect(() => { try { localStorage.setItem('tbh-email-settings', JSON.stringify(emailSettings)); } catch { /* quota */ } }, [emailSettings]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-surface p-3 md:p-4 space-y-3">
        <div className="text-xs font-bold text-text">收件邮箱</div>
        <input type="email" aria-label="收件邮箱" placeholder="your@email.com" value={emailSettings.address} onChange={(e) => setEmailSettings((s) => ({ ...s, address: e.target.value }))} className="h-8 w-full rounded-md border border-border bg-bg px-3 text-xs text-text" />
        <div className="text-[10px] text-text-3">用于接收通知摘要和告警邮件</div>
      </div>
      <div className="rounded-xl border border-border bg-surface p-3 md:p-4 space-y-3">
        <div className="text-xs font-bold text-text">测试发送</div>
        <button onClick={async () => { setEmailTestSending(true); await new Promise((r) => setTimeout(r, 1200)); setEmailTestSending(false); }} disabled={emailTestSending || !emailSettings.address} className="rounded-lg bg-brand-accent px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40">
          {emailTestSending ? '发送中…' : '发送测试邮件'}
        </button>
        <div className="text-[10px] text-text-3">模拟发送一封测试邮件到上方邮箱</div>
      </div>
    </div>
  );
}
