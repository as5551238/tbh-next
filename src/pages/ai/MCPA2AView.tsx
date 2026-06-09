import { useState, useCallback } from 'react';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { useAppStore } from '@/stores/appStore';
import { createBuiltinServer, getExternalServers, type MCPServer, type MCPTool, type A2AMessage } from '@/lib/mcpA2a';
import { a2aSend, a2aGetMessages, a2aPipeline } from '@/lib/mcpA2a';
import { MORNING_AGENT, PROGRESS_AGENT, RISK_AGENT } from '@/lib/agents';
import { cn } from '@/lib/utils';
import { Plug, Radio, Play, ArrowRight, Loader2, Zap, RefreshCw, Unplug, Wifi } from 'lucide-react';
import { hasFeature } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';
import { usePersistedState } from '@/hooks/usePersistedState';

const MCP_STATUS_STORAGE = 'tbh-mcp-status';

const ALL_AGENTS_DEF = [MORNING_AGENT, PROGRESS_AGENT, RISK_AGENT];

interface ServerConnectionInfo {
  address: string;
  protocolVersion: string;
  latency: number;
  connectedAt: string;
}

function loadSavedStatuses(): Record<string, 'connected' | 'disconnected' | 'error'> {
  try { const s = localStorage.getItem(MCP_STATUS_STORAGE); return s ? JSON.parse(s) : {}; } catch { return {}; }
}

