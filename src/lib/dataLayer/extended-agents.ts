import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { filterColumns } from './columns';

// ======== Knowledge Packs ========

export async function fetchKnowledgePacks(industry?: string): Promise<import('./types').KnowledgePackRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  let query = supabase.from('knowledge_packs').select('*').order('downloads', { ascending: false });
  if (industry) query = query.eq('industry', industry);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as import('./types').KnowledgePackRow[];
}

export async function createKnowledgePack(data: Record<string, unknown>): Promise<import('./types').KnowledgePackRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as import('./types').KnowledgePackRow;
  const filtered = filterColumns('knowledge_packs', data);
  const { data: result, error } = await supabase.from('knowledge_packs').insert(filtered).select().single();
  if (error) throw new Error(`createKnowledgePack: ${error.message}`);
  return result as import('./types').KnowledgePackRow;
}

// ======== Marketplace Agents ========

export async function fetchMarketplaceAgents(): Promise<import('./types').MarketplaceAgentRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('marketplace_agents').select('*').order('downloads', { ascending: false });
  if (error || !data) return [];
  return data as import('./types').MarketplaceAgentRow[];
}

export async function createMarketplaceAgent(data: Record<string, unknown>): Promise<import('./types').MarketplaceAgentRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as import('./types').MarketplaceAgentRow;
  const filtered = filterColumns('marketplace_agents', data);
  const { data: result, error } = await supabase.from('marketplace_agents').insert(filtered).select().single();
  if (error) throw new Error(`createMarketplaceAgent: ${error.message}`);
  return result as import('./types').MarketplaceAgentRow;
}

// ======== AI Module: Agent Configs ========

export async function fetchAgentConfigs(): Promise<import('./types').AgentConfigRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('agent_configs').select('*').order('sort_order', { ascending: true });
  if (error || !data) return [];
  return data as import('./types').AgentConfigRow[];
}

export async function upsertAgentConfig(data: Record<string, unknown>): Promise<import('./types').AgentConfigRow> {
  if (!isSupabaseConfigured() || !supabase) return {} as import('./types').AgentConfigRow;
  const filtered = filterColumns('agent_configs', data);
  const { data: result, error } = await supabase.from('agent_configs').upsert(filtered, { onConflict: 'name' }).select().single();
  if (error) throw new Error(`upsertAgentConfig: ${error.message}`);
  return result as import('./types').AgentConfigRow;
}

// ======== AI Module: Installed Agents ========

export async function fetchInstalledAgents(): Promise<import('./types').InstalledAgentRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('installed_agents').select('*').order('installed_at', { ascending: false });
  if (error || !data) return [];
  return data as import('./types').InstalledAgentRow[];
}

export async function insertInstalledAgent(agentId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('installed_agents').insert({ agent_id: agentId, team_id: '__default__', member_id: 'demo' });
  if (error) throw new Error(`insertInstalledAgent: ${error.message}`);
}

export async function deleteInstalledAgent(agentId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('installed_agents').delete().eq('agent_id', agentId);
  if (error) throw new Error(`deleteInstalledAgent: ${error.message}`);
}

export async function replaceInstalledAgents(agentIds: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('installed_agents').delete().neq('id', '__never__');
  if (agentIds.length > 0) {
    const rows = agentIds.map((aid) => ({ agent_id: aid, team_id: '__default__', member_id: 'demo' }));
    await supabase.from('installed_agents').insert(rows);
  }
}

// ======== AI Module: Running Workflows ========

export async function fetchRunningWorkflows(): Promise<import('./types').RunningWorkflowRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('running_workflows').select('*');
  if (error || !data) return [];
  return data as import('./types').RunningWorkflowRow[];
}

export async function insertRunningWorkflow(workflowId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('running_workflows').insert({ workflow_id: workflowId });
  if (error && !error.message.includes('duplicate')) throw new Error(`insertRunningWorkflow: ${error.message}`);
}

export async function deleteRunningWorkflow(workflowId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('running_workflows').delete().eq('workflow_id', workflowId);
  if (error) throw new Error(`deleteRunningWorkflow: ${error.message}`);
}

export async function replaceRunningWorkflows(workflowIds: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('running_workflows').delete().neq('id', '__never__');
  if (workflowIds.length > 0) {
    const rows = workflowIds.map((wid) => ({ workflow_id: wid }));
    await supabase.from('running_workflows').insert(rows);
  }
}

// ======== AI Module: MCP Status ========

export async function fetchMcpStatuses(): Promise<import('./types').McpStatusRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('mcp_status').select('*');
  if (error || !data) return [];
  return data as import('./types').McpStatusRow[];
}

export async function upsertMcpStatus(serverId: string, status: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const filtered = filterColumns('mcp_status', { server_id: serverId, status });
  const { error } = await supabase.from('mcp_status').upsert(filtered, { onConflict: 'server_id' });
  if (error) throw new Error(`upsertMcpStatus: ${error.message}`);
}

export async function replaceMcpStatuses(statuses: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('mcp_status').delete().neq('id', '__never__');
  for (const [serverId, status] of Object.entries(statuses)) {
    await supabase.from('mcp_status').insert({ server_id: serverId, status });
  }
}

// ======== AI Module: Installed Packs ========

export async function fetchInstalledPacks(): Promise<import('./types').InstalledPackRow[]> {
  if (!isSupabaseConfigured() || !supabase) return [];
  const { data, error } = await supabase.from('installed_packs').select('*');
  if (error || !data) return [];
  return data as import('./types').InstalledPackRow[];
}

export async function insertInstalledPack(packId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('installed_packs').insert({ pack_id: packId });
  if (error && !error.message.includes('duplicate')) throw new Error(`insertInstalledPack: ${error.message}`);
}

export async function deleteInstalledPack(packId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.from('installed_packs').delete().eq('pack_id', packId);
  if (error) throw new Error(`deleteInstalledPack: ${error.message}`);
}

export async function replaceInstalledPacks(packIds: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  await supabase.from('installed_packs').delete().neq('id', '__never__');
  if (packIds.length > 0) {
    const rows = packIds.map((pid) => ({ pack_id: pid }));
    await supabase.from('installed_packs').insert(rows);
  }
}
