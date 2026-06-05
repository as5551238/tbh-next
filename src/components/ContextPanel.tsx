import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { INDUSTRIES, IND_COLORS, getDepartments } from '@/matrix/data';
import { useIndustryColor, useMatrixCell, useDepartments as useDepts } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { X, Sparkles, ChevronRight, Bot, Loader2 } from 'lucide-react';
import { chatCompletion, buildSystemPrompt, type ChatMessage } from '@/lib/aiService';

interface AiMsg {
  role: 'ai' | 'user';
  text: string;
}

interface ChipOption {
  label: string;
  industry: string;
  dept: string;
  confidence: number;
}

export default function ContextPanel() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const setContext = useAppStore((s) => s.setContext);
  const toggleCtxPanel = useAppStore((s) => s.toggleCtxPanel);

  const [inputVal, setInputVal] = useState('');
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([
    { role: 'ai', text: '你好！告诉我你的工作内容，我来理解你的行业和岗位，为你定制专属体验。' },
  ]);
  const [chips, setChips] = useState<ChipOption[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const indColor = useIndustryColor();
  const { cell, loading } = useMatrixCell();

  const handleAiUnderstand = useCallback(async (userText: string) => {
    setIsThinking(true);
    setChips([]);

    const systemPrompt = [
      '你是一个"AI工作理解"助手，根据用户描述的工作内容，推断其所属行业和部门。',
      '',
      '## 可选行业和部门',
      ...INDUSTRIES.map((ind) => {
        const depts = getDepartments(ind);
        return `- ${ind}: ${depts.join('、')}`;
      }),
      '',
      '## 回答格式（严格JSON）',
      '返回一个JSON数组，每项包含 label(对用户的推荐描述)、industry(行业名)、dept(部门名)、confidence(0-1置信度)',
      '按置信度从高到低排列，最多返回3个。',
      '示例: [{"label":"制造业·供应商质量部","industry":"制造业","dept":"供应商质量部","confidence":0.9}]',
      '',
      '只返回JSON数组，不要任何其它文字。',
    ].join('\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ];

    try {
      const res = await chatCompletion(messages);
      const cleanText = res.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed: ChipOption[] = JSON.parse(cleanText);

      if (Array.isArray(parsed) && parsed.length > 0) {
        setChips(parsed.slice(0, 3));
        setAiMessages((prev) => [
          ...prev,
          { role: 'ai', text: `我理解了你的工作。请选择最匹配的上下文，或继续描述以便我更精准地匹配：` },
        ]);
      } else {
        throw new Error('Empty result');
      }
    } catch {
      // Fallback: local keyword matching
      const fallbackChips = localFallbackMatch(userText);
      if (fallbackChips.length > 0) {
        setChips(fallbackChips);
        setAiMessages((prev) => [
          ...prev,
          { role: 'ai', text: `我理解了你的工作。请选择最匹配的上下文：` },
        ]);
      } else {
        setAiMessages((prev) => [
          ...prev,
          { role: 'ai', text: `我还在学习中，能否更详细地描述你的工作内容？比如你所在的行业或负责的业务领域。` },
        ]);
      }
    } finally {
      setIsThinking(false);
    }
  }, []);

  function localFallbackMatch(text: string): ChipOption[] {
    const results: ChipOption[] = [];

    // Check direct keyword matches
    for (const ind of INDUSTRIES) {
      const shortName = ind.replace('行业', '').replace('业', '');
      if (text.includes(shortName) || text.includes(ind)) {
        const depts = getDepartments(ind);
        results.push({ label: `${ind} · ${depts[0]}`, industry: ind, dept: depts[0], confidence: 0.8 });
        if (depts.length > 1) {
          results.push({ label: `${ind} · ${depts[1]}`, industry: ind, dept: depts[1], confidence: 0.5 });
        }
        break;
      }
    }

    // Check department keywords
    if (results.length === 0) {
      const kwMap: Record<string, [string, string]> = {
        '供应商': ['制造业', '供应商质量部'],
        '来料': ['制造业', '供应商质量部'],
        '产品': ['IT业', '产品部'],
        'PRD': ['IT业', '产品部'],
        '教学': ['教育行业', '教学部'],
        '排课': ['教育行业', '教学部'],
        '风控': ['金融行业', '风控部'],
        '合规': ['金融行业', '风控部'],
        '产线': ['制造业', '生产部'],
        'OEE': ['制造业', '生产部'],
        '招生': ['教育行业', '招生部'],
        '研发': ['IT业', '研发部'],
        '代码': ['IT业', '研发部'],
        '质量': ['制造业', '质量部'],
        '检测': ['制造业', '质量部'],
      };
      for (const [kw, val] of Object.entries(kwMap)) {
        if (text.includes(kw)) {
          results.push({ label: `${val[0]} · ${val[1]}`, industry: val[0], dept: val[1], confidence: 0.7 });
          break;
        }
      }
    }

    // Ultimate fallback
    if (results.length === 0) {
      results.push(
        { label: 'IT业 · 产品部', industry: 'IT业', dept: '产品部', confidence: 0.4 },
        { label: '制造业 · 生产部', industry: '制造业', dept: '生产部', confidence: 0.3 },
      );
    }

    return results;
  }

  function handleSuggestionClick(text: string) {
    setAiMessages((prev) => [...prev, { role: 'user', text }]);
    handleAiUnderstand(text);
    setInputVal('');
  }

  function handleChipSelect(chip: ChipOption) {
    setContext(chip.industry, chip.dept);
    setAiMessages((prev) => [
      ...prev,
      { role: 'ai', text: `已切换到「${chip.industry} · ${chip.dept}」，界面、KPI、工作流和Agent已为你定制。` },
    ]);
    setChips([]);
  }

  function handleSubmit() {
    if (!inputVal.trim() || isThinking) return;
    const text = inputVal.trim();
    setAiMessages((prev) => [...prev, { role: 'user', text }]);
    handleAiUnderstand(text);
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
        <button onClick={toggleCtxPanel} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text">
          <X size={16} />
        </button>
      </div>

      {/* Current Context */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">当前理解</div>
        <div className="flex items-center gap-2">
          <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: indColor + '18', color: indColor }}>{industry}</span>
          <ChevronRight size={12} className="text-text-3" />
          <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-medium text-text">{dept}</span>
        </div>
      </div>

      {/* Understanding Layers */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">词汇层</div>
        <div className="flex flex-wrap gap-1.5">
          {cell.kpis.slice(0, 3).map((kpi) => (
            <span key={kpi.name} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-text-2">{kpi.name}</span>
          ))}
        </div>
        <div className="mb-2 mt-3 text-[10px] font-bold uppercase tracking-wider text-text-3">流程层</div>
        <div className="flex items-center gap-1 text-[10px] text-text-2">
          {cell.workflow.map((step, i) => (
            <span key={step} className="flex items-center gap-1">
              <span className={cn(i === cell.wfCurrent && 'font-bold text-accent')}>{step}</span>
              {i < cell.workflow.length - 1 && <ChevronRight size={10} className="text-text-3" />}
            </span>
          ))}
        </div>
        <div className="mb-2 mt-3 text-[10px] font-bold uppercase tracking-wider text-text-3">指标层</div>
        <div className="flex flex-wrap gap-1.5">
          {cell.kpis.map((kpi) => (
            <span key={kpi.name} className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', kpi.status === 'good' && 'bg-success/10 text-success', kpi.status === 'warn' && 'bg-warn/10 text-warn', kpi.status === 'bad' && 'bg-danger/10 text-danger')}>
              {kpi.name} {kpi.value}
            </span>
          ))}
        </div>
      </div>

      {/* AI Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">对话设定</div>
        <div className="flex flex-col gap-2 mb-3">
          {aiMessages.map((msg, i) => (
            <div key={i} className={cn('rounded-lg px-3 py-2 text-xs leading-relaxed', msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : 'bg-surface-2 text-text-2 ml-6')}>
              {msg.role === 'ai' && <Bot size={12} className="inline mr-1 opacity-50" />}
              {msg.text}
            </div>
          ))}
          {isThinking && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary-2">
              <Loader2 size={12} className="animate-spin" />
              <span>正在理解...</span>
            </div>
          )}
        </div>

        {/* Chip options */}
        {chips.length > 0 && (
          <div className="space-y-1.5 mb-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-text-3">选择你的上下文</div>
            {chips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleChipSelect(chip)}
                className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: (IND_COLORS[chip.industry] ?? '#7b6cf0') + '18', color: IND_COLORS[chip.industry] ?? '#7b6cf0' }}>
                  {Math.round(chip.confidence * 100)}%
                </span>
                <span className="text-xs font-medium text-text">{chip.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Suggestions */}
      <div className="border-t border-border px-4 py-2">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">快速描述</div>
        <div className="flex flex-wrap gap-1.5">
          {['我负责供应商来料质量', '我是产品经理', '我管理教学排课', '我做风险控制', '我负责产线OEE', '我是招生顾问'].map((s) => (
            <button key={s} onClick={() => handleSuggestionClick(s)} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-3 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary-2" disabled={isThinking}>
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
            aria-label="描述你的工作"
            className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3"
            disabled={isThinking}
          />
          <button onClick={handleSubmit} className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50" disabled={isThinking}>
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
