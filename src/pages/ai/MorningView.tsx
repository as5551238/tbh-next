import { useState, useEffect, useCallback, useRef } from 'react';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { Bot, Sun, RefreshCw, Sparkles } from 'lucide-react';
import { chatCompletion, buildSystemPrompt, type ChatMessage } from '@/lib/aiService';
import { MORNING_AGENT } from '@/lib/agents';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useMatrix';

/** Morning Focus - AI-powered dedicated morning briefing view */
export default function MorningView() {
  const { cell, loading } = useMatrixCell();
  const indColor = useIndustryColor();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);

  const [briefing, setBriefing] = useState<string>('');
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingSource, setBriefingSource] = useState<string>('');
  const { addNotification } = useNotifications();
  const briefingPushedRef = useRef(false);

  const generateBriefing = useCallback(async () => {
    setBriefingLoading(true);
    setBriefing('');

    const systemPrompt = MORNING_AGENT.systemPrompt(cell, industry, dept);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请生成今日晨间播报，包含：1)核心状态概括 2)今日重点(3-5项) 3)告警指标行动建议' },
    ];

    try {
      const res = await chatCompletion(messages, {
        stream: true,
        harness: { agentId: 'morning-brief' },
        enableTools: true,
        onChunk: (chunk, done) => {
          if (done) {
            setBriefingLoading(false);
            return;
          }
          setBriefing((prev) => prev + chunk);
        },
      });
      setBriefingSource(res.agent ?? 'local');

      // S8.2: Push morning briefing notification (once per session)
      if (!briefingPushedRef.current && res.text) {
        briefingPushedRef.current = true;
        const summary = res.text.slice(0, 120).replace(/[#*_]/g, '').trim();
        addNotification({
          title: '晨间播报已生成',
          message: summary + (res.text.length > 120 ? '...' : ''),
          type: 'system',
          related_id: null,
          related_type: null,
          member_id: null,
          level: 'info',
        });
      }
    } catch {
      // AI generation failed — fallback to cell.morning static data
      setBriefing(cell.morning);
      setBriefingSource('fallback');
      setBriefingLoading(false);
    }
  }, [cell, industry, dept]);

  // Auto-generate briefing on mount or when cell changes
  useEffect(() => {
    if (!loading && cell.morning) {
      generateBriefing();
    }
  }, [loading, cell.morning, generateBriefing]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-lg w-full space-y-6">
        {/* Greeting */}
        <div className="text-center relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full blur-3xl opacity-20" style={{ backgroundColor: indColor }} />
          </div>
          <div className="relative z-10">
            <div className="text-5xl mb-3">☀️</div>
            <h1 className="text-2xl font-extrabold text-text mb-1">晨间聚焦</h1>
            <p className="text-sm text-text-3">{industry} · {dept}</p>
          </div>
        </div>

        {/* AI Briefing */}
        <div className="rounded-xl border border-border p-5 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${indColor}06 0%, ${indColor}02 100%)` }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10"><Bot size={12} className="text-primary-2" /></div>
            <span className="text-xs font-bold text-text">AI 晨间播报</span>
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[8px] font-bold',
              briefingSource === 'llm' && 'bg-success/10 text-success',
              briefingSource === 'edge' && 'bg-primary/10 text-primary-2',
              briefingSource === 'local' && 'bg-warn/10 text-warn',
              !briefingSource && 'bg-surface-2 text-text-3',
            )}>
              {briefingSource === 'llm' ? 'LLM' : briefingSource === 'edge' ? 'Edge' : briefingSource === 'local' ? '离线快照' : 'AI生成'}
            </span>
            <button
              onClick={generateBriefing}
              className="ml-auto rounded-lg p-1 text-text-3 transition-all hover:bg-primary/10 hover:text-primary-2"
              title="重新生成"
              disabled={briefingLoading}
            >
              <RefreshCw size={14} className={cn(briefingLoading && 'animate-spin')} />
            </button>
          </div>
          {briefingLoading && !briefing ? (
            <div className="flex items-center gap-2 text-sm text-text-3">
              <Sparkles size={14} className="animate-pulse text-primary-2" />
              <span>AI 正在生成晨间播报...</span>
            </div>
          ) : (
            <p className="text-sm text-text-2 leading-relaxed whitespace-pre-line">
              {briefing || cell.morning}
              {briefingLoading && <span className="inline-block w-1.5 h-4 ml-1 bg-primary-2 animate-pulse align-text-bottom" />}
            </p>
          )}
        </div>

        {/* Key metrics */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-3">行业快照</div>
          <p className="text-sm text-text-2 mb-4">{cell.ribbon}</p>
          <div className="flex items-center gap-2 text-xs text-primary-2">
            <Bot size={14} />
            <span>下一步: {cell.nextStep}</span>
          </div>
        </div>

        {/* Top 3 alerts */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3">重点关注</div>
          {cell.top3.map((item, i) => (
            <div key={i} className={`rounded-xl px-4 py-3 text-xs ${
              item.level === 'danger' ? 'bg-danger/5 text-danger border border-danger/10' :
              item.level === 'warn' ? 'bg-warn/5 text-warn border border-warn/10' :
              'bg-primary/5 text-primary-2 border border-primary/10'
            }`}>
              {item.level === 'danger' ? '🔴' : item.level === 'warn' ? '⚠️' : 'ℹ️'} {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
