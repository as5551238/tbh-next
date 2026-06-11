import { useState, useEffect, useCallback } from 'react';
import {
  fetchGoals, fetchTasks, fetchProjects, fetchKnowledgeDocs,
  fetchScheduleEvents, fetchDocs, fetchExperiences, fetchPredictions,
  fetchInsights, fetchWorkflowInstances, fetchNotes, fetchSprints,
  fetchTemplates, fetchBookmarks,
  createGoal, updateGoal, deleteGoal,
  createTask, updateTask, deleteTask,
  createProject, updateProject, deleteProject,
  createKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc,
  createDoc, updateDoc, deleteDoc,
  createScheduleEvent, updateScheduleEvent, deleteScheduleEvent,
  createPrediction, updatePrediction, deletePrediction,
  createExperience, updateExperience, deleteExperience,
  createInsight, updateInsight, deleteInsight,
  createWorkflowInstance, updateWorkflowInstance, deleteWorkflowInstance,
  createNote, updateNote, deleteNote,
  createSprint, updateSprint, deleteSprint,
  createTemplate, updateTemplate, deleteTemplate,
  createBookmark, deleteBookmark,
  type InsightRow, type WorkflowInstanceRow,
  type NoteRow, type SprintRow, type TemplateRow, type BookmarkRow,
  type GoalRow, type TaskRow, type ProjectRow, type KnowledgeDocRow,
  type ScheduleEventRow, type DocRow, type ExperienceRow, type PredictionRow,
} from '@/lib/dataLayer';
import type { InsightInput, WorkflowInstanceInput, ScheduleEventInput, DocInput, ExperienceInput, PredictionInput } from '@/contracts/dataContracts';
import { cacheGet, cacheSet, cacheDelete } from '@/lib/perfCache';

