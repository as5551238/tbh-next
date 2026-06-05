import { useExperiences, useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { BookOpen, Sparkles, Tag, ThumbsUp, MessageSquare, Plus, Loader2 } from 'lucide-react';

export default function ExperienceContent() {
  const { cell, loading: cellLoading } = useMatrixCell();
  const indColor = useIndustryColor();
  const { experiences, loading } = useExperiences();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-2" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen size={18} style={{ color: indColor }} />
        <span className="text-sm font-bold">经验库</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>AI增强</span>
        <button className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20">
          <Plus size={12} />
          提炼经验
        </button>
      </div>

      {/* AI Auto-extraction Hint */}
      <div className="rounded-xl border border-border p-3 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${indColor}06 0%, transparent 100%)` }}>
        <div className="flex items-center gap-2 text-xs">
          <Sparkles size={14} style={{ color: indColor }} />
          <span className="font-semibold text-text">AI 已自动提炼 3 条新经验</span>
        </div>
        <p className="mt-1 text-[11px] text-text-2">基于本周项目复盘和代码提交，发现2个可复用模式。点击查看详情。</p>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <BookOpen size={14} className="text-text-3" />
          <span className="text-xs text-text-3">搜索经验、标签、作者...</span>
        </div>
      </div>

      {/* Hot Tags */}
      <div className="flex flex-wrap gap-1.5">
        {['敏捷', '性能', '协作', 'PRD', '优化', '流程', '沟通', '模板'].map((t) => (
          <span key={t} className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] text-text-2 hover:bg-primary/10 hover:text-primary-2 cursor-pointer transition-colors">
            <Tag size={9} className="inline mr-1" />{t}
          </span>
        ))}
      </div>

      {/* Experience Cards */}
      <div className="space-y-3">
        {experiences.map((e) => (
          <div key={e.id} className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text">{e.title}</span>
              <span className="text-[10px] text-text-3">{e.author}</span>
            </div>
            <p className="text-[11px] text-text-2 leading-relaxed mb-3">{e.summary}</p>
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {e.tags.map((t) => (
                  <span key={t} className="rounded bg-primary/5 px-1.5 py-0.5 text-[9px] text-primary-2">{t}</span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-text-3">
                <span className="flex items-center gap-1"><ThumbsUp size={10} />{e.likes}</span>
                <span className="flex items-center gap-1"><MessageSquare size={10} />{e.comments}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Suggestion */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-xs text-primary-2">
          <Sparkles size={14} />
          <span className="font-semibold">AI 建议</span>
        </div>
        <p className="mt-1 text-[11px] text-text-2">"导出功能性能优化"和"敏捷迭代避坑"被高频引用，建议升级为团队标准流程文档。</p>
      </div>
    </div>
  );
}
