/**
 * MCP (Model Context Protocol) & A2A (Agent-to-Agent) Protocol Layer.
 *
 * MCP: Standardized interface for AI models to access external tools/data.
 * - Exposes TBH resources (KPIs, goals, tasks, knowledge) as MCP tools
 * - Allows external MCP servers to be registered and called
 * - Follows Anthropic MCP specification
 *
 * A2A: Agent-to-Agent communication protocol.
 * - Agents can delegate tasks to each other
 * - Supports broadcast, targeted, and pipeline patterns
 * - Enables multi-agent orchestration
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { type MatrixCell } from '@/matrix/data';

// ============================================================
// MCP: Model Context Protocol
// ============================================================

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  url?: string;          // Remote MCP server URL
  tools: MCPTool[];
  status: 'connected' | 'disconnected' | 'error';
  isBuiltIn: boolean;
}

// --- Built-in MCP Tools ---

export function createBuiltinMCPTools(cell: MatrixCell, industry: string, dept: string): MCPTool[] {
  return [
    {
      name: 'get_kpis',
      description: `获取「${industry} · ${dept}」的KPI数据`,
      parameters: {},
      handler: async () => cell.kpis,
    },
    {
      name: 'get_risks',
      description: `获取「${industry} · ${dept}」的风险预警`,
      parameters: {},
      handler: async () => cell.top3,
    },
    {
      name: 'get_workflow',
      description: `获取「${industry} · ${dept}」的工作流进度`,
      parameters: {},
      handler: async () => ({ steps: cell.workflow, current: cell.wfCurrent }),
    },
    {
      name: 'get_morning_brief',
      description: `获取「${industry} · ${dept}」的晨间播报`,
      parameters: {},
      handler: async () => ({ morning: cell.morning, ribbon: cell.ribbon, nextStep: cell.nextStep }),
    },
    {
      name: 'get_agents',
      description: `获取当前可用的AI Agent列表`,
      parameters: {},
      handler: async () => cell.agents,
    },
    {
      name: 'search_knowledge',
      description: '搜索行业知识库',
      parameters: { query: { type: 'string', description: '搜索关键词', required: true } },
      handler: async (params) => {
        const query = params.query as string;
        // In production, would search Supabase knowledge_packs
        return { results: [{ title: `${industry}知识条目`, snippet: `与"${query}"相关的知识...` }] };
      },
    },
    {
      name: 'create_task',
      description: '创建新任务',
      parameters: {
        title: { type: 'string', description: '任务标题', required: true },
        priority: { type: 'string', description: '优先级: high/medium/low' },
      },
      handler: async (params) => {
        const { title, priority = 'medium' } = params;
        if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase.from('tasks').insert({ title, priority, assignee: 'AI', due: '', done: false }).select().single();
          if (error) return { success: false, error: error.message };
          return { success: true, task: data };
        }
        return { success: true, task: { id: `local-${Date.now()}`, title, priority, assignee: 'AI' } };
      },
    },
  ];
}

// --- MCP Server Registry ---

export interface MCPServerRegistry {
  servers: MCPServer[];
}

const BUILTIN_SERVER_ID = 'tbh-builtin';

export function createBuiltinServer(cell: MatrixCell, industry: string, dept: string): MCPServer {
  return {
    id: BUILTIN_SERVER_ID,
    name: 'TBH 内置工具',
    description: '团队业务中台内置MCP工具集',
    tools: createBuiltinMCPTools(cell, industry, dept),
    status: 'connected',
    isBuiltIn: true,
  };
}

// External MCP servers (simulated)
const EXTERNAL_SERVERS: MCPServer[] = [
  {
    id: 'mcp-weather',
    name: '天气数据',
    description: '获取实时天气和气象预警数据',
    url: 'https://mcp.example.com/weather',
    tools: [
      { name: 'get_weather', description: '获取指定城市天气', parameters: { city: { type: 'string', description: '城市名', required: true } }, handler: async (p) => ({ city: p.city, temp: '26°C', condition: '晴' }) },
    ],
    status: 'disconnected',
    isBuiltIn: false,
  },
  {
    id: 'mcp-calendar',
    name: '日历集成',
    description: 'Google Calendar / Outlook 日历读写',
    url: 'https://mcp.example.com/calendar',
    tools: [
      { name: 'list_events', description: '列出今日日程', parameters: {}, handler: async () => ({ events: [] }) },
      { name: 'create_event', description: '创建日程', parameters: { title: { type: 'string', required: true }, time: { type: 'string', required: true } }, handler: async () => ({ success: true }) },
    ],
    status: 'disconnected',
    isBuiltIn: false,
  },
  {
    id: 'mcp-wechat-work',
    name: '企业微信',
    description: '企业微信消息发送与审批集成',
    url: 'https://mcp.example.com/wecom',
    tools: [
      { name: 'send_message', description: '发送企微消息', parameters: { to: { type: 'string', required: true }, content: { type: 'string', required: true } }, handler: async () => ({ success: true }) },
    ],
    status: 'disconnected',
    isBuiltIn: false,
  },
];

export function getExternalServers(): MCPServer[] {
  return EXTERNAL_SERVERS;
}

// ============================================================
// A2A: Agent-to-Agent Protocol
// ============================================================

export interface A2AMessage {
  id: string;
  from: string;      // Agent ID
  to: string;         // Agent ID or 'broadcast'
  type: 'delegate' | 'query' | 'notify' | 'result';
  payload: unknown;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface A2AAgent {
  id: string;
  name: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'offline';
}

// Simple in-memory message bus for A2A
const a2aBus: A2AMessage[] = [];
const a2aListeners: Map<string, (msg: A2AMessage) => void> = new Map();

export function a2aSend(message: Omit<A2AMessage, 'id' | 'timestamp' | 'status'>): A2AMessage {
  const msg: A2AMessage = {
    ...message,
    id: `a2a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    status: 'pending',
  };
  a2aBus.push(msg);

  // Notify listeners
  if (message.to === 'broadcast') {
    a2aListeners.forEach((listener) => listener(msg));
  } else {
    const listener = a2aListeners.get(message.to);
    if (listener) listener(msg);
  }

  return msg;
}

export function a2aSubscribe(agentId: string, listener: (msg: A2AMessage) => void): () => void {
  a2aListeners.set(agentId, listener);
  return () => a2aListeners.delete(agentId);
}

export function a2aGetMessages(agentId?: string): A2AMessage[] {
  if (agentId) return a2aBus.filter((m) => m.to === agentId || m.to === 'broadcast');
  return a2aBus;
}

// Agent orchestration patterns
export async function a2aPipeline(
  input: unknown,
  agents: Array<{ id: string; name: string }>,
  cell: MatrixCell,
  industry: string,
  dept: string,
): Promise<unknown[]> {
  const results: unknown[] = [];
  let currentInput = input;

  for (const agent of agents) {
    const msg = a2aSend({
      from: 'orchestrator',
      to: agent.id,
      type: 'delegate',
      payload: currentInput,
    });
    msg.status = 'processing';

    // In production, each agent would process via its LLM
    // For now, simulate with a simple result
    const result = { agent: agent.name, input: currentInput, output: `${agent.name}处理完成` };
    results.push(result);
    currentInput = result;
    msg.status = 'completed';
  }

  return results;
}
