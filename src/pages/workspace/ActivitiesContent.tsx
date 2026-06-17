import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities } from '@/hooks/useMatrix';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { Activity, Plus, Filter, Search, CalendarDays } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { useAppStore } from '@/stores/appStore';
import { t } from '@/lib/i18nCore';

const TYPE_CFG: Record<string, { label: () => string; color: string }> = {
  created: { label: () => t('activities.typeCreated'), color: 'bg-blue-500/20 text-blue-400' },
  updated: { label: () => t('activities.typeUpdated'), color: 'bg-yellow-500/20 text-yellow-400' },
  completed: { label: () => t('activities.typeCompleted'), color: 'bg-green-500/20 text-green-400' },
  commented: { label: () => t('activities.typeCommented'), color: 'bg-purple-500/20 text-purple-400' },
  mentioned: { label: () => t('activities.typeMentioned'), color: 'bg-orange-500/20 text-orange-400' },
};

const ENTITY_TYPE_MAP: Record<string, { module: string; iface: string }> = {
  task: { module: 'tasks', iface: 'workspace' },
  project: { module: 'projects', iface: 'workspace' },
  goal: { module: 'goals', iface: 'workspace' },
  action_item: { module: 'actionItems', iface: 'workspace' },
};

const ALL_TYPES = ['all', 'created', 'updated', 'completed', 'commented', 'mentioned'];
const DATE_RANGES = ['all', 'today', 'week', 'month'] as const;
type DateRange = typeof DATE_RANGES[number];

export default function ActivitiesContent() {
  const { activities, loading, addActivity } = useActivities();
  const addModal = useModal();
  const navigate = useNavigate();
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { toasts, success } = useToast();
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [textSearch, setTextSearch] = useState('');
  const [newItem, setNewItem] = useState({ title: '', description: '', type: 'created', actor: '' });

  const filtered = useMemo(() => {
    let list = activities;
    if (filterType !== 'all') list = list.filter((a) => a.type === filterType);
    if (textSearch.trim()) {
      const q = textSearch.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q));
    }
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = dateRange === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : dateRange === 'week' ? new Date(now.getTime() - 7 * 86400000) : new Date(now.getTime() - 30 * 86400000);
      list = list.filter((a) => new Date(a.created_at) >= cutoff);
    }
    return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [activities, filterType, dateRange, textSearch]);

  const handleAdd = async () => {
    if (!newItem.title.trim()) return;
    await addActivity({ title: newItem.title, description: newItem.description, type: newItem.type, actor: newItem.actor || t('activities.systemActor'), target_type: null, target_id: null, team_id: '__default__' });
    success(t('activities.activityAdded'));
    setNewItem({ title: '', description: '', type: 'created', actor: '' });
    addModal.closeModal();
  };

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      <ToastOverlay toasts={toasts} />
      <div className="flex flex-wrap items-center gap-2">
        <Activity size={18} className="text-primary-2" />
        <span className="text-sm font-bold">{t('activities.title')}</span>
        <span className="text-[10px] text-text-3">{t('activities.countLabel', { count: filtered.length })}</span>
        <div className="flex-1" />
        <button onClick={() => addModal.openModal()} className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20">
          <Plus size={12} />
          {t('activities.addActivity')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <Search size={14} className="text-text-3" />
          <input type="text" value={textSearch} onChange={(e) => setTextSearch(e.target.value)} placeholder={t('activities.searchPlaceholder')} aria-label={t('activities.searchAria')} className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Filter size={12} className="text-text-3 shrink-0" />
        {ALL_TYPES.map((ft) => (
          <button key={ft} onClick={() => setFilterType(ft)} className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all', filterType === ft ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2')}>
            {ft === 'all' ? t('activities.filterAll') : TYPE_CFG[ft]?.label() ?? ft}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <CalendarDays size={12} className="text-text-3 shrink-0" />
        {DATE_RANGES.map((d) => (
          <button key={d} onClick={() => setDateRange(d)} className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all', dateRange === d ? 'bg-primary/10 text-primary-2' : 'text-text-3 hover:bg-surface-2')}>
            {d === 'all' ? t('activities.dateAll') : d === 'today' ? t('activities.dateToday') : d === 'week' ? t('activities.dateWeek') : t('activities.dateMonth')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-3">
          <Activity size={32} className="mb-2 opacity-30" />
          <span className="text-xs">{t('activities.emptyState')}</span>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.updated;
            return (
              <div key={item.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer" onClick={() => {
                if (item.target_type && ENTITY_TYPE_MAP[item.target_type]) {
                  const route = ENTITY_TYPE_MAP[item.target_type];
                  navigate(navigateTo(route.iface, route.module));
                }
              }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 shrink-0 mt-0.5">
                  <Activity size={14} className="text-text-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-text">{item.title}</span>
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', cfg.color)}>{cfg.label()}</span>
                  </div>
                  {item.description && (
                    <div className="text-[10px] text-text-3 mt-0.5 line-clamp-2">{item.description}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] text-primary-2">{item.actor}</span>
                    <span className="text-[10px] text-text-3">{new Date(item.created_at).toLocaleString('zh-CN')}</span>
                    {item.target_type && (
                      <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-3">{item.target_type}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={addModal.open} onClose={addModal.closeModal} title={t('activities.addModalTitle')}
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>{t('common.cancel')}</button>
            <button className={btnPrimary} onClick={handleAdd} disabled={!newItem.title.trim()}>{t('common.add')}</button>
          </div>
        }>
        <ModalField label={t('activities.titleLabel')}>
          <input className={inputCls} placeholder={t('activities.titlePlaceholder')} value={newItem.title} onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label={t('activities.descriptionLabel')}>
          <textarea className={cn(inputCls, 'min-h-[60px]')} placeholder={t('activities.descriptionPlaceholder')} value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} />
        </ModalField>
        <ModalField label={t('activities.typeLabel')}>
          <select className={inputCls} value={newItem.type} onChange={(e) => setNewItem((p) => ({ ...p, type: e.target.value }))}>
            {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label()}</option>)}
          </select>
        </ModalField>
        <ModalField label={t('activities.actorLabel')}>
          <input className={inputCls} placeholder={t('activities.actorPlaceholder')} value={newItem.actor} onChange={(e) => setNewItem((p) => ({ ...p, actor: e.target.value }))} />
        </ModalField>
      </Modal>
    </div>
  );
}
