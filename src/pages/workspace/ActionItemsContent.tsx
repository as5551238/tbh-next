/**
 * ActionItemsContent — 行动项管理（业务闭环核心页面）
 *
 * 功能：
 * 1. 行动项列表 — 按来源/状态/优先级筛选
 * 2. 创建行动项 — 来源：手动/复盘/偏差/AI建议
 * 3. 行动项转任务 — 闭环：ActionItem → Task（自动标记closed_loop）
 * 4. 偏差告警展示 — 关联的deviation alerts
 * 5. 目标关联 — 行动项归属目标一目了然
 */

import { useState, useMemo } from 'react';
import { useActionItems, useDeviationAlerts, useGoals } from '@/hooks/useMatrix';
import type { ActionItemRow } from '@/lib/dataLayer';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import CommentSection from '@/components/CommentSection';
import { cn } from '@/lib/utils';
import { CardSkeleton } from '@/components/Skeleton';
import {
  Zap, CheckCircle2, AlertTriangle, ArrowRight, Plus,
  Filter, ExternalLink, Circle, Clock, ChevronDown,
  MessageSquare,
} from 'lucide-react';

// --- 状态/来源/优先级标签配置 ---

const STATUS_CFG: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  open: { label: '待处理', color: 'text-text-3', icon: Circle },
  in_progress: { label: '进行中', color: 'text-blue-400', icon: Clock },
  completed: { label: '已完成', color: 'text-success', icon: CheckCircle2 },
  cancelled: { label: '已取消', color: 'text-text-3', icon: Circle },
};

const SOURCE_CFG: Record<string, { label: string; color: string }> = {
  manual: { label: '手动创建', color: 'bg-gray-500/20 text-gray-400' },
  review: { label: '复盘产出', color: 'bg-purple-500/20 text-purple-400' },
  deviation: { label: '偏差告警', color: 'bg-red-500/20 text-red-400' },
  ai_suggested: { label: 'AI建议', color: 'bg-blue-500/20 text-blue-400' },
};

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  critical: { label: '紧急', color: 'text-red-400' },
  high: { label: '高', color: 'text-orange-400' },
  medium: { label: '中', color: 'text-yellow-400' },
  low: { label: '低', color: 'text-text-3' },
};

