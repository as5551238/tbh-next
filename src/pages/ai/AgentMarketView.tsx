import { useState, useEffect, type ReactNode } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { useAgentDetails } from '@/hooks/useMatrix';
import { fetchMarketplaceAgents, CATEGORIES, type MarketplaceAgent } from '@/lib/agentMarketplace';
import { cn } from '@/lib/utils';
import { Search, Download, Star, X, Check, Crown, Zap, Building2 } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { hasFeature } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';
import { usePersistedState } from '@/hooks/usePersistedState';

const INSTALLED_AGENTS_STORAGE = 'tbh-installed-agents';

const PRICE_ICONS: Record<string, ReactNode> = {
  free: <Zap size={12} className="text-success" />,
  pro: <Crown size={12} className="text-primary-2" />,
  enterprise: <Building2 size={12} className="text-accent" />,
};

export default function AgentMarketView() {
  const [showPaywall, setShowPaywall] = useState(false);
  const industry = useAppStore((s) => s.industry);
  const { addAgent, removeAgent } = useAgentDetails();
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null);
  const { toasts, success, error } = useToast();
  const [installedAgentIds, setInstalledAgentIds] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem(INSTALLED_AGENTS_STORAGE); return s ? new Set(JSON.parse(s)) : new Set<string>(); } catch { return new Set<string>(); }
  });

  function saveInstalledAgentIds(ids: Set<string>) {
    setInstalledAgentIds(ids);
    try { localStorage.setItem(INSTALLED_AGENTS_STORAGE, JSON.stringify([...ids])); } catch {}
  }

  useEffect(() => {
    fetchMarketplaceAgents().then((data) => {
      setAgents(data.map((a) => ({ ...a, isInstalled: installedAgentIds.has(a.id) })));
      setLoading(false);
    }).catch((err) => { console.error('[agent-market]', err); error('Agent 市场加载失败，请重试'); setLoading(false); });
  }, [installedAgentIds.size]);

  const filtered = agents.filter((a) => {
    if (category !== 'all' && a.category !== category) return false;
    if (search && !a.name.includes(search) && !a.description.includes(search) && !a.tags.some((t) => t.includes(search))) return false;
    return true;
  });

  const installed = agents.filter((a) => a.isInstalled);
  const available = filtered.filter((a) => !a.isInstalled);

  async function toggleInstall() {
    if (!selectedAgent) return;
    const id = selectedAgent.id;
    const nowInstalled = !selectedAgent.isInstalled;
    const newIds = new Set(installedAgentIds);
    if (nowInstalled) {
      newIds.add(id);
      await addAgent({
        name: selectedAgent.name,
        model: 'gpt-4o',
        description: selectedAgent.description,
        status: 'idle',
        enabled: true,
        tasks_completed: 0,
        uptime: '0%',
        capabilities: selectedAgent.capabilities,
      });
    } else {
      newIds.delete(id);
      await removeAgent(id);
    }
    saveInstalledAgentIds(newIds);
    setAgents((prev) => prev.map((a) => a.id === id ? { ...a, isInstalled: nowInstalled } : a));
    setSelectedAgent((prev) => prev ? { ...prev, isInstalled: nowInstalled } : null);
    success(nowInstalled ? `Agent"${selectedAgent.name}"已安装` : `Agent"${selectedAgent.name}"已卸载`);
  }

  return (
    <div className="flex h-full">
      <ToastOverlay toasts={toasts} />
      {/* Main list */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <span className="text-sm font-bold">Agent 市场</span>
          <span className="text-[10px] text-text-3">{agents.length} 个Agent · {installed.length} 已安装</span>
          <div className="ml-auto flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5">
            <Search size={13} className="text-text-3" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索Agent..." aria-label="搜索Agent市场" className="bg-transparent text-xs text-text outline-none placeholder:text-text-3 w-32" />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setCategory(cat.id)} className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-all whitespace-nowrap', category === cat.id ? 'bg-primary/10 text-primary-2 font-semibold' : 'bg-surface-2 text-text-3 hover:text-text')}>
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* Agent grid */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          {loading ? (
            <CardSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((agent) => (
                <button key={agent.id} onClick={() => setSelectedAgent(agent)} className="flex flex-col rounded-xl border border-border bg-surface p-3 md:p-4 text-left transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xl">{agent.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-text truncate">{agent.name}</span>
                        {agent.isOfficial && <span className="rounded bg-primary/10 px-1 py-[1px] text-[7px] font-bold text-primary-2">官方</span>}
                      </div>
                      <div className="text-[9px] text-text-3">{agent.author}</div>
                    </div>
                    {PRICE_ICONS[agent.price]}
                  </div>
                  <p className="text-[10px] text-text-2 leading-relaxed mb-2 line-clamp-2">{agent.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-[9px] text-text-3 mt-auto">
                    <span className="flex flex-wrap items-center gap-0.5"><Star size={9} className="text-warn fill-warn" />{agent.rating}</span>
                    <span className="flex flex-wrap items-center gap-0.5"><Download size={9} />{agent.downloads}</span>
                    {agent.isInstalled && <span className="flex flex-wrap items-center gap-0.5 text-success"><Check size={9} />已安装</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedAgent && (
        <div className="flex w-[380px] shrink-0 flex-col border-l border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold">Agent 详情</span>
            <button onClick={() => setSelectedAgent(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2"><X size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
            <div className="text-center">
              <span className="text-4xl">{selectedAgent.icon}</span>
              <h3 className="text-lg font-extrabold text-text mt-2">{selectedAgent.name}</h3>
              <p className="text-xs text-text-3">{selectedAgent.author} · v{selectedAgent.version}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="text-center"><div className="text-lg font-bold text-text">{selectedAgent.rating}</div><div className="text-[9px] text-text-3">评分</div></div>
              <div className="text-center"><div className="text-lg font-bold text-text">{selectedAgent.downloads}</div><div className="text-[9px] text-text-3">下载</div></div>
              <div className="text-center"><div className="text-lg font-bold text-text">{selectedAgent.reviewCount}</div><div className="text-[9px] text-text-3">评价</div></div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-1.5">简介</div>
              <p className="text-xs text-text-2 leading-relaxed">{selectedAgent.longDescription}</p>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-1.5">能力</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedAgent.capabilities.map((cap) => (
                  <span key={cap} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary-2">{cap}</span>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-1.5">标签</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedAgent.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] text-text-2">#{tag}</span>
                ))}
              </div>
            </div>

            {selectedAgent.industry && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 text-xs text-primary-2">
                行业专精: {selectedAgent.industry}
              </div>
            )}
          </div>

          <div className="border-t border-border p-3 md:p-4">
            <button onClick={toggleInstall} className={cn('w-full rounded-xl py-3 text-sm font-bold text-white transition-all',
              selectedAgent.isInstalled ? 'bg-surface-2 text-text-3' :
              selectedAgent.price === 'free' ? 'bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/20' :
              'bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/20'
            )}>
              {selectedAgent.isInstalled ? '卸载' : selectedAgent.price === 'free' ? '免费安装' : `${selectedAgent.price === 'pro' ? '专业版' : '企业版'} 解锁`}
            </button>
          </div>
        </div>
      )}
    
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason="AI代理市场需要专业版或企业版" feature="ai_agent_marketplace" />
</div>
  );
}
