import { useState } from 'react';
import { useNotifications } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Bell, Check, Trash2, Loader2 } from 'lucide-react';

const TYPE_STYLES: Record<string, string> = {
  alert: 'bg-danger/10 text-danger',
  mention: 'bg-primary/10 text-primary-2',
  update: 'bg-accent/10 text-accent',
  system: 'bg-surface-2 text-text-3',
};

export default function NotificationsContent() {
  const { notifications: initialNotifs, setNotifications, loading } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'alert'>('all');
  const unreadCount = initialNotifs.filter((n) => !n.read).length;

  const filtered = filter === 'all' ? initialNotifs : filter === 'unread' ? initialNotifs.filter((n) => !n.read) : initialNotifs.filter((n) => n.type === 'alert');

  const detailModal = useModal();
  const [activeNotif, setActiveNotif] = useState<{ id: string; title: string; content: string; type: string; read: boolean } | null>(null);

  const confirmModal = useModal();
  const [confirmAction, setConfirmAction] = useState<{ label: string; onConfirm: () => void } | null>(null);

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  function markAllRead() {
    setConfirmAction({
      label: '将所有通知标记为已读',
      onConfirm: () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        confirmModal.closeModal();
      },
    });
    confirmModal.openModal();
  }

  function removeNotif(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (activeNotif?.id === id) detailModal.closeModal();
  }

  function confirmRemove(id: string) {
    const notif = initialNotifs.find((n) => n.id === id);
    setConfirmAction({
      label: `删除通知「${notif?.title ?? ''}」`,
      onConfirm: () => {
        removeNotif(id);
        confirmModal.closeModal();
      },
    });
    confirmModal.openModal();
  }

  function openDetail(notif: { id: string; title: string; content: string; type: string; read: boolean }) {
    setActiveNotif(notif);
    detailModal.openModal();
    if (!notif.read) markRead(notif.id);
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
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-2" /></div>
        ) : filtered.map((notif) => (
          <div key={notif.id} onClick={() => openDetail(notif)} className={cn('group rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-lg cursor-pointer', !notif.read && 'border-l-2 border-l-primary')}>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', TYPE_STYLES[notif.type])}>
                {notif.type === 'alert' ? '预警' : notif.type === 'mention' ? '@我' : notif.type === 'update' ? '更新' : '系统'}
              </span>
              <span className="text-xs font-semibold text-text">{notif.title}</span>
              {!notif.read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
              <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                {!notif.read && <button onClick={() => markRead(notif.id)} className="rounded p-1 text-text-3 hover:text-success"><Check size={12} /></button>}
                <button onClick={() => confirmRemove(notif.id)} className="rounded p-1 text-text-3 hover:text-danger"><Trash2 size={12} /></button>
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

      <Modal open={detailModal.open} onClose={detailModal.closeModal} title="通知详情"
        footer={
          activeNotif ? (
            <>
              <button onClick={() => { removeNotif(activeNotif.id); detailModal.closeModal(); }} className={cn(btnSecondary, 'text-danger hover:text-danger')}>删除</button>
              <button onClick={detailModal.closeModal} className={btnPrimary}>关闭</button>
            </>
          ) : undefined
        }>
        {activeNotif && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', TYPE_STYLES[activeNotif.type])}>
                {activeNotif.type === 'alert' ? '预警' : activeNotif.type === 'mention' ? '@我' : activeNotif.type === 'update' ? '更新' : '系统'}
              </span>
              {!activeNotif.read && <span className="text-[10px] text-primary-2 font-semibold">未读</span>}
            </div>
            <p className="text-sm font-semibold text-text">{activeNotif.title}</p>
            <p className="text-xs text-text-2 leading-relaxed">{activeNotif.content}</p>
          </div>
        )}
      </Modal>

      <Modal open={confirmModal.open} onClose={confirmModal.closeModal} title="确认操作"
        footer={
          <>
            <button onClick={confirmModal.closeModal} className={btnSecondary}>取消</button>
            <button onClick={confirmAction?.onConfirm} className={btnPrimary}>确认</button>
          </>
        }>
        <p className="text-xs text-text-2">{confirmAction?.label}</p>
      </Modal>
    </div>
  );
}
