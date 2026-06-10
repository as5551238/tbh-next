import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Factory, BarChart3, Users, Target, Edit3, Check, X, Sparkles, ChevronRight } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

const DEFAULT_PERSPECTIVES: Record<string, { focus: string; trends: string[]; benchmarks: { label: string; met: boolean }[] }> = {
  'IT业': {
    focus: '需求交付效率与产品市场匹配',
    trends: ['AI原生功能成为标配', '低代码平台渗透加速', 'SaaS向PaaS演进'],
    benchmarks: [
      { label: '需求交付周期 ≤15天', met: false },
      { label: 'PRD通过率 ≥80%', met: false },
      { label: 'NPS ≥45', met: false },
      { label: 'Sprint完成率 ≥85%', met: false },
    ],
  },
  '制造业': {
    focus: '生产良率与供应链韧性',
    trends: ['数字孪生落地', '绿色制造合规', '柔性生产升级'],
    benchmarks: [
      { label: '生产良率 ≥98%', met: false },
      { label: '交付准时率 ≥95%', met: false },
      { label: '库存周转 ≤30天', met: false },
    ],
  },
  '教育业': {
    focus: '教学效果与学生留存',
    trends: ['个性化学习路径', 'AI辅导助手', '混合式教学深化'],
    benchmarks: [
      { label: '课程完成率 ≥70%', met: false },
      { label: '学生满意度 ≥4.2/5', met: false },
      { label: '续费率 ≥60%', met: false },
    ],
  },
  '金融业': {
    focus: '风控合规与客户资产增长',
    trends: ['监管科技(RegTech)升级', '嵌入式金融', 'ESG投资主流化'],
    benchmarks: [
      { label: '风控准确率 ≥99.5%', met: false },
      { label: '客户资产增长率 ≥8%', met: false },
      { label: '合规事件 =0', met: false },
    ],
  },
};

