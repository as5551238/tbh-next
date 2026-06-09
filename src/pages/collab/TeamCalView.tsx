import { useState } from 'react';
import { useMatrixCell, useScheduleEvents } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock, MapPin, Users, Plus, Trash2, Edit3 } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface CalEvent {
  time: string;
  title: string;
  type: 'meeting' | 'deadline' | 'reminder';
  location?: string;
  attendees?: number;
}

export default function TeamCalView() {
  const industry = useAppStore((s) => s.industry);
  const { cell } = useMatrixCell();
  const { events, addEvent, editEvent, removeEvent } = useScheduleEvents();
  const { toasts, success } = useToast();
  const today = new Date();
  const addModal = useModal();
  const editModal = useModal();

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', type: 'meeting', start_date: '', description: '',
  });
  const [editForm, setEditForm] = useState({
    title: '', type: 'meeting', start_date: '', description: '',
  });

  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const eventsByDay: Record<number, CalEvent[]> = {};
  const eventRowByDay: Record<number, typeof events> = {};
  events.forEach((evt) => {
    const d = new Date(evt.start_date ?? evt.created_at ?? '');
    if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      if (!eventRowByDay[day]) eventRowByDay[day] = [];
      eventsByDay[day].push({
        time: d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        title: evt.title,
        type: (evt.type?.includes('deadline') ? 'deadline' : evt.type?.includes('reminder') ? 'reminder' : 'meeting') as CalEvent['type'],
        location: evt.description ?? undefined,
      });
      eventRowByDay[day].push(evt);
    }
  });

  const selectedEvents = eventRowByDay[selectedDay] ?? [];
  const todayDisplayEvents = eventsByDay[selectedDay] ?? [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else { setViewMonth(viewMonth - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else { setViewMonth(viewMonth + 1); }
  };

  const handleAddOpen = () => {
    const sd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}T10:00`;
    setForm({ title: '', type: 'meeting', start_date: sd, description: '' });
    addModal.openModal();
  };

  const handleAddSave = async () => {
    if (!form.title.trim()) return;
    await addEvent({ title: form.title, type: form.type, start_date: form.start_date, description: form.description, team_id: 'default' });
    addModal.closeModal();
    success(`日程"${form.title}"已创建`);
  };

  const handleEditOpen = (evt: typeof events[0]) => {
    setEditId(evt.id);
    setEditForm({
      title: evt.title,
      type: evt.type ?? 'meeting',
      start_date: evt.start_date ?? '',
      description: evt.description ?? '',
    });
    editModal.openModal();
  };

  const handleEditSave = async () => {
    if (!editId || !editForm.title.trim()) return;
    await editEvent(editId, editForm);
    editModal.closeModal();
    success('日程已更新');
  };

  const handleDelete = async (id: string) => {
    await removeEvent(id);
    editModal.closeModal();
    success('日程已删除');
  };

  return (
    <div className="flex h-full">
      <ToastOverlay toasts={toasts} />

      {/* Calendar Grid */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <ChevronLeft size={16} className="text-text-3 cursor-pointer hover:text-text" onClick={prevMonth} />
          <span className="text-sm font-bold">{viewYear}年{viewMonth + 1}月</span>
          <ChevronRight size={16} className="text-text-3 cursor-pointer hover:text-text" onClick={nextMonth} />
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary-2">今天</span>
          <button className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20" onClick={handleAddOpen}>
            <Plus size={12} />新建日程
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[9px] font-bold uppercase text-text-3 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-lg p-1 min-h-[48px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === currentDay && viewMonth === currentMonth && viewYear === currentYear;
            const hasEvents = eventsByDay[day] && eventsByDay[day].length > 0;
            return (
              <div key={day} onClick={() => setSelectedDay(day)} className={cn('rounded-lg p-1 min-h-[48px] text-[11px] transition-colors cursor-pointer',
                isToday ? 'bg-primary/10' : 'hover:bg-surface-2',
                hasEvents && !isToday && 'bg-surface/50',
                day === selectedDay && 'ring-1 ring-primary/40'
              )}>
                <div className={cn('flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold',
                  isToday ? 'bg-primary text-white' : 'text-text-2'
                )}>{day}</div>
                {hasEvents && (
                  <div className="mt-0.5 flex gap-0.5">
                    {eventsByDay[day].slice(0, 2).map((evt, ei) => (
                      <div key={ei} className={cn('h-1 w-1 rounded-full',
                        evt.type === 'meeting' ? 'bg-primary-2' : evt.type === 'deadline' ? 'bg-danger' : 'bg-warn'
                      )} />
                    ))}
                    {eventsByDay[day].length > 2 && <div className="h-1 w-1 rounded-full bg-text-3" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events */}
      <div className="flex w-72 shrink-0 flex-col border-l border-border bg-surface overflow-y-auto">
        <div className="border-b border-border px-4 py-3 flex items-center">
          <span className="text-xs font-bold">{viewMonth + 1}月{selectedDay}日</span>
          <span className="ml-2 text-[10px] text-text-3">{todayDisplayEvents.length} 项</span>
        </div>
        <div className="p-3 space-y-2">
          {todayDisplayEvents.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-3">当日无日程安排</div>
          ) : todayDisplayEvents.map((evt, i) => {
            const row = selectedEvents[i];
            return (
              <div key={i} className={cn('rounded-xl border border-border p-3 transition-all hover:border-border-2 cursor-pointer',
                evt.type === 'deadline' && 'border-l-2 border-l-danger',
                evt.type === 'meeting' && 'border-l-2 border-l-primary'
              )} onClick={() => row && handleEditOpen(row)}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={11} className="text-text-3" />
                  <span className="text-[10px] font-semibold text-text-2">{evt.time}</span>
                  <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                    evt.type === 'meeting' ? 'bg-primary/10 text-primary-2' : evt.type === 'deadline' ? 'bg-danger/10 text-danger' : 'bg-warn/10 text-warn'
                  )}>
                    {evt.type === 'meeting' ? '会议' : evt.type === 'deadline' ? '截止' : '提醒'}
                  </span>
                  {row && (
                    <Edit3 size={10} className="text-text-3 hover:text-text" />
                  )}
                </div>
                <div className="text-xs font-semibold text-text mb-1">{evt.title}</div>
                <div className="flex items-center gap-3 text-[10px] text-text-3">
                  {evt.location && <span className="flex items-center gap-1"><MapPin size={9} />{evt.location}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Modal */}
      <Modal open={addModal.open} onClose={addModal.closeModal} title="新建日程"
        footer={
          <div className="flex gap-2">
            <button className={btnSecondary} onClick={addModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleAddSave} disabled={!form.title.trim()}>创建</button>
          </div>
        }>
        <ModalField label="日程标题">
          <input className={inputCls} placeholder="输入日程标题" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="类型">
          <select className={inputCls} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="meeting">会议</option>
            <option value="deadline">截止</option>
            <option value="reminder">提醒</option>
          </select>
        </ModalField>
        <ModalField label="开始时间">
          <input className={inputCls} type="datetime-local" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
        </ModalField>
        <ModalField label="描述/地点">
          <input className={inputCls} placeholder="会议室或描述" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </ModalField>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModal.open} onClose={editModal.closeModal} title="编辑日程"
        footer={
          <div className="flex gap-2">
            {editId && (
              <button className="flex items-center gap-1 rounded-lg bg-danger/10 px-3 py-1.5 text-[10px] text-danger hover:bg-danger/20 mr-auto" onClick={() => handleDelete(editId)}>
                <Trash2 size={10} />删除
              </button>
            )}
            <button className={btnSecondary} onClick={editModal.closeModal}>取消</button>
            <button className={btnPrimary} onClick={handleEditSave} disabled={!editForm.title.trim()}>保存</button>
          </div>
        }>
        <ModalField label="日程标题">
          <input className={inputCls} value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
        </ModalField>
        <ModalField label="类型">
          <select className={inputCls} value={editForm.type} onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}>
            <option value="meeting">会议</option>
            <option value="deadline">截止</option>
            <option value="reminder">提醒</option>
          </select>
        </ModalField>
        <ModalField label="开始时间">
          <input className={inputCls} type="datetime-local" value={editForm.start_date} onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))} />
        </ModalField>
        <ModalField label="描述/地点">
          <input className={inputCls} value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
        </ModalField>
      </Modal>
    </div>
  );
}
