import { Building2, Globe, Users, Calendar, Settings } from 'lucide-react';

export default function OrgContent() {
  const orgInfo = {
    name: '星辰科技',
    industry: '信息技术',
    size: '50-200人',
    plan: '专业版',
    created: '2025-03-15',
  };

  const departments = [
    { name: '产品部', head: '赵PM', members: 5, goals: 4, color: '#7b6cf0' },
    { name: '研发部', head: '张工', members: 12, goals: 6, color: '#00d4aa' },
    { name: '设计部', head: '刘设计', members: 3, goals: 2, color: '#ffc44d' },
    { name: '运营部', head: '待定', members: 4, goals: 3, color: '#ff5c6a' },
    { name: 'AI团队', head: 'AI同事', members: 1, goals: 0, color: '#00d4aa' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Building2 size={18} className="text-primary-2" />
        <span className="text-sm font-bold">组织设置</span>
      </div>

      {/* Org Info Card */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary-2">
            星
          </div>
          <div>
            <div className="text-base font-bold text-text">{orgInfo.name}</div>
            <div className="text-[11px] text-text-3">{orgInfo.industry} · {orgInfo.size} · {orgInfo.plan}</div>
          </div>
          <button className="ml-auto rounded-lg bg-surface-2 px-3 py-1 text-[11px] text-text-2 hover:bg-surface-2/80">
            编辑
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-surface-2/50 p-2.5 text-center">
            <div className="text-xs font-bold text-text">{orgInfo.size}</div>
            <div className="text-[9px] text-text-3">团队规模</div>
          </div>
          <div className="rounded-lg bg-surface-2/50 p-2.5 text-center">
            <div className="text-xs font-bold text-text">{departments.length}</div>
            <div className="text-[9px] text-text-3">部门数</div>
          </div>
          <div className="rounded-lg bg-surface-2/50 p-2.5 text-center">
            <div className="text-xs font-bold text-text">{orgInfo.plan}</div>
            <div className="text-[9px] text-text-3">当前版本</div>
          </div>
        </div>
      </div>

      {/* Department Structure */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-text-3 uppercase tracking-wider">部门架构</span>
          <button className="rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary-2 hover:bg-primary/20">
            + 新建部门
          </button>
        </div>
        <div className="space-y-2">
          {departments.map((d) => (
            <div key={d.name} className="group flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer">
              <div className="h-9 w-9 flex items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: d.color + '15' }}>
                <Users size={15} style={{ color: d.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text">{d.name}</div>
                <div className="text-[10px] text-text-3">负责人: {d.head} · {d.members}人 · {d.goals}个目标</div>
              </div>
              <div className="h-6 w-16 rounded-full overflow-hidden bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${Math.min(d.members / 12 * 100, 100)}%`, backgroundColor: d.color }} />
              </div>
              <button className="opacity-0 group-hover:opacity-100 text-text-3 hover:text-text transition-opacity">
                <Settings size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Org Settings */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-text-3 uppercase tracking-wider">组织配置</span>
        {[
          { label: '行业类型', value: '信息技术', icon: <Globe size={13} /> },
          { label: '创建时间', value: orgInfo.created, icon: <Calendar size={13} /> },
          { label: '订阅方案', value: '专业版 (年付)', icon: <Settings size={13} /> },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5">
            <span className="text-text-3">{s.icon}</span>
            <span className="text-xs text-text-2">{s.label}</span>
            <span className="ml-auto text-xs font-medium text-text">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
