import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Pin, MessageSquare, Eye } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  department: string;
  priority: 'top' | 'normal' | 'info';
  pinned: boolean;
  time: string;
  views: number;
  comments: number;
}

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: 'AN-001', title: 'Q3战略目标全员对齐会', content: '本周五14:00在主会议室召开Q3战略目标对齐会，请各部门负责人准备5分钟述职报告，重点汇报进展偏差和资源需求。', author: 'CEO办公室', department: '管理层', priority: 'top', pinned: true, time: '1小时前', views: 128, comments: 12 },
  { id: 'AN-002', title: '新办公区域6/15正式启用', content: 'B座3楼整修完成，6月15日起研发部和设计部将搬迁至新区域，请提前整理个人物品，行政部会协助搬迁。', author: '行政部', department: '行政', priority: 'normal', pinned: true, time: '3小时前', views: 86, comments: 5 },
  { id: 'AN-003', title: '6月团建活动报名开始', content: '本月底团建前往莫干山，含徒步、篝火晚会等项目，6/10前完成报名，费用公司承担，家属可参加（自费50%）。', author: 'HR', department: '人力', priority: 'info', pinned: false, time: '1天前', views: 203, comments: 28 },
  { id: 'AN-004', title: 'VPN升级维护通知', content: '6月12日22:00-23:00进行VPN系统升级，期间远程访问将中断，请提前做好工作安排。', author: 'IT部', department: 'IT', priority: 'normal', pinned: false, time: '2天前', views: 67, comments: 3 },
];

const PRIORITY_STYLES: Record<string, string> = {
  top: 'bg-danger/10 text-danger',
  normal: 'bg-warn/10 text-warn',
  info: 'bg-primary/10 text-primary-2',
};

export default function AnnouncementsView() {
  const indColor = useIndustryColor();
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
        {MOCK_ANNOUNCEMENTS.map((ann) => (
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
        ))}
      </div>
    </div>
  );
}
