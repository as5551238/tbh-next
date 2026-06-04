import { useState } from 'react';
import { useMatrixCell } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Workflow, Play, Copy, Edit3, Star, Clock } from 'lucide-react';

interface WorkflowTemplate {
  id: string;
  name: string;
  steps: string[];
  category: string;
  usageCount: number;
  isBuiltIn: boolean;
}

const MOCK_WORKFLOWS: WorkflowTemplate[] = [
  { id: 'WF-001', name: '需求→交付标准流程', steps: ['需求采集', '优先级排序', 'PRD编写', '评审', '排入迭代', '验收'], category: '产品', usageCount: 342, isBuiltIn: true },
  { id: 'WF-002', name: 'Bug修复流程', steps: ['Bug报告', '分级确认', '排期修复', '代码审查', '测试验证', '上线'], category: '研发', usageCount: 256, isBuiltIn: true },
  { id: 'WF-003', name: '项目立项审批', steps: ['立项申请', '预算审核', '技术评审', '管理层审批', '启动'], category: '管理', usageCount: 89, isBuiltIn: true },
  { id: 'WF-004', name: '竞品分析SOP', steps: ['数据采集', '功能对比', 'SWOT分析', '策略建议', '汇报'], category: '产品', usageCount: 45, isBuiltIn: false },
  { id: 'WF-005', name: '版本发布流程', steps: ['Release分支', 'QA验证', '灰度发布', '全量发布', '监控'], category: '研发', usageCount: 128, isBuiltIn: true },
];

export default function WorkflowsView() {
  const [selectedId, setSelectedId] = useState(MOCK_WORKFLOWS[0].id);
  const selected = MOCK_WORKFLOWS.find((w) => w.id === selectedId)!;
  const cell = useMatrixCell();

  return (
    <div className="flex h-full">
      {/* Template List */}
      <div className="flex w-64 shrink-0 flex-col border-r border-border bg-surface overflow-y-auto">
        <div className="border-b border-border px-3 py-2.5">
          <span className="text-xs font-bold">工作流模板</span>
          <span className="ml-2 text-[9px] text-text-3">{MOCK_WORKFLOWS.length} 个</span>
        </div>
        <div className="py-1">
          {MOCK_WORKFLOWS.map((wf) => (
            <button key={wf.id} onClick={() => setSelectedId(wf.id)}
              className={cn('flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors',
                selectedId === wf.id ? 'bg-primary/10 font-semibold text-primary-2' : 'text-text-2 hover:bg-surface-2'
              )}
            >
              <Workflow size={13} className="shrink-0 text-text-3" />
              <div className="min-w-0">
                <div className="truncate">{wf.name}</div>
                <div className="text-[9px] text-text-3 flex items-center gap-2"><Star size={8} />{wf.usageCount}次使用</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="text-sm font-bold">{selected.name}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary-2">{selected.category}</span>
          {selected.isBuiltIn && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] text-text-3">内置</span>}
          <div className="ml-auto flex gap-2">
            <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] text-text-3 hover:text-text"><Copy size={10} />复制</button>
            <button className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] text-text-3 hover:text-text"><Edit3 size={10} />编辑</button>
            <button className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-white hover:opacity-80"><Play size={10} />启动</button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-2xl">
          {/* Steps visualization */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-3">流程步骤</div>
            <div className="space-y-2">
              {selected.steps.map((step, i) => {
                const isCurrent = cell.workflow[i] === step && i === cell.wfCurrent;
                const isDone = i < cell.wfCurrent;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0',
                      isCurrent ? 'bg-primary text-white' : isDone ? 'bg-success/20 text-success' : 'bg-surface-2 text-text-3'
                    )}>{i + 1}</div>
                    <span className={cn('text-xs', isCurrent ? 'font-semibold text-text' : isDone ? 'text-success' : 'text-text-3')}>{step}</span>
                    {isCurrent && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-bold text-primary-2">当前</span>}
                    {isDone && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[8px] font-bold text-success">已完成</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="text-[9px] text-text-3 mb-1">使用次数</div>
              <div className="text-lg font-extrabold text-text flex items-center gap-2"><Clock size={14} className="text-text-3" />{selected.usageCount}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="text-[9px] text-text-3 mb-1">步骤数</div>
              <div className="text-lg font-extrabold text-text">{selected.steps.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
