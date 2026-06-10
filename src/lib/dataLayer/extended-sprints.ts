import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  SprintRow, TemplateRow, BookmarkRow,
  CommentRow, TagRow, CategoryRow, FeatureFlagRow, SavedViewRow,
} from '@/lib/dataLayerMockData';
import {
  localSprints, localTemplates, localBookmarks,
  localComments, localTags, localCategories, localFeatureFlags, localSavedViews,
} from '@/lib/dataLayerMockData';
import { filterColumns } from './columns';

// ======== Sprints ========

export async function fetchSprints(): Promise<SprintRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localSprints();
  const { data, error } = await supabase.from('sprints').select('*').order('start_date', { ascending: false });
  if (error || !data?.length) return localSprints();
  return data as SprintRow[];
}

export async function createSprint(data: Omit<SprintRow, 'id' | 'created_at' | 'updated_at'>): Promise<SprintRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `sp_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as SprintRow;
  const filtered = filterColumns('sprints', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('sprints').insert(filtered).select().single();
  if (error) throw new Error(`createSprint: ${error.message}`);
  return result as SprintRow;
}

export async function updateSprint(id: string, data: Partial<Omit<SprintRow, 'id' | 'created_at'>>): Promise<SprintRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, updated_at: new Date().toISOString(), ...data } as SprintRow;
  const filtered = filterColumns('sprints', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('sprints').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateSprint: ${error.message}`);
  return result as SprintRow;
}

export async function deleteSprint(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('sprints').delete().eq('id', id);
  if (error) throw new Error(`deleteSprint: ${error.message}`);
}

// ======== Templates ========

export async function fetchTemplates(): Promise<TemplateRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localTemplates();
  const { data, error } = await supabase.from('templates').select('*').order('usage_count', { ascending: false });
  if (error || !data?.length) return localTemplates();
  return data as TemplateRow[];
}

export async function createTemplate(data: Omit<TemplateRow, 'id' | 'created_at' | 'updated_at'>): Promise<TemplateRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `tpl_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as TemplateRow;
  const filtered = filterColumns('templates', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('templates').insert(filtered).select().single();
  if (error) throw new Error(`createTemplate: ${error.message}`);
  return result as TemplateRow;
}

export async function updateTemplate(id: string, data: Partial<Omit<TemplateRow, 'id' | 'created_at'>>): Promise<TemplateRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, updated_at: new Date().toISOString(), ...data } as TemplateRow;
  const filtered = filterColumns('templates', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('templates').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateTemplate: ${error.message}`);
  return result as TemplateRow;
}

export async function deleteTemplate(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) throw new Error(`deleteTemplate: ${error.message}`);
}

// ======== Bookmarks ========

export async function fetchBookmarks(): Promise<BookmarkRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localBookmarks();
  const { data, error } = await supabase.from('bookmarks').select('*').order('created_at', { ascending: false });
  if (error || !data?.length) return localBookmarks();
  return data as BookmarkRow[];
}

export async function createBookmark(data: Omit<BookmarkRow, 'id' | 'created_at'>): Promise<BookmarkRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `bk_local_${Date.now()}`, created_at: new Date().toISOString(), ...data } as BookmarkRow;
  const filtered = filterColumns('bookmarks', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('bookmarks').insert(filtered).select().single();
  if (error) throw new Error(`createBookmark: ${error.message}`);
  return result as BookmarkRow;
}

export async function deleteBookmark(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('bookmarks').delete().eq('id', id);
  if (error) throw new Error(`deleteBookmark: ${error.message}`);
}

// ======== Comments ========

export async function fetchComments(targetType?: string, targetId?: string): Promise<CommentRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localComments(targetType, targetId);
  let query = supabase.from('comments').select('*').order('created_at', { ascending: true });
  if (targetType) query = query.eq('target_type', targetType);
  if (targetId) query = query.eq('target_id', targetId);
  const { data, error } = await query;
  if (error || !data?.length) return localComments(targetType, targetId);
  return data as CommentRow[];
}

