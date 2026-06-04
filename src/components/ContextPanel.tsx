import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { INDUSTRIES, IND_COLORS, getDepartments } from '@/matrix/data';
import { useIndustryColor, useMatrixCell, useDepartments as useDepts } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { X, Sparkles, ChevronRight } from 'lucide-react';

const SUGGESTIONS = [
  '我负责供应商来料质量',
  '我是产品经理',
  '我管理教学排课',
  '我做风险控制',
  '我负责产线OEE',
  '我是招生顾问',
];

const SUGGESTION_MAP: Record<string, [string, string]> = {
  '我负责供应商来料质量': ['制造业', '供应商质量部'],
  '我是产品经理': ['IT业', '产品部'],
  '我管理教学排课': ['教育行业', '教学部'],
  '我做风险控制': ['金融行业', '风控部'],
  '我负责产线OEE': ['制造业', '生产部'],
  '我是招生顾问': ['教育行业', '招生部'],
};

export default function ContextPanel() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const setContext = useAppStore((s) => s.setContext);
  const toggleCtxPanel = useAppStore((s) => s.toggleCtxPanel);

  const [inputVal, setInputVal] = useState('');
  const [aiMessages, setAiMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: '你好！告诉我你的工作内容，我来理解你的行业和岗位，为你定制专属体验。' },
  ]);

  const indColor = useIndustryColor();
  const cell = useMatrixCell();

  function handleSuggestion(text: string) {
    const mapped = SUGGESTION_MAP[text];
    if (mapped) {
      setContext(mapped[0], mapped[1]);
      setAiMessages((prev) => [
        ...prev,
        { role: 'user', text },
        { role: 'ai', text: `识别到你的行业是「${mapped[0]}」，岗位是「${mapped[1]}」。我已为你调整界面、KPI、工作流和Agent配置。` },
      ]);
      setInputVal('');
    }
  }

  function handleSubmit() {
    if (!inputVal.trim()) return;
    const text = inputVal.trim();
    setAiMessages((prev) => [...prev, { role: 'user', text }]);

    let matchedInd = industry;
    let matchedDept = dept;
    for (const [key, val] of Object.entries(SUGGESTION_MAP)) {
      if (text.includes(key.slice(2, 5))) {
        matchedInd = val[0];
        matchedDept = val[1];
        break;
      }
    }
    for (const ind of INDUSTRIES) {
      if (text.includes(ind.replace('行业', '').replace('业', ''))) {
        matchedInd = ind;
        const depts = getDepartments(ind);
        matchedDept = depts[0];
        break;
      }
    }

    setContext(matchedInd, matchedDept);
    setAiMessages((prev) => [
      ...prev,
      { role: 'ai', text: `我已经理解了。你处于「${matchedInd} · ${matchedDept}」，界面已切换为对应视角。` },
    ]);
    setInputVal('');
  }

  return (
    <div className="flex w-[380px] shrink-0 flex-col border-l border-border bg-surface z-40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: indColor }} />
          <span className="text-sm font-bold">AI 理解你的工作</span>
        </div>
        <button
          onClick={toggleCtxPanel}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
        >
          <X size={16} />
        </button>
      </div>

      {/* Current Context */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">
          当前理解
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-md px-2 py-1 text-xs font-semibold"
            style={{ backgroundColor: indColor + '18', color: indColor }}
          >
            {industry}
          </span>
          <ChevronRight size={12} className="text-text-3" />
          <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-medium text-text">
            {dept}
          </span>
        </div>
      </div>

      {/* Understanding Layers */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">
          词汇层
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cell.kpis.slice(0, 3).map((kpi) => (
            <span key={kpi.name} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-text-2">
              {kpi.name}
            </span>
          ))}
        </div>

        <div className="mb-2 mt-3 text-[10px] font-bold uppercase tracking-wider text-text-3">
          流程层
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-2">
          {cell.workflow.map((step, i) => (
            <span key={step} className="flex items-center gap-1">
              <span className={cn(i === cell.wfCurrent && 'font-bold text-accent')}>{step}</span>
              {i < cell.workflow.length - 1 && <ChevronRight size={10} className="text-text-3" />}
            </span>
          ))}
        </div>

        <div className="mb-2 mt-3 text-[10px] font-bold uppercase tracking-wider text-text-3">
          指标层
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cell.kpis.map((kpi) => (
            <span
              key={kpi.name}
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                kpi.status === 'good' && 'bg-success/10 text-success',
                kpi.status === 'warn' && 'bg-warn/10 text-warn',
                kpi.status === 'bad' && 'bg-danger/10 text-danger'
              )}
            >
              {kpi.name} {kpi.value}
            </span>
          ))}
        </div>
      </div>

      {/* AI Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">
          对话设定
        </div>
        <div className="flex flex-col gap-2 mb-3">
          {aiMessages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg px-3 py-2 text-xs leading-relaxed',
                msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : 'bg-surface-2 text-text-2 ml-6'
              )}
            >
              {msg.text}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Suggestions */}
      <div className="border-t border-border px-4 py-2">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">
          快速描述
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-3 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary-2"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="描述你的工作..."
            className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3"
          />
          <button
            onClick={handleSubmit}
            className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-80"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
