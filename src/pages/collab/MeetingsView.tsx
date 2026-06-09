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

const MEETING_FIELDS: FieldDef[] = [
  { key: 'title', label: '会议主题', type: 'text', editable: true },
  { key: 'time', label: '时间', type: 'text', editable: true },
  { key: 'location', label: '地点', type: 'text', editable: true },
  { key: 'organizer', label: '发起人', type: 'text', editable: true },
  { key: 'status', label: '状态', type: 'select', editable: true, options: [
    { value: 'upcoming', label: '即将开始' },
    { value: 'ongoing', label: '进行中' },
    { value: 'ended', label: '已结束' },
  ]},
];

export default function MeetingsView() {
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
      location: form.location || (form.type === 'online' ? '线上会议' : '待定'),
      organizer: '我',
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
      triggerFeedback({ type: 'meeting', action: 'started', entity: mtg });
      showToast(`已加入会议: ${mtg.title ?? ''}`);
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
        <span className="text-sm font-bold">会议</span>
        <span className="text-[10px] text-text-3">{upcomingCount} 场即将开始</span>
        <button onClick={createModal.openModal} className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">+ 预约会议</button>
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
                {mtg.status === 'upcoming' ? '即将开始' : mtg.status === 'ongoing' ? '进行中' : '已结束'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-text-3 mb-2">
              <span className="flex flex-wrap items-center gap-1"><Clock size={10} />{mtg.time} · {mtg.duration}</span>
              <span className="flex flex-wrap items-center gap-1"><MapPin size={10} />{mtg.location}</span>
              <span className="flex flex-wrap items-center gap-1"><Users size={10} />{mtg.attendees}人</span>
              <span className="flex flex-wrap items-center gap-1"><Calendar size={10} />发起: {mtg.organizer}</span>
            </div>
            {mtg.type === 'online' && mtg.status === 'upcoming' && (
              <button onClick={(e) => { e.stopPropagation(); handleJoin(mtg); }} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">
                <Video size={12} />加入会议
              </button>
            )}
            {mtg.agenda && (
              <div className="mt-2 rounded-lg bg-surface-2 p-2.5">
                <div className="text-[9px] font-bold text-text-3 mb-1.5 uppercase">议程</div>
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

      <ItemDetailModal open={detailModal.open} onClose={detailModal.closeModal} title="会议详情" fields={MEETING_FIELDS} data={selected} commentTarget={selected?.id ? { type: 'meeting', id: String(selected.id) } : null}
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
              <span className="text-sm font-bold">预约会议</span>
              <button onClick={createModal.closeModal} className="text-text-3 hover:text-text"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-3 mb-1 block">会议主题 *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="输入会议主题" className={inputCls + ' w-full'} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-text-3 mb-1 block">时间</label>
                  <input value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} placeholder="例: 明天 10:00" className={inputCls + ' w-full'} />
                </div>
                <div>
                  <label className="text-[10px] text-text-3 mb-1 block">时长</label>
                  <select value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} className={inputCls + ' w-full'}>
                    <option value="15分钟">15分钟</option>
                    <option value="30分钟">30分钟</option>
                    <option value="1小时">1小时</option>
                    <option value="2小时">2小时</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-text-3 mb-1 block">地点/链接</label>
                <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="会议室名或视频链接" className={inputCls + ' w-full'} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex flex-wrap items-center gap-1.5 text-xs text-text-2 cursor-pointer">
                  <input type="radio" name="meetingType" value="online" checked={form.type === 'online'} onChange={() => setForm((f) => ({ ...f, type: 'online' }))} className="accent-primary" />线上
                </label>
                <label className="flex flex-wrap items-center gap-1.5 text-xs text-text-2 cursor-pointer">
                  <input type="radio" name="meetingType" value="offline" checked={form.type === 'offline'} onChange={() => setForm((f) => ({ ...f, type: 'offline' }))} className="accent-primary" />线下
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button onClick={handleCreate} disabled={!form.title.trim()} className={`${btnPrimary} disabled:opacity-40`}>确认预约</button>
              <button onClick={createModal.closeModal} className={btnSecondary}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