export async function createComment(data: Omit<CommentRow, 'id' | 'created_at' | 'updated_at'>): Promise<CommentRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `cmt_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as CommentRow;
  const filtered = filterColumns('comments', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('comments').insert(filtered).select().single();
  if (error) throw new Error(`createComment: ${error.message}`);
  return result as CommentRow;
}

export async function deleteComment(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw new Error(`deleteComment: ${error.message}`);
}

// ======== Tags ========

export async function fetchTags(): Promise<TagRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localTags();
  const { data, error } = await supabase.from('tags').select('*').order('name');
  if (error || !data?.length) return localTags();
  return data as TagRow[];
}

export async function createTag(data: Omit<TagRow, 'id' | 'created_at' | 'updated_at'>): Promise<TagRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `tag_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as TagRow;
  const filtered = filterColumns('tags', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('tags').insert(filtered).select().single();
  if (error) throw new Error(`createTag: ${error.message}`);
  return result as TagRow;
}

export async function deleteTag(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw new Error(`deleteTag: ${error.message}`);
}

// ======== Categories ========

export async function fetchCategories(): Promise<CategoryRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localCategories();
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error || !data?.length) return localCategories();
  return data as CategoryRow[];
}

export async function createCategory(data: Omit<CategoryRow, 'id' | 'created_at' | 'updated_at'>): Promise<CategoryRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `cat_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as CategoryRow;
  const filtered = filterColumns('categories', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('categories').insert(filtered).select().single();
  if (error) throw new Error(`createCategory: ${error.message}`);
  return result as CategoryRow;
}

export async function deleteCategory(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(`deleteCategory: ${error.message}`);
}

// ======== Feature Flags ========

export async function fetchFeatureFlags(): Promise<FeatureFlagRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localFeatureFlags();
  const { data, error } = await supabase.from('feature_flags').select('*').order('name');
  if (error || !data?.length) return localFeatureFlags();
  return data as FeatureFlagRow[];
}

export async function updateFeatureFlag(id: string, updates: Partial<FeatureFlagRow>): Promise<FeatureFlagRow> {
  if (!isSupabaseConfigured() || !supabase) return { id, ...updates, updated_at: new Date().toISOString() } as FeatureFlagRow;
  const filtered = filterColumns('feature_flags', updates as Record<string, unknown>);
  const { data, error } = await supabase.from('feature_flags').update(filtered).eq('id', id).select().single();
  if (error) throw new Error(`updateFeatureFlag: ${error.message}`);
  return data as FeatureFlagRow;
}

export async function createFeatureFlag(data: Omit<FeatureFlagRow, 'id' | 'created_at' | 'updated_at'>): Promise<FeatureFlagRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `ff_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as FeatureFlagRow;
  const filtered = filterColumns('feature_flags', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('feature_flags').insert(filtered).select().single();
  if (error) throw new Error(`createFeatureFlag: ${error.message}`);
  return result as FeatureFlagRow;
}

// ======== Saved Views ========

export async function fetchSavedViews(): Promise<SavedViewRow[]> {
  if (!isSupabaseConfigured() || !supabase) return localSavedViews();
  const { data, error } = await supabase.from('saved_views').select('*').order('name');
  if (error || !data?.length) return localSavedViews();
  return data as SavedViewRow[];
}

export async function createSavedView(data: Omit<SavedViewRow, 'id' | 'created_at' | 'updated_at'>): Promise<SavedViewRow> {
  if (!isSupabaseConfigured() || !supabase) return { id: `sv_local_${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...data } as SavedViewRow;
  const filtered = filterColumns('saved_views', data as Record<string, unknown>);
  const { data: result, error } = await supabase.from('saved_views').insert(filtered).select().single();
  if (error) throw new Error(`createSavedView: ${error.message}`);
  return result as SavedViewRow;
}

export async function deleteSavedView(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('saved_views').delete().eq('id', id);
  if (error) throw new Error(`deleteSavedView: ${error.message}`);
}
