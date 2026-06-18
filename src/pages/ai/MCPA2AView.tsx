import { useState, useCallback } from 'react';
import { t } from '@/lib/i18n';
import { useMatrixCell, useIndustryColor } from '@/hooks/useMatrix';
import { useToast, ToastOverlay } from '@/hooks/useToast';
import { useAppStore } from '@/stores/appStore';
import { createBuiltinServer, getExternalServers, type MCPServer, type MCPTool, type A2AMessage } from '@/lib/mcpA2a';
import { a2aSend, a2aGetMessages, a2aPipeline } from '@/lib/mcpA2a';
import { MORNING_AGENT, PROGRESS_AGENT, RISK_AGENT } from '@/lib/agents';
import { cn } from '@/lib/utils';
import { Plug, Radio, Play, ArrowRight, Loader2, Zap, RefreshCw, Unplug, Wifi } from 'lucide-react';
import PaywallModal from '@/components/PaywallModal';

const ALL_AGENTS_DEF = [MORNING_AGENT, PROGRESS_AGENT, RISK_AGENT];

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
  const [toolResult, setToolResult] = useState<unknown>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [a2aMessages, setA2aMessages] = useState<A2AMessage[]>(a2aGetMessages());
  const [pipelineResult, setPipelineResult] = useState<unknown[] | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const { toasts, success, error: toastError } = useToast();

  const activeServer = allServers.find((s) => s.id === selectedServer) ?? builtinServer;

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'reachable' | 'unreachable'>('idle');

  async function handleTestConnection(serverId: string) {
    setTestStatus('testing');
    try {
      const server = allServers.find((s) => s.id === serverId);
      if (server?.url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(server.url, { mode: 'no-cors', signal: controller.signal });
        clearTimeout(timeout);
        setTestStatus('reachable');
        success(t('mcp.endpointReachable', { url: server.url }));
      } else {
        setTestStatus('unreachable');
        toastError(t('mcp.noRealEndpoint'));
      }
    } catch {
      setTestStatus('unreachable');
      toastError(t('mcp.cannotConnect'));
    }
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
        t('mcp.pipelinePrompt'),
        ALL_AGENTS_DEF.map((a) => ({ id: a.id, name: a.name })),
        cell,
        industry,
        dept,
      );
      setPipelineResult(result);
    } catch {
      setPipelineResult([{ error: t('mcp.pipelineFailed') }]);
    } finally {
      setPipelineRunning(false);
    }
  }

  function handleA2ASend() {
    const msg = a2aSend({
      from: ALL_AGENTS_DEF[0].id,
      to: 'broadcast',
      type: 'notify',
      payload: { text: t('mcp.testA2AMessage') },
    });
    msg.status = 'completed';
    setA2aMessages(a2aGetMessages());
  }

  return (
    <div className="flex h-full">
      <ToastOverlay toasts={toasts} />
      <div className="absolute top-0 left-0 right-0 z-10 rounded-b-lg bg-warn/10 border-b border-warn/20 px-4 py-2 text-center text-[11px] text-warn font-semibold">
        {t('mcp.comingSoonBanner')}
      </div>
      <div className="flex w-72 shrink-0 flex-col border-r border-border bg-surface mt-9">
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Plug size={16} className="text-primary-2" />
            <span className="text-sm font-bold">{t('mcp.title')}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-text-3">{t('mcp.mcpServices')}</div>
          {allServers.map((server) => (
            <button key={server.id} onClick={() => setSelectedServer(server.id)} className={cn('flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors', selectedServer === server.id ? 'bg-primary/10 font-semibold text-primary-2' : 'text-text-2 hover:bg-surface-2')}>
              <span className="h-2 w-2 rounded-full shrink-0 bg-text-3" />
              <span className="truncate">{server.name}</span>
              {server.isBuiltIn && <span className="rounded bg-primary/10 px-1 py-[1px] text-[7px] font-bold text-primary-2">{t('mcp.builtin')}</span>}
            </button>
          ))}

          <div className="px-3 py-1.5 mt-3 text-[9px] font-bold uppercase tracking-wider text-text-3">{t('mcp.a2aAgentComm')}</div>
          {ALL_AGENTS_DEF.map((agent) => (
            <div key={agent.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs text-text-2">
              <span className="text-sm">{agent.icon}</span>
              <span className="truncate">{agent.name}</span>
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-success" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto mt-9">
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">{activeServer.name}</span>
            <span className="rounded-full bg-text-3/10 px-2 py-0.5 text-[8px] font-bold text-text-3">{t('mcp.comingSoon')}</span>
          </div>
          <p className="text-[10px] text-text-3 mt-0.5">{activeServer.description}</p>

          {testStatus === 'reachable' && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-success/5 px-3 py-2 text-[9px] text-success">
              <Wifi size={10} />{t('mcp.endpointReachable', { url: activeServer.url ?? 'N/A' })}
            </div>
          )}
          {testStatus === 'unreachable' && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-danger/5 px-3 py-2 text-[9px] text-danger">
              <Unplug size={10} />{t('mcp.cannotConnect')}
            </div>
          )}

          <button onClick={() => handleTestConnection(selectedServer)} className="mt-2 flex flex-wrap items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-[10px] font-semibold text-primary-2 hover:bg-primary/20 disabled:opacity-50" disabled={testStatus === 'testing'}>
            {testStatus === 'testing' ? <><Loader2 size={10} className="animate-spin" />{t('mcp.testing')}</> : <><Plug size={10} />{t('mcp.testConnection')}</>}
          </button>
        </div>

        <div className="border-b border-border p-3 md:p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-3">{t('mcp.mcpTools')} ({activeServer.tools.length})</div>
          <div className="space-y-2">
            {activeServer.tools.map((tool) => (
              <div key={tool.name} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
                <Zap size={13} className="text-primary-2 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-text">{tool.name}</div>
                  <div className="text-[9px] text-text-3">{tool.description}</div>
                </div>
                <button onClick={() => handleCallTool(tool)} className="rounded-lg bg-primary/10 px-2.5 py-1 text-[9px] font-semibold text-primary-2 hover:bg-primary/20 disabled:opacity-50" disabled={toolLoading}>
                  {toolLoading ? <Loader2 size={10} className="animate-spin" /> : t('mcp.invoke')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {toolResult !== null && (
          <div className="border-b border-border p-3 md:p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-3 mb-2">{t('mcp.invokeResult')}</div>
            <pre className="rounded-lg bg-surface-2 p-3 text-[10px] text-text-2 overflow-x-auto max-h-40">{JSON.stringify(toolResult, null, 2)}</pre>
          </div>
        )}

        <div className="border-b border-border p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Radio size={14} className="text-accent" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">{t('mcp.agentPipeline')}</span>
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
            {t('mcp.executePipeline')}
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

        <div className="p-3 md:p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">{t('mcp.a2aMessageBus')}</span>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleA2ASend} className="rounded-lg bg-primary/10 px-2.5 py-1 text-[9px] font-semibold text-primary-2 hover:bg-primary/20">{t('mcp.sendTest')}</button>
              <button onClick={() => setA2aMessages(a2aGetMessages())} aria-label={t('mcp.refreshMessages')} className="rounded-lg bg-surface-2 p-1 text-text-3 hover:text-text"><RefreshCw size={11} /></button>
            </div>
          </div>
          {a2aMessages.length === 0 ? (
            <div className="text-xs text-text-3 text-center py-4">{t('mcp.noA2aMessages')}</div>
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
                    <span>{t('mcp.time')}: {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="ml-3">{t('mcp.sender')}: {msg.from}</span>
                    {msg.payload && typeof msg.payload === 'object' && 'text' in (msg.payload as object) ? (
                      <span className="ml-3 text-text-2">{t('mcp.content')}: {String((msg.payload as Record<string, unknown>).text)}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason={t('mcp.paywallReason')} feature="ai_mcp_a2a" />
</div>
  );
}
