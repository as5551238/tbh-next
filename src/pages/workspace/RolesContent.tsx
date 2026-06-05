import { useRoles } from '@/hooks/useMatrix';
import { Shield, Plus, Users, Lock, Eye, Loader2 } from 'lucide-react';

export default function RolesContent() {
  const { roles, loading } = useRoles();

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
        <Shield size={18} className="text-primary-2" />
        <span className="text-sm font-bold">角色权限</span>
        <button className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20">
          <Plus size={12} />
          新建角色
        </button>
      </div>

      {/* Permission Matrix */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-2/50">
              <th className="px-3 py-2 text-left font-semibold text-text-3">权限项</th>
              {roles.map((r) => (
                <th key={r.key} className="px-2 py-2 text-center font-semibold" style={{ color: r.color }}>
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: '系统配置', perms: ['admin'] },
              { name: '成员管理', perms: ['admin', 'manager'] },
              { name: '目标管理', perms: ['admin', 'manager'] },
              { name: '审批', perms: ['admin', 'manager'] },
              { name: '任务管理', perms: ['admin', 'manager', 'member'] },
              { name: '文档协作', perms: ['admin', 'manager', 'member', 'agent'] },
              { name: '数据分析', perms: ['admin', 'manager', 'agent'] },
              { name: '只读访问', perms: ['admin', 'manager', 'member', 'agent', 'viewer'] },
            ].map((row, i) => (
              <tr key={row.name} className={i % 2 === 0 ? '' : 'bg-surface-2/30'}>
                <td className="px-3 py-1.5 text-text-2">{row.name}</td>
                {roles.map((r) => (
                  <td key={r.key} className="px-2 py-1.5 text-center">
                    {row.perms.includes(r.key) ? (
                      <span className="inline-block h-4 w-4 rounded-full bg-success/20 text-success text-[9px] leading-4">&#10003;</span>
                    ) : (
                      <span className="inline-block h-4 w-4 rounded-full bg-surface-2 text-text-3 text-[9px] leading-4">&#8212;</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role Cards */}
      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.key} className="rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-sm font-semibold text-text">{r.name}</span>
              </div>
              <div className="flex items-center gap-1 text-text-3">
                <Users size={12} />
                <span className="text-[10px]">{r.members} 人</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.permissions.map((p) => (
                <span key={p} className="rounded-full px-2 py-0.5 text-[9px] bg-surface-2 text-text-2 flex items-center gap-1">
                  {p === '只读访问' ? <Eye size={9} /> : <Lock size={9} />}
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
