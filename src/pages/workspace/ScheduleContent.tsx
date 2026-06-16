import { useState, useMemo } from 'react';
import { useScheduleEvents } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { Calendar, Clock, MapPin, Plus, Lock, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { createScheduleEvent } from '@/lib/dataLayer';
import { hasFeature } from '@/lib/subscription';
import { CardSkeleton } from '@/components/Skeleton';
import { useLocale } from '@/lib/i18n';

const WEEKDAYS_KEYS = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'];
const WEEKDAYS_FULL_KEYS = ['weekdayFullSun', 'weekdayFullMon', 'weekdayFullTue', 'weekdayFullWed', 'weekdayFullThu', 'weekdayFullFri', 'weekdayFullSat'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 07:00 - 19:00

type ViewMode = 'month' | 'week' | 'day';

export default function ScheduleContent() {
  const { t } = useLocale();
  const isPro = hasFeature('advancedAnalytics' as never);
  const industry = useAppStore((s) => s.industry);
  const { events, setEvents, addEvent, editEvent, removeEvent, loading } = useScheduleEvents();
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1 + (monthOffset !== 0 ? 0 : 0));
  const currentDay = monthOffset === 0 ? today.getDate() : -1;
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  // Week view: compute the start of the week containing viewDate
  const weekStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay() + monthOffset * 7); // shift by week offset
    return d;
  }, [today, monthOffset]);

  // Day view: just use today + monthOffset days (more intuitive with +/- nav)
  const dayDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + monthOffset);
    return d;
  }, [today, monthOffset]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  // Filter events by date string helper
  const dateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const monthEvents = events.filter((e) => e.date && e.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`));
  const todayEvents = monthOffset === 0
    ? events.filter((e) => !e.date || e.date === dateStr(today))
    : monthEvents;

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
    const dateStr2 = formDate || dateStr(today);
    addEvent({
      title: formTitle.trim(),
      date: dateStr2,
      time: formTime,
      description: formLocation.trim() || '',
      type: formType,
    } as unknown as Parameters<typeof addEvent>[0]);
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
    editEvent(editingId, {
      title: formTitle.trim(),
      time: formTime,
      location: formLocation.trim() || undefined,
      type: formType,
    });
    resetForm();
    editModal.closeModal();
  }

  function openCreateForDay(day: number) {
    setFormDate(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    createModal.openModal();
  }

  function openCreateForDate(d: Date) {
    setFormDate(dateStr(d));
    createModal.openModal();
  }

  const WEEKDAYS = WEEKDAYS_KEYS.map((k) => t(`schedule.${k}`));
  const WEEKDAYS_FULL = WEEKDAYS_FULL_KEYS.map((k) => t(`schedule.${k}`));

  const modalForm = (
    <>
      <ModalField label={t('schedule.eventTitle')}>
        <input className={inputCls} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder={t('schedule.eventTitlePlaceholder')} />
      </ModalField>
      <ModalField label={t('schedule.time')}>
        <input className={inputCls} type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
      </ModalField>
      <ModalField label={t('schedule.location')}>
        <input className={inputCls} value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder={t('schedule.locationOptional')} />
      </ModalField>
      <ModalField label={t('schedule.type')}>
        <select className={inputCls} value={formType} onChange={(e) => setFormType(e.target.value)}>
          <option value="meeting">{t('schedule.typeMeeting')}</option>
          <option value="deadline">{t('schedule.typeDeadline')}</option>
          <option value="task">{t('schedule.typeTask')}</option>
          <option value="reminder">{t('schedule.typeReminder')}</option>
        </select>
      </ModalField>
      <ModalField label={t('schedule.dateLabel')}>
        <input className={inputCls} type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
      </ModalField>
    </>
  );

  // Navigation label based on view
  const navLabel = viewMode === 'month'
    ? t('schedule.navMonthLabel', { year: currentYear, month: currentMonth + 1 })
    : viewMode === 'week'
      ? `${dateStr(weekStart)} ~ ${dateStr(new Date(weekStart.getTime() + 6 * 86400000))}`
      : dateStr(dayDate);

  // ── Month View ──
  const monthView = (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAYS.map((d) => <div key={d} className="text-center text-[9px] text-text-3 py-1">{d}</div>)}
      {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
      {Array.from({ length: daysInMonth }).map((_, i) => {
        const day = i + 1;
        const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvts = events.filter((e) => e.date === ds);
        const isToday = day === currentDay;
        return (
          <div key={day} onClick={() => openCreateForDay(day)} className={cn('flex flex-col items-center justify-start h-10 text-[10px] rounded cursor-pointer p-0.5', isToday ? 'bg-primary/20 font-bold' : 'text-text-2 hover:bg-surface-2')}>
            <span className={cn('flex items-center justify-center w-5 h-5 rounded-full text-[10px]', isToday && 'bg-primary text-white')}>{day}</span>
            {dayEvts.length > 0 && <div className="flex gap-0.5 mt-0.5">{dayEvts.slice(0, 3).map((e, j) => <div key={j} className={cn('w-1 h-1 rounded-full', e.type === 'deadline' ? 'bg-danger' : e.type === 'meeting' ? 'bg-primary' : 'bg-warn')} />)}</div>}
          </div>
        );
      })}
    </div>
  );

  // ── Week View ──
  const weekView = (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(weekStart.getTime() + i * 86400000);
        const ds = dateStr(d);
        const dayEvts = events.filter((e) => e.date === ds);
        const isToday = ds === dateStr(today);
        return (
          <div key={i} className="flex flex-col items-center border border-border/50 rounded-lg p-1 min-h-[160px]">
            <div className={cn('text-[9px] font-semibold mb-0.5', isToday && 'text-primary-2')}>{WEEKDAYS_FULL[d.getDay()]}</div>
            <div className={cn('flex items-center justify-center w-6 h-6 rounded-full text-[10px] mb-1', isToday && 'bg-primary text-white', !isToday && 'text-text-2')}>{d.getDate()}</div>
            <div className="flex-1 w-full space-y-0.5 overflow-y-auto">
              {dayEvts.map((e) => (
                <div key={e.id} onClick={() => openEditModal({ id: e.id, title: e.title, time: e.time, location: e.location ?? undefined, type: e.type })} className={cn('rounded px-1 py-0.5 text-[8px] truncate cursor-pointer', e.type === 'deadline' ? 'bg-danger/10 text-danger' : e.type === 'meeting' ? 'bg-primary/10 text-primary-2' : 'bg-warn/10 text-warn')}>
                  {e.time ? `${e.time.slice(0, 5)} ` : ''}{e.title}
                </div>
              ))}
            </div>
            <button className="text-[8px] text-text-3 hover:text-primary-2 mt-1" onClick={() => openCreateForDate(d)}>+</button>
          </div>
        );
      })}
    </div>
  );

  // ── Day View (Timeline) ──
  const dayView = (
    <div className="space-y-0.5">
      {HOURS.map((h) => {
        const hourStr = `${String(h).padStart(2, '0')}:00`;
        const ds = dateStr(dayDate);
        const hourEvts = events.filter((e) => e.date === ds && e.time && e.time.startsWith(String(h).padStart(2, '0')));
        const isNow = monthOffset === 0 && h === today.getHours();
        return (
          <div key={h} className={cn('flex items-start gap-2 py-1 border-b border-border/30', isNow && 'bg-primary/5')}>
            <span className="text-[10px] text-text-3 w-10 shrink-0 text-right pt-0.5">{hourStr}</span>
            <div className="flex-1 min-h-[20px] space-y-0.5">
              {hourEvts.map((e) => (
                <div key={e.id} onClick={() => openEditModal({ id: e.id, title: e.title, time: e.time, location: e.location ?? undefined, type: e.type })} className={cn('rounded-lg px-2 py-1 cursor-pointer text-[10px]', e.type === 'deadline' ? 'bg-danger/10 border-l-2 border-l-danger' : e.type === 'meeting' ? 'bg-primary/10 border-l-2 border-l-primary' : 'bg-warn/10 border-l-2 border-l-warn')}>
                  <span className="font-semibold">{e.title}</span>
                  {e.location && <span className="text-text-3 ml-2"><MapPin size={8} className="inline" /> {e.location}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <button className="mt-2 w-full rounded-lg bg-primary/5 py-1 text-[10px] text-primary-2 hover:bg-primary/10" onClick={() => openCreateForDate(dayDate)}>{t('schedule.addScheduleHere')}</button>
    </div>
  );

  // Right panel events for month view
  const panelTitle = viewMode === 'month'
    ? (monthOffset === 0 ? t('schedule.todaySchedule') : t('schedule.monthSchedule', { month: currentMonth + 1 }))
    : viewMode === 'week'
      ? t('schedule.weekSchedule')
      : t('schedule.dayScheduleLabel', { date: dateStr(dayDate) });

  const panelEvents = viewMode === 'month'
    ? todayEvents
    : viewMode === 'week'
      ? events.filter((e) => {
          const ws = dateStr(weekStart);
          const we = dateStr(new Date(weekStart.getTime() + 6 * 86400000));
          return e.date && e.date >= ws && e.date <= we;
        })
      : events.filter((e) => e.date === dateStr(dayDate));

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto p-3 md:p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Calendar size={18} className="text-primary-2" />
          <span className="text-sm font-bold">{t('schedule.title')}</span>
          {/* View mode switcher */}
          <div className="flex rounded-lg bg-surface-2 overflow-hidden">
            {([['month', t('schedule.viewMonth')], ['week', t('schedule.viewWeek')], ['day', t('schedule.viewDay')]] as [ViewMode, string][]).map(([mode, label]) => (
              <button key={mode} className={cn('px-2.5 py-1 text-[10px] font-semibold transition-colors', viewMode === mode ? 'bg-primary/15 text-primary-2' : 'text-text-3 hover:text-text')} onClick={() => { setViewMode(mode); setMonthOffset(0); }}>{label}</button>
            ))}
          </div>
          <button onClick={() => { if (!isPro) return; resetForm(); createModal.openModal(); }} className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20">{isPro ? t('schedule.newSchedule') : <><Lock size={10} className="inline mr-1" />Pro</>}</button>
        </div>

        <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <ChevronLeft size={14} className="text-text-3 cursor-pointer hover:text-text" onClick={() => setMonthOffset((o) => o - 1)} />
            <span className="text-xs font-bold">{navLabel}</span>
            <ChevronRight size={14} className="text-text-3 cursor-pointer hover:text-text" onClick={() => setMonthOffset((o) => o + 1)} />
            {monthOffset !== 0 && <button className="text-[9px] text-primary-2 hover:underline ml-1" onClick={() => setMonthOffset(0)}>{t('schedule.backToToday')}</button>}
          </div>
          {viewMode === 'month' && monthView}
          {viewMode === 'week' && weekView}
          {viewMode === 'day' && dayView}
        </div>
      </div>

      <div className="flex w-72 shrink-0 flex-col border-l border-border bg-surface overflow-y-auto">
        <div className="border-b border-border px-4 py-3"><span className="text-xs font-bold">{panelTitle}</span></div>
        <div className="p-3 space-y-2">
          {loading ? (
            <CardSkeleton />
          ) : panelEvents.map((evt) => (
            <div key={evt.id} onClick={() => openEditModal({ id: evt.id, title: evt.title, time: evt.time, location: evt.location ?? undefined, type: evt.type })} className={cn('rounded-xl border border-border p-3 cursor-pointer hover:border-primary/30 transition-colors',
              evt.type === 'deadline' && 'border-l-2 border-l-danger',
              evt.type === 'meeting' && 'border-l-2 border-l-primary'
            )}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Clock size={10} className="text-text-3" />
                <span className="text-[10px] font-semibold text-text-2">{evt.time}</span>
                <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                  evt.type === 'meeting' ? 'bg-primary/10 text-primary-2' : evt.type === 'deadline' ? 'bg-danger/10 text-danger' : 'bg-warn/10 text-warn'
                )}>
                  {evt.type === 'meeting' ? t('schedule.typeMeeting') : evt.type === 'deadline' ? t('schedule.typeDeadline') : evt.type === 'task' ? t('schedule.typeTask') : t('schedule.typeReminder')}
                </span>
              </div>
              <div className="text-xs font-semibold text-text">{evt.title}</div>
              {evt.location && <div className="text-[10px] text-text-3 mt-0.5 flex flex-wrap items-center gap-1"><MapPin size={9} />{evt.location}</div>}
            </div>
          ))}
        </div>
      </div>

      <Modal open={createModal.open} onClose={createModal.closeModal} title={t('schedule.newScheduleTitle')}
        footer={
          <>
            <button onClick={createModal.closeModal} className={btnSecondary}>{t('common.cancel')}</button>
            <button onClick={handleCreate} className={btnPrimary} disabled={!formTitle.trim() || !formTime.trim()}>{t('common.create')}</button>
          </>
        }>
        {modalForm}
      </Modal>

      <Modal open={editModal.open} onClose={editModal.closeModal} title={t('schedule.editScheduleTitle')}
        footer={
          <>
            <button onClick={() => { if (editingId) { removeEvent(editingId); resetForm(); editModal.closeModal(); } }} className="text-[11px] text-danger hover:underline mr-auto">{t('common.delete')}</button>
            <button onClick={editModal.closeModal} className={btnSecondary}>{t('common.cancel')}</button>
            <button onClick={handleEdit} className={btnPrimary} disabled={!formTitle.trim() || !formTime.trim()}>{t('common.save')}</button>
          </>
        }>
        {modalForm}
      </Modal>
    </div>
  );
}