import { useState } from 'react';
import { useScheduleEvents } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Calendar, Clock, MapPin, Users, Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { createScheduleEvent } from '@/lib/dataLayer';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function ScheduleContent() {
  const industry = useAppStore((s) => s.industry);
  const { events, setEvents, loading } = useScheduleEvents();
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const currentDay = monthOffset === 0 ? today.getDate() : -1;
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const todayEvents = monthOffset === 0
    ? events.filter((e) => !e.date || e.date === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`)
    : events.filter((e) => e.date && e.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`));
  const createModal = useModal();
  const editModal = useModal();
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formType, setFormType] = useState('meeting');
  const [formDate, setFormDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  function resetForm() {
    setFormTitle('');
    setFormTime('');
    setFormLocation('');
    setFormType('meeting');
    setFormDate('');
    setEditingId(null);
  }

  function handleCreate() {
    if (!formTitle.trim() || !formTime.trim()) return;
    const dateStr = formDate || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const newEvt = {
      id: `evt-${Date.now()}`,
      title: formTitle.trim(),
      time: formTime,
      location: formLocation.trim() || undefined,
      type: formType,
      date: dateStr,
    };
    setEvents((prev) => [...prev, newEvt]);
    createScheduleEvent({ id: newEvt.id, title: newEvt.title, start_date: dateStr, description: newEvt.location || '', type: newEvt.type });
    resetForm();
    createModal.closeModal();
  }

  function openEditModal(evt: { id: string; title: string; time: string; location?: string; type: string }) {
    setEditingId(evt.id);
    setFormTitle(evt.title);
    setFormTime(evt.time);
    setFormLocation(evt.location || '');
    setFormType(evt.type);
    editModal.openModal();
  }

  function handleEdit() {
    if (!formTitle.trim() || !formTime.trim() || !editingId) return;
    setEvents((prev) => prev.map((e) => e.id === editingId ? {
      ...e,
      title: formTitle.trim(),
      time: formTime,
      location: formLocation.trim() || undefined,
      type: formType,
    } : e));
    resetForm();
    editModal.closeModal();
  }

  function openCreateForDay(day: number) {
    setFormDate(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    createModal.openModal();
  }

  const modalForm = (
    <>
      <ModalField label="日程标题">
        <input className={inputCls} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="输入日程标题" />
      </ModalField>
      <ModalField label="时间">
        <input className={inputCls} type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
      </ModalField>
      <ModalField label="地点">
        <input className={inputCls} value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="可选" />
      </ModalField>
        <ModalField label="类型">
          <select className={inputCls} value={formType} onChange={(e) => setFormType(e.target.value)}>
            <option value="meeting">会议</option>
            <option value="deadline">截止</option>
            <option value="task">任务</option>
            <option value="reminder">提醒</option>
          </select>
        </ModalField>
        <ModalField label="日期">
          <input className={inputCls} type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
        </ModalField>
    </>
  );

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={18} className="text-primary-2" />
          <span className="text-sm font-bold">日程</span>
          <button onClick={() => { resetForm(); createModal.openModal(); }} className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20">+ 新建日程</button>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-3 mb-3">
            <ChevronLeft size={14} className="text-text-3 cursor-pointer hover:text-text" onClick={() => setMonthOffset((o) => o - 1)} />
            <span className="text-xs font-bold">{currentYear}年{currentMonth + 1}月</span>
            <ChevronRight size={14} className="text-text-3 cursor-pointer hover:text-text" onClick={() => setMonthOffset((o) => o + 1)} />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => <div key={d} className="text-center text-[9px] text-text-3 py-1">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === currentDay;
              return (
                <div key={day} onClick={() => openCreateForDay(day)} className={cn('flex items-center justify-center h-6 text-[10px] rounded cursor-pointer', isToday ? 'bg-primary text-white font-bold' : 'text-text-2 hover:bg-surface-2')}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex w-72 shrink-0 flex-col border-l border-border bg-surface overflow-y-auto">
        <div className="border-b border-border px-4 py-3"><span className="text-xs font-bold">{monthOffset === 0 ? '今日安排' : `${currentMonth + 1}月日程`}</span></div>
        <div className="p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-primary-2" /></div>
          ) : todayEvents.map((evt) => (
            <div key={evt.id} onClick={() => openEditModal(evt)} className={cn('rounded-xl border border-border p-3 cursor-pointer hover:border-primary/30 transition-colors',
              evt.type === 'deadline' && 'border-l-2 border-l-danger',
              evt.type === 'meeting' && 'border-l-2 border-l-primary'
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={10} className="text-text-3" />
                <span className="text-[10px] font-semibold text-text-2">{evt.time}</span>
                <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                  evt.type === 'meeting' ? 'bg-primary/10 text-primary-2' : evt.type === 'deadline' ? 'bg-danger/10 text-danger' : 'bg-warn/10 text-warn'
                )}>
                  {evt.type === 'meeting' ? '会议' : evt.type === 'deadline' ? '截止' : evt.type === 'task' ? '任务' : '提醒'}
                </span>
              </div>
              <div className="text-xs font-semibold text-text">{evt.title}</div>
              {evt.location && <div className="text-[10px] text-text-3 mt-0.5 flex items-center gap-1"><MapPin size={9} />{evt.location}</div>}
            </div>
          ))}
        </div>
      </div>

      <Modal open={createModal.open} onClose={createModal.closeModal} title="新建日程"
        footer={
          <>
            <button onClick={createModal.closeModal} className={btnSecondary}>取消</button>
            <button onClick={handleCreate} className={btnPrimary} disabled={!formTitle.trim() || !formTime.trim()}>创建</button>
          </>
        }>
        {modalForm}
      </Modal>

      <Modal open={editModal.open} onClose={editModal.closeModal} title="编辑日程"
        footer={
          <>
            <button onClick={editModal.closeModal} className={btnSecondary}>取消</button>
            <button onClick={handleEdit} className={btnPrimary} disabled={!formTitle.trim() || !formTime.trim()}>保存</button>
          </>
        }>
        {modalForm}
      </Modal>
    </div>
  );
}
