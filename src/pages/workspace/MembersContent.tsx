import { useMembers } from '@/hooks/useMatrix';
import { Users, Plus, Search, MoreHorizontal, Mail, Phone, Loader2 } from 'lucide-react';

export default function MembersContent() {
  const { members, loading } = useMembers();

  const roleMap: Record<string, { label: string; cls: string }> = {
    admin: { label: '管理员', cls: 'bg-danger/10 text-danger' },
    manager: { label: '经理', cls: 'bg-warn/10 text-warn' },
    member: { label: '成员', cls: 'bg-primary/10 text-primary-2' },
    agent: { label: 'AI同事', cls: 'bg-accent/10 text-accent' },
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

      {/* Search */}
      <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
        <Search size={14} className="text-text-3" />
        <span className="text-xs text-text-3">搜索成员...</span>
      </div>

      {/* Member List */}
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-2" /></div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => {
            const role = roleMap[m.role] || roleMap.member;
            return (
              <div key={m.id} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg">
                <div className="relative shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary-2">
                    {m.name.charAt(0)}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text">{m.name}</span>
                    <span className={cn2('rounded-full px-1.5 py-[1px] text-[8px] font-bold', role.cls)}>{role.label}</span>
                  </div>
                  <div className="text-[10px] text-text-3">{m.dept} · {m.email}</div>
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
      )}
    </div>
  );
}

function cn2(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
