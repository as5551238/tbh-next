import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MatrixCell } from '@/matrix/data';
import { MATRIX, getMatrixCell } from '@/matrix/data';

/**
 * Data layer abstraction.
 * When Supabase is configured, reads from DB;
 * otherwise falls back to local MATRIX mock data.
 */

export async function fetchMatrixCell(industry: string, dept: string): Promise<MatrixCell> {
  if (!isSupabaseConfigured() || !supabase) {
    return getMatrixCell(industry, dept);
  }

  const { data, error } = await supabase
    .from('matrix_cells')
    .select('*')
    .eq('industry', industry)
    .eq('dept', dept)
    .single();

  if (error || !data) {
    // Fallback to local data
    return getMatrixCell(industry, dept);
  }

  return data as MatrixCell;
}

export async function fetchIndustries(): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return Object.keys(MATRIX);
  }

  const { data, error } = await supabase
    .from('industries')
    .select('name')
    .order('sort_order');

  if (error || !data?.length) {
    return Object.keys(MATRIX);
  }

  return data.map((d: { name: string }) => d.name);
}

export async function fetchDepartments(industry: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return Object.keys(MATRIX[industry] ?? {});
  }

  const { data, error } = await supabase
    .from('departments')
    .select('name')
    .eq('industry', industry)
    .order('sort_order');

  if (error || !data?.length) {
    return Object.keys(MATRIX[industry] ?? {});
  }

  return data.map((d: { name: string }) => d.name);
}
