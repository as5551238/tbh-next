import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MatrixCell } from '@/matrix/data';
import { MATRIX, getMatrixCell } from '@/matrix/data';

/**
 * Data layer abstraction.
 * When Supabase is configured, reads from DB;
 * otherwise falls back to local MATRIX mock data.
 */

// --- Matrix Core ---

export async function fetchMatrixCell(industry: string, dept: string): Promise<MatrixCell> {
  if (!isSupabaseConfigured() || !supabase) {
    return getMatrixCell(industry, dept);
  }

  // Fetch cell + related data in parallel
  const [cellRes, kpiRes, agentRes, channelRes] = await Promise.all([
    supabase.from('matrix_cells').select('*').eq('industry', industry).eq('dept', dept).single(),
    supabase.from('kpis').select('*').eq('industry', industry).eq('dept', dept).order('sort_order'),
    supabase.from('agents').select('*').eq('industry', industry).eq('dept', dept).order('sort_order'),
    supabase.from('channels').select('*').eq('industry', industry).eq('dept', dept).order('sort_order'),
  ]);

  if (cellRes.error || !cellRes.data) {
    return getMatrixCell(industry, dept);
  }

  const cell = cellRes.data;
  return {
    kpis: kpiRes.data?.map((k: { name: string; value: string; target: string; status: string; trend: string }) => ({
      name: k.name, value: k.value, target: k.target,
      status: k.status as MatrixCell['kpis'][0]['status'],
      trend: k.trend as MatrixCell['kpis'][0]['trend'],
    })) ?? getMatrixCell(industry, dept).kpis,
    workflow: cell.workflow ?? [],
    wfCurrent: cell.wf_current ?? 0,
    top3: cell.top3 ?? [],
    morning: cell.morning ?? '',
    agents: agentRes.data?.map((a: { name: string; description: string; status: string }) => ({
      name: a.name, desc: a.description, status: a.status,
    })) ?? [],
    channels: channelRes.data?.map((c: { name: string }) => c.name) ?? [],
    ribbon: cell.ribbon ?? '',
    nextStep: cell.next_step ?? '',
  } as MatrixCell;
}

export async function fetchIndustries(): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return Object.keys(MATRIX);
  }
  const { data, error } = await supabase.from('industries').select('name, color').order('sort_order');
  if (error || !data?.length) return Object.keys(MATRIX);
  return data.map((d: { name: string }) => d.name);
}

export async function fetchDepartments(industry: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return Object.keys(MATRIX[industry] ?? {});
  }
  const { data, error } = await supabase.from('departments').select('name').eq('industry', industry).order('sort_order');
  if (error || !data?.length) return Object.keys(MATRIX[industry] ?? {});
  return data.map((d: { name: string }) => d.name);
}

// --- Goals ---

export interface GoalRow {
  id: string;
  title: string;
  progress: number;
  status: string;
  key_results: string[];
  owner: string;
  due_date: string | null;
}

export async function fetchGoals(): Promise<GoalRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
  return (data as GoalRow[]) ?? [];
}

// --- Tasks ---

export interface TaskRow {
  id: string;
  title: string;
  priority: string;
  assignee: string;
  due: string;
  done: boolean;
  goal_id: string | null;
}

export async function fetchTasks(): Promise<TaskRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  return (data as TaskRow[]) ?? [];
}

// --- Projects ---

export interface ProjectRow {
  id: string;
  name: string;
  status: string;
  progress: number;
  members: number;
  deadline: string;
}

export async function fetchProjects(): Promise<ProjectRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  return (data as ProjectRow[]) ?? [];
}

// --- Members ---

export interface MemberRow {
  id: string;
  name: string;
  role: string;
  dept: string;
  email: string;
  phone: string;
  status: string;
}

export async function fetchMembers(): Promise<MemberRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false });
  return (data as MemberRow[]) ?? [];
}

// --- Knowledge Docs ---

export interface KnowledgeDocRow {
  id: string;
  title: string;
  type: string;
  author: string;
  updated: string;
}

export async function fetchKnowledgeDocs(): Promise<KnowledgeDocRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data } = await supabase.from('knowledge_docs').select('*').order('created_at', { ascending: false });
  return (data as KnowledgeDocRow[]) ?? [];
}
