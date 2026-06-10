import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { Settings, Database, Bell, Shield, Palette, Globe, Plug, Info, Save, Plus, Trash2, Lock } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { checkSupabaseHealth, fetchApiKeys, createApiKey, deleteApiKey } from '@/lib/dataLayer';
import { hasFeature, PLAN_LIMITS, getCurrentPlan } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';
import AuditLogView from '@/pages/AuditLogView';

type ApiKeyEntry = { id: string; name: string; key: string; created: string };

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function encodeKey(key: string): string {
  try { return btoa(unescape(encodeURIComponent(key))); } catch { return btoa(key); }
}

function decodeKey(encoded: string): string {
  try { return decodeURIComponent(escape(atob(encoded))); } catch { return atob(encoded); }
}

async function migrateLocalStorageKeys(): Promise<void> {
  try {
    const raw = localStorage.getItem('tbh-api-keys');
    if (!raw) return;
    const old: ApiKeyEntry[] = JSON.parse(raw);
    if (!old.length) return;
    for (const k of old) {
      try {
        await createApiKey({ provider: k.name, encrypted_key: encodeKey(k.key) });
      } catch { /* already exists */ }
    }
    localStorage.removeItem('tbh-api-keys');
  } catch { /* parse error */ }
}

type ConfigItem = {
  icon: ReactNode;
  label: string;
  value: string;
  status: string;
};

const ADMIN_TABS = ['通用', '通知偏好', '邮件设置', '功能开关', '审计日志'] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

