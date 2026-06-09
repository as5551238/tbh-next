import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { fetchKnowledgePacks, KNOWLEDGE_CATEGORIES, type KnowledgePack } from '@/lib/knowledgeOSP';
import { cn } from '@/lib/utils';
import { Search, Download, Star, X, Check, BookOpen, Loader2, Tag } from 'lucide-react';

const INSTALLED_PACKS_STORAGE = 'tbh-installed-packs';

export default function KnowledgeOSPView() {
  const industry = useAppStore((s) => s.industry);
  const [packs, setPacks] = useState<KnowledgePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedPack, setSelectedPack] = useState<KnowledgePack | null>(null);
  const [showAllIndustries, setShowAllIndustries] = useState(false);
  const { toasts, success, error } = useToast();
  const [installedIds, setInstalledIds] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem(INSTALLED_PACKS_STORAGE); return s ? new Set(JSON.parse(s)) : new Set<string>(); } catch { return new Set<string>(); }
  });

  function saveInstalledIds(ids: Set<string>) {
    setInstalledIds(ids);
    try { localStorage.setItem(INSTALLED_PACKS_STORAGE, JSON.stringify([...ids])); } catch {}
  }

  useEffect(() => {
    fetchKnowledgePacks(showAllIndustries ? undefined : industry).then((data) => {
      // Apply persisted install state
      setPacks(data.map((p) => ({ ...p, isInstalled: installedIds.has(p.id) })));
      setLoading(false);
    }).catch((err) => { console.error("[knowledge]", err); error("知识包加载失败，请重试"); setLoading(false); });
  }, [industry, showAllIndustries, installedIds.size]);

  const filtered = packs.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    if (search && !p.title.includes(search) && !p.description.includes(search) && !p.tags.some((t) => t.includes(search))) return false;
    return true;
  });

  function toggleInstall() {
    if (!selectedPack) return;
    const id = selectedPack.id;
    const nowInstalled = !selectedPack.isInstalled;
    const newIds = new Set(installedIds);
    if (nowInstalled) newIds.add(id); else newIds.delete(id);
    saveInstalledIds(newIds);
    setPacks((prev) => prev.map((p) => p.id === id ? { ...p, isInstalled: nowInstalled } : p));
    setSelectedPack((prev) => prev ? { ...prev, isInstalled: nowInstalled } : null);
    success(nowInstalled ? `知识包"${selectedPack.title}"已安装` : `知识包"${selectedPack.title}"已卸载`);
  }

  return (
    <div className="flex h-full">
      <ToastOverlay toasts={toasts} />
      {/* Main list */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <BookOpen size={16} className="text-primary-2" />
          <span className="text-sm font-bold">行业知识库</span>
          <span className="text-[10px] text-text-3">{packs.length} 个知识包</span>
          <label className="ml-auto flex items-center gap-1.5 text-[10px] text-text-3 cursor-pointer">
            <input type="checkbox" id="show-all-industries" checked={showAllIndustries} onChange={(e) => setShowAllIndustries(e.target.checked)} className="rounded" />
            <label htmlFor="show-all-industries" className="text-[10px] text-text-3 cursor-pointer">全部行业</label>
          </label>
          <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5">
            <Search size={13} className="text-text-3" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索知识..." aria-label="搜索知识库" className="bg-transparent text-xs text-text outline-none placeholder:text-text-3 w-28" />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 border-b border-border px-4 py-2 overflow-x-auto">
          <button onClick={() => setCategory('all')} className={cn('rounded-full px-3 py-1 text-[11px] font-medium transition-all whitespace-nowrap', category === 'all' ? 'bg-primary/10 text-primary-2 font-semibold' : 'bg-surface-2 text-text-3 hover:text-text')}>全部</button>
          {KNOWLEDGE_CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setCategory(cat.id)} className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-all whitespace-nowrap', category === cat.id ? 'bg-primary/10 text-primary-2 font-semibold' : 'bg-surface-2 text-text-3 hover:text-text')}>
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* Packs list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-text-3" size={24} /></div>
          ) : (
            filtered.map((pack) => (
              <button key={pack.id} onClick={() => setSelectedPack(pack)} className={cn('flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-lg',
                pack.isInstalled ? 'border-success/30 bg-success/5 hover:border-success/50' : 'border-border bg-surface hover:border-primary/30')}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg shrink-0">
                  {KNOWLEDGE_CATEGORIES.find((c) => c.id === pack.category)?.icon ?? '📚'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-text truncate">{pack.title}</span>
                    {pack.isOfficial && <span className="rounded bg-primary/10 px-1 py-[1px] text-[7px] font-bold text-primary-2">官方</span>}
                    {pack.isInstalled && <span className="flex items-center gap-0.5 rounded bg-success/10 px-1 py-[1px] text-[7px] font-bold text-success"><Check size={7} />已安装</span>}
                  </div>
                  <p className="text-[10px] text-text-3 truncate">{pack.description}</p>
                  <div className="flex items-center gap-3 text-[9px] text-text-3 mt-1">
                    <span className="rounded bg-surface-2 px-1.5 py-0.5">{pack.industry}</span>
                    <span>{pack.categoryLabel}</span>
                    <span className="flex items-center gap-0.5"><Star size={8} className="text-warn fill-warn" />{pack.rating}</span>
                    <span className="flex items-center gap-0.5"><Download size={8} />{pack.downloads}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedPack && (
        <div className="flex w-[420px] shrink-0 flex-col border-l border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-bold">{selectedPack.categoryLabel}</span>
            <button onClick={() => setSelectedPack(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2"><X size={14} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-text">{selectedPack.title}</h3>
              <p className="text-xs text-text-3 mt-1">{selectedPack.author} · v{selectedPack.version} · {selectedPack.updatedAt}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center"><div className="text-lg font-bold text-text">{selectedPack.rating}</div><div className="text-[9px] text-text-3">评分</div></div>
              <div className="text-center"><div className="text-lg font-bold text-text">{selectedPack.downloads}</div><div className="text-[9px] text-text-3">下载</div></div>
            </div>

            <div className="rounded-xl bg-surface-2 p-4">
              <div className="text-xs text-text-2 leading-relaxed whitespace-pre-line font-mono">{selectedPack.content}</div>
            </div>

            <div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-text-3 mb-1.5"><Tag size={10} />标签</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedPack.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary-2">#{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border p-4">
            <button onClick={toggleInstall} className={cn('w-full rounded-xl py-3 text-sm font-bold transition-all',
              selectedPack.isInstalled ? 'bg-success/10 text-success border border-success/20 hover:bg-success/20' : 'bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/20'
            )}>
              {selectedPack.isInstalled ? '✓ 已安装 · 点击卸载' : selectedPack.plan === 'free' ? '免费安装' : `${selectedPack.plan === 'pro' ? '专业版' : '企业版'} 解锁`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
