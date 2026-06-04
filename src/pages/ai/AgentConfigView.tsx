import { useState } from 'react';
import { useMatrixCell } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { Settings, Bot, Save, RotateCcw } from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  schedule: string;
  enabled: boolean;
}

const MOCK_CONFIGS: AgentConfig[] = [
  { id: 'AG-001', name: '产品分析师', model: 'gpt-4o', temperature: 0.3, maxTokens: 4096, systemPrompt: '你是一位专业的产品分析师，负责PRD撰写和需求分析。始终基于数据做判断，保持客观中立。', schedule: '每日08:00自动运行', enabled: true },
  { id: 'AG-002', name: '竞品侦探', model: 'claude-3.5-sonnet', temperature: 0.5, maxTokens: 4096, systemPrompt: '你是竞品监控专家，持续追踪竞品动态并提供深度分析。', schedule: '每日09:00自动运行', enabled: true },
  { id: 'AG-003', name: '数据看门人', model: 'gpt-4o', temperature: 0.2, maxTokens: 2048, systemPrompt: '你是数据监控专家，追踪核心KPI指标，发现异常立即告警。', schedule: '每小时检测', enabled: true },
];

export default function AgentConfigView() {
  const [configs, setConfigs] = useState(MOCK_CONFIGS);
  const [selectedId, setSelectedId] = useState(MOCK_CONFIGS[0].id);
  const selected = configs.find((c) => c.id === selectedId)!;

  function updateConfig(field: keyof AgentConfig, value: any) {
    setConfigs((prev) => prev.map((c) => c.id === selectedId ? { ...c, [field]: value } : c));
  }

  return (
    <div className="flex h-full">
      {/* Agent List */}
      <div className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-3 py-2.5">
          <span className="text-xs font-bold">选择Agent</span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {configs.map((cfg) => (
            <button
              key={cfg.id}
              onClick={() => setSelectedId(cfg.id)}
              className={cn('flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors',
                selectedId === cfg.id ? 'bg-primary/10 font-semibold text-primary-2' : 'text-text-2 hover:bg-surface-2'
              )}
            >
              <Bot size={14} className="shrink-0" />
              <span className="truncate">{cfg.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Config Form */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Settings size={16} className="text-primary-2" />
          <span className="text-sm font-bold">{selected.name} 配置</span>
          <div className="ml-auto flex gap-2">
            <button className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] text-text-3 hover:text-text">
              <RotateCcw size={10} />重置
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10] font-semibold text-white hover:opacity-80">
              <Save size={10} />保存
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-2xl">
          {/* Model */}
          <div>
            <label className="block text-[10px] font-bold text-text-3 mb-1.5">模型</label>
            <select value={selected.model} onChange={(e) => updateConfig('model', e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-primary"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="gpt-4o-mini">GPT-4o-mini</option>
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-[10px] font-bold text-text-3 mb-1.5">Temperature: {selected.temperature}</label>
            <input type="range" min="0" max="1" step="0.1" value={selected.temperature}
              onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[9px] text-text-3"><span>精确(0)</span><span>创意(1)</span></div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-[10px] font-bold text-text-3 mb-1.5">最大Token数</label>
            <input type="number" value={selected.maxTokens} onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-primary"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-[10px] font-bold text-text-3 mb-1.5">系统提示词</label>
            <textarea value={selected.systemPrompt} onChange={(e) => updateConfig('systemPrompt', e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-[10px] font-bold text-text-3 mb-1.5">执行计划</label>
            <input type="text" value={selected.schedule} onChange={(e) => updateConfig('schedule', e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
