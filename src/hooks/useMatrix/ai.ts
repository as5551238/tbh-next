import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import {
  fetchAgentDetails, fetchAgentConfigs, fetchRisks, fetchWorkflows,
  fetchActionItems, fetchDeviationAlerts,
  fetchTags, fetchCategories, fetchFeatureFlags,
  fetchSavedViews, fetchAutomationRules, fetchStatusFlowRules,
  fetchItemLinks,
  updateAgentDetail, createAgentDetail, deleteAgentDetail,
  saveAgentConfig,
  createRisk, updateRisk, deleteRisk,
  createActionItem, updateActionItem, deleteActionItem,
  updateFeatureFlag,
  createSavedView, deleteSavedView,
  createAutomationRule, updateAutomationRule, deleteAutomationRule,
  createStatusFlowRule, deleteStatusFlowRule,
  createItemLink, deleteItemLink,
  createTag, deleteTag,
  createCategory, deleteCategory,
  type TagRow, type CategoryRow, type FeatureFlagRow, type SavedViewRow,
  type AutomationRuleRow, type StatusFlowRuleRow, type ItemLinkRow,
  type AgentDetailRow, type AgentConfigRow, type RiskRow, type WorkflowRow,
} from '@/lib/dataLayer';
import type { ActionItemRow, DeviationAlertRow, TaskRow } from '@/lib/dataLayer/types';
import type { RiskInput } from '@/contracts/dataContracts';

