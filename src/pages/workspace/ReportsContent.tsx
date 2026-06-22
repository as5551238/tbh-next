import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { useState, useCallback, useEffect } from 'react';
import { useReports, useGoals, useTasks, useRisks, useActionItems, useDeviationAlerts } from '@/hooks/useMatrix';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { chatCompletion } from '@/lib/aiService';
import { usePermission } from '@/hooks/usePermission';
import { BarChart3, Download, Plus, Sparkles, FileText, ChevronDown, ChevronUp, Building2, FileText as PersonalIcon } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import type { ReportInput, ReportUpdate } from '@/contracts/dataContracts';
import { CardSkeleton } from '@/components/Skeleton';
import { aggregateWeekData, generateWeeklyReport, reportToMarkdown, saveReportLocally, loadSavedReports, loadReportsFromDB, type WeeklyReportResult, type WeekDataAggregate, type SavedReport } from '@/lib/weeklyReport';
import EnterpriseWeeklyReport from '@/components/EnterpriseWeeklyReport';

const TYPE_STYLES: Record<string, string> = { weekly: 'bg-primary/10 text-primary-2', monthly: 'bg-accent/10 text-accent', custom: 'bg-success/10 text-success' };

export default function ReportsContent() {
  const { showPaywall: rpShow, paywallReason: rpReason, paywallFeature: rpFeat, closePaywall: rpClose, requireFeature: rpRequire } = useGateCheck();
  const { reports, addReport, editReport, removeReport, loading } = useReports();
  const { goals } = useGoals();
  const { tasks } = useTasks();
  const { risks } = useRisks();
  const { actionItems } = useActionItems();
  const { alerts: deviationAlerts } = useDeviationAlerts();
  const { user } = useAuth();
  const { can } = usePermission();
  const { toasts, error } = useToast();
  const genModal = useModal();
  const editModal = useModal();
  const [selectedReport, setSelectedReport] = useState<(typeof reports)[number] | null>(null);
  const [form, setForm] = useState({ title: '', type: 'weekly' });
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const [reportTab, setReportTab] = useState<'personal' | 'enterprise'>('personal');

  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportResult | null>(null);
  const [weeklyGenerating, setWeeklyGenerating] = useState(false);
  const [weeklyExpanded, setWeeklyExpanded] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeekDataAggregate | null>(null);

  const [savedReports, setSavedReports] = useState<SavedReport[]>(() => loadSavedReports());

  useEffect(() => {
    loadReportsFromDB(20).then((dbReports) => {
      if (dbReports.length > 0) setSavedReports(dbReports);
    }).catch(() => { /* keep local fallback */ });
  }, []);

  const handleGenerateWeeklyReport = useCallback(async () => {
    if (weeklyGenerating) return;
    setWeeklyGenerating(true);
    try {
      const data = aggregateWeekData(tasks, goals, actionItems, deviationAlerts);
      setWeeklyData(data);
      const result = await generateWeeklyReport(data);
      setWeeklyReport(result);
      const saved = saveReportLocally(result);
      setSavedReports((prev) => [saved, ...prev].slice(0, 20));
      addReport({
        title: result.title,
        type: 'weekly',
        generated_at: data.period,
        status: 'ready',
      } as ReportInput).catch(() => { /* non-blocking */ });
    } catch {
      error(t('reports.weeklyGenFailed'));
    } finally {
      setWeeklyGenerating(false);
    }
  }, [tasks, goals, actionItems, deviationAlerts, addReport, weeklyGenerating, error]);

  const handleOpenGen = useCallback(() => {
    setForm({ title: '', type: 'weekly' });
    genModal.openModal();
  }, [genModal.openModal]);

  const handleGenReport = useCallback(() => {
    if (!form.title.trim()) return;
    addReport({
      title: form.title.trim(),
      type: form.type,
      generated_at: new Date().toLocaleDateString(),
      status: 'generating',
    } as ReportInput).then((row) => {
      const id = row.id;
      setTimeout(() => {
        editReport(id, { status: 'ready' } as ReportUpdate);
      }, 2000);
    }).catch((err) => { console.error('[reports]', err); error(t('reports.createFailed')); });
    genModal.closeModal();
  }, [form, genModal.closeModal, addReport, editReport, error]);

  const handleExport = useCallback((report: typeof reports[number]) => {
    const now = new Date();
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.progress >= 100).length;
    const goalRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(task => task.status === 'done' || task.status === 'completed').length;
    const riskCount = risks.length;
    const deviationCount = goals.filter(g => g.progress < 50 && g.progress > 0).length;
    const lines = [
      `# ${report.title}`,
      '',
      `- ${t('reports.typeLabel')}: ${report.type === 'weekly' ? t('reports.typeWeekly') : report.type === 'monthly' ? t('reports.typeMonthly') : t('reports.typeCustom')}`,
      `- ${t('reports.generatedAtLabel')}: ${report.generated_at}`,
      `- ${t('reports.statusLabel')}: ${report.status === 'ready' ? t('reports.statusReady') : t('reports.statusGenerating')}`,
      '',
      '---',
      '',
      t('reports.exportedAt', { date: now.toLocaleString() }),
    ];
    if (report.type === 'weekly') {
      lines.push('', `## ${t('reports.weeklyOverview')}`, '', `- ${t('reports.goalCompletionRate')}: ${goalRate}%`, `- ${t('reports.taskDelivery')}: ${doneTasks}/${totalTasks}`, `- ${t('reports.riskItems')}: ${riskCount}`, `- ${t('reports.deviationAlerts')}: ${deviationCount}`);
    } else if (report.type === 'monthly') {
      const goalProgressLines = goals.slice(0, 5).map(g => `  - ${g.title}: ${Math.round(g.progress)}%`).join('\n');
      lines.push('', `## ${t('reports.monthlyOverview')}`, '', `- ${t('reports.okrProgress')}:`, goalProgressLines || `  - ${t('reports.noGoals')}`, `- ${t('reports.taskCompletion')}: ${doneTasks}/${totalTasks}`, `- ${t('reports.riskItems')}: ${riskCount}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [goals, tasks, risks]);

  const handleExportWeeklyReport = useCallback(() => {
    if (!weeklyReport) return;
    const md = reportToMarkdown(weeklyReport);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${weeklyReport.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [weeklyReport]);

  const handleAiSummary = useCallback(async () => {
    if (aiSummarizing) return;
    setAiSummarizing(true);
    setAiSummary(null);
    try {
      const goalRate = goals.length > 0 ? Math.round(goals.filter(g => g.progress >= 100).length / goals.length * 100) : 0;
      const taskDone = tasks.filter(task => task.done || task.status === 'done').length;
      const overdue = tasks.filter(task => !task.done && task.due_date && task.due_date < new Date().toISOString().slice(0, 10)).length;
      const res = await chatCompletion([{ role: 'user', content: t('reports.aiSummaryPrompt', { goalRate, taskDone, totalTasks: tasks.length, overdue, risks: risks.length }) }]);
      setAiSummary(res?.text ?? t('reports.aiNoSummary'));
    } catch {
      setAiSummary(t('reports.aiSummaryUnavailable'));
    } finally {
      setAiSummarizing(false);
    }
  }, [goals, tasks, risks, aiSummarizing]);

  if (loading) {
    return <CardSkeleton />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <BarChart3 size={16} className="text-primary-2" />
        <span className="text-sm font-bold">{t('reports.title')}</span>
        {can('ai:chat') && (
        <button className="flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20 disabled:opacity-50" onClick={handleAiSummary} disabled={aiSummarizing}><Sparkles size={12} />{aiSummarizing ? t('reports.generating') : t('reports.aiSummary')}</button>
        )}
        <button className={cn('flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] font-semibold hover:opacity-80', weeklyGenerating ? 'bg-surface-2 text-text-3' : 'bg-primary-2/10 text-primary-2')} onClick={handleGenerateWeeklyReport} disabled={weeklyGenerating}>
          <FileText size={12} />
          {weeklyGenerating ? t('reports.generating') : t('reports.oneClickWeekly')}
        </button>
        <button className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:opacity-80" onClick={() => { if (!rpRequire('customReports', t('reports.paywallCustomReports'))) return; handleOpenGen(); }}>
          <Plus size={12} />{t('reports.generateReport')}
        </button>
      </div>

      <div className="flex items-center gap-1 px-3 md:px-4 pt-2 pb-1">
        {([
          { key: 'personal' as const, label: t('reports.personalWeekly'), icon: PersonalIcon },
          { key: 'enterprise' as const, label: t('reports.enterpriseWeekly'), icon: Building2 },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setReportTab(tab.key)}
            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors', reportTab === tab.key ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2')}>
            <tab.icon size={12} />{tab.label}
          </button>
        ))}
      </div>

      {reportTab === 'enterprise' && (
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          <EnterpriseWeeklyReport />
        </div>
      )}

      {reportTab === 'personal' && (<>

      {aiSummary && (
        <div className="mx-3 md:mx-4 mt-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-2">
          <div className="flex items-start justify-between gap-2">
            <Sparkles size={12} className="mt-0.5 shrink-0 text-accent" />
            <span className="flex-1 whitespace-pre-wrap">{aiSummary}</span>
          </div>
          <button className="mt-1 text-[9px] text-text-3 hover:text-text" onClick={() => setAiSummary(null)}>{t('reports.close')}</button>
        </div>
      )}

      {weeklyReport && (
        <div className="mx-3 md:mx-4 mt-3 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setWeeklyExpanded((v) => !v)}>
            <FileText size={14} className="text-primary-2" />
            <span className="text-sm font-semibold text-primary-2">{weeklyReport.title}</span>
            <span className="text-[10px] text-text-3">{new Date(weeklyReport.generatedAt).toLocaleString()}</span>
            <div className="ml-auto flex items-center gap-2">
              <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[10px] text-text-3 hover:text-text" onClick={(e) => { e.stopPropagation(); handleExportWeeklyReport(); }}>
                <Download size={10} />{t('reports.export')}
              </button>
              {weeklyExpanded ? <ChevronUp size={14} className="text-text-3" /> : <ChevronDown size={14} className="text-text-3" />}
            </div>
          </div>
          {weeklyExpanded && (
            <div className="px-4 pb-4 space-y-3">
              <div className="rounded-lg bg-surface p-3">
                <div className="flex items-center gap-1 text-[10px] font-semibold text-accent mb-1"><Sparkles size={10} />{t('reports.aiGeneratedSummary')}</div>
                <p className="text-xs text-text-2 leading-relaxed whitespace-pre-wrap">{weeklyReport.aiSummary}</p>
              </div>
              {weeklyData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="rounded-lg bg-surface p-2 text-center">
                    <div className="text-lg font-bold text-primary-2">{weeklyData.taskCompletionRate}%</div>
                    <div className="text-[9px] text-text-3">{t('reports.taskCompletionRate')}</div>
                  </div>
                  <div className="rounded-lg bg-surface p-2 text-center">
                    <div className="text-lg font-bold text-accent">{weeklyData.avgGoalProgress}%</div>
                    <div className="text-[9px] text-text-3">{t('reports.avgGoalProgress')}</div>
                  </div>
                  <div className="rounded-lg bg-surface p-2 text-center">
                    <div className={cn('text-lg font-bold', weeklyData.overdueTasks > 0 ? 'text-danger' : 'text-success')}>{weeklyData.overdueTasks}</div>
                    <div className="text-[9px] text-text-3">{t('reports.overdueTasks')}</div>
                  </div>
                  <div className="rounded-lg bg-surface p-2 text-center">
                    <div className={cn('text-lg font-bold', weeklyData.criticalAlerts > 0 ? 'text-danger' : 'text-success')}>{weeklyData.criticalAlerts}</div>
                    <div className="text-[9px] text-text-3">{t('reports.criticalAlerts')}</div>
                  </div>
                </div>
              )}
              {weeklyData && weeklyData.topOverdueTasks.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-text-3 mb-1">{t('reports.overdueTop5')}</div>
                  {weeklyData.topOverdueTasks.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] py-1">
                      <span className="text-danger font-semibold w-4 text-right">{i + 1}.</span>
                      <span className="text-text truncate flex-1">{item.title}</span>
                      <span className="text-text-3 shrink-0">{t('reports.overdueDays', { days: item.daysLate })}</span>
                    </div>
                  ))}
                </div>
              )}
              {weeklyData && weeklyData.topAtRiskGoals.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-text-3 mb-1">{t('reports.highRiskGoals')}</div>
                  {weeklyData.topAtRiskGoals.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] py-1">
                      <span className="text-warn font-semibold w-4 text-right">{i + 1}.</span>
                      <span className="text-text truncate flex-1">{g.title}</span>
                      <span className="text-text-3 shrink-0">{t('reports.progressWithDays', { progress: g.progress, days: g.daysLeft })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {savedReports.length > 0 && (
        <div className="mx-3 md:mx-4 mt-2">
          <div className="text-[10px] font-semibold text-text-3 mb-1">{t('reports.historyReports')}</div>
          <div className="space-y-1">
            {savedReports.slice(0, 5).map((sr) => (
              <div key={sr.id} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-[11px] hover:bg-surface-2 transition-colors">
                <FileText size={12} className="text-primary-2 shrink-0" />
                <span className="truncate flex-1 text-text">{sr.title}</span>
                <span className="text-[9px] text-text-3 shrink-0">{sr.period}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold shrink-0', TYPE_STYLES[sr.type] ?? TYPE_STYLES.weekly)}>
                  {sr.type === 'weekly' ? t('reports.typeWeekly') : sr.type === 'monthly' ? t('reports.typeMonthly') : t('reports.typeCustom')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
        {reports.map((report) => (
          <div key={report.id} className={cn('group rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-lg cursor-pointer',
            report.status === 'generating' && 'animate-pulse'
          )} onClick={() => { setSelectedReport(report); editModal.openModal(); }}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <BarChart3 size={16} className="text-primary-2" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-text">{report.title}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', TYPE_STYLES[report.type])}>
                    {report.type === 'weekly' ? t('reports.typeWeekly') : report.type === 'monthly' ? t('reports.typeMonthly') : t('reports.typeCustom')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-3">
                  <span>{report.generated_at}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[8px]', report.status === 'ready' ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn')}>
                    {report.status === 'ready' ? t('reports.statusReady') : t('reports.statusGenerating')}
                  </span>
                </div>
              </div>
              {report.status === 'ready' && (
                <button className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[10px] text-text-3 opacity-0 group-hover:opacity-100 transition-all hover:text-text" onClick={() => handleExport(report)}>
                  <Download size={10} />{t('reports.export')}
                </button>
              )}
              {report.status === 'generating' && (
                <span className="rounded-full bg-warn/10 px-2 py-0.5 text-[9px] font-bold text-warn">{t('reports.generating')}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={genModal.open} onClose={genModal.closeModal} title={t('reports.generateTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={genModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleGenReport} disabled={!form.title.trim()}>{t('reports.generateBtn')}</button>
          </div>
        }>
        <ModalField label={t('reports.reportName')}>
          <input className={inputCls} placeholder={t('reports.reportNamePlaceholder')} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('reports.reportType')}>
          <select className={inputCls} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="weekly">{t('reports.typeWeekly')}</option>
            <option value="monthly">{t('reports.typeMonthly')}</option>
            <option value="custom">{t('reports.typeCustom')}</option>
          </select>
        </ModalField>
      </Modal>

      <ItemDetailModal
        open={editModal.open}
        onClose={editModal.closeModal}
        title={t('reports.reportDetail')}
        fields={[
          { key: 'title', label: t('reports.titleLabel'), type: 'text' },
          { key: 'type', label: t('reports.typeLabel'), type: 'select', options: [
            { value: 'weekly', label: t('reports.typeWeekly') }, { value: 'monthly', label: t('reports.typeMonthly') }, { value: 'quarterly', label: t('reports.typeQuarterly') }, { value: 'annual', label: t('reports.typeAnnual') },
          ]},
          { key: 'generated_at', label: t('reports.periodLabel'), type: 'text' },
        ]}
        data={selectedReport as Record<string, unknown> | null}
        commentTarget={selectedReport?.id ? { type: 'report', id: String(selectedReport.id) } : null}
        onSave={(updated) => {
          const id = updated.id as string;
          editReport(id, updated as Record<string, unknown>);
        }}
        onDelete={() => {
          if (selectedReport) removeReport(selectedReport.id);
        }}
      />
      <PaywallModal open={rpShow} onClose={rpClose} reason={rpReason} feature={rpFeat} />
      </>)} {/* end personal tab */}
    </div>
  );
}
