import { useMatrixCell } from '@/hooks/useMatrix';
import { FileText, Plus, Clock, Users, MoreHorizontal } from 'lucide-react';

export default function DocsContent() {
  const cell = useMatrixCell();

  const docs = [
    { title: 'Q3产品路线图', type: '在线文档', editors: 3, updated: '10分钟前', status: 'editing', author: '我' },
    { title: '导出功能技术方案', type: '在线文档', editors: 2, updated: '1小时前', status: 'editing', author: '张工' },
    { title: '竞品分析报告', type: '在线文档', editors: 1, updated: '昨天', status: 'review', author: 'AI同事' },
    { title: 'PRD模板v2.0', type: '模板', editors: 0, updated: '3天前', status: 'published', author: '我' },
    { title: 'API接口文档', type: '在线文档', editors: 1, updated: '5天前', status: 'draft', author: '李工' },
    { title: '新人onboarding手册', type: '在线文档', editors: 0, updated: '1周前', status: 'published', author: 'HR' },
  ];

  const statusMap: Record<string, { label: string; cls: string }> = {
    editing: { label: '编辑中', cls: 'bg-success/10 text-success' },
    review: { label: '评审中', cls: 'bg-warn/10 text-warn' },
    draft: { label: '草稿', cls: 'bg-surface-2 text-text-3' },
    published: { label: '已发布', cls: 'bg-primary/10 text-primary-2' },
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-primary-2" />
        <span className="text-sm font-bold">文档协作</span>
        <button className="ml-auto flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white transition-all hover:bg-primary-2">
          <Plus size={12} />
          新建文档
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2">
        {['全部', '正在编辑', '评审中', '草稿', '已发布'].map((f, i) => (
          <button key={f} className={`rounded-lg px-3 py-1 text-[11px] font-medium transition-all ${i === 0 ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-2">实时协作</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px]">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-text-2">张工正在编辑 <span className="text-text font-medium">导出功能技术方案</span></span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-text-2">AI同事正在评审 <span className="text-text font-medium">竞品分析报告</span></span>
          </div>
        </div>
      </div>

      {/* Doc List */}
      <div className="space-y-2">
        {docs.map((d) => {
          const st = statusMap[d.status];
          return (
            <div key={d.title} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <FileText size={15} className="text-primary-2" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text truncate">{d.title}</div>
                <div className="flex items-center gap-2 text-[10px] text-text-3 mt-0.5">
                  <span>{d.type}</span>
                  <span>·</span>
                  <Clock size={9} />
                  <span>{d.updated}</span>
                  {d.editors > 0 && (
                    <>
                      <span>·</span>
                      <Users size={9} />
                      <span>{d.editors}人编辑</span>
                    </>
                  )}
                </div>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold', st.cls)}>{st.label}</span>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity text-text-3 hover:text-text">
                <MoreHorizontal size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
