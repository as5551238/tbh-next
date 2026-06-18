import { useState } from 'react';
import { useMeetings } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Video, MapPin, Users, Clock, Calendar, Check, X } from 'lucide-react';
import { useModal, btnPrimary, btnSecondary, inputCls } from '@/components/Modal';
import ItemDetailModal from '@/components/ItemDetailModal';
import type { FieldDef } from '@/components/ItemDetailModal';
import type { MeetingRow } from '@/lib/dataLayer';
import { useMLOOFeedback } from '@/hooks/useMLOOFeedback';
import { CardSkeleton } from '@/components/Skeleton';
import { t } from '@/lib/i18n';

export default function MeetingsView() {
  const MEETING_FIELDS: FieldDef[] = [
    { key: 'title', label: t('meetings.fieldTitle'), type: 'text', editable: true },
    { key: 'time', label: t('meetings.fieldTime'), type: 'text', editable: true },
    { key: 'location', label: t('meetings.fieldLocation'), type: 'text', editable: true },
    { key: 'organizer', label: t('meetings.fieldOrganizer'), type: 'text', editable: true },
    { key: 'status', label: t('meetings.fieldStatus'), type: 'select', editable: true, options: [
      { value: 'upcoming', label: t('meetings.statusUpcoming') },
      { value: 'ongoing', label: t('meetings.statusOngoing') },
      { value: 'ended', label: t('meetings.statusEnded') },
    ]},
  ];

  const { meetings, addMeeting, editMeeting, removeMeeting, loading } = useMeetings();
  const { triggerFeedback } = useMLOOFeedback();
  const detailModal = useModal();
  const createModal = useModal();
  const [selected, setSelected] = useState<MeetingRow | null>(null);
  const [form, setForm] = useState({ title: '', time: '', location: '', duration: '30分钟', type: 'online' as 'online' | 'offline' });
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const upcomingCount = meetings.filter((m) => m.status === 'upcoming').length;

  async function handleCreate() {
    if (!form.title.trim()) return;
    await addMeeting({
      title: form.title.trim(),
      time: form.time || new Date().toLocaleString('zh-CN'),
      duration: form.duration,
      location: form.location || (form.type === 'online' ? t('meetings.onlineMeeting') : t('meetings.tbd')),
      organizer: t('meetings.me'),
      attendees: 1,
      status: 'upcoming',
      type: form.type,
      agenda: [],
    });
    setForm({ title: '', time: '', location: '', duration: '30分钟', type: 'online' });
    createModal.closeModal();
  }

  function handleJoin(mtg: MeetingRow) {
    const location = String(mtg.location ?? '');
    if (location.startsWith('http')) {
      window.open(location, '_blank');
    } else {
      editMeeting(mtg.id, { status: 'ongoing' });
      triggerFeedback({ type: 'meeting', action: 'started', entity: mtg as unknown as Record<string, unknown> });
      showToast(t('meetings.joinedMeeting', { title: mtg.title ?? '' }));
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex flex-wrap items-center gap-2 rounded-xl bg-success/90 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
          <Check size={12} className="mr-1.5 inline" />{toast}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">{t('meetings.title')}</span>
        <span className="text-[10px] text-text-3">{t('meetings.upcomingCount', { count: upcomingCount })}</span>
        <button onClick={createModal.openModal} className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">{t('meetings.createMeeting')}</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        {loading ? (
          <CardSkeleton />
        ) : (
        meetings.map((mtg) => (
          <div key={mtg.id} className={cn('rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg cursor-pointer',
            mtg.status === 'ongoing' && 'border-l-2 border-l-success',
            mtg.status === 'ended' && 'opacity-60'
          )} onClick={() => { setSelected(mtg); detailModal.openModal(); }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text">{mtg.title}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold',
                mtg.status === 'upcoming' ? 'bg-primary/10 text-primary-2' :
                mtg.status === 'ongoing' ? 'bg-success/10 text-success' : 'bg-surface-2 text-text-3'
              )}>
                {mtg.status === 'upcoming' ? t('meetings.statusUpcoming') : mtg.status === 'ongoing' ? t('meetings.statusOngoing') : t('meetings.statusEnded')}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-3 mb-2">
              <span className="flex flex-wrap items-center gap-1"><Clock size={10} />{mtg.time} · {mtg.duration}</span>
              <span className="flex flex-wrap items-center gap-1"><MapPin size={10} />{mtg.location}</span>
              <span className="flex flex-wrap items-center gap-1"><Users size={10} />{t('meetings.attendeesCount', { count: mtg.attendees })}</span>
              <span className="flex flex-wrap items-center gap-1"><Calendar size={10} />{t('meetings.initiatedBy')} {mtg.organizer}</span>
            </div>
            {mtg.type === 'online' && mtg.status === 'upcoming' && (
              <button onClick={(e) => { e.stopPropagation(); handleJoin(mtg); }} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">
                <Video size={12} />{t('meetings.joinMeeting')}
              </button>
            )}
            {mtg.agenda && (
              <div className="mt-2 rounded-lg bg-surface-2 p-2.5">
                <div className="text-[9px] font-bold text-text-3 mb-1.5 uppercase">{t('meetings.agenda')}</div>
                {mtg.agenda.map((item: string, i: number) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 text-[10px] text-text-2 py-0.5">
                    <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-text-3/20 text-[8px] font-bold">{i + 1}</span>
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
        )}
      </div>

      <ItemDetailModal open={detailModal.open} onClose={detailModal.closeModal} title={t('meetings.detailTitle')} fields={MEETING_FIELDS} data={selected as unknown as Record<string, unknown> | null} commentTarget={selected?.id ? { type: 'meeting', id: String(selected.id) } : null}
        onSave={(updated) => {
          if (selected) {
            editMeeting(selected.id, updated);
          }
        }}
        onDelete={() => {
          if (selected) removeMeeting(selected.id);
        }}
      />

      {/* Create Meeting Modal */}
      {createModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={createModal.closeModal}>
          <div className="w-96 rounded-xl border border-border bg-surface-2 p-3 md:p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">{t('meetings.createModalTitle')}</span>
              <button onClick={createModal.closeModal} aria-label={t('meetings.closeAria')} className="text-text-3 hover:text-text"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-3 mb-1 block">{t('meetings.titleLabel')}</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={t('meetings.titlePlaceholder')} className={inputCls + ' w-full'} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-text-3 mb-1 block">{t('meetings.timeLabel')}</label>
                  <input value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} placeholder={t('meetings.timePlaceholder')} className={inputCls + ' w-full'} />
                </div>
                <div>
                  <label className="text-[10px] text-text-3 mb-1 block">{t('meetings.durationLabel')}</label>
                  <select value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} className={inputCls + ' w-full'}>
                    <option value="15分钟">{t('meetings.duration15min')}</option>
                    <option value="30分钟">{t('meetings.duration30min')}</option>
                    <option value="1小时">{t('meetings.duration1h')}</option>
                    <option value="2小时">{t('meetings.duration2h')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-text-3 mb-1 block">{t('meetings.locationLabel')}</label>
                <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder={t('meetings.locationPlaceholder')} className={inputCls + ' w-full'} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex flex-wrap items-center gap-1.5 text-xs text-text-2 cursor-pointer">
                  <input type="radio" name="meetingType" value="online" checked={form.type === 'online'} onChange={() => setForm((f) => ({ ...f, type: 'online' }))} className="accent-primary" />{t('meetings.online')}
                </label>
                <label className="flex flex-wrap items-center gap-1.5 text-xs text-text-2 cursor-pointer">
                  <input type="radio" name="meetingType" value="offline" checked={form.type === 'offline'} onChange={() => setForm((f) => ({ ...f, type: 'offline' }))} className="accent-primary" />{t('meetings.offline')}
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button onClick={handleCreate} disabled={!form.title.trim()} className={`${btnPrimary} disabled:opacity-40`}>{t('meetings.confirmSchedule')}</button>
              <button onClick={createModal.closeModal} className={btnSecondary}>{t('meetings.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
