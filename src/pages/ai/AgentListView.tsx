import { useState } from 'react';
import { useAgentDetails, useIndustryColor } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { Bot, ToggleLeft, ToggleRight, BarChart3, Cpu, Zap, Plus, Check, Edit3 } from 'lucide-react';
import { Modal, useModal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import { CardSkeleton } from '@/components/Skeleton';
import { hasFeature } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';

const STATUS_DOT: Record<string, string> = { running: 'bg-success', idle: 'bg-warn', error: 'bg-danger' };
const STATUS_LABEL: Record<string, string> = { running: '运行中', idle: '空闲', error: '异常' };

export default function AgentListView() {
  const [showPaywall, setShowPaywall] = useState(false);
  const indColor = useIndustryColor();
  const { agents, setAgents, loading, addAgent, editAgent } = useAgentDetails();
  const registerModal = useModal();
  const [formName, setFormName] = useState('');
  const [formModel, setFormModel] = useState('gpt-4o');
  const [formDesc, setFormDesc] = useState('');
  const [formSystemPrompt, setFormSystemPrompt] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function toggleAgent(id: string) {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return;
    const nextEnabled = !agent.enabled;
    setAgents((prev) => prev.map((a) => a.id === id ? { ...a, enabled: nextEnabled } : a));
    await editAgent(id, { enabled: nextEnabled });
    showToast(nextEnabled ? `${agent.name} 已启用` : `${agent.name} 已禁用`);
  }

  async function handleRegister() {
    if (!formName.trim()) return;
    if (editingId) {
      await editAgent(editingId, { name: formName.trim(), description: formDesc.trim() || '自定义Agent', system_prompt: formSystemPrompt });
      setEditingId(null);
      showToast(`Agent"${formName.trim()}"已更新`);
    } else {
      const row = await addAgent({
        name: formName.trim(),
        model: formModel,
        description: formDesc.trim() || '自定义Agent',
        status: 'idle',
        enabled: true,
        tasks_completed: 0,
        uptime: '0%',
        capabilities: ['自定义'],
        system_prompt: formSystemPrompt,
      });
      showToast(`Agent"${row.name}"已注册`);
    }
    setFormName('');
    setFormModel('gpt-4o');
    setFormDesc('');
    setFormSystemPrompt('');
    registerModal.closeModal();
  }

  function handleEditOpen(agent: typeof agents[0]) {
    setEditingId(agent.id);
    setFormName(agent.name);
    setFormModel(agent.model ?? 'gpt-4o');
    setFormDesc(agent.description ?? '');
    setFormSystemPrompt((agent as Record<string, unknown>).system_prompt as string ?? '');
    registerModal.openModal();
  }

  const runningCount = agents.filter((a) => a.enabled && a.status === 'running').length;

  if (loading) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-success/90 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          <Check size={12} className="mr-1.5 inline" />{toast}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className="text-sm font-bold">Agent 列表</span>
        <span className="text-[10px] text-text-3">{runningCount} 运行中 · {agents.length} 总计</span>
        <button onClick={registerModal.openModal} className="ml-auto rounded-lg bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary-2 hover:bg-primary/20 transition-colors">+ 新建Agent</button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mx-4 mt-3">
        {[
          { label: '总任务完成', value: agents.reduce((s, a) => s + a.tasks_completed, 0).toString(), icon: BarChart3 },
          { label: '平均可用率', value: agents.length ? (agents.reduce((s, a) => s + parseFloat(a.uptime), 0) / agents.length).toFixed(1) + '%' : '0%', icon: Zap },
          { label: '启用/总数', value: `${agents.filter((a) => a.enabled).length}/${agents.length}`, icon: Cpu },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-surface p-3 text-center">
            <stat.icon size={14} className="mx-auto text-primary-2 mb-1" />
            <div className="text-base font-extrabold text-text">{stat.value}</div>
            <div className="text-[9px] text-text-3">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
        {agents.map((agent) => (
          <div key={agent.id} className={cn('rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-lg',
            !agent.enabled && 'opacity-50'
          )}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Bot size={20} className="text-primary-2" />
                </div>
                <div className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface', STATUS_DOT[agent.status])} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-text">{agent.name}</span>
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                    agent.status === 'running' ? 'bg-success/10 text-success' : agent.status === 'idle' ? 'bg-warn/10 text-warn' : 'bg-danger/10 text-danger'
                  )}>{STATUS_LABEL[agent.status]}</span>
                  <span className="text-[9px] text-text-3">{agent.model}</span>
                </div>
                <div className="text-[11px] text-text-3 mt-0.5">{agent.description}</div>
              </div>
              <button onClick={() => handleEditOpen(agent)} className="shrink-0 rounded-lg p-1 text-text-3 hover:bg-surface-2 hover:text-primary-2">
                <Edit3 size={14} />
              </button>
              <button onClick={() => toggleAgent(agent.id)} className="shrink-0">
                {agent.enabled ? <ToggleRight size={28} className="text-primary-2" /> : <ToggleLeft size={28} className="text-text-3" />}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3 ml-13">
              {agent.capabilities.map((cap) => (
                <span key={cap} className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] text-text-3">{cap}</span>
              ))}
              <div className="ml-auto flex flex-wrap items-center gap-3 text-[10px] text-text-3">
                <span>{agent.tasks_completed} 任务</span>
                <span>{agent.uptime} 可用</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={registerModal.open} onClose={() => { setEditingId(null); registerModal.closeModal(); }} title={editingId ? '编辑Agent' : '新建Agent'}
        footer={
          <>
            <button onClick={() => { setEditingId(null); registerModal.closeModal(); }} className={btnSecondary}>取消</button>
            <button onClick={handleRegister} className={btnPrimary} disabled={!formName.trim()}>{editingId ? '保存' : '创建'}</button>
          </>
        }>
        <ModalField label="Agent名称">
          <input className={inputCls} value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="输入Agent名称" />
        </ModalField>
        <ModalField label="模型">
          <select className={inputCls} value={formModel} onChange={(e) => setFormModel(e.target.value)}>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
            <option value="gpt-4o-mini">GPT-4o-mini</option>
          </select>
        </ModalField>
        <ModalField label="描述">
          <input className={inputCls} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="输入Agent描述" />
        </ModalField>
        <ModalField label="System Prompt">
          <textarea className={inputCls} rows={4} value={formSystemPrompt} onChange={(e) => setFormSystemPrompt(e.target.value)} placeholder="定义Agent的行为指令..." />
        </ModalField>
      </Modal>
    
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason="AI代理列表需要专业版或企业版" feature="ai_agent_list" />
</div>
  );
}
