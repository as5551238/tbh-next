import type { JSX } from 'react';
import { useState } from 'react';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { Settings, Info } from 'lucide-react';
import GeneralTab from './admin/GeneralTab';
import NotificationTab from './admin/NotificationTab';
import EmailSettingsTab from './admin/EmailSettingsTab';
import FeatureFlagsTab from './admin/FeatureFlagsTab';
import AuditLogTab from './admin/AuditLogTab';
import { t } from '@/lib/i18nCore';

const ADMIN_TAB_KEYS = ['general', 'notification', 'email', 'features', 'audit'] as const;
type AdminTabKey = (typeof ADMIN_TAB_KEYS)[number];

const TAB_LABEL: Record<AdminTabKey, string> = {
  general: 'admin.tabGeneral',
  notification: 'admin.tabNotification',
  email: 'admin.tabEmail',
  features: 'admin.tabFeatures',
  audit: 'admin.tabAudit',
};

const TAB_COMPONENTS: Record<AdminTabKey, () => JSX.Element> = {
  general: GeneralTab,
  notification: NotificationTab,
  email: EmailSettingsTab,
  features: FeatureFlagsTab,
  audit: AuditLogTab,
};

export default function AdminContent() {
  const { toasts } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('general');

  const TabComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Settings size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('admin.title')}</span>
        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[9px] font-bold text-danger">{t('admin.adminOnly')}</span>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
        {ADMIN_TAB_KEYS.map((key) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${activeTab === key ? 'bg-brand-accent text-white' : 'text-text-3 hover:text-text hover:bg-white/5'}`}>{t(TAB_LABEL[key])}</button>
        ))}
      </div>

      <TabComponent />
    </div>
  );
}
