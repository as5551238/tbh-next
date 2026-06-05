import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { getMatrixCell, getDepartments, IND_COLORS, INDUSTRIES, MATRIX } from '@/matrix/data';
import {
  fetchMatrixCell, fetchDepartments, fetchIndustries,
  fetchGoals, fetchTasks, fetchProjects, fetchMembers, fetchKnowledgeDocs,
  fetchNotifications, fetchReports, fetchApprovals, fetchAnnouncements,
  fetchMeetings, fetchCollabDocs, fetchSharedFiles, fetchContacts,
  fetchAgentDetails, fetchAgentConfigs, fetchRisks, fetchWorkflows,
  fetchScheduleEvents, fetchOrgInfo, fetchRoles, fetchPredictions,
  fetchExperiences, fetchDocs,
  createGoal, updateGoal, deleteGoal,
  createTask, updateTask, deleteTask,
  createProject, updateProject, deleteProject,
  createMember, updateMember, deleteMember,
  createKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc,
  type GoalRow, type TaskRow, type ProjectRow, type MemberRow, type KnowledgeDocRow,
  type NotificationRow, type ReportRow, type ApprovalRow, type AnnouncementRow,
  type MeetingRow, type CollabDocRow, type SharedFileRow, type ContactRow,
  type AgentDetailRow, type AgentConfigRow, type RiskRow, type WorkflowRow,
  type ScheduleEventRow, type OrgInfoRow, type RoleRow, type PredictionRow,
  type ExperienceRow, type DocRow,
} from '@/lib/dataLayer';
import type { MatrixCell } from '@/matrix/data';

/**
 * Primary hook — Supabase first, local MATRIX fallback.
 * Returns { cell, loading } so consumers can show skeletons while fetching.
 * The initial render uses local data for instant UX, then upgrades to DB data.
 */
export function useMatrixCell(): { cell: MatrixCell; loading: boolean } {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);

  const [cell, setCell] = useState<MatrixCell>(() => getMatrixCell(industry, dept));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMatrixCell(industry, dept).then((data) => {
      if (!cancelled) { setCell(data); setLoading(false); }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [industry, dept]);

  return { cell, loading };
}

