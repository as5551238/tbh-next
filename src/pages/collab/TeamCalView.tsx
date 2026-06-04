import { useMatrixCell } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

interface CalEvent {
  time: string;
  title: string;
  type: 'meeting' | 'deadline' | 'reminder';
  location?: string;
  attendees?: number;
}

const MOCK_EVENTS: Record<number, CalEvent[]> = {
  4: [
    { time: '09:30', title: '产品周会', type: 'meeting', location: '会议室A', attendees: 8 },
    { time: '14:00', title: 'Q3路线图评审', type: 'meeting', location: '主会议室', attendees: 15 },
    { time: '17:00', title: 'PRD评审截止', type: 'deadline' },
  ],
  5: [
    { time: '10:00', title: '1:1 with 研发负责人', type: 'meeting', attendees: 2 },
  ],
  6: [
    { time: '11:00', title: '设计走查', type: 'meeting', location: '设计区', attendees: 5 },
  ],
  9: [
    { time: '09:00', title: 'Sprint Review', type: 'meeting', location: '线上', attendees: 12 },
    { time: '16:00', title: '导出功能上线', type: 'deadline' },
  ],
  12: [
    { time: '15:00', title: '月度复盘', type: 'meeting', location: '主会议室', attendees: 20 },
  ],
  15: [],
  18: [
    { time: '14:00', title: 'Q3中期回顾', type: 'meeting', location: '主会议室', attendees: 10 },
  ],
  20: [
    { time: '23:59', title: 'Q3目标截止', type: 'deadline' },
  ],
  25: [
    { time: '10:00', title: '团建活动', type: 'reminder', location: '莫干山', attendees: 40 },
  ],
  30: [
    { time: '17:00', title: '月度总结提交', type: 'deadline' },
  ],
};

export default function TeamCalView() {
  const industry = useAppStore((s) => s.industry);
  const cell = useMatrixCell();
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const todayEvents = MOCK_EVENTS[currentDay] ?? [];

  return (
    <div className="flex h-full">
      {/* Calendar Grid */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <ChevronLeft size={16} className="text-text-3 cursor-pointer hover:text-text" />
          <span className="text-sm font-bold">{currentYear}年{currentMonth + 1}月</span>
          <ChevronRight size={16} className="text-text-3 cursor-pointer hover:text-text" />
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary-2">今天</span>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[9px] font-bold uppercase text-text-3 py-1">{d}</div>
          ))}
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-lg p-1 min-h-[48px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === currentDay;
            const hasEvents = MOCK_EVENTS[day] && MOCK_EVENTS[day].length > 0;
            return (
              <div key={day} className={cn('rounded-lg p-1 min-h-[48px] text-[11px] transition-colors cursor-pointer',
                isToday ? 'bg-primary/10' : 'hover:bg-surface-2',
                hasEvents && !isToday && 'bg-surface/50'
              )}>
                <div className={cn('flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold',
                  isToday ? 'bg-primary text-white' : 'text-text-2'
                )}>{day}</div>
                {hasEvents && (
                  <div className="mt-0.5 flex gap-0.5">
                    {MOCK_EVENTS[day].slice(0, 2).map((evt, ei) => (
                      <div key={ei} className={cn('h-1 w-1 rounded-full',
                        evt.type === 'meeting' ? 'bg-primary-2' : evt.type === 'deadline' ? 'bg-danger' : 'bg-warn'
                      )} />
                    ))}
                    {MOCK_EVENTS[day].length > 2 && <div className="h-1 w-1 rounded-full bg-text-3" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Events */}
      <div className="flex w-72 shrink-0 flex-col border-l border-border bg-surface overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <span className="text-xs font-bold">今日日程</span>
          <span className="ml-2 text-[10px] text-text-3">{todayEvents.length} 项</span>
        </div>
        <div className="p-3 space-y-2">
          {todayEvents.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-3">今日无日程安排</div>
          ) : todayEvents.map((evt, i) => (
            <div key={i} className={cn('rounded-xl border border-border p-3 transition-all hover:border-border-2',
              evt.type === 'deadline' && 'border-l-2 border-l-danger',
              evt.type === 'meeting' && 'border-l-2 border-l-primary'
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Clock size={11} className="text-text-3" />
                <span className="text-[10px] font-semibold text-text-2">{evt.time}</span>
                <span className={cn('ml-auto rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                  evt.type === 'meeting' ? 'bg-primary/10 text-primary-2' : evt.type === 'deadline' ? 'bg-danger/10 text-danger' : 'bg-warn/10 text-warn'
                )}>
                  {evt.type === 'meeting' ? '会议' : evt.type === 'deadline' ? '截止' : '提醒'}
                </span>
              </div>
              <div className="text-xs font-semibold text-text mb-1">{evt.title}</div>
              <div className="flex items-center gap-3 text-[10px] text-text-3">
                {evt.location && <span className="flex items-center gap-1"><MapPin size={9} />{evt.location}</span>}
                {evt.attendees && <span className="flex items-center gap-1"><Users size={9} />{evt.attendees}人</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
