import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { Bot, User, Sun } from 'lucide-react';

/** Morning Focus - dedicated morning briefing view */
export default function MorningView() {
  const cell = useMatrixCell();
  const indColor = useIndustryColor();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);

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

        {/* Briefing */}
        <div className="rounded-xl border border-border p-5 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${indColor}06 0%, ${indColor}02 100%)` }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10"><Bot size={12} className="text-primary-2" /></div>
            <span className="text-xs font-bold text-text">AI 晨间播报</span>
            <span className="rounded-full px-2 py-0.5 text-[8px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>AI生成</span>
          </div>
          <p className="text-sm text-text-2 leading-relaxed">{cell.morning}</p>
        </div>

        {/* Key metrics */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-3">实时数据</div>
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
