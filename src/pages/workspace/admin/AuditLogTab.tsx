import { useState } from 'react';
import { Lock } from 'lucide-react';
import { hasFeature } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';
import AuditLogView from '@/pages/AuditLogView';
import { t } from '@/lib/i18nCore';

export default function AuditLogTab() {
  const [showPaywall, setShowPaywall] = useState(false);

  if (hasFeature('auditExport')) {
    return (
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <AuditLogView />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
        <Lock size={24} className="mx-auto mb-2 text-primary-2" />
        <div className="text-sm font-semibold text-text mb-1">{t('admin.auditLog')}</div>
        <p className="text-xs text-text-3 mb-3">{t('admin.auditPaywallMsg')}</p>
        <button className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-80" onClick={() => setShowPaywall(true)}>{t('admin.upgradePro')}</button>
      </div>
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason={t('admin.auditPaywallReason')} feature="audit_export" />
    </>
  );
}