export default function MCPA2AView() {
  const [showPaywall, setShowPaywall] = useState(false);
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const indColor = useIndustryColor();
  const { cell } = useMatrixCell();

  const builtinServer = createBuiltinServer(cell, industry, dept);
  const externalServers = getExternalServers();
  const allServers = [builtinServer, ...externalServers];

  const [selectedServer, setSelectedServer] = useState<string>(builtinServer.id);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [serverStatuses, setServerStatuses] = useState<Record<string, 'connected' | 'disconnected' | 'error'>>(() => loadSavedStatuses());
  const [connectionInfos, setConnectionInfos] = useState<Record<string, ServerConnectionInfo>>({});
  const [toolResult, setToolResult] = useState<unknown>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [a2aMessages, setA2aMessages] = useState<A2AMessage[]>(a2aGetMessages());
  const [pipelineResult, setPipelineResult] = useState<unknown[] | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const { toasts, success, error: toastError } = useToast();

  function saveStatuses(statuses: Record<string, 'connected' | 'disconnected' | 'error'>) {
    setServerStatuses(statuses);
    try { localStorage.setItem(MCP_STATUS_STORAGE, JSON.stringify(statuses)); } catch {}
  }

  const activeServer = allServers.find((s) => s.id === selectedServer) ?? builtinServer;

  async function handleConnect(serverId: string) {
    setConnecting(serverId);
    const start = Date.now();
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 600));
    const latency = Date.now() - start;
    const server = allServers.find((s) => s.id === serverId);
    saveStatuses({ ...serverStatuses, [serverId]: 'connected' });
    setConnectionInfos((prev) => ({
      ...prev,
      [serverId]: {
        address: server?.url ?? `mcp://localhost/${serverId}`,
        protocolVersion: '2025-03-26',
        latency,
        connectedAt: new Date().toISOString(),
      },
    }));
    setConnecting(null);
    success(`MCP服务"${server?.name ?? serverId}"已连接 (${latency}ms)`);
  }

  function handleDisconnect(serverId: string) {
    saveStatuses({ ...serverStatuses, [serverId]: 'disconnected' });
    setConnectionInfos((prev) => {
      const next = { ...prev };
      delete next[serverId];
      return next;
    });
    const server = allServers.find((s) => s.id === serverId);
    success(`MCP服务"${server?.name ?? serverId}"已断开`);
  }

  async function handleCallTool(tool: MCPTool) {
    setToolLoading(true);
    setToolResult(null);
    try {
      const result = await tool.handler({});
      setToolResult(result);
    } catch (err: unknown) {
      setToolResult({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      setToolLoading(false);
    }
  }

  async function handlePipeline() {
    setPipelineRunning(true);
    setPipelineResult(null);
    try {
      const result = await a2aPipeline(
        '分析当前业务状态并给出建议',
        ALL_AGENTS_DEF.map((a) => ({ id: a.id, name: a.name })),
        cell,
        industry,
        dept,
      );
      setPipelineResult(result);
    } catch {
      setPipelineResult([{ error: 'Pipeline 执行失败' }]);
    } finally {
      setPipelineRunning(false);
    }
  }

  function handleA2ASend() {
    const msg = a2aSend({
      from: ALL_AGENTS_DEF[0].id,
      to: 'broadcast',
      type: 'notify',
      payload: { text: '测试A2A消息' },
    });
    msg.status = 'completed';
    setA2aMessages(a2aGetMessages());
  }

  const getStatus = (server: MCPServer) => serverStatuses[server.id] ?? server.status;
  const connInfo = connectionInfos[selectedServer];

  return (
    <div className="flex h-full">
      <ToastOverlay toasts={toasts} />
      {/* Left: Server list */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Plug size={16} className="text-primary-2" />
            <span className="text-sm font-bold">MCP 服务 & A2A</span>
            <span className="rounded-full bg-warn/10 px-2 py-0.5 text-[8px] font-bold text-warn">模拟模式</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-text-3">已连接</div>
          {[builtinServer, ...externalServers.filter((s) => getStatus(s) === 'connected')].map((server) => (
            <button key={server.id} onClick={() => setSelectedServer(server.id)} className={cn('flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors', selectedServer === server.id ? 'bg-primary/10 font-semibold text-primary-2' : 'text-text-2 hover:bg-surface-2')}>
              <span className={cn('h-2 w-2 rounded-full shrink-0', getStatus(server) === 'connected' ? 'bg-success' : getStatus(server) === 'error' ? 'bg-danger' : 'bg-text-3')} />
              <span className="truncate">{server.name}</span>
              {server.isBuiltIn && <span className="rounded bg-primary/10 px-1 py-[1px] text-[7px] font-bold text-primary-2">内置</span>}
            </button>
          ))}

          <div className="px-3 py-1.5 mt-3 text-[9px] font-bold uppercase tracking-wider text-text-3">可连接</div>
          {externalServers.filter((s) => getStatus(s) !== 'connected').map((server) => (
            <div key={server.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs text-text-3">
              <span className="h-2 w-2 rounded-full shrink-0 bg-text-3" />
              <span className="truncate">{server.name}</span>
              <button onClick={() => handleConnect(server.id)} className="ml-auto rounded-lg bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary-2 hover:bg-primary/20 disabled:opacity-50" disabled={connecting === server.id}>
                {connecting === server.id ? '连接中...' : '连接'}
              </button>
            </div>
          ))}

          <div className="px-3 py-1.5 mt-3 text-[9px] font-bold uppercase tracking-wider text-text-3">A2A Agent通信</div>
          {ALL_AGENTS_DEF.map((agent) => (
            <div key={agent.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs text-text-2">
              <span className="text-sm">{agent.icon}</span>
              <span className="truncate">{agent.name}</span>
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-success" />
            </div>
          ))}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        {/* MCP Server detail */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">{activeServer.name}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[8px] font-bold', getStatus(activeServer) === 'connected' ? 'bg-success/10 text-success' : 'bg-text-3/10 text-text-3')}>
              {getStatus(activeServer) === 'connected' ? '已连接' : '未连接'}
            </span>
          </div>
          <p className="text-[10px] text-text-3 mt-0.5">{activeServer.description}</p>
          {activeServer.isBuiltIn && <p className="text-[9px] text-warn mt-1">此服务运行于本地模拟环境，连接状态为模拟数据</p>}

          {/* Connection Info */}
          {connInfo && getStatus(activeServer) === 'connected' && (
            <div className="mt-2 flex flex-wrap items-center gap-4 rounded-lg bg-success/5 px-3 py-2 text-[9px] text-text-2">
              <span className="flex flex-wrap items-center gap-1"><Wifi size={10} className="text-success" />{connInfo.address}</span>
              <span>协议 v{connInfo.protocolVersion}</span>
              <span>延迟 {connInfo.latency}ms</span>
              <span className="ml-auto">{new Date(connInfo.connectedAt).toLocaleTimeString('zh-CN')}</span>
            </div>
          )}

          {/* Disconnect button */}
          {!activeServer.isBuiltIn && getStatus(activeServer) === 'connected' && (
            <button onClick={() => handleDisconnect(selectedServer)} className="mt-2 flex flex-wrap items-center gap-1 rounded-lg bg-danger/10 px-3 py-1 text-[10px] text-danger hover:bg-danger/20">
              <Unplug size={10} />断开连接
            </button>
          )}

          {/* Test Connect button for disconnected servers */}
          {!activeServer.isBuiltIn && getStatus(activeServer) !== 'connected' && (
            <button onClick={() => handleConnect(selectedServer)} className="mt-2 flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary-2 hover:bg-primary/20 disabled:opacity-50" disabled={connecting === selectedServer}>
              {connecting === selectedServer ? <><Loader2 size={10} className="animate-spin" />连接中...</> : <><Plug size={10} />测试连接</>}
            </button>
          )}
        </div>

        {/* Tools */}
        <div className="border-b border-border p-3 md:p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-3">MCP 工具 ({activeServer.tools.length})</div>
          <div className="space-y-2">
            {activeServer.tools.filter(() => getStatus(activeServer) === 'connected').map((tool) => (
              <div key={tool.name} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
                <Zap size={13} className="text-primary-2 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-text">{tool.name}</div>
                  <div className="text-[9px] text-text-3">{tool.description}</div>
                </div>
                <button onClick={() => handleCallTool(tool)} className="rounded-lg bg-primary/10 px-2.5 py-1 text-[9px] font-semibold text-primary-2 hover:bg-primary/20 disabled:opacity-50" disabled={toolLoading}>
                  {toolLoading ? <Loader2 size={10} className="animate-spin" /> : '调用'}
                </button>
              </div>
            ))}
            {getStatus(activeServer) !== 'connected' && (
              <div className="text-xs text-text-3 text-center py-4">请先连接此MCP服务器</div>
            )}
          </div>
        </div>

        {/* Tool result */}
        {toolResult !== null && (
          <div className="border-b border-border p-3 md:p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-2">调用结果</div>
            <pre className="rounded-lg bg-surface-2 p-3 text-[10px] text-text-2 overflow-x-auto max-h-40">{JSON.stringify(toolResult, null, 2)}</pre>
          </div>
        )}

        {/* A2A Pipeline */}
        <div className="border-b border-border p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Radio size={14} className="text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">Agent 协作流水线</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {ALL_AGENTS_DEF.map((agent, i) => (
              <span key={agent.id} className="flex flex-wrap items-center gap-1 text-[10px] text-text-2">
                <span className="text-sm">{agent.icon}</span> {agent.name}
                {i < ALL_AGENTS_DEF.length - 1 && <ArrowRight size={10} className="ml-1 text-text-3" />}
              </span>
            ))}
          </div>
          <button onClick={handlePipeline} className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-bold text-white hover:shadow-lg disabled:opacity-50" disabled={pipelineRunning}>
            {pipelineRunning ? <Loader2 size={12} className="animate-spin inline mr-1" /> : <Play size={12} className="inline mr-1" />}
            执行流水线
          </button>
          {pipelineResult && (
            <div className="mt-3 space-y-2">
              {pipelineResult.map((result, i) => (
                <div key={i} className="rounded-lg bg-surface-2 p-3">
                  <pre className="text-[10px] text-text-2">{JSON.stringify(result, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* A2A Messages */}
        <div className="p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">A2A 消息总线</span>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleA2ASend} className="rounded-lg bg-primary/10 px-2.5 py-1 text-[9px] font-semibold text-primary-2 hover:bg-primary/20">发送测试</button>
              <button onClick={() => setA2aMessages(a2aGetMessages())} className="rounded-lg bg-surface-2 p-1 text-text-3 hover:text-text"><RefreshCw size={11} /></button>
            </div>
          </div>
          {a2aMessages.length === 0 ? (
            <div className="text-xs text-text-3 text-center py-4">暂无A2A消息</div>
          ) : (
            <div className="space-y-1.5">
              {a2aMessages.map((msg) => (
                <div key={msg.id} className="rounded-lg bg-surface-2 px-3 py-2 text-[10px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-1.5 py-0.5 font-bold', msg.type === 'delegate' && 'bg-primary/10 text-primary-2', msg.type === 'notify' && 'bg-accent/10 text-accent', msg.type === 'result' && 'bg-success/10 text-success', msg.type === 'query' && 'bg-warn/10 text-warn')}>
                      {msg.type}
                    </span>
                    <span className="text-text-2">{msg.from} → {msg.to}</span>
                    <span className="text-text-3 font-mono text-[8px]">{msg.id}</span>
                    <span className={cn('ml-auto rounded-full px-1.5 py-0.5 font-bold', msg.status === 'completed' && 'bg-success/10 text-success', msg.status === 'processing' && 'bg-warn/10 text-warn', msg.status === 'pending' && 'bg-surface-2 text-text-3', msg.status === 'failed' && 'bg-danger/10 text-danger')}>
                      {msg.status}
                    </span>
                  </div>
                  <div className="mt-1 text-text-3">
                    <span>时间: {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="ml-3">发送者: {msg.from}</span>
                    {msg.payload && typeof msg.payload === 'object' && 'text' in (msg.payload as object) && (
                      <span className="ml-3 text-text-2">内容: {(msg.payload as { text: string }).text}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason="MCP/A2A协议层需要专业版或企业版" feature="ai_mcp_a2a" />
</div>
  );
}
