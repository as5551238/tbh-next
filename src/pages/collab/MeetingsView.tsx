import { useMeetings } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Video, MapPin, Users, Clock, Calendar, Loader2 } from 'lucide-react';



export default function MeetingsView() {
  const { meetings, loading } = useMeetings();
  const industry = useAppStore((s) => s.industry);

  const upcomingCount = meetings.filter((m) => m.status === 'upcoming').length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">会议</span>
        <span className="text-[10px] text-text-3">{upcomingCount} 场即将开始</span>
        <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">+ 预约会议</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-text-3" size={24} /></div>
        ) : (
        meetings.map((mtg) => (
          <div key={mtg.id} className={cn('rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-2 hover:shadow-lg',
            mtg.status === 'ongoing' && 'border-l-2 border-l-success',
            mtg.status === 'ended' && 'opacity-60'
          )}>
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
              <span className="flex items-center gap-1"><Clock size={10} />{mtg.time} · {mtg.duration}</span>
              <span className="flex items-center gap-1"><MapPin size={10} />{mtg.location}</span>
              <span className="flex items-center gap-1"><Users size={10} />{mtg.attendees}人</span>
              <span className="flex items-center gap-1"><Calendar size={10} />发起: {mtg.organizer}</span>
            </div>
            {mtg.type === 'online' && mtg.status === 'upcoming' && (
              <button className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">
                <Video size={12} />加入会议
              </button>
            )}
            {mtg.agenda && (
              <div className="mt-2 rounded-lg bg-surface-2 p-2.5">
                <div className="text-[9px] font-bold text-text-3 mb-1.5 uppercase">议程</div>
                {mtg.agenda.map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-text-2 py-0.5">
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
    </div>
  );
}
