import { useState, useEffect } from 'react';
import { useMatrixCell, useIndustryColor, useAgentDetails } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Bot, ToggleLeft, ToggleRight, Settings, MessageSquare, BarChart3, RefreshCw, X, Check } from 'lucide-react';
import { useModal, btnPrimary, btnSecondary, inputCls } from '@/components/Modal';
import type { AgentDetailRow } from '@/lib/dataLayer';
import { CardSkeleton } from '@/components/Skeleton';

interface AgentItem {
  id: string;
  name: string;
  description: string;
  status: string;
  enabled: boolean;
}

export default function AiAgentsView() {
  const { cell } = useMatrixCell();
  const indColor = useIndustryColor();
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const { agents: dbAgents, editAgent, addAgent, removeAgent, loading } = useAgentDetails();

  // Merge cell.agents (matrix fallback) with DB agents
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const addModal = useModal();
  const statsModal = useModal();
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [statsAgent, setStatsAgent] = useState<AgentItem | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!loading && dbAgents.length > 0) {
      setAgents(dbAgents.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        status: a.status,
        enabled: a.enabled,
      })));
    } else if (!loading && dbAgents.length === 0) {
      // Fallback to cell.agents when DB is empty
      setAgents(cell.agents.map((a, i) => ({
        id: `cell-agent-${i}`,
        name: a.name,
        description: a.desc ?? a.status,
        status: a.status,
        enabled: true,
      })));
    }
  }, [loading, dbAgents, cell.agents]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function toggleAgent(id: string) {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return;
    const newEnabled = !agent.enabled;
    setAgents((prev) => prev.map((a) => a.id === id ? { ...a, enabled: newEnabled } : a));
    editAgent(id, { enabled: newEnabled });
  }

  async function handleAddAgent() {
    if (!newAgentName.trim()) return;
    const row = await addAgent({
      name: newAgentName.trim(),
      description: newAgentDesc.trim() || '自定义AI助手',
      status: '在线',
      enabled: true,
      model: 'default',
      tasks_completed: 0,
      uptime: '0h',
      capabilities: [],
    });
    setAgents((prev) => [...prev, {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      enabled: row.enabled,
    }]);
    setNewAgentName('');
    setNewAgentDesc('');
    addModal.closeModal();
    showToast(`AI同事"${newAgentName.trim()}"已添加`);
  }

  function handleAgentAction(id: string, action: string) {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return;
    if (action === 'restart') {
      setAgents((prev) => prev.map((a) => a.id === id ? { ...a, status: '重启中' } : a));
      editAgent(id, { status: '重启中' });
      setTimeout(() => {
        setAgents((prev) => prev.map((a) => a.id === id ? { ...a, status: '在线' } : a));
        editAgent(id, { status: '在线' });
        showToast(`${agent.name} 已重启完成`);
      }, 1500);
    } else if (action === 'chat') {
      navigateTo('ai', 'main');
    } else if (action === 'stats') {
      setStatsAgent(agent);
      statsModal.openModal();
    } else if (action === 'config') {
      navigateTo('ai', 'agentConfig');
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">AI 同事管理</span>
        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: indColor + '20', color: indColor }}>{industry} · {dept}</span>
        <span className="text-[10px] text-text-3">{agents.filter((a) => a.enabled).length}/{agents.length} 启用</span>
        <button onClick={addModal.openModal} className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">+ 添加AI同事</button>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-success/90 px-4 py-2 text-xs font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          <Check size={12} className="mr-1.5 inline" />{toast}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-4">
          <p className="text-xs text-text-2 leading-relaxed">
            AI同事是与你同在一个团队的智能助手，它们会持续监控数据、提供分析、参与协作。你可以根据需要启用或禁用特定的AI同事。
          </p>
        </div>

        {loading ? (
          <CardSkeleton />
        ) : (
        agents.map((agent) => (
          <div key={agent.id} className={cn('rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-lg',
            !agent.enabled && 'opacity-50'
          )}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Bot size={20} className="text-primary-2" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-text">{agent.name}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                    agent.status === '重启中' ? 'bg-warning/10 text-warning' :
                    agent.enabled ? 'bg-success/10 text-success' : 'bg-surface-2 text-text-3'
                  )}>
                    {agent.status === '重启中' ? '重启中' : agent.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
                <div className="text-[11px] text-text-3">{agent.description}</div>
              </div>
              <button onClick={() => toggleAgent(agent.id)} className="shrink-0">
                {agent.enabled ? (
                  <ToggleRight size={28} className="text-primary-2" />
                ) : (
                  <ToggleLeft size={28} className="text-text-3" />
                )}
              </button>
            </div>
            {agent.enabled && (
              <div className="flex flex-wrap items-center gap-2 mt-3 ml-13">
                <button onClick={() => handleAgentAction(agent.id, 'chat')} className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-[9px] text-text-3 hover:text-text hover:bg-primary/10 transition-colors">
                  <MessageSquare size={10} />对话
                </button>
                <button onClick={() => handleAgentAction(agent.id, 'stats')} className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-[9px] text-text-3 hover:text-text hover:bg-primary/10 transition-colors">
                  <BarChart3 size={10} />统计
                </button>
                <button onClick={() => handleAgentAction(agent.id, 'config')} className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-[9px] text-text-3 hover:text-text hover:bg-primary/10 transition-colors">
                  <Settings size={10} />配置
                </button>
                <button onClick={() => handleAgentAction(agent.id, 'restart')} className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-[9px] text-text-3 hover:text-text hover:bg-primary/10 transition-colors">
                  <RefreshCw size={10} />重启
                </button>
                <button onClick={() => { removeAgent(agent.id); setAgents((prev) => prev.filter((a) => a.id !== agent.id)); }} className="flex flex-wrap items-center gap-1 rounded-lg bg-danger/10 px-2.5 py-1 text-[9px] text-danger hover:bg-danger/20 transition-colors">
                  删除
                </button>
              </div>
            )}
          </div>
        ))
        )}
      </div>

      {/* Add Agent Modal */}
      {addModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-96 rounded-xl border border-border bg-bg p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold">添加AI同事</span>
              <button onClick={addModal.closeModal}><X size={16} className="text-text-3" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-text-3 mb-1">名称</label>
                <input className={inputCls} value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} placeholder="输入AI同事名称" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-3 mb-1">描述</label>
                <input className={inputCls} value={newAgentDesc} onChange={(e) => setNewAgentDesc(e.target.value)} placeholder="输入AI同事描述" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button onClick={addModal.closeModal} className={btnSecondary}>取消</button>
              <button onClick={handleAddAgent} className={btnPrimary}>添加</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {statsModal.open && statsAgent && (() => {
        const dbAgent = dbAgents.find((a) => a.id === statsAgent.id);
        const tasksCompleted = dbAgent?.tasks_completed ?? 0;
        const uptime = dbAgent?.uptime ?? '-';
        const capabilities = dbAgent?.capabilities ?? [];
        const allTasks = dbAgents.reduce((s, a) => s + a.tasks_completed, 0);
        const enabledCount = dbAgents.filter((a) => a.enabled).length;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-96 rounded-xl border border-border bg-bg p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold">{statsAgent.name} 统计</span>
              <button onClick={statsModal.closeModal}><X size={16} className="text-text-3" /></button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-3">状态</span>
                <span className={statsAgent.status === '在线' ? 'text-success' : 'text-warning'}>{statsAgent.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-3">累计完成任务</span>
                <span className="text-text">{tasksCompleted}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-3">运行时长</span>
                <span className="text-text">{uptime}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-3">能力标签</span>
                <span className="text-text">{capabilities.length > 0 ? capabilities.join('、') : '暂无'}</span>
              </div>
              <div className="mt-3 rounded-lg bg-surface-2 p-3">
                <div className="text-[10px] font-bold text-text-3 mb-2">团队概览</div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-text-3">AI 同事总数</span>
                    <span className="text-text">{dbAgents.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-text-3">已启用</span>
                    <span className="text-text">{enabledCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-text-3">团队总任务量</span>
                    <span className="text-text">{allTasks}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={statsModal.closeModal} className={btnSecondary}>关闭</button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
