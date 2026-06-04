import { useState } from 'react';
import { useMatrixCell } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Bell, Check, Trash2, ExternalLink, Filter } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'alert' | 'update' | 'mention' | 'system';
  source: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'N-001', title: 'Q3路线图评审截止', content: '明天是Q3路线图评审截止日，3个需求待确认', type: 'alert', source: 'AI产品分析师', time: '10分钟前', read: false },
  { id: 'N-002', title: '导出功能使用率下降', content: '本周使用率降至12%，较上周下降3个百分点', type: 'alert', source: 'AI数据看门人', time: '1小时前', read: false },
  { id: 'N-003', title: '张明在PRD中@了你', content: '「导出功能技术方案」v2.1 需要你的评审意见', type: 'mention', source: '协作', time: '2小时前', read: false },
  { id: 'N-004', title: 'Sprint Review会议提醒', content: '明天09:00 Sprint Review，请准备演示内容', type: 'system', source: '日历', time: '3小时前', read: true },
  { id: 'N-005', title: 'PRD模板v2.0已更新', content: '你关注的「PRD模板」已更新至v2.0', type: 'update', source: '知识库', time: '5小时前', read: true },
  { id: 'N-006', title: '竞品动态', content: 'XX产品发布了AI辅助决策功能', type: 'update', source: 'AI竞品侦探', time: '1天前', read: true },
];

const TYPE_STYLES: Record<string, string> = {
  alert: 'bg-danger/10 text-danger',
  mention: 'bg-primary/10 text-primary-2',
  update: 'bg-accent/10 text-accent',
  system: 'bg-surface-2 text-text-3',
};

export default function NotificationsContent() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread' | 'alert'>('all');
  const unreadCount = notifs.filter((n) => !n.read).length;

  const filtered = filter === 'all' ? notifs : filter === 'unread' ? notifs.filter((n) => !n.read) : notifs.filter((n) => n.type === 'alert');

  function markRead(id: string) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function removeNotif(id: string) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Bell size={16} className="text-primary-2" />
        <span className="text-sm font-bold">通知</span>
        {unreadCount > 0 && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">{unreadCount}</span>}
        <div className="ml-auto flex gap-2">
          {(['all', 'unread', 'alert'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors', filter === f ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2')}
            >{f === 'all' ? '全部' : f === 'unread' ? '未读' : '预警'}</button>
          ))}
          <button onClick={markAllRead} className="rounded-lg px-2.5 py-1 text-[10px] text-text-3 hover:bg-surface-2">全部已读</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.map((notif) => (
          <div key={notif.id} className={cn('group rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-lg', !notif.read && 'border-l-2 border-l-primary')}>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', TYPE_STYLES[notif.type])}>
                {notif.type === 'alert' ? '预警' : notif.type === 'mention' ? '@我' : notif.type === 'update' ? '更新' : '系统'}
              </span>
              <span className="text-xs font-semibold text-text">{notif.title}</span>
              {!notif.read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
              <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notif.read && <button onClick={() => markRead(notif.id)} className="rounded p-1 text-text-3 hover:text-success"><Check size={12} /></button>}
                <button onClick={() => removeNotif(notif.id)} className="rounded p-1 text-text-3 hover:text-danger"><Trash2 size={12} /></button>
              </div>
            </div>
            <p className="text-[11px] text-text-2 leading-relaxed">{notif.content}</p>
            <div className="flex items-center gap-2 mt-2 text-[9px] text-text-3">
              <span>{notif.source}</span>
              <span>·</span>
              <span>{notif.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