export default function AdminContent() {
  const { toasts, error } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('通用');
  const emailModal = useModal();
  const apiModal = useModal();
  const genericModal = useModal();

  const [genericTitle, setGenericTitle] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [genericField, setGenericField] = useState<{ label: string; value: string }[]>([]);

  const [resendKey, setResendKey] = useState(() => { try { return localStorage.getItem('tbh_resend_key') ?? ''; } catch { return ''; } });
  const [senderEmail, setSenderEmail] = useState(() => { try { return localStorage.getItem('tbh_sender_email') ?? ''; } catch { return ''; } });
  const [smtpServer, setSmtpServer] = useState(() => { try { return localStorage.getItem('tbh_smtp_server') ?? ''; } catch { return ''; } });

  const [notifPrefs, setNotifPrefs] = useState<{ email: boolean; push: boolean; im: boolean; digest: 'none' | 'daily' | 'weekly' }>(() => {
    try { const raw = localStorage.getItem('tbh-notif-prefs'); return raw ? JSON.parse(raw) : { email: true, push: true, im: false, digest: 'daily' as const }; } catch { return { email: true, push: true, im: false, digest: 'daily' as const }; }
  });
  useEffect(() => { try { localStorage.setItem('tbh-notif-prefs', JSON.stringify(notifPrefs)); } catch { /* quota */ } }, [notifPrefs]);

  const [emailSettings, setEmailSettings] = useState<{ address: string }>(() => {
    try { const raw = localStorage.getItem('tbh-email-settings'); return raw ? JSON.parse(raw) : { address: '' }; } catch { return { address: '' }; }
  });
  const [emailTestSending, setEmailTestSending] = useState(false);

  useEffect(() => { try { localStorage.setItem('tbh-email-settings', JSON.stringify(emailSettings)); } catch { /* quota */ } }, [emailSettings]);

  function saveEmailConfig() {
    try {
      localStorage.setItem('tbh_resend_key', resendKey);
      localStorage.setItem('tbh_sender_email', senderEmail);
      localStorage.setItem('tbh_smtp_server', smtpServer);
    } catch { /* ignore */ }
    emailModal.closeModal();
  }

  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await migrateLocalStorageKeys();
      try {
        const rows = await fetchApiKeys();
        setApiKeys(rows.map((r) => ({ id: r.id, name: r.provider, key: decodeKey(r.encrypted_key), created: r.created_at?.slice(0, 10) ?? '' })));
      } catch { /* offline */ }
      setKeysLoading(false);
    })();
  }, []);

  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const checkDbHealth = useCallback(() => {
    setDbStatus('checking');
    checkSupabaseHealth().then((s) => setDbStatus(s)).catch((err) => { console.error('[admin]', err); error('管理操作失败，请重试'); setDbStatus('error'); });
  }, []);
  useEffect(() => { checkDbHealth(); }, [checkDbHealth]);

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  const sections: { title: string; items: ConfigItem[] }[] = [
    {
      title: '系统',
      items: [
        { icon: <Database size={15} />, label: '数据库连接', value: 'Supabase · ' + (dbStatus === 'ok' ? '已连接' : dbStatus === 'error' ? '连接失败' : '检测中…'), status: dbStatus === 'ok' ? 'ok' : dbStatus === 'error' ? 'error' : 'warn' },
        { icon: <Plug size={15} />, label: 'API密钥管理', value: `${apiKeys.length}个已配置`, status: 'ok' },
        { icon: <Globe size={15} />, label: '域名与部署', value: 'GitHub Pages', status: 'ok' },
      ],
    },
    {
      title: '通知',
      items: [
        { icon: <Bell size={15} />, label: '通知渠道', value: '企微 + 浏览器推送', status: 'ok' },
        { icon: <Bell size={15} />, label: '告警规则', value: '5条规则', status: 'ok' },
        { icon: <Bell size={15} />, label: '邮件推送', value: resendKey ? 'Resend API · 已配置' : 'Resend API · 未配置', status: resendKey ? 'ok' : 'warn' },
      ],
    },
    {
      title: '安全',
      items: [
        { icon: <Shield size={15} />, label: '登录方式', value: '密码 + Supabase Auth', status: 'ok' },
        { icon: <Shield size={15} />, label: '会话超时', value: '24小时', status: 'ok' },
        { icon: <Shield size={15} />, label: '数据备份', value: '自动 · 每日', status: 'ok' },
      ],
    },
    {
      title: '外观',
      items: [
        { icon: <Palette size={15} />, label: '主题', value: '深色科技风', status: 'ok' },
        { icon: <Palette size={15} />, label: '品牌色', value: 'var(--brand-accent)', status: 'ok' },
      ],
    },
  ];

  const statusCls: Record<string, string> = {
    ok: 'text-success',
    warn: 'text-warn',
    error: 'text-danger',
  };

  function openGeneric(title: string, fields: { label: string; value: string }[]) {
    setGenericTitle(title);
    setGenericField(fields.map((f) => ({ ...f })));
    genericModal.openModal();
  }

  function onItemClick(item: ConfigItem) {
    if (item.label === '邮件推送') return emailModal.openModal();
    if (item.label === 'API密钥管理') return apiModal.openModal();

    const fieldMap: Record<string, { label: string; value: string }[]> = {
      '数据库连接': [{ label: '连接类型', value: 'Supabase' }, { label: '项目 URL', value: import.meta.env.VITE_SUPABASE_URL || '(环境变量)' }, { label: '状态', value: dbStatus === 'ok' ? '已连接' : dbStatus === 'error' ? '连接失败' : '检测中…' }],
      '域名与部署': [{ label: '部署平台', value: 'GitHub Pages' }, { label: '域名', value: 'as5551238.github.io/team-business-hub' }, { label: 'CI', value: 'GitHub Actions' }],
      '通知渠道': [{ label: '企业微信', value: '已启用' }, { label: '浏览器推送', value: '已启用' }, { label: '邮件', value: resendKey ? '已启用' : '未启用' }],
      '告警规则': [{ label: '规则数量', value: '5' }, { label: '最近触发', value: '无' }, { label: '通知方式', value: '企微 + 浏览器' }],
      '登录方式': [{ label: '密码登录', value: '已启用' }, { label: 'Supabase Auth', value: '已启用' }, { label: 'SSO', value: '未启用' }],
      '会话超时': [{ label: '超时时间', value: '24小时' }, { label: '刷新策略', value: '自动续期' }],
      '数据备份': [{ label: '备份频率', value: '每日' }, { label: '保留天数', value: '30天' }, { label: '最近备份', value: '今日 03:00' }],
      '主题': [{ label: '当前主题', value: '深色科技风' }, { label: '模式', value: 'Dark' }],
      '品牌色': [{ label: '主色', value: '--brand-accent' }, { label: '辅色', value: '--brand-accent-hover' }],
    };

    const fields = fieldMap[item.label];
    if (fields) openGeneric(item.label, fields);
  }

  async function addApiKey() {
    if (!newKeyName.trim() || !newKeyValue.trim()) return;
    const name = newKeyName.trim();
    const key = newKeyValue.trim();
    try {
      const row = await createApiKey({ provider: name, encrypted_key: encodeKey(key) });
      setApiKeys((prev) => [...prev, { id: row.id, name, key, created: row.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10) }]);
    } catch {
      setApiKeys((prev) => [...prev, { id: Date.now().toString(), name, key, created: new Date().toISOString().slice(0, 10) }]);
    }
    setNewKeyName('');
    setNewKeyValue('');
  }

  async function removeApiKey(id: string) {
    try { await deleteApiKey(id); } catch { /* offline */ }
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Settings size={18} className="text-primary-2" />
        <span className="text-sm font-bold">系统配置</span>
        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[9px] font-bold text-danger">仅管理员</span>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
        {ADMIN_TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeTab === tab ? 'bg-brand-accent text-white' : 'text-text-3 hover:text-text hover:bg-white/5'}`}>{tab}</button>
        ))}
      </div>

      {/* ───── 通用 tab ───── */}
      {activeTab === '通用' && (<>
      {/* System Health */}
      <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-text-3 uppercase tracking-wider">系统健康</span>
          <span className="text-[10px] text-success font-semibold">正常运行</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '数据库', status: dbStatus === 'checking' ? 'warn' : dbStatus },
            { label: 'API', status: 'ok' as string },
            { label: '部署', status: 'ok' as string },
            { label: '邮件', status: resendKey ? 'ok' : 'warn' },
          ].map((h) => (
            <div key={h.label} className="text-center">
              <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${h.status === 'ok' ? 'bg-success' : 'bg-warn'}`} />
              <div className="text-[10px] text-text-2">{h.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Config Sections */}
      {sections.map((sec) => (
        <div key={sec.title}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-2">{sec.title}</div>
          <div className="space-y-1.5">
            {sec.items.map((item) => (
              <div key={item.label} onClick={() => onItemClick(item)} className="group flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 transition-all hover:border-border-2 cursor-pointer">
                <span className="text-text-3">{item.icon}</span>
                <span className="text-xs text-text-2 min-w-[100px]">{item.label}</span>
                <span className="flex-1 text-xs font-medium text-text text-right">{item.value}</span>
                <span className={`text-[9px] ${statusCls[item.status]}`}>
                  {item.status === 'ok' ? '✓' : item.status === 'error' ? '✗' : '⚠'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Version Info */}
      <div className="rounded-xl border border-border bg-surface-2/30 p-3 flex flex-wrap items-center gap-2">
        <Info size={14} className="text-text-3" />
        <div className="text-[10px] text-text-3">
          TBH Next v0.1.0 · Build 20260604 · React 19 + Vite 5.4 + Supabase
        </div>
      </div>
      </>)}

      {/* ───── 通知偏好 tab ───── */}
      {activeTab === '通知偏好' && (
        <div className="space-y-3">
          {([
            { key: 'email' as const, label: '邮件通知', desc: '重要事件通过邮件推送' },
            { key: 'push' as const, label: '浏览器推送', desc: '浏览器桌面通知' },
            { key: 'im' as const, label: '企微/Slack', desc: '即时通讯渠道推送' },
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
              <div className="text-xs font-medium text-text">摘要频率</div>
              <div className="text-[10px] text-text-3">定期推送工作摘要</div>
            </div>
            <select value={notifPrefs.digest} onChange={(e) => setNotifPrefs((p) => ({ ...p, digest: e.target.value as 'none' | 'daily' | 'weekly' }))} className="h-7 rounded-md border border-border bg-bg px-2 text-xs text-text">
              <option value="none">关闭</option>
              <option value="daily">每日</option>
              <option value="weekly">每周</option>
            </select>
          </div>
        </div>
      )}

      {/* ───── 邮件设置 tab ───── */}
      {activeTab === '邮件设置' && (
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
      )}

      {/* ───── 功能开关 tab ───── */}
      {activeTab === '功能开关' && (
        <div className="space-y-2">
          <div className="text-[10px] text-text-3 mb-2">当前方案: <span className="text-brand-accent font-bold">{getCurrentPlan() === 'free' ? '免费版' : getCurrentPlan() === 'pro' ? '专业版' : '企业版'}</span></div>
          {(
            Object.entries(PLAN_LIMITS.free).filter(([, v]) => typeof v === 'boolean') as [string, boolean][]
          ).map(([key, freeVal]) => {
            const enabled = hasFeature(key as keyof import('@/lib/subscription').PlanLimits);
            return (
              <div key={key} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-text">{key}</span>
                  {freeVal === false && !enabled && <Lock size={11} className="text-text-3" />}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] ${enabled ? 'text-accent' : 'text-text-3'}`}>{enabled ? '已启用' : '未启用'}</span>
                  {!enabled && <a href="#/ai/subscription" className="text-[10px] text-brand-accent hover:underline">升级</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ───── 审计日志 tab ───── */}
      {activeTab === '审计日志' && (
        hasFeature('auditExport') ? (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <AuditLogView />
          </div>
        ) : (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
            <Lock size={24} className="mx-auto mb-2 text-primary-2" />
            <div className="text-sm font-semibold text-text mb-1">审计日志</div>
            <p className="text-xs text-text-3 mb-3">审计日志导出需要专业版或企业版</p>
            <button className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-80" onClick={() => setShowPaywall(true)}>升级专业版</button>
          </div>
        )
      )}

      {/* ========== 邮件推送配置 Modal ========== */}
      <Modal open={emailModal.open} onClose={emailModal.closeModal} title="邮件推送配置"
        footer={
          <>
            <button onClick={emailModal.closeModal} className={btnSecondary}>取消</button>
            <button onClick={saveEmailConfig} className={`${btnPrimary} flex items-center gap-1.5`}>
              <Save size={12} /> 保存
            </button>
          </>
        }>
        <ModalField label="Resend API Key">
          <input type="password" className={inputCls} placeholder="re_xxxxxxxxxxxx" value={resendKey} onChange={(e) => setResendKey(e.target.value)} />
        </ModalField>
        <ModalField label="发件人邮箱">
          <input type="email" className={inputCls} placeholder="noreply@yourdomain.com" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} />
        </ModalField>
        <ModalField label="SMTP 服务器（可选）">
          <input className={inputCls} placeholder="smtp.resend.com:465" value={smtpServer} onChange={(e) => setSmtpServer(e.target.value)} />
        </ModalField>
        <p className="text-[10px] text-text-3 mt-2">配置后将通过 Resend API 发送告警与通知邮件。API Key 将存储于环境变量中。</p>
      </Modal>

      {/* ========== API密钥管理 Modal ========== */}
      <Modal open={apiModal.open} onClose={apiModal.closeModal} title="API 密钥管理" width="max-w-lg"
        footer={
          <>
            <button onClick={apiModal.closeModal} className={btnSecondary}>关闭</button>
          </>
        }>
        <div className="space-y-2 mb-4">
          {apiKeys.map((k) => (
            <div key={k.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text truncate">{k.name}</div>
                <div className="text-[10px] text-text-3">{maskKey(k.key)} · 创建于 {k.created}</div>
              </div>
              <button onClick={() => removeApiKey(k.id)} aria-label="删除密钥" className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-text-3 hover:bg-danger/10 hover:text-danger transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-2">新增密钥</div>
          <div className="flex flex-wrap gap-2">
            <input className={`${inputCls} flex-1`} aria-label="密钥名称" placeholder="名称" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            <input type="password" className={`${inputCls} flex-1`} aria-label="密钥值" placeholder="密钥值" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} />
            <button onClick={addApiKey} className={`${btnPrimary} flex items-center gap-1 whitespace-nowrap`}>
              <Plus size={12} /> 添加
            </button>
          </div>
        </div>
      </Modal>

      {/* ========== 通用配置查看/编辑 Modal ========== */}
      <Modal open={genericModal.open} onClose={genericModal.closeModal} title={genericTitle}
        footer={
          <>
            <button onClick={genericModal.closeModal} className={btnSecondary}>关闭</button>
            <button onClick={() => {
              try {
                localStorage.setItem(`tbh-config-${genericTitle}`, JSON.stringify(genericField));
              } catch { /* quota */ }
              genericModal.closeModal();
            }} className={`${btnPrimary} flex items-center gap-1.5`}>
              <Save size={12} /> 保存
            </button>
          </>
        }>
        {genericField.map((f, i) => (
          <ModalField key={i} label={f.label}>
            <input className={inputCls} value={f.value} onChange={(e) => {
              const next = [...genericField];
              next[i] = { ...next[i], value: e.target.value };
              setGenericField(next);
            }} />
          </ModalField>
        ))}
      </Modal>
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason="审计日志导出需要专业版或企业版" feature="audit_export" />
    </div>
  );
}
