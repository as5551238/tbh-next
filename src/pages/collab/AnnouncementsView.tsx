import { useIndustryColor, useAnnouncements } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Pin, MessageSquare, Eye, Loader2 } from 'lucide-react';



const PRIORITY_STYLES: Record<string, string> = {
  top: 'bg-danger/10 text-danger',
  normal: 'bg-warn/10 text-warn',
  info: 'bg-primary/10 text-primary-2',
};

export default function AnnouncementsView() {
  const indColor = useIndustryColor();
  const { announcements, loading } = useAnnouncements();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">公告板</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{industry} · {dept}</span>
        <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">+ 发布公告</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-text-3" size={24} /></div>
        ) : (
        announcements.map((ann) => (
          <div key={ann.id} className={cn('rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg',
            ann.pinned && 'border-l-2 border-l-primary'
          )}>
            <div className="flex items-center gap-2 mb-2">
              {ann.pinned && <Pin size={12} className="text-primary-2 shrink-0" />}
              <span className="text-sm font-semibold text-text">{ann.title}</span>
              <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', PRIORITY_STYLES[ann.priority])}>
                {ann.priority === 'top' ? '置顶' : ann.priority === 'normal' ? '重要' : '通知'}
              </span>
            </div>
            <p className="text-xs text-text-2 leading-relaxed mb-3">{ann.content}</p>
            <div className="flex items-center justify-between text-[10px] text-text-3">
              <span>{ann.author} · {ann.department}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Eye size={10} />{ann.views}</span>
                <span className="flex items-center gap-1"><MessageSquare size={10} />{ann.comments}</span>
                <span>{ann.time}</span>
              </div>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
}
