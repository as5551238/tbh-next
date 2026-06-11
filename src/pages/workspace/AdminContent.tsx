import type { JSX } from 'react';
import { useState } from 'react';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { Settings, Info } from 'lucide-react';
import GeneralTab from './admin/GeneralTab';
import NotificationTab from './admin/NotificationTab';
import EmailSettingsTab from './admin/EmailSettingsTab';
import FeatureFlagsTab from './admin/FeatureFlagsTab';
import AuditLogTab from './admin/AuditLogTab';

const ADMIN_TABS = ['通用', '通知偏好', '邮件设置', '功能开关', '审计日志'] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

const TAB_COMPONENTS: Record<AdminTab, () => JSX.Element> = {
  '通用': GeneralTab,
  '通知偏好': NotificationTab,
  '邮件设置': EmailSettingsTab,
  '功能开关': FeatureFlagsTab,
  '审计日志': AuditLogTab,
};

export default function AdminContent() {
  const { toasts } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>('通用');

  const TabComponent = TAB_COMPONENTS[activeTab];

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

      <TabComponent />
    </div>
  );
}
