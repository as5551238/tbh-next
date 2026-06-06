import { useState, useCallback } from 'react';
import { useReports, useGoals, useTasks, useRisks } from '@/hooks/useMatrix';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { BarChart3, Download, Loader2, Plus } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';

const TYPE_STYLES: Record<string, string> = { weekly: 'bg-primary/10 text-primary-2', monthly: 'bg-accent/10 text-accent', custom: 'bg-success/10 text-success' };

export default function ReportsContent() {
  const { reports, setReports, loading } = useReports();
  const { goals } = useGoals();
  const { tasks } = useTasks();
  const { risks } = useRisks();
  const { user } = useAuth();
  const genModal = useModal();
  const editModal = useModal();
  const [selectedReport, setSelectedReport] = useState<(typeof reports)[number] | null>(null);
  const [form, setForm] = useState({ name: '', type: 'weekly' });

  const handleOpenGen = useCallback(() => {
    setForm({ name: '', type: 'weekly' });
    genModal.openModal();
  }, [genModal.openModal]);

  const handleGenReport = useCallback(() => {
    if (!form.name.trim()) return;
    const newReport = {
      id: `rpt-${Date.now()}`,
      name: form.name.trim(),
      type: form.type,
      generated_at: new Date().toLocaleDateString('zh-CN'),
      generated_by: user?.name ?? '当前用户',
      status: 'generating' as const,
      size: '0 KB',
    };
    setReports((prev) => [newReport, ...prev]);
    genModal.closeModal();
    // Simulate generation completing after 2s
    setTimeout(() => {
      setReports((prev) => prev.map((r) => r.id === newReport.id ? { ...r, status: 'ready' as const, size: '1.2 MB' } : r));
    }, 2000);
  }, [form, genModal.closeModal]);

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
      `# ${report.name}`,
      '',
      `- 类型: ${report.type === 'weekly' ? '周报' : report.type === 'monthly' ? '月报' : '自定义'}`,
      `- 生成时间: ${report.generated_at}`,
      `- 生成者: ${report.generated_by}`,
      `- 状态: ${report.status === 'ready' ? '已完成' : '生成中'}`,
      '',
      '---',
      '',
      `本报表于 ${now.toLocaleString('zh-CN')} 导出。`,
    ];
    if (report.type === 'weekly') {
      lines.push('', '## 本周概览', '', `- 目标完成率: ${goalRate}%`, `- 任务交付: ${doneTasks}/${totalTasks}`, `- 风险项: ${riskCount}`, `- 偏差预警: ${deviationCount}`);
    } else if (report.type === 'monthly') {
      const goalProgressLines = goals.slice(0, 5).map(g => `  - ${g.name}: ${Math.round(g.progress)}%`).join('\n');
      lines.push('', '## 本月概览', '', `- OKR进度:`, goalProgressLines || '  - 暂无目标', `- 任务完成: ${doneTasks}/${totalTasks}`, `- 风险项: ${riskCount}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [goals, tasks, risks]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-2" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <BarChart3 size={16} className="text-primary-2" />
        <span className="text-sm font-bold">报表中心</span>
        <button className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:opacity-80" onClick={handleOpenGen}>
          <Plus size={12} />生成报表
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {reports.map((report) => (
          <div key={report.id} className={cn('group rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-lg cursor-pointer',
            report.status === 'generating' && 'animate-pulse'
          )} onClick={() => { setSelectedReport(report); editModal.openModal(); }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <BarChart3 size={16} className="text-primary-2" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-text">{report.name}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', TYPE_STYLES[report.type])}>
                    {report.type === 'weekly' ? '周报' : report.type === 'monthly' ? '月报' : '自定义'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-text-3">
                  <span>{report.generated_by}</span>
                  <span>{report.generated_at}</span>
                  <span>{report.size}</span>
                </div>
              </div>
              {report.status === 'ready' && (
                <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[10px] text-text-3 opacity-0 group-hover:opacity-100 transition-all hover:text-text" onClick={() => handleExport(report)}>
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
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={genModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleGenReport} disabled={!form.name.trim()}>生成</button>
          </div>
        }>
        <ModalField label="报表名称">
          <input className={inputCls} placeholder="输入报表名称" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
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
          { key: 'name', label: '标题', type: 'text' },
          { key: 'type', label: '类型', type: 'select', options: [
            { value: 'weekly', label: '周报' }, { value: 'monthly', label: '月报' }, { value: 'quarterly', label: '季报' }, { value: 'annual', label: '年报' },
          ]},
          { key: 'generated_at', label: '周期', type: 'text' },
        ]}
        data={selectedReport as Record<string, unknown> | null}
        onSave={(updated) => {
          const id = updated.id as string;
          setReports(prev => prev.map(r => r.id === id ? { ...r, ...updated } as (typeof reports)[number] : r));
        }}
      />
    </div>
  );
}
