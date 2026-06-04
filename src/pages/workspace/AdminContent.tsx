import { Settings, Database, Bell, Shield, Palette, Globe, Plug, Info } from 'lucide-react';

export default function AdminContent() {
  const sections = [
    {
      title: '系统',
      items: [
        { icon: <Database size={15} />, label: '数据库连接', value: 'Supabase · 已连接', status: 'ok' },
        { icon: <Plug size={15} />, label: 'API密钥管理', value: '3个已配置', status: 'ok' },
        { icon: <Globe size={15} />, label: '域名与部署', value: 'GitHub Pages', status: 'ok' },
      ],
    },
    {
      title: '通知',
      items: [
        { icon: <Bell size={15} />, label: '通知渠道', value: '企微 + 浏览器推送', status: 'ok' },
        { icon: <Bell size={15} />, label: '告警规则', value: '5条规则', status: 'ok' },
        { icon: <Bell size={15} />, label: '邮件推送', value: 'Resend API · 未配置', status: 'warn' },
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
            { label: '邮件', status: 'warn' },
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
              <div key={item.label} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 transition-all hover:border-border-2 cursor-pointer">
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
    </div>
  );
}
