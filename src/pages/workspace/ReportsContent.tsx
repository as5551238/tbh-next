import { useGateCheck } from '@/hooks/useGateCheck';
import PaywallModal from '@/components/PaywallModal';
import { hasFeature } from '@/lib/subscription'; // gate: Pro feature check
import { useState, useCallback } from 'react';
import { useReports, useGoals, useTasks, useRisks } from '@/hooks/useMatrix';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { chatCompletion } from '@/lib/aiService';
import { usePermission } from '@/hooks/usePermission';
import { BarChart3, Download, Plus, Sparkles } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import type { ReportInput, ReportUpdate } from '@/contracts/dataContracts';
import { CardSkeleton } from '@/components/Skeleton';

const TYPE_STYLES: Record<string, string> = { weekly: 'bg-primary/10 text-primary-2', monthly: 'bg-accent/10 text-accent', custom: 'bg-success/10 text-success' };

export default function ReportsContent() {
  const { showPaywall: rpShow, paywallReason: rpReason, paywallFeature: rpFeat, closePaywall: rpClose, requireFeature: rpRequire } = useGateCheck();
  const { reports, addReport, editReport, removeReport, loading } = useReports();
  const { goals } = useGoals();
  const { tasks } = useTasks();
  const { risks } = useRisks();
  const { user } = useAuth();
  const { can } = usePermission();
  const { toasts, error } = useToast();
  const genModal = useModal();
  const editModal = useModal();
  const [selectedReport, setSelectedReport] = useState<(typeof reports)[number] | null>(null);
  const [form, setForm] = useState({ title: '', type: 'weekly' });
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummarizing, setAiSummarizing] = useState(false);

  const handleOpenGen = useCallback(() => {
    setForm({ title: '', type: 'weekly' });
    genModal.openModal();
  }, [genModal.openModal]);

  const handleGenReport = useCallback(() => {
    if (!form.title.trim()) return;
    addReport({
      title: form.title.trim(),
      type: form.type,
      generated_at: new Date().toLocaleDateString('zh-CN'),
      status: 'generating',
    } as ReportInput).then((row) => {
      const id = row.id;
      setTimeout(() => {
        editReport(id, { status: 'ready' } as ReportUpdate);
      }, 2000);
    }).catch((err) => { console.error('[reports]', err); error('报表创建失败，请重试'); });
    genModal.closeModal();
  }, [form, genModal.closeModal, addReport, editReport]);

  const handleExport = useCallback((report: typeof reports[number]) => {
    const now = new Date();
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.progress >= 100).length;
    const goalRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
    const riskCount = risks.length;
    const deviationCount = goals.filter(g => g.progress < 50 && g.progress > 0).length;
    const lines = [
      `# ${report.title}`,
      '',
      `- 类型: ${report.type === 'weekly' ? '周报' : report.type === 'monthly' ? '月报' : '自定义'}`,
      `- 生成时间: ${report.generated_at}`,
      `- 状态: ${report.status === 'ready' ? '已完成' : '生成中'}`,
      '',
      '---',
      '',
      `本报表于 ${now.toLocaleString('zh-CN')} 导出。`,
    ];
    if (report.type === 'weekly') {
      lines.push('', '## 本周概览', '', `- 目标完成率: ${goalRate}%`, `- 任务交付: ${doneTasks}/${totalTasks}`, `- 风险项: ${riskCount}`, `- 偏差预警: ${deviationCount}`);
    } else if (report.type === 'monthly') {
      const goalProgressLines = goals.slice(0, 5).map(g => `  - ${g.title}: ${Math.round(g.progress)}%`).join('\n');
      lines.push('', '## 本月概览', '', `- OKR进度:`, goalProgressLines || '  - 暂无目标', `- 任务完成: ${doneTasks}/${totalTasks}`, `- 风险项: ${riskCount}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [goals, tasks, risks]);

  const handleAiSummary = useCallback(async () => {
    if (aiSummarizing) return;
    setAiSummarizing(true);
    setAiSummary(null);
    try {
      const goalRate = goals.length > 0 ? Math.round(goals.filter(g => g.progress >= 100).length / goals.length * 100) : 0;
      const taskDone = tasks.filter(t => t.done || t.status === 'done').length;
      const overdue = tasks.filter(t => !t.done && t.due_date && t.due_date < new Date().toISOString().slice(0, 10)).length;
      const res = await chatCompletion([{ role: 'user', content: `基于以下团队数据生成简短的工作摘要（150字内）：目标完成率${goalRate}%，任务${taskDone}/${tasks.length}已完成，${overdue}项逾期，${risks.length}个风险。` }]);
      setAiSummary(res?.text ?? 'AI暂无摘要');
    } catch {
      setAiSummary('AI摘要暂不可用，请稍后再试。');
    } finally {
      setAiSummarizing(false);
    }
  }, [goals, tasks, risks, aiSummarizing]);

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <BarChart3 size={16} className="text-primary-2" />
        <span className="text-sm font-bold">报表中心</span>
        {can('ai:chat') && (
        <button className="flex items-center gap-1 rounded-lg bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20 disabled:opacity-50" onClick={handleAiSummary} disabled={aiSummarizing}><Sparkles size={12} />{aiSummarizing ? '生成中...' : 'AI摘要'}</button>
        )}
        <button className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:opacity-80" onClick={() => { if (!rpRequire('customReports', '自定义报表需要专业版或企业版')) return; handleOpenGen(); }}>
          <Plus size={12} />生成报表
        </button>
      </div>
      {aiSummary && (
        <div className="mx-3 md:mx-4 mt-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-2">
          <div className="flex items-start justify-between gap-2">
            <Sparkles size={12} className="mt-0.5 shrink-0 text-accent" />
            <span className="flex-1 whitespace-pre-wrap">{aiSummary}</span>
          </div>
          <button className="mt-1 text-[9px] text-text-3 hover:text-text" onClick={() => setAiSummary(null)}>关闭</button>
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
                    {report.type === 'weekly' ? '周报' : report.type === 'monthly' ? '月报' : '自定义'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-3">
                  <span>{report.generated_at}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[8px]', report.status === 'ready' ? 'bg-success/10 text-success' : 'bg-warn/10 text-warn')}>
                    {report.status === 'ready' ? '已完成' : '生成中'}
                  </span>
                </div>
              </div>
              {report.status === 'ready' && (
                <button className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[10px] text-text-3 opacity-0 group-hover:opacity-100 transition-all hover:text-text" onClick={() => handleExport(report)}>
                  <Download size={10} />导出
                </button>
              )}
              {report.status === 'generating' && (
                <span className="rounded-full bg-warn/10 px-2 py-0.5 text-[9px] font-bold text-warn">生成中...</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={genModal.open} onClose={genModal.closeModal} title="生成报表"
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={genModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleGenReport} disabled={!form.title.trim()}>生成</button>
          </div>
        }>
        <ModalField label="报表名称">
          <input className={inputCls} placeholder="输入报表名称" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="报表类型">
          <select className={inputCls} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="weekly">周报</option>
            <option value="monthly">月报</option>
            <option value="custom">自定义</option>
          </select>
        </ModalField>
      </Modal>

      <ItemDetailModal
        open={editModal.open}
        onClose={editModal.closeModal}
        title="报表详情"
        fields={[
          { key: 'title', label: '标题', type: 'text' },
          { key: 'type', label: '类型', type: 'select', options: [
            { value: 'weekly', label: '周报' }, { value: 'monthly', label: '月报' }, { value: 'quarterly', label: '季报' }, { value: 'annual', label: '年报' },
          ]},
          { key: 'generated_at', label: '周期', type: 'text' },
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
    </div>
  );
}
