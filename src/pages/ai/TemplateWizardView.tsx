import { useState, useCallback } from 'react';
import { getTemplatesForIndustry, type IndustryTemplate, INDUSTRY_TEMPLATES } from '@/lib/templateWizard';
import { useAppStore } from '@/stores/appStore';
import { useGoals, useTasks } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { Wand2, ChevronRight, Check, SkipForward, Sparkles } from 'lucide-react';

type WizardPhase = 'browse' | 'preview' | 'apply';

export default function TemplateWizardView() {
  const industry = useAppStore((s) => s.industry);
  const { addGoal } = useGoals();
  const { addTask } = useTasks();
  const { toasts, success, error: errorToast } = useToast();
  const [phase, setPhase] = useState<WizardPhase>('browse');
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
  const [applying, setApplying] = useState(false);

  const templates = getTemplatesForIndustry(industry);

  const handleSelect = useCallback((tpl: IndustryTemplate) => {
    setSelectedTemplate(tpl);
    setPhase('preview');
  }, []);

  const handleApply = useCallback(async () => {
    if (!selectedTemplate || applying) return;
    setApplying(true);
    try {
      // Create goals (DR-53: data drives at least one automatic action)
      for (const pg of selectedTemplate.presetGoals) {
        await addGoal({
          title: pg.title,
          progress: 0,
          status: 'active',
          key_results: pg.keyResults,
          owner_id: null,
          leader_id: null,
          end_date: null,
          start_date: null,
          priority: pg.priority,
        });
      }
      // Create tasks
      for (const pt of selectedTemplate.presetTasks) {
        await addTask({
          title: pt.title,
          priority: pt.priority,
          assignee_id: null,
          leader_id: null,
          due_date: null,
          status: 'todo',
          done: false,
          goal_id: null,
          category: pt.category,
        });
      }
      success(`已应用模板"${selectedTemplate.name}"：${selectedTemplate.presetGoals.length}个目标 + ${selectedTemplate.presetTasks.length}个任务`);
      setPhase('browse');
      setSelectedTemplate(null);
    } catch {
      errorToast('模板应用失败，请检查目标与任务列表后重试');
    } finally {
      setApplying(false);
    }
  }, [selectedTemplate, applying, addGoal, addTask, success]);

  // Show all templates if no industry-specific ones
  const displayTemplates = templates.length > 0 ? templates : INDUSTRY_TEMPLATES;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ToastOverlay toasts={toasts} />
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Wand2 size={16} className="text-accent" />
        <span className="text-sm font-bold">行业模板向导</span>
        <span className="text-[10px] text-text-3">{industry} · {displayTemplates.length} 个模板</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {/* Browse phase */}
        {phase === 'browse' && (
          <>
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} className="text-accent" />
                <span className="text-xs font-semibold text-accent">快速启动</span>
              </div>
              <p className="text-[11px] text-text-2">选择行业模板，一键生成目标和任务。你也可以随时手动创建。</p>
            </div>

            <div className="space-y-2">
              {displayTemplates.map((tpl) => (
                <div key={tpl.id} onClick={() => handleSelect(tpl)} className="group rounded-xl border border-border bg-surface p-4 cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                      <Wand2 size={16} className="text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-text">{tpl.name}</div>
                      <div className="text-[10px] text-text-3">{tpl.industry} · {tpl.presetGoals.length}目标 / {tpl.presetTasks.length}任务</div>
                    </div>
                    <ChevronRight size={14} className="text-text-3 group-hover:text-primary-2 transition-colors" />
                  </div>
                  <p className="text-[10px] text-text-2 leading-relaxed">{tpl.description}</p>
                </div>
              ))}
            </div>

            <button className="flex items-center gap-1 text-[11px] text-text-3 hover:text-text" onClick={() => success('已跳过模板向导')}>
              <SkipForward size={12} />跳过，手动创建
            </button>
          </>
        )}

        {/* Preview phase */}
        {phase === 'preview' && selectedTemplate && (
          <>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="text-sm font-bold text-primary-2 mb-1">{selectedTemplate.name}</div>
              <p className="text-[11px] text-text-2">{selectedTemplate.description}</p>
            </div>

            {/* Goals preview */}
            <div>
              <div className="text-xs font-bold text-text-3 uppercase tracking-wider mb-2">将创建的目标 ({selectedTemplate.presetGoals.length})</div>
              <div className="space-y-1.5">
                {selectedTemplate.presetGoals.map((g, i) => (
                  <div key={i} className="rounded-lg border border-border bg-surface p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-text">{g.title}</span>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', g.priority === 'critical' ? 'bg-danger/10 text-danger' : g.priority === 'high' ? 'bg-warn/10 text-warn' : 'bg-primary/10 text-primary-2')}>
                        {g.priority === 'critical' ? '紧急' : g.priority === 'high' ? '高' : '中'}
                      </span>
                    </div>
                    <div className="space-y-0.5 pl-2">
                      {g.keyResults.map((kr, j) => (
                        <div key={j} className="text-[10px] text-text-3 flex items-center gap-1">
                          <div className="h-1 w-1 rounded-full bg-primary-2 shrink-0" />
                          {kr}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks preview */}
            <div>
              <div className="text-xs font-bold text-text-3 uppercase tracking-wider mb-2">将创建的任务 ({selectedTemplate.presetTasks.length})</div>
              <div className="space-y-1">
                {selectedTemplate.presetTasks.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 bg-surface px-3 py-1.5">
                    <div className={cn('h-1.5 w-1.5 rounded-full', t.priority === 'critical' || t.priority === 'high' ? 'bg-warn' : 'bg-text-3')} />
                    <span className="text-[10px] text-text flex-1">{t.title}</span>
                    <span className="text-[8px] text-text-3 rounded-full bg-surface-2 px-1.5 py-0.5">{t.category}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones preview */}
            {selectedTemplate.milestones.length > 0 && (
              <div>
                <div className="text-xs font-bold text-text-3 uppercase tracking-wider mb-2">里程碑</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedTemplate.milestones.map((ms, i) => (
                    <div key={i} className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[9px] text-accent">
                      {i + 1}. {ms}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button className={cn('flex items-center gap-1 rounded-lg px-4 py-2 text-[11px] font-semibold text-white', applying ? 'bg-surface-2 text-text-3' : 'bg-primary hover:opacity-80')} onClick={handleApply} disabled={applying}>
                {applying ? '应用中...' : <><Check size={12} />应用模板</>}
              </button>
              <button className="text-[11px] text-text-3 hover:text-text" onClick={() => { setPhase('browse'); setSelectedTemplate(null); }}>
                返回
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