/** Async hook — Supabase first, falls back to local data */
export function useAsyncMatrixCell() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);

  const [cell, setCell] = useState<MatrixCell>(() => getMatrixCell(industry, dept));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMatrixCell(industry, dept).then((data) => {
      if (!cancelled) { setCell(data); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [industry, dept]);

  return { cell, loading };
}

/** Async departments — Supabase first, local fallback */
export function useAsyncDepartments() {
  const industry = useAppStore((s) => s.industry);
  const [departments, setDepartments] = useState<string[]>(() => getDepartments(industry));

  useEffect(() => {
    fetchDepartments(industry).then(setDepartments);
  }, [industry]);

  return departments;
}

/** Async industries — Supabase first, local fallback */
export function useAsyncIndustries() {
  const [industries, setIndustries] = useState<string[]>(INDUSTRIES);

  useEffect(() => {
    fetchIndustries().then(setIndustries);
  }, []);

  return industries;
}

export function useIndustryColor(): string {
  const industry = useAppStore((s) => s.industry);
  return IND_COLORS[industry] ?? '#7b6cf0';
}

export function useDepartments(): string[] {
  const industry = useAppStore((s) => s.industry);
  return getDepartments(industry);
}

export function useIndustries(): string[] {
  return INDUSTRIES;
}

// --- Entity Hooks (Supabase first, local mock fallback) ---
// These now support the matrix cell's local mock data as fallback,
// so pages work even without Supabase configured.

export function useGoals() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchGoals().then((d) => { setGoals(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addGoal = useCallback(async (data: Omit<GoalRow, 'id'>) => {
    const row = await createGoal(data);
    setGoals((prev) => [row, ...prev]);
    return row;
  }, []);

  const editGoal = useCallback(async (id: string, data: Partial<Omit<GoalRow, 'id'>>) => {
    const row = await updateGoal(id, data);
    setGoals((prev) => prev.map((g) => g.id === id ? row : g));
    return row;
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return { goals, setGoals, loading, addGoal, editGoal, removeGoal };
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTasks().then((d) => { setTasks(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addTask = useCallback(async (data: Omit<TaskRow, 'id'>) => {
    const row = await createTask(data);
    setTasks((prev) => [row, ...prev]);
    return row;
  }, []);

  const editTask = useCallback(async (id: string, data: Partial<Omit<TaskRow, 'id'>>) => {
    const row = await updateTask(id, data);
    setTasks((prev) => prev.map((t) => t.id === id ? row : t));
    return row;
  }, []);

  const removeTask = useCallback(async (id: string) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
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

export function useMembers() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchMembers().then((d) => { setMembers(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addMember = useCallback(async (data: Omit<MemberRow, 'id'>) => {
    const row = await createMember(data);
    setMembers((prev) => [row, ...prev]);
    return row;
  }, []);

  const editMember = useCallback(async (id: string, data: Partial<Omit<MemberRow, 'id'>>) => {
    const row = await updateMember(id, data);
    setMembers((prev) => prev.map((m) => m.id === id ? row : m));
    return row;
  }, []);

  const removeMember = useCallback(async (id: string) => {
    await deleteMember(id);
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { members, setMembers, loading, addMember, editMember, removeMember };
}

export function useKnowledgeDocs() {
  const [docs, setDocs] = useState<KnowledgeDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchKnowledgeDocs().then((d) => { setDocs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addDoc = useCallback(async (data: Omit<KnowledgeDocRow, 'id'>) => {
    const row = await createKnowledgeDoc(data);
    setDocs((prev) => [row, ...prev]);
    return row;
  }, []);

  const editDoc = useCallback(async (id: string, data: Partial<Omit<KnowledgeDocRow, 'id'>>) => {
    const row = await updateKnowledgeDoc(id, data);
    setDocs((prev) => prev.map((d) => d.id === id ? row : d));
    return row;
  }, []);

  const removeDoc = useCallback(async (id: string) => {
    await deleteKnowledgeDoc(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { docs, setDocs, loading, addDoc, editDoc, removeDoc };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchNotifications().then((d) => { setNotifications(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { notifications, setNotifications, loading };
}

export function useReports() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchReports().then((d) => { setReports(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { reports, loading };
}

export function useApprovals() {
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchApprovals().then((d) => { setApprovals(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { approvals, setApprovals, loading };
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAnnouncements().then((d) => { setAnnouncements(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { announcements, loading };
}

export function useMeetings() {
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchMeetings().then((d) => { setMeetings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { meetings, loading };
}

export function useCollabDocs() {
  const [docs, setDocs] = useState<CollabDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchCollabDocs().then((d) => { setDocs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { docs, loading };
}

export function useSharedFiles() {
  const [files, setFiles] = useState<SharedFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchSharedFiles().then((d) => { setFiles(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { files, loading };
}

export function useContacts() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchContacts().then((d) => { setContacts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { contacts, loading };
}

export function useAgentDetails() {
  const [agents, setAgents] = useState<AgentDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAgentDetails().then((d) => { setAgents(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { agents, setAgents, loading };
}

export function useAgentConfigs() {
  const [configs, setConfigs] = useState<AgentConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAgentConfigs().then((d) => { setConfigs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { configs, setConfigs, loading };
}

export function useRisks() {
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchRisks().then((d) => { setRisks(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { risks, loading };
}

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchWorkflows().then((d) => { setWorkflows(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { workflows, loading };
}

export function useScheduleEvents() {
  const [events, setEvents] = useState<ScheduleEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchScheduleEvents().then((d) => { setEvents(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { events, loading };
}

export function useOrgInfo() {
  const [orgInfo, setOrgInfo] = useState<OrgInfoRow | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchOrgInfo().then((d) => { setOrgInfo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { orgInfo, loading };
}

export function useRoles() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchRoles().then((d) => { setRoles(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { roles, loading };
}

export function usePredictions() {
  const [predictions, setPredictions] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchPredictions().then((d) => { setPredictions(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { predictions, loading };
}

export function useExperiences() {
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchExperiences().then((d) => { setExperiences(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { experiences, loading };
}

export function useDocs() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchDocs().then((d) => { setDocs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { docs, loading };
}
