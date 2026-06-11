import { useState, useEffect, useCallback } from 'react';
import { fetchScheduleEvents, createScheduleEvent, updateScheduleEvent, deleteScheduleEvent, type ScheduleEventRow } from '@/lib/dataLayer';
import type { ScheduleEventInput } from '@/contracts/dataContracts';

export function useScheduleEvents() {
  const [events, setEvents] = useState<ScheduleEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchScheduleEvents().then((d) => { setEvents(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addEvent = useCallback(async (data: Partial<ScheduleEventRow>) => {
    const tempId = `evt-${Date.now()}`;
    const tempRow = { id: tempId, ...data } as ScheduleEventRow;
    setEvents((prev) => [tempRow, ...prev]);
    const dbRow = await createScheduleEvent(data as ScheduleEventInput);
    if (dbRow) {
      setEvents((prev) => prev.map((e) => e.id === tempId ? dbRow as ScheduleEventRow : e));
    }
    return (dbRow as ScheduleEventRow) ?? tempRow;
  }, []);

  const editEvent = useCallback(async (id: string, data: Partial<ScheduleEventRow>) => {
    const prev = events;
    setEvents((p) => p.map((e) => e.id === id ? { ...e, ...data } : e));
    try { await updateScheduleEvent(id, data as ScheduleEventInput); } catch (e) { setEvents(prev); console.warn('[useScheduleEvents] editEvent DB failed, rolled back', e); }
  }, [events]);

  const removeEvent = useCallback(async (id: string) => {
    const prev = events;
    setEvents((p) => p.filter((e) => e.id !== id));
    try { await deleteScheduleEvent(id); } catch (e) { setEvents(prev); console.warn('[useScheduleEvents] removeEvent DB failed, rolled back', e); }
  }, [events]);

  return { events, setEvents, loading, addEvent, editEvent, removeEvent };
}