export function useAgentDetails() {
  const [agents, setAgents] = useState<AgentDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAgentDetails().then((d) => { setAgents(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const editAgent = useCallback(async (id: string, data: Partial<AgentDetailRow>) => {
    setAgents((prev) => prev.map((a) => a.id === id ? { ...a, ...data } : a));
    try { await updateAgentDetail(id, data as Record<string, unknown>); } catch { /* optimistic */ }
  }, []);

  const addAgent = useCallback(async (data: Partial<AgentDetailRow>) => {
    try {
      const dbRow = await createAgentDetail(data as Parameters<typeof createAgentDetail>[0]);
      if (dbRow && dbRow.id) {
        setAgents((prev) => [dbRow, ...prev]);
        return dbRow;
      }
    } catch { /* fallback */ }
    const id = `agent-${Date.now()}`;
    const row = { id, ...data } as AgentDetailRow;
    setAgents((prev) => [row, ...prev]);
    return row;
  }, []);

  const removeAgent = useCallback(async (id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
    try { await deleteAgentDetail(id); } catch { /* optimistic */ }
  }, []);

  return { agents, setAgents, loading, editAgent, addAgent, removeAgent };
}

export function useAgentConfigs() {
  const [configs, setConfigs] = useState<AgentConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAgentConfigs().then((d) => { setConfigs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  const saveConfig = useCallback(async (config: AgentConfigRow) => {
    await saveAgentConfig(config);
    setConfigs((prev) => prev.map((c) => c.id === config.id ? config : c));
  }, []);
  return { configs, setConfigs, saveConfig, loading };
}

export function useRisks() {
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchRisks().then((d) => { setRisks(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addRisk = useCallback(async (data: Partial<RiskRow>) => {
    const row = await createRisk(data as RiskInput);
    setRisks((prev) => [row, ...prev]);
    return row;
  }, []);

  const editRisk = useCallback(async (id: string, data: Partial<RiskRow>) => {
    const row = await updateRisk(id, data as Record<string, unknown>);
    setRisks((prev) => prev.map((r) => r.id === id ? row : r));
    return row;
  }, []);

  const removeRisk = useCallback(async (id: string) => {
    await deleteRisk(id);
    setRisks((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { risks, setRisks, loading, addRisk, editRisk, removeRisk };
}

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchWorkflows().then((d) => { setWorkflows(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { workflows, setWorkflows, loading };
}

export function useActionItems(goalId?: string) {
  const [actionItems, setActionItems] = useState<ActionItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchActionItems(goalId).then((d) => { setActionItems(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [goalId]);

  const addActionItem = useCallback(async (data: Partial<ActionItemRow>) => {
    const row = await createActionItem(data as Parameters<typeof createActionItem>[0]);
    setActionItems((prev) => [row, ...prev]);
    return row;
  }, []);

  const editActionItem = useCallback(async (id: string, data: Partial<ActionItemRow>) => {
    const row = await updateActionItem(id, data as Parameters<typeof updateActionItem>[1]);
    setActionItems((prev) => prev.map((a) => a.id === id ? row : a));
    return row;
  }, []);

  const removeActionItem = useCallback(async (id: string) => {
    await deleteActionItem(id);
    setActionItems((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const convertToTask = useCallback(async (actionItem: ActionItemRow, taskData: Partial<TaskRow>) => {
    const { createTask: ct } = await import('@/lib/dataLayer');
    const task = await ct({
      title: actionItem.title,
      description: actionItem.description,
      goal_id: actionItem.goal_id,
      assignee_id: actionItem.assignee_id,
      priority: actionItem.priority,
      ...taskData,
    } as Parameters<typeof ct>[0]);
    await updateActionItem(actionItem.id, { status: 'completed', closed_loop: true } as Parameters<typeof updateActionItem>[1]);
    setActionItems((prev) => prev.map((a) => a.id === actionItem.id ? { ...a, status: 'completed', closed_loop: true } : a));
    return task;
  }, []);

  return { actionItems, setActionItems, loading, addActionItem, editActionItem, removeActionItem, convertToTask };
}

export function useDeviationAlerts(unreadOnly?: boolean) {
  const [alerts, setAlerts] = useState<DeviationAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchDeviationAlerts(unreadOnly).then((d) => { setAlerts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [unreadOnly]);

  const markRead = useCallback(async (id: string) => {
    await import('@/lib/dataLayer').then((m) => m.markAlertRead(id));
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
  }, []);

  const markResolved = useCallback(async (id: string) => {
    await import('@/lib/dataLayer').then((m) => m.markAlertResolved(id));
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() } : a));
  }, []);

  return { alerts, setAlerts, loading, markRead, markResolved };
}

export function useTags() {
  const teamId = useAppStore((s) => s.teamId);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTags().then((d) => { setTags(d); setLoading(false); }).catch(() => setLoading(false));
  }, [teamId]);
  const addTag = useCallback(async (data: Omit<TagRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createTag(data);
    setTags((prev) => [row, ...prev]);
    return row;
  }, []);
  const removeTag = useCallback(async (id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    try { await deleteTag(id); } catch { /* optimistic */ }
  }, []);
  return { tags, setTags, loading, addTag, removeTag };
}

export function useCategories() {
  const teamId = useAppStore((s) => s.teamId);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchCategories().then((d) => { setCategories(d); setLoading(false); }).catch(() => setLoading(false));
  }, [teamId]);
  const addCategory = useCallback(async (data: Omit<CategoryRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createCategory(data);
    setCategories((prev) => [row, ...prev]);
    return row;
  }, []);
  const removeCategory = useCallback(async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    try { await deleteCategory(id); } catch { /* optimistic */ }
  }, []);
  return { categories, setCategories, loading, addCategory, removeCategory };
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchFeatureFlags().then((d) => { setFlags(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const toggleFlag = useCallback(async (id: string, enabled: boolean) => {
    setFlags((prev) => prev.map((f) => f.id === id ? { ...f, enabled, updated_at: new Date().toISOString() } : f));
    try { await updateFeatureFlag(id, { enabled } as Partial<FeatureFlagRow>); } catch { /* optimistic */ }
  }, []);
  return { flags, setFlags, loading, toggleFlag };
}

export function useSavedViews() {
  const [views, setViews] = useState<SavedViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchSavedViews().then((d) => { setViews(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addView = useCallback(async (data: Omit<SavedViewRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createSavedView(data);
    setViews((prev) => [row, ...prev]);
    return row;
  }, []);
  const removeView = useCallback(async (id: string) => {
    setViews((prev) => prev.filter((v) => v.id !== id));
    try { await deleteSavedView(id); } catch { /* optimistic */ }
  }, []);
  return { views, setViews, loading, addView, removeView };
}

export function useAutomationRules() {
  const [rules, setRules] = useState<AutomationRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchAutomationRules().then((d) => { setRules(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addRule = useCallback(async (data: Omit<AutomationRuleRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createAutomationRule(data);
    setRules((prev) => [row, ...prev]);
    return row;
  }, []);
  const editRule = useCallback(async (id: string, updates: Partial<AutomationRuleRow>) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r));
    try { await updateAutomationRule(id, updates); } catch { /* optimistic */ }
  }, []);
  const removeRule = useCallback(async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    try { await deleteAutomationRule(id); } catch { /* optimistic */ }
  }, []);
  return { rules, setRules, loading, addRule, editRule, removeRule };
}

export function useStatusFlowRules() {
  const [rules, setRules] = useState<StatusFlowRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchStatusFlowRules().then((d) => { setRules(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  const addRule = useCallback(async (data: Omit<StatusFlowRuleRow, 'id' | 'created_at' | 'updated_at'>) => {
    const row = await createStatusFlowRule(data);
    setRules((prev) => [row, ...prev]);
    return row;
  }, []);
  const removeRule = useCallback(async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    try { await deleteStatusFlowRule(id); } catch { /* optimistic */ }
  }, []);
  return { rules, setRules, loading, addRule, removeRule };
}

export function useItemLinks(sourceId?: string, sourceType?: string) {
  const [links, setLinks] = useState<ItemLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchItemLinks(sourceId, sourceType).then((d) => { setLinks(d); setLoading(false); }).catch(() => setLoading(false));
  }, [sourceId, sourceType]);
  const addLink = useCallback(async (data: Omit<ItemLinkRow, 'id' | 'created_at'>) => {
    const row = await createItemLink(data);
    setLinks((prev) => [...prev, row]);
    return row;
  }, []);
  const removeLink = useCallback(async (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    try { await deleteItemLink(id); } catch { /* optimistic */ }
  }, []);
  return { links, setLinks, loading, addLink, removeLink };
}
