import { useState } from 'react';
import { useMatrixCell, useScheduleEvents } from '@/hooks/useMatrix';
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


export default function TeamCalView() {
  const industry = useAppStore((s) => s.industry);
  const { cell, loading } = useMatrixCell();
  const { events } = useScheduleEvents();
  const today = new Date();

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Group events by day of month
  const eventsByDay: Record<number, CalEvent[]> = {};
  events.forEach((evt) => {
    const d = new Date(evt.start_date ?? evt.created_at ?? '');
    if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push({
        time: d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        title: evt.title,
        type: (evt.type?.includes('deadline') ? 'deadline' : evt.type?.includes('reminder') ? 'reminder' : 'meeting') as CalEvent['type'],
        location: evt.description ?? undefined,
      });
    }
  });

  const todayEvents = eventsByDay[selectedDay] ?? [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else { setViewMonth(viewMonth - 1); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else { setViewMonth(viewMonth + 1); }
  };

  return (
    <div className="flex h-full">
      {/* Calendar Grid */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <ChevronLeft size={16} className="text-text-3 cursor-pointer hover:text-text" onClick={prevMonth} />
          <span className="text-sm font-bold">{viewYear}年{viewMonth + 1}月</span>
          <ChevronRight size={16} className="text-text-3 cursor-pointer hover:text-text" onClick={nextMonth} />
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
