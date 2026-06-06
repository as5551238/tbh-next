import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { PLAN_LIMITS, PLAN_PRICES, fetchSubscription, fetchUsageToday, type SubscriptionInfo, type UsageSummary } from '@/lib/subscription';
import { Crown, Zap, Building2, TrendingUp, Users, Bot, FileText, FolderKanban, Loader2 } from 'lucide-react';
import { useAgentDetails, useMembers, useProjects, useKnowledgeDocs } from '@/hooks/useMatrix';

export default function SubscriptionView() {
  const { user } = useAuth();
  const { agents } = useAgentDetails();
  const { members } = useMembers();
  const { projects } = useProjects();
  const { docs: knowledgeDocs } = useKnowledgeDocs();
  const [sub, setSub] = useState<SubscriptionInfo>({ plan: 'free', status: 'active', currentPeriodEnd: null });
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (user?.id) {
        const [subInfo, usageToday] = await Promise.all([
          fetchSubscription(user.id),
          fetchUsageToday(user.id),
        ]);
        setSub(subInfo);

        // Build usage summary from limits + actual usage
        const limits = PLAN_LIMITS[subInfo.plan] ?? PLAN_LIMITS.free;
        setUsage({
          aiQueries: usageToday.aiQueries,
          aiQueriesLimit: limits.aiQueriesPerDay,
          agents: agents.length,
          agentsLimit: limits.maxAgents,
          teamMembers: members.length,
          teamMembersLimit: limits.maxTeamMembers,
          projects: projects.length,
          projectsLimit: limits.maxProjects,
          docs: knowledgeDocs.length,
          docsLimit: limits.maxDocs,
        });
      }
      setLoading(false);
    }
    load();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-text-3" size={24} />
      </div>
    );
  }

  const limits = PLAN_LIMITS[sub.plan] ?? PLAN_LIMITS.free;
  const price = PLAN_PRICES[sub.plan];
  const planIcon = sub.plan === 'pro' ? <Crown size={20} className="text-primary-2" /> : sub.plan === 'enterprise' ? <Building2 size={20} className="text-accent" /> : <Zap size={20} className="text-warn" />;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Current plan */}
        <div className="rounded-xl border border-border p-5" style={{ background: `linear-gradient(135deg, #7b6cf006 0%, #00d4aa03 100%)` }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">{planIcon}</div>
            <div>
              <h2 className="text-lg font-extrabold text-text">{price.label}</h2>
              <p className="text-xs text-text-3">状态: {sub.status === 'active' ? '活跃' : '暂停'}</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-extrabold text-text">${price.monthly}</div>
              <div className="text-[10px] text-text-3">/用户/月</div>
            </div>
          </div>

          {sub.currentPeriodEnd && (
            <p className="text-xs text-text-3">当前周期截止: {new Date(sub.currentPeriodEnd).toLocaleDateString('zh-CN')}</p>
          )}
        </div>

        {/* Usage meters */}
        {usage && (
          <div className="rounded-xl border border-border p-5">
            <h3 className="text-sm font-bold text-text mb-4">今日用量</h3>
            <div className="space-y-4">
              <UsageMeter icon={<Bot size={14} />} label="AI 查询" current={usage.aiQueries} limit={usage.aiQueriesLimit} color="#7b6cf0" />
              <UsageMeter icon={<Users size={14} />} label="团队成员" current={usage.teamMembers} limit={usage.teamMembersLimit} color="#00d4aa" />
              <UsageMeter icon={<Bot size={14} />} label="Agent" current={usage.agents} limit={usage.agentsLimit} color="#ffc44d" />
              <UsageMeter icon={<FolderKanban size={14} />} label="项目" current={usage.projects} limit={usage.projectsLimit} color="#ff5c6a" />
              <UsageMeter icon={<FileText size={14} />} label="文档" current={usage.docs} limit={usage.docsLimit} color="#7b6cf0" />
            </div>
          </div>
        )}

        {/* Feature matrix */}
        <div className="rounded-xl border border-border p-5">
          <h3 className="text-sm font-bold text-text mb-4">功能对比</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left text-text-3 font-normal">功能</th>
                  <th className="py-2 text-center text-text-3 font-normal">免费版</th>
                  <th className="py-2 text-center font-semibold text-primary-2">专业版</th>
                  <th className="py-2 text-center text-text-3 font-normal">企业版</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI查询/日', '50', '500', '无限'],
                  ['Agent数量', '3', '10', '无限'],
                  ['团队人数', '5', '50', '无限'],
                  ['高级分析', '-', '✓', '✓'],
                  ['自定义工作流', '-', '✓', '✓'],
                  ['SSO集成', '-', '-', '✓'],
                  ['审计导出', '-', '✓', '✓'],
                  ['优先支持', '-', '✓', '✓'],
                ].map(([feature, free, pro, ent]) => (
                  <tr key={feature} className="border-b border-border/50">
                    <td className="py-2 text-text-2">{feature}</td>
                    <td className="py-2 text-center text-text-3">{free}</td>
                    <td className="py-2 text-center text-text font-semibold">{pro}</td>
                    <td className="py-2 text-center text-text-3">{ent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageMeter({ icon, label, current, limit, color }: { icon: React.ReactNode; label: string; current: number; limit: number; color: string }) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 30 : Math.min(100, (current / limit) * 100);
  const isWarn = !isUnlimited && pct >= 80;
  const isDanger = !isUnlimited && pct >= 95;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs text-text-2">{icon}<span>{label}</span></div>
        <span className={cn('text-xs font-semibold', isDanger && 'text-danger', isWarn && 'text-warn', !isWarn && !isDanger && 'text-text')}>
          {current}{isUnlimited ? '' : ` / ${limit}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2">
        <div className={cn('h-full rounded-full transition-all', isDanger && 'bg-danger', isWarn && 'bg-warn', !isWarn && !isDanger && 'bg-primary')} style={{ width: `${pct}%`, backgroundColor: (!isWarn && !isDanger) ? color : undefined }} />
      </div>
    </div>
  );
}
