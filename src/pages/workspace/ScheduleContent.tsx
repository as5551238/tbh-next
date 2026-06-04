import { useMatrixCell } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Calendar, Clock, MapPin, Users, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface ScheduleEvent {
  time: string;
  title: string;
  type: 'meeting' | 'deadline' | 'task' | 'reminder';
  location?: string;
}

const MOCK_TODAY: ScheduleEvent[] = [
  { time: '09:00', title: '晨站会', type: 'meeting' },
  { time: '09:30', title: '产品周会', type: 'meeting', location: '会议室A' },
  { time: '14:00', title: 'Q3路线图评审截止', type: 'deadline' },
  { time: '17:30', title: '30min有氧运动', type: 'reminder' },
];

export default function ScheduleContent() {
  const industry = useAppStore((s) => s.industry);
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={18} className="text-primary-2" />
          <span className="text-sm font-bold">日程</span>
          <button className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20">+ 新建日程</button>
        </div>

        {/* Mini Calendar */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-3 mb-3">
            <ChevronLeft size={14} className="text-text-3 cursor-pointer" />
            <span className="text-xs font-bold">{currentYear}年{currentMonth + 1}月</span>
            <ChevronRight size={14} className="text-text-3 cursor-pointer" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => <div key={d} className="text-center text-[9px] text-text-3 py-1">{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === currentDay;
              return (
                <div key={day} className={cn('flex items-center justify-center h-6 text-[10px] rounded cursor-pointer', isToday ? 'bg-primary text-white font-bold' : 'text-text-2 hover:bg-surface-2')}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex w-72 shrink-0 flex-col border-l border-border bg-surface overflow-y-auto">
        <div className="border-b border-border px-4 py-3"><span className="text-xs font-bold">今日安排</span></div>
        <div className="p-3 space-y-2">
          {MOCK_TODAY.map((evt, i) => (
            <div key={i} className={cn('rounded-xl border border-border p-3',
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
    </div>
  );
}
