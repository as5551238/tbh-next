import { useMatrixCell } from '@/hooks/useMatrix';
import { Users, Plus, Search, MoreHorizontal, Mail, Phone } from 'lucide-react';

export default function MembersContent() {
  const members = [
    { name: '王学', role: 'admin', dept: '产品部', email: 'admin@team.com', phone: '186****1903', status: 'online', tasks: 5, goals: 3 },
    { name: '张工', role: 'member', dept: '研发部', email: 'zhang@team.com', phone: '139****5678', status: 'online', tasks: 8, goals: 2 },
    { name: '李工', role: 'member', dept: '研发部', email: 'li@team.com', phone: '138****1234', status: 'away', tasks: 3, goals: 1 },
    { name: '赵PM', role: 'manager', dept: '产品部', email: 'zhao@team.com', phone: '137****5678', status: 'online', tasks: 6, goals: 4 },
    { name: '刘设计', role: 'member', dept: '设计部', email: 'liu@team.com', phone: '136****9012', status: 'offline', tasks: 2, goals: 1 },
    { name: 'AI同事·数据分析师', role: 'agent', dept: 'AI团队', email: '-', phone: '-', status: 'online', tasks: 12, goals: 0 },
  ];

  const roleMap: Record<string, { label: string; cls: string }> = {
    admin: { label: '管理员', cls: 'bg-danger/10 text-danger' },
    manager: { label: '经理', cls: 'bg-warn/10 text-warn' },
    member: { label: '成员', cls: 'bg-primary/10 text-primary-2' },
    agent: { label: 'AI同事', cls: 'bg-accent/10 text-accent' },
  };

  const statusMap: Record<string, { dot: string; label: string }> = {
    online: { dot: 'bg-success', label: '在线' },
    away: { dot: 'bg-warn', label: '离开' },
    offline: { dot: 'bg-text-3', label: '离线' },
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users size={18} className="text-primary-2" />
        <span className="text-sm font-bold">成员管理</span>
        <span className="ml-auto text-[10px] text-text-3">{members.length} 人</span>
        <button className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:bg-primary-2">
          <Plus size={12} />
          邀请成员
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <div className="text-xl font-extrabold text-success">4</div>
          <div className="text-[10px] text-text-3">在线</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <div className="text-xl font-extrabold text-warn">1</div>
          <div className="text-[10px] text-text-3">离开</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 text-center">
          <div className="text-xl font-extrabold text-text-3">1</div>
          <div className="text-[10px] text-text-3">离线</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
        <Search size={14} className="text-text-3" />
        <span className="text-xs text-text-3">搜索成员...</span>
      </div>

      {/* Member List */}
      <div className="space-y-2">
        {members.map((m) => {
          const role = roleMap[m.role];
          const st = statusMap[m.status];
          return (
            <div key={m.name} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg">
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary-2">
                  {m.name.charAt(0)}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${st.dot}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text">{m.name}</span>
                  <span className={cn2('rounded-full px-1.5 py-[1px] text-[8px] font-bold', role.cls)}>{role.label}</span>
                </div>
                <div className="text-[10px] text-text-3">{m.dept} · {m.tasks}任务 · {m.goals}目标</div>
              </div>
              <div className="hidden group-hover:flex items-center gap-1">
                <button className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text"><Mail size={13} /></button>
                <button className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text"><Phone size={13} /></button>
                <button className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2 hover:text-text"><MoreHorizontal size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function cn2(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
