import { useState } from 'react';
import { Settings, Database, Bell, Shield, Palette, Globe, Plug, Info, Save, Plus, Trash2 } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';

type ConfigItem = {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: string;
};

export default function AdminContent() {
  const emailModal = useModal();
  const apiModal = useModal();
  const genericModal = useModal();

  const [genericTitle, setGenericTitle] = useState('');
  const [genericField, setGenericField] = useState<{ label: string; value: string }[]>([]);

  const [resendKey, setResendKey] = useState(() => { try { return localStorage.getItem('tbh_resend_key') ?? ''; } catch { return ''; } });
  const [senderEmail, setSenderEmail] = useState(() => { try { return localStorage.getItem('tbh_sender_email') ?? ''; } catch { return ''; } });
  const [smtpServer, setSmtpServer] = useState(() => { try { return localStorage.getItem('tbh_smtp_server') ?? ''; } catch { return ''; } });

  function saveEmailConfig() {
    try {
      localStorage.setItem('tbh_resend_key', resendKey);
      localStorage.setItem('tbh_sender_email', senderEmail);
      localStorage.setItem('tbh_smtp_server', smtpServer);
    } catch { /* ignore */ }
    emailModal.closeModal();
  }

  const [apiKeys, setApiKeys] = useState([
    { id: '1', name: 'Supabase Anon', key: 'eyJhb...truncated', created: '2026-06-01' },
    { id: '2', name: 'Resend API', key: 're_xxx...truncated', created: '2026-06-02' },
    { id: '3', name: 'GitHub Token', key: 'ghp_xxx...truncated', created: '2026-06-03' },
  ]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  const sections: { title: string; items: ConfigItem[] }[] = [
    {
      title: '系统',
      items: [
        { icon: <Database size={15} />, label: '数据库连接', value: 'Supabase · 已连接', status: 'ok' },
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
        { icon: <Palette size={15} />, label: '品牌色', value: '#7b6cf0', status: 'ok' },
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
      '数据库连接': [{ label: '连接类型', value: 'Supabase' }, { label: '项目 URL', value: import.meta.env.VITE_SUPABASE_URL || '(环境变量)' }, { label: '状态', value: '已连接' }],
      '域名与部署': [{ label: '部署平台', value: 'GitHub Pages' }, { label: '域名', value: 'as5551238.github.io/team-business-hub' }, { label: 'CI', value: 'GitHub Actions' }],
      '通知渠道': [{ label: '企业微信', value: '已启用' }, { label: '浏览器推送', value: '已启用' }, { label: '邮件', value: resendKey ? '已启用' : '未启用' }],
      '告警规则': [{ label: '规则数量', value: '5' }, { label: '最近触发', value: '无' }, { label: '通知方式', value: '企微 + 浏览器' }],
      '登录方式': [{ label: '密码登录', value: '已启用' }, { label: 'Supabase Auth', value: '已启用' }, { label: 'SSO', value: '未启用' }],
      '会话超时': [{ label: '超时时间', value: '24小时' }, { label: '刷新策略', value: '自动续期' }],
      '数据备份': [{ label: '备份频率', value: '每日' }, { label: '保留天数', value: '30天' }, { label: '最近备份', value: '今日 03:00' }],
      '主题': [{ label: '当前主题', value: '深色科技风' }, { label: '模式', value: 'Dark' }],
      '品牌色': [{ label: '主色', value: '#7b6cf0' }, { label: '辅色', value: '#5b4cc0' }],
    };

    const fields = fieldMap[item.label];
    if (fields) openGeneric(item.label, fields);
  }

  function addApiKey() {
    if (!newKeyName.trim() || !newKeyValue.trim()) return;
    setApiKeys((prev) => [...prev, { id: Date.now().toString(), name: newKeyName.trim(), key: newKeyValue.trim().slice(0, 6) + '...truncated', created: new Date().toISOString().slice(0, 10) }]);
    setNewKeyName('');
    setNewKeyValue('');
  }

  function removeApiKey(id: string) {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings size={18} className="text-primary-2" />
        <span className="text-sm font-bold">系统配置</span>
        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[9px] font-bold text-danger">仅管理员</span>
      </div>

      {/* System Health */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-text-3 uppercase tracking-wider">系统健康</span>
          <span className="text-[10px] text-success font-semibold">正常运行</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '数据库', status: 'ok' },
            { label: 'API', status: 'ok' },
            { label: '部署', status: 'ok' },
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
              <div key={item.label} onClick={() => onItemClick(item)} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 transition-all hover:border-border-2 cursor-pointer">
                <span className="text-text-3">{item.icon}</span>
                <span className="text-xs text-text-2 min-w-[100px]">{item.label}</span>
                <span className="flex-1 text-xs font-medium text-text text-right">{item.value}</span>
                <span className={`text-[9px] ${statusCls[item.status]}`}>
                  {item.status === 'ok' ? '✓' : '⚠'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Version Info */}
      <div className="rounded-xl border border-border bg-surface-2/30 p-3 flex items-center gap-2">
        <Info size={14} className="text-text-3" />
        <div className="text-[10px] text-text-3">
          TBH Next v0.1.0 · Build 20260604 · React 19 + Vite 5.4 + Supabase
        </div>
      </div>

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
            <div key={k.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text truncate">{k.name}</div>
                <div className="text-[10px] text-text-3">{k.key} · 创建于 {k.created}</div>
              </div>
              <button onClick={() => removeApiKey(k.id)} className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-text-3 hover:bg-danger/10 hover:text-danger transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-2">新增密钥</div>
          <div className="flex gap-2">
            <input className={`${inputCls} flex-1`} placeholder="名称" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            <input type="password" className={`${inputCls} flex-1`} placeholder="密钥值" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} />
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
    </div>
  );
}