export default function IndustryView() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const navigate = useNavigate();
  const indColor = useIndustryColor();
  const { cell, loading } = useMatrixCell();

  const editModal = useModal();
  const [editField, setEditField] = useState<'focus' | 'trend' | 'benchmark'>('focus');
  const [editIdx, setEditIdx] = useState(0);
  const [editValue, setEditValue] = useState('');

  const STORAGE_KEY = 'tbh-perspectives';
  const [perspectives, setPerspectives] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_PERSPECTIVES, ...JSON.parse(saved) } : DEFAULT_PERSPECTIVES;
    } catch { return DEFAULT_PERSPECTIVES; }
  });

  const persistPerspectives = (next: typeof perspectives) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };
  const perspective = perspectives[industry] ?? perspectives['IT业'];

  // Auto-check benchmarks against current KPI values
  const checkedBenchmarks = useMemo(() => {
    return perspective.benchmarks.map((bm: Record<string, unknown>) => {
      const bmLabel = String(bm.label ?? '');
      const matchingKpi = cell.kpis.find((kpi) => {
        const bmLower = bmLabel.toLowerCase();
        const kpiLower = kpi.name.toLowerCase();
        return bmLower.includes(kpiLower) || kpiLower.includes(bmLower.split(' ')[0]);
      });
      if (matchingKpi) {
        const progress = Number(matchingKpi.target) > 0 ? (Number(matchingKpi.value) / Number(matchingKpi.target)) * 100 : 0;
        return { ...(bm as Record<string, unknown>), met: progress >= 100 };
      }
      return bm;
    });
  }, [perspective.benchmarks, cell.kpis]);

  const handleEditFocus = () => {
    setEditField('focus');
    setEditValue(perspective.focus);
    editModal.openModal();
  };

  const handleEditTrend = (idx: number) => {
    setEditField('trend');
    setEditIdx(idx);
    setEditValue(perspective.trends[idx]);
    editModal.openModal();
  };

  const handleAddTrend = () => {
    setEditField('trend');
    setEditIdx(-1);
    setEditValue('');
    editModal.openModal();
  };

  const handleToggleBenchmark = (idx: number) => {
    setPerspectives((prev: Record<string, unknown>) => {
      const current = (prev[industry] ?? prev['IT业']) as Record<string, unknown>;
      const benchmarks = current.benchmarks as Record<string, unknown>[];
      const newBenchmarks = [...benchmarks];
      newBenchmarks[idx] = { ...(newBenchmarks[idx] as Record<string, unknown>), met: !(newBenchmarks[idx] as Record<string, unknown>).met };
      const next = { ...prev, [industry]: { ...current, benchmarks: newBenchmarks } };
      persistPerspectives(next);
      return next;
    });
  };

  const handleEditBenchmark = (idx: number) => {
    setEditField('benchmark');
    setEditIdx(idx);
    setEditValue(perspective.benchmarks[idx].label);
    editModal.openModal();
  };

  const handleAddBenchmark = () => {
    setEditField('benchmark');
    setEditIdx(-1);
    setEditValue('');
    editModal.openModal();
  };

  const handleSave = () => {
    setPerspectives((prev: Record<string, unknown>) => {
      const current = (prev[industry] ?? prev['IT业']) as Record<string, unknown>;
      let next: typeof prev;
      if (editField === 'focus') {
        next = { ...prev, [industry]: { ...current, focus: editValue } };
      } else if (editField === 'trend') {
        const newTrends = [...(current.trends as string[])];
        if (editIdx === -1) newTrends.push(editValue);
        else newTrends[editIdx] = editValue;
        next = { ...prev, [industry]: { ...current, trends: newTrends } };
      } else {
        const newBm = [...(current.benchmarks as Record<string, unknown>[])];
        if (editIdx === -1) newBm.push({ label: editValue, met: false });
        else newBm[editIdx] = { ...(newBm[editIdx] as Record<string, unknown>), label: editValue };
        next = { ...prev, [industry]: { ...current, benchmarks: newBm } };
      }
      persistPerspectives(next);
      return next;
    });
    editModal.closeModal();
  };

  const navigateToKpi = () => {
    navigate(navigateTo('ai', 'kpiDash'));
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Factory size={16} className="text-primary-2" />
        <span className="text-sm font-bold">行业视图</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{industry}</span>
        <span className="text-[10px] text-text-3">{dept}</span>
        <button className="ml-auto flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={navigateToKpi}>
          <BarChart3 size={12} />KPI详情
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {/* Focus - Editable */}
        <div className="rounded-xl border border-border p-3 md:p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${indColor}08 0%, ${indColor}03 100%)` }}>
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10" style={{ backgroundColor: indColor }} />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Target size={14} style={{ color: indColor }} />
              <span className="text-xs font-bold">核心关注</span>
              <button onClick={handleEditFocus} className="ml-auto rounded-lg bg-surface-2 p-1 hover:bg-surface-2/80">
                <Edit3 size={10} className="text-text-3" />
              </button>
            </div>
            <p className="text-sm text-text-2">{perspective.focus}</p>
          </div>
        </div>

        {/* KPIs with navigation */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">当前KPI</span>
            <button onClick={navigateToKpi} className="flex flex-wrap items-center gap-1 text-[10px] text-primary-2 hover:underline">
              查看详情 <ChevronRight size={10} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cell.kpis.slice(0, 6).map((kpi) => {
              const TrendIcon = TREND_ICON[kpi.trend];
              const progress = Number(kpi.target) > 0 ? Math.min(100, Math.round((Number(kpi.value) / Number(kpi.target)) * 100)) : 0;
              return (
                <div key={kpi.name} className="rounded-xl border border-border bg-surface p-3 cursor-pointer hover:border-primary/30 transition-all" onClick={navigateToKpi}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-text-3">{kpi.name}</span>
                    <TrendIcon size={12} className={kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger'} />
                  </div>
                  <div className={cn('text-lg font-extrabold', kpi.status === 'good' ? 'text-success' : kpi.status === 'warn' ? 'text-warn' : 'text-danger')}>{kpi.value}</div>
                  <div className="text-[9px] text-text-3">目标 {kpi.target}</div>
                  <div className="mt-1 h-1 rounded-full bg-surface-2 overflow-hidden">
                    <div className={cn('h-full rounded-full', kpi.status === 'good' ? 'bg-success' : kpi.status === 'warn' ? 'bg-warn' : 'bg-danger')} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trends - Editable + Addable */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">行业趋势</span>
            <button onClick={handleAddTrend} className="rounded-lg bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary-2 hover:bg-primary/20">+ 添加</button>
          </div>
          <div className="space-y-2">
            {perspective.trends.map((trend: Record<string, unknown>, i: number) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3 group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <TrendingUp size={14} className="text-primary-2" />
                </div>
                <span className="text-xs text-text flex-1">{String(trend)}</span>
                <button onClick={() => handleEditTrend(i)} className="rounded-lg bg-surface-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit3 size={10} className="text-text-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Benchmarks - Checkable + Editable */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">行业基准</span>
            <button onClick={handleAddBenchmark} className="rounded-lg bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary-2 hover:bg-primary/20">+ 添加</button>
          </div>
          <div className="space-y-1.5">
            {checkedBenchmarks.map((bm: Record<string, unknown>, i: number) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-2.5 group">
                <button
                  onClick={() => handleToggleBenchmark(i)}
                  className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
                    bm.met ? 'bg-success border-success' : 'border-border hover:border-primary/40'
                  )}
                >
                  {bm.met ? <Check size={12} className="text-white" /> : null}
                </button>
                <span className={cn('text-[11px] flex-1', bm.met ? 'text-success line-through' : 'text-text-2')}>{String(bm.label)}</span>
                <button onClick={() => handleEditBenchmark(i)} className="rounded-lg bg-surface-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit3 size={10} className="text-text-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insight */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary-2 mb-2">
            <Sparkles size={14} />AI 行业洞察
          </div>
          <p className="text-[11px] text-text-2 leading-relaxed">
            基于{industry}行业{dept}部门的当前数据，AI将持续监控KPI偏离情况并自动生成行业对比分析。
            前往「个人AI台 → 工作助手」获取个性化洞察建议。
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal.open} onClose={editModal.closeModal} title={editField === 'focus' ? '编辑核心关注' : editField === 'trend' ? '编辑趋势' : '编辑基准'}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={editModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleSave} disabled={!editValue.trim()}>保存</button>
          </div>
        }>
        <ModalField label={editField === 'focus' ? '核心关注描述' : editField === 'trend' ? '趋势描述' : '基准描述'}>
          {editField === 'focus' ? (
            <textarea className={inputCls} rows={3} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
          ) : (
            <input className={inputCls} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
          )}
        </ModalField>
      </Modal>
    </div>
  );
}
