import { useState } from 'react';
import { Lock } from 'lucide-react';
import { hasFeature } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';
import AuditLogView from '@/pages/AuditLogView';

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
        <div className="text-sm font-semibold text-text mb-1">审计日志</div>
        <p className="text-xs text-text-3 mb-3">审计日志导出需要专业版或企业版</p>
        <button className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-80" onClick={() => setShowPaywall(true)}>升级专业版</button>
      </div>
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason="审计日志导出需要专业版或企业版" feature="audit_export" />
    </>
  );
}