export default function ActionItemsContent() {
  const { actionItems, loading, addActionItem, editActionItem, removeActionItem, convertToTask } = useActionItems();
  const { alerts } = useDeviationAlerts();
  const { goals } = useGoals();
  const addModal = useModal();
  const convertModal = useModal();
  const detailModal = useModal();

  const [detailItem, setDetailItem] = useState<ActionItemRow | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [convertItem, setConvertItem] = useState<ActionItemRow | null>(null);
  const [convertDueDate, setConvertDueDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', priority: 'medium' as string, goal_id: '', due_date: '' });

  // 筛选逻辑
  const filteredItems = useMemo(() => {
    let items = actionItems;
    if (filterStatus !== 'all') items = items.filter((a) => a.status === filterStatus);
    if (filterSource !== 'all') items = items.filter((a) => a.source === filterSource);
    // 排序：优先级 > 状态 > 创建时间
    const priOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const staOrder = { open: 0, in_progress: 1, completed: 2, cancelled: 3 };
    items = [...items].sort((a, b) => {
      const sd = staOrder[a.status] - staOrder[b.status];
      if (sd !== 0) return sd;
      const pd = priOrder[a.priority] - priOrder[b.priority];
      if (pd !== 0) return pd;
      return b.created_at.localeCompare(a.created_at);
    });
    return items;
  }, [actionItems, filterStatus, filterSource]);

  // 统计
  const stats = useMemo(() => {
    const open = actionItems.filter((a) => a.status === 'open').length;
    const inProgress = actionItems.filter((a) => a.status === 'in_progress').length;
    const completed = actionItems.filter((a) => a.status === 'completed').length;
    const closedLoop = actionItems.filter((a) => a.closed_loop).length;
    const unresolvedAlerts = alerts.filter((a) => !a.is_resolved).length;
    return { open, inProgress, completed, closedLoop, unresolvedAlerts };
  }, [actionItems, alerts]);

  const handleAdd = async () => {
    if (!newItem.title.trim()) return;
    await addActionItem({
      title: newItem.title,
      description: newItem.description,
      source: 'manual',
      goal_id: newItem.goal_id || null,
      priority: newItem.priority as ActionItemRow['priority'],
      due_date: newItem.due_date || null,
      status: 'open',
      closed_loop: false,
    } as Partial<ActionItemRow>);
    setNewItem({ title: '', description: '', priority: 'medium', goal_id: '', due_date: '' });
    addModal.closeModal();
  };

  const handleConvert = async () => {
    if (!convertItem) return;
    await convertToTask(convertItem, { due_date: convertDueDate || undefined });
    setConvertItem(null);
    setConvertDueDate('');
    convertModal.closeModal();
  };

  const handleStatusChange = async (id: string, status: ActionItemRow['status']) => {
    await editActionItem(id, {
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      closed_loop: status === 'completed' ? true : undefined,
    } as Partial<ActionItemRow>);
  };

  const goalTitle = (goalId: string | null) => {
    if (!goalId) return null;
    return goals.find((g) => g.id === goalId)?.title ?? '未知目标';
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
      {/* 顶部统计 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: '待处理', value: stats.open, color: 'text-text-2', icon: Circle },
          { label: '进行中', value: stats.inProgress, color: 'text-blue-400', icon: Clock },
          { label: '已完成', value: stats.completed, color: 'text-success', icon: CheckCircle2 },
          { label: '闭环率', value: actionItems.length > 0 ? `${Math.round(stats.closedLoop / actionItems.length * 100)}%` : '-', color: 'text-primary-2', icon: Zap },
          { label: '未解决告警', value: stats.unresolvedAlerts, color: stats.unresolvedAlerts > 0 ? 'text-danger' : 'text-text-3', icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-3 text-center">
            <s.icon size={14} className={cn('mx-auto mb-1', s.color)} />
            <div className={cn('text-lg font-extrabold', s.color)}>{s.value}</div>
            <div className="text-[10px] text-text-3">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 标题栏+操作 */}
      <div className="flex flex-wrap items-center gap-2">
        <Zap size={18} className="text-primary-2" />
        <span className="text-sm font-bold">行动项</span>
        <span className="text-[10px] text-text-3">{filteredItems.length} 项</span>
        <div className="flex-1" />
        <button
          className="flex flex-wrap items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-text-3 hover:bg-surface-2"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={12} />
          筛选
          <ChevronDown size={12} className={cn('transition-transform', showFilters && 'rotate-180')} />
        </button>
        <button
          className="flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary-2 transition-all hover:bg-primary/20"
          onClick={addModal.openModal}
        >
          <Plus size={12} />
          新建行动项
        </button>
      </div>

      {/* 筛选条 */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
          <span className="text-[11px] text-text-3">状态:</span>
          <select className={cn(inputCls, 'text-[11px] py-1')} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">全部</option>
            <option value="open">待处理</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
          <span className="text-[11px] text-text-3">来源:</span>
          <select className={cn(inputCls, 'text-[11px] py-1')} value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="all">全部</option>
            <option value="manual">手动创建</option>
            <option value="review">复盘产出</option>
            <option value="deviation">偏差告警</option>
            <option value="ai_suggested">AI建议</option>
          </select>
        </div>
      )}

      {/* 偏差告警（未解决） */}
      {stats.unresolvedAlerts > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle size={14} className="text-danger" />
            <span className="text-xs font-bold text-danger">偏差告警</span>
            <span className="rounded-full bg-danger/20 px-1.5 py-0.5 text-[10px] font-bold text-danger">{stats.unresolvedAlerts}</span>
          </div>
          {alerts.filter((a) => !a.is_resolved).slice(0, 3).map((alert) => (
            <div key={alert.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2">
              <AlertTriangle size={14} className={cn('shrink-0', alert.severity === 'critical' ? 'text-danger' : 'text-warn')} />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-text truncate">{alert.message}</div>
                {alert.goal_id && <div className="text-[10px] text-text-3">目标: {goalTitle(alert.goal_id)}</div>}
              </div>
              {!alert.action_item_id && (
                <button
                  className="shrink-0 rounded-lg bg-danger/10 px-2 py-1 text-[10px] font-semibold text-danger hover:bg-danger/20"
                  onClick={async () => {
                    await addActionItem({
                      title: `处理偏差: ${alert.message.slice(0, 30)}`,
                      source: 'deviation',
                      source_id: alert.id,
                      goal_id: alert.goal_id,
                      priority: alert.severity === 'critical' ? 'critical' : 'high',
                      status: 'open',
                      closed_loop: false,
                    } as Partial<ActionItemRow>);
                  }}
                >
                  + 生成行动项
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 行动项列表 */}
      {loading ? (
        <CardSkeleton />
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-3">
          <Zap size={32} className="mb-2 opacity-30" />
          <span className="text-xs">暂无行动项</span>
          <span className="text-[10px]">复盘或偏差告警会自动生成行动项</span>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const statusCfg = STATUS_CFG[item.status] ?? STATUS_CFG.open;
            const sourceCfg = SOURCE_CFG[item.source] ?? SOURCE_CFG.manual;
            const priCfg = PRIORITY_CFG[item.priority] ?? PRIORITY_CFG.medium;
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 transition-all hover:border-border-2 hover:shadow-lg',
                  item.status === 'completed' ? 'border-border opacity-60' : 'border-border',
                )}
              >
                {/* 状态切换 */}
                <button
                  className="shrink-0"
                  onClick={() => {
                    if (item.status === 'open') handleStatusChange(item.id, 'in_progress');
                    else if (item.status === 'in_progress') handleStatusChange(item.id, 'completed');
                    else handleStatusChange(item.id, 'open');
                  }}
                >
                  <StatusIcon size={18} className={statusCfg.color} />
                </button>

                {/* 内容 */}
                <div className="min-w-0 flex-1">
                  <div className={cn('text-xs font-semibold', item.status === 'completed' && 'line-through text-text-3')}>
                    {item.title}
                  </div>
                  {item.description && (
                    <div className="text-[10px] text-text-3 truncate mt-0.5">{item.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', sourceCfg.color)}>
                      {sourceCfg.label}
                    </span>
                    <span className={cn('text-[10px] font-semibold', priCfg.color)}>
                      {priCfg.label}
                    </span>
                    {item.goal_id && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-2">
                        {goalTitle(item.goal_id)}
                      </span>
                    )}
                    {item.due_date && (
                      <span className="text-[10px] text-text-3 flex flex-wrap items-center gap-0.5">
                        <Clock size={10} />
                        {item.due_date.slice(0, 10)}
                      </span>
                    )}
                    {item.closed_loop && (
                      <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                        闭环
                      </span>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    className="rounded-lg px-1.5 py-1 text-[10px] text-text-3 hover:bg-surface-2 hover:text-primary-2"
                    onClick={() => { setDetailItem(item); detailModal.openModal(); }}
                    title="详情/评论"
                  >
                    <MessageSquare size={10} />
                  </button>
                  {item.status !== 'completed' && !item.closed_loop && (
                    <button
                      className="flex flex-wrap items-center gap-0.5 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary-2 hover:bg-primary/20"
                      onClick={() => {
                        setConvertItem(item);
                        setConvertDueDate(item.due_date?.slice(0, 10) ?? '');
                        convertModal.openModal();
                      }}
                      title="转为任务"
                    >
                      <ArrowRight size={10} />
                      转任务
                    </button>
                  )}
                  {item.closed_loop && (
                    <button className="flex flex-wrap items-center gap-0.5 rounded-lg bg-success/10 px-2 py-1 text-[10px] font-semibold text-success" title="已闭环">
                      <ExternalLink size={10} />
                      已闭环
                    </button>
                  )}
                  <button
                    className="rounded-lg px-1.5 py-1 text-[10px] text-text-3 hover:bg-surface-2 hover:text-danger"
                    onClick={() => removeActionItem(item.id)}
                    title="删除"
                  >
                    x
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 新建行动项弹窗 */}
      <Modal open={addModal.open} onClose={addModal.closeModal} title="新建行动项"
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleAdd} disabled={!newItem.title.trim()}>创建</button>
          </div>
        }
      >
        <ModalField label="标题">
          <input className={inputCls} placeholder="行动项标题" value={newItem.title} onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="描述">
          <textarea className={cn(inputCls, 'min-h-[60px]')} placeholder="详细描述（可选）" value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} />
        </ModalField>
        <ModalField label="关联目标">
          <select className={inputCls} value={newItem.goal_id || '__EMPTY__'} onChange={(e) => setNewItem((p) => ({ ...p, goal_id: e.target.value === '__EMPTY__' ? '' : e.target.value }))}>
            <option value="__EMPTY__">无关联目标</option>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </ModalField>
        <ModalField label="优先级">
          <select className={inputCls} value={newItem.priority} onChange={(e) => setNewItem((p) => ({ ...p, priority: e.target.value }))}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
            <option value="critical">紧急</option>
          </select>
        </ModalField>
        <ModalField label="截止日期">
          <input type="date" className={inputCls} value={newItem.due_date} onChange={(e) => setNewItem((p) => ({ ...p, due_date: e.target.value }))} />
        </ModalField>
      </Modal>

      {/* 转任务弹窗 */}
      <Modal open={convertModal.open} onClose={convertModal.closeModal} title="行动项转任务"
        footer={
          <div className="flex flex-wrap gap-2">
            <button className={btnSecondary} onClick={convertModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleConvert}>确认转换</button>
          </div>
        }
      >
        <div className="mb-3 rounded-lg bg-surface-2 p-3">
          <div className="text-xs font-semibold text-text">{convertItem?.title}</div>
          {convertItem?.description && <div className="text-[11px] text-text-3 mt-1">{convertItem.description}</div>}
          {convertItem?.goal_id && <div className="text-[10px] text-primary-2 mt-1">关联目标: {goalTitle(convertItem.goal_id)}</div>}
        </div>
        <p className="text-[11px] text-text-3 mb-3">
          将此行动项转换为正式任务。行动项将被标记为"已完成+闭环"，新任务将继承目标和优先级。
        </p>
        <ModalField label="任务截止日期">
          <input type="date" className={inputCls} value={convertDueDate} onChange={(e) => setConvertDueDate(e.target.value)} />
        </ModalField>
      </Modal>

      {/* 行动项详情/评论弹窗 */}
      <Modal open={detailModal.open} onClose={detailModal.closeModal} title="行动项详情"
        footer={
          <div className="flex flex-wrap gap-2">
            <button className="mr-auto rounded-lg px-3 py-1.5 text-[11px] font-semibold text-danger hover:bg-danger/10" onClick={() => { if (detailItem) { removeActionItem(detailItem.id); detailModal.closeModal(); setDetailItem(null); } }}>删除</button>
            <button className={btnSecondary} onClick={detailModal.closeModal}>关闭</button>
          </div>
        }
      >
        {detailItem && (
          <div>
            <div className="mb-2 text-sm font-semibold text-text">{detailItem.title}</div>
            {detailItem.description && <div className="text-xs text-text-2 mb-2">{detailItem.description}</div>}
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', (STATUS_CFG[detailItem.status] ?? STATUS_CFG.open).color)}>
                {(STATUS_CFG[detailItem.status] ?? STATUS_CFG.open).label}
              </span>
              <span className={cn('text-[10px] font-semibold', (PRIORITY_CFG[detailItem.priority] ?? PRIORITY_CFG.medium).color)}>
                {(PRIORITY_CFG[detailItem.priority] ?? PRIORITY_CFG.medium).label}
              </span>
              {detailItem.goal_id && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-2">
                  {goalTitle(detailItem.goal_id)}
                </span>
              )}
              {detailItem.closed_loop && (
                <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">闭环</span>
              )}
            </div>
            <CommentSection targetType="action_item" targetId={detailItem.id} />
          </div>
        )}
      </Modal>
    </div>
  );
}
