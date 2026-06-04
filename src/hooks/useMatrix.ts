import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { getMatrixCell, getDepartments, IND_COLORS, INDUSTRIES } from '@/matrix/data';
import {
  fetchMatrixCell, fetchDepartments, fetchIndustries,
  fetchGoals, fetchTasks, fetchProjects, fetchMembers, fetchKnowledgeDocs,
  type GoalRow, type TaskRow, type ProjectRow, type MemberRow, type KnowledgeDocRow,
} from '@/lib/dataLayer';
import type { MatrixCell } from '@/matrix/data';

/** Sync hook — uses local MATRIX data (instant, no network) */
export function useMatrixCell(): MatrixCell {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  return getMatrixCell(industry, dept);
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

// --- Entity Hooks (Supabase only, return [] if not configured) ---

export function useGoals() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchGoals().then((d) => { setGoals(d); setLoading(false); }); }, []);
  return { goals, loading };
}

export function useTasks() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchTasks().then((d) => { setTasks(d); setLoading(false); }); }, []);
  return { tasks, loading };
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchProjects().then((d) => { setProjects(d); setLoading(false); }); }, []);
  return { projects, loading };
}

export function useMembers() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchMembers().then((d) => { setMembers(d); setLoading(false); }); }, []);
  return { members, loading };
}

export function useKnowledgeDocs() {
  const [docs, setDocs] = useState<KnowledgeDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchKnowledgeDocs().then((d) => { setDocs(d); setLoading(false); }); }, []);
  return { docs, loading };
}