export function useGoals() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Try perfCache first (P2-2: integrate into data pipeline)
    const cached = cacheGet<GoalRow[]>('goals');
    if (cached) {
      setGoals(cached);
      setLoading(false);
    }
    fetchGoals().then((d) => { setGoals(d); setLoading(false); cacheSet('goals', d); })
      .catch(() => setLoading(false));
  }, []);

  const addGoal = useCallback(async (data: Omit<GoalRow, 'id'>) => {
    const row = await createGoal(data);
    setGoals((prev) => [row, ...prev]);
    cacheDelete('goals');
    return row;
  }, []);

  const editGoal = useCallback(async (id: string, data: Partial<Omit<GoalRow, 'id'>>) => {
    const row = await updateGoal(id, data);
    setGoals((prev) => prev.map((g) => g.id === id ? row : g));
    cacheDelete('goals');
    return row;
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
    cacheDelete('goals');
  }, []);

  return { goals, setGoals, loading, addGoal, editGoal, removeGoal };
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Try perfCache first (P2-2: integrate into data pipeline)
    const cached = cacheGet<TaskRow[]>('tasks');
    if (cached) {
      setTasks(cached);
      setLoading(false);
    }
    fetchTasks().then((d) => { setTasks(d); setLoading(false); cacheSet('tasks', d); })
      .catch(() => setLoading(false));
  }, []);

  const addTask = useCallback(async (data: Omit<TaskRow, 'id'>) => {
    const row = await createTask(data);
    setTasks((prev) => [row, ...prev]);
    cacheDelete('tasks');
    return row;
  }, []);

  const editTask = useCallback(async (id: string, data: Partial<Omit<TaskRow, 'id'>>) => {
    const row = await updateTask(id, data);
    setTasks((prev) => prev.map((t) => t.id === id ? row : t));
    cacheDelete('tasks');
    return row;
  }, []);

  const removeTask = useCallback(async (id: string) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    cacheDelete('tasks');
  }, []);

  return { tasks, setTasks, loading, addTask, editTask, removeTask };
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchProjects().then((d) => { setProjects(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addProject = useCallback(async (data: Omit<ProjectRow, 'id'>) => {
    const row = await createProject(data);
    setProjects((prev) => [row, ...prev]);
    return row;
  }, []);

  const editProject = useCallback(async (id: string, data: Partial<Omit<ProjectRow, 'id'>>) => {
    const row = await updateProject(id, data);
    setProjects((prev) => prev.map((p) => p.id === id ? row : p));
    return row;
  }, []);

  const removeProject = useCallback(async (id: string) => {
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { projects, setProjects, loading, addProject, editProject, removeProject };
}

export function useKnowledgeDocs() {
  const [docs, setDocs] = useState<KnowledgeDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchKnowledgeDocs().then((d) => { setDocs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addDoc = useCallback(async (data: Omit<KnowledgeDocRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createKnowledgeDoc(data);
    setDocs((prev) => [row, ...prev]);
    return row;
  }, []);

  const editDoc = useCallback(async (id: string, data: Partial<Omit<KnowledgeDocRow, 'id' | 'created_at' | 'updated_at'>>) => {
    const row = await updateKnowledgeDoc(id, data);
    setDocs((prev) => prev.map((d) => d.id === id ? row : d));
    return row;
  }, []);

  const removeDoc = useCallback(async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    try { await deleteDoc(id); } catch { /* optimistic */ }
  }, []);

  return { docs, setDocs, loading, addDoc, editDoc, removeDoc };
}

export function useInsights() {
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights().then((rows) => { setInsights(rows || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const addInsight = useCallback(async (data: InsightInput) => {
    const row = await createInsight(data);
    setInsights((prev) => [row, ...prev]);
    return row;
  }, []);

  const editInsight = useCallback(async (id: string, data: InsightInput) => {
    setInsights((prev) => prev.map((i) => i.id === id ? { ...i, ...data } : i));
    try { await updateInsight(id, data); } catch { /* optimistic */ }
  }, []);

  const removeInsight = useCallback(async (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    try { await deleteInsight(id); } catch { /* optimistic */ }
  }, []);

  return { insights, setInsights, loading, addInsight, editInsight, removeInsight };
}

export function useWorkflowInstances() {
  const [instances, setInstances] = useState<WorkflowInstanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflowInstances().then((rows) => { setInstances(rows || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const addInstance = useCallback(async (data: WorkflowInstanceInput) => {
    const row = await createWorkflowInstance(data);
    setInstances((prev) => [...prev, row]);
    return row;
  }, []);

  const editInstance = useCallback(async (id: string, data: WorkflowInstanceInput) => {
    setInstances((prev) => prev.map((w) => w.id === id ? { ...w, ...data } as WorkflowInstanceRow : w));
    try { await updateWorkflowInstance(id, data); } catch { /* optimistic */ }
  }, []);

  const removeInstance = useCallback(async (id: string) => {
    setInstances((prev) => prev.filter((w) => w.id !== id));
    try { await deleteWorkflowInstance(id); } catch { /* optimistic */ }
  }, []);

  return { instances, setInstances, loading, addInstance, editInstance, removeInstance };
}

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
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, ...data } : e));
    try { await updateScheduleEvent(id, data as ScheduleEventInput); } catch { /* optimistic */ }
  }, []);

  const removeEvent = useCallback(async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try { await deleteScheduleEvent(id); } catch { /* optimistic */ }
  }, []);

  return { events, setEvents, loading, addEvent, editEvent, removeEvent };
}

export function useDocs() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchDocs().then((d) => { setDocs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addDoc = useCallback(async (data: Partial<DocRow>) => {
    const tempId = `wsdoc-${Date.now()}`;
    const tempRow = { id: tempId, ...data } as DocRow;
    setDocs((prev) => [tempRow, ...prev]);
    const dbRow = await createDoc(data as DocInput);
    if (dbRow) {
      setDocs((prev) => prev.map((d) => d.id === tempId ? dbRow as DocRow : d));
    }
    return (dbRow as DocRow) ?? tempRow;
  }, []);

  const editDoc = useCallback(async (id: string, data: Partial<DocRow>) => {
    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, ...data } : d));
    try { await updateDoc(id, data as DocInput); } catch { /* optimistic */ }
  }, []);

  const removeDoc = useCallback(async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    try { await deleteDoc(id); } catch { /* optimistic */ }
  }, []);

  return { docs, setDocs, loading, addDoc, editDoc, removeDoc };
}

export function useExperiences() {
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchExperiences().then((d) => { setExperiences(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addExperience = useCallback(async (data: Partial<ExperienceRow>) => {
    const row = await createExperience(data as ExperienceInput);
    setExperiences((prev) => [row, ...prev]);
    return row;
  }, []);

  const editExperience = useCallback(async (id: string, data: Partial<ExperienceRow>) => {
    const row = await updateExperience(id, data as ExperienceInput);
    setExperiences((prev) => prev.map((e) => e.id === id ? row : e));
    return row;
  }, []);

  const removeExperience = useCallback(async (id: string) => {
    await deleteExperience(id);
    setExperiences((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { experiences, setExperiences, loading, addExperience, editExperience, removeExperience };
}

export function usePredictions() {
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchPredictions().then((d) => { setPredictions(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addPrediction = useCallback(async (data: Partial<PredictionRow>) => {
    const row = await createPrediction(data as PredictionInput);
    setPredictions((prev) => [row, ...prev]);
    return row;
  }, []);

  const editPrediction = useCallback(async (id: string, data: Partial<PredictionRow>) => {
    const row = await updatePrediction(id, data as PredictionInput);
    setPredictions((prev) => prev.map((p) => p.id === id ? row : p));
    return row;
  }, []);

  const removePrediction = useCallback(async (id: string) => {
    await deletePrediction(id);
    setPredictions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { predictions, setPredictions, loading, addPrediction, editPrediction, removePrediction };
}

export function useNotes() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchNotes().then((d) => { setNotes(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addNote = useCallback(async (data: Omit<NoteRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createNote(data);
    setNotes((prev) => [row, ...prev]);
    return row;
  }, []);
  const editNote = useCallback(async (id: string, data: Partial<Omit<NoteRow, 'id' | 'created_at'>>) => {
    const row = await updateNote(id, data);
    setNotes((prev) => prev.map((n) => n.id === id ? row : n));
    return row;
  }, []);
  const removeNote = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try { await deleteNote(id); } catch { /* optimistic */ }
  }, []);
  return { notes, setNotes, loading, addNote, editNote, removeNote };
}

export function useSprints() {
  const [sprints, setSprints] = useState<SprintRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchSprints().then((d) => { setSprints(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addSprint = useCallback(async (data: Omit<SprintRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createSprint(data);
    setSprints((prev) => [row, ...prev]);
    return row;
  }, []);
  const editSprint = useCallback(async (id: string, data: Partial<Omit<SprintRow, 'id' | 'created_at'>>) => {
    const row = await updateSprint(id, data);
    setSprints((prev) => prev.map((s) => s.id === id ? row : s));
    return row;
  }, []);
  const removeSprint = useCallback(async (id: string) => {
    setSprints((prev) => prev.filter((s) => s.id !== id));
    try { await deleteSprint(id); } catch { /* optimistic */ }
  }, []);
  return { sprints, setSprints, loading, addSprint, editSprint, removeSprint };
}

export function useTemplates() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTemplates().then((d) => { setTemplates(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addTemplate = useCallback(async (data: Omit<TemplateRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createTemplate(data);
    setTemplates((prev) => [row, ...prev]);
    return row;
  }, []);
  const editTemplate = useCallback(async (id: string, data: Partial<Omit<TemplateRow, 'id' | 'created_at'>>) => {
    const row = await updateTemplate(id, data);
    setTemplates((prev) => prev.map((t) => t.id === id ? row : t));
    return row;
  }, []);
  const removeTemplate = useCallback(async (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    try { await deleteTemplate(id); } catch { /* optimistic */ }
  }, []);
  return { templates, setTemplates, loading, addTemplate, editTemplate, removeTemplate };
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchBookmarks().then((d) => { setBookmarks(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addBookmark = useCallback(async (data: Omit<BookmarkRow, 'id' | 'created_at'>) => {
    const row = await createBookmark(data);
    setBookmarks((prev) => [row, ...prev]);
    return row;
  }, []);
  const removeBookmark = useCallback(async (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    try { await deleteBookmark(id); } catch { /* optimistic */ }
  }, []);
  return { bookmarks, setBookmarks, loading, addBookmark, removeBookmark };
}
