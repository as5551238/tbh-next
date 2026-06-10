import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { getMatrixCell, getDepartments, IND_COLORS, INDUSTRIES } from '@/matrix/data';
import { fetchMatrixCell, fetchDepartments, fetchIndustries } from '@/lib/dataLayer';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { MatrixCell } from '@/matrix/data';

export function useMatrixCell(): { cell: MatrixCell; loading: boolean; refetch: () => void; isDemoData: boolean } {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);

  const [cell, setCell] = useState<MatrixCell>(() => getMatrixCell(industry, dept));
  const [loading, setLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMatrixCell(industry, dept).then((data) => {
      if (!cancelled) { setCell(data); setLoading(false); }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [industry, dept, fetchKey]);

  const isDemoData = !isSupabaseConfigured();

  return { cell, loading, refetch, isDemoData };
}

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

export function useAsyncDepartments() {
  const industry = useAppStore((s) => s.industry);
  const [departments, setDepartments] = useState<string[]>(() => getDepartments(industry));

  useEffect(() => {
    fetchDepartments(industry).then(setDepartments);
  }, [industry]);

  return departments;
}

export function useAsyncIndustries() {
  const [industries, setIndustries] = useState<string[]>(INDUSTRIES);

  useEffect(() => {
    fetchIndustries().then(setIndustries);
  }, []);

  return industries;
}

export function useIndustryColor(): string {
  const industry = useAppStore((s) => s.industry);
  return IND_COLORS[industry] ?? 'var(--brand-accent)';
}

export function useDepartments(): string[] {
  const industry = useAppStore((s) => s.industry);
  return getDepartments(industry);
}

export function useIndustries(): string[] {
  return INDUSTRIES;
}
