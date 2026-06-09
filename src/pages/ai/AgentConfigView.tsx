import { useState, useRef, useEffect } from 'react';
import { useAgentConfigs, useMatrixCell } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useMatrix';
import { setStoredModelId, AI_MODEL_PRESETS } from '@/lib/aiService';
import { Settings, Bot, Save, RotateCcw, Loader2, Check } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import { hasFeature } from '@/lib/subscription';
import PaywallModal from '@/components/PaywallModal';

const CONFIG_STORAGE_KEY = 'tbh-agent-configs';

function loadSavedConfigs(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveConfigsToStorage(configs: { id: string; model: string; temperature: number; max_tokens: number; system_prompt: string; schedule: string }[]) {
  try {
    const map: Record<string, unknown> = {};
    configs.forEach((c) => { map[c.id] = { model: c.model, temperature: c.temperature, max_tokens: c.max_tokens, system_prompt: c.system_prompt, schedule: c.schedule }; });
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(map));
  } catch { /* quota exceeded - silent */ }
}

export default function AgentConfigView() {
  const [showPaywall, setShowPaywall] = useState(false);
  const { configs, setConfigs, saveConfig, loading } = useAgentConfigs();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');
  const resolvedId = selectedId ?? configs[0]?.id ?? '';
  const selected = configs.find((c) => c.id === resolvedId);

  // Apply saved localStorage configs on load
  useEffect(() => {
    if (configs.length === 0) return;
    const saved = loadSavedConfigs();
    if (Object.keys(saved).length === 0) return;
    setConfigs((prev) => prev.map((c) => saved[c.id] ? { ...c, ...saved[c.id] } : c));
  }, [configs.length > 0]);

  const originalRef = useRef<typeof selected>(null);

  useEffect(() => {
    if (selected) {
      originalRef.current = { ...selected };
    }
  }, [resolvedId]);

  function updateConfig(field: string, value: unknown) {
    setConfigs((prev) => prev.map((c) => c.id === resolvedId ? { ...c, [field]: value } : c));
    setSaved(false);
  }

  async function handleSave() {
    originalRef.current = selected ? { ...selected } : null;
    saveConfigsToStorage(configs);
    // S8.3: Also persist to Supabase
    if (selected) {
      try {
        await saveConfig(selected);
        // Sync selected agent's model to global AI model store
        const presetId = AI_MODEL_PRESETS.find((p) => p.model === selected.model)?.id;
        if (presetId) setStoredModelId(presetId);
      } catch (err) {
        console.warn('Failed to save agent config to Supabase:', err);
      }
    }
    setSaved(true);
    setToast('配置已保存');
    setTimeout(() => { setSaved(false); setToast(''); }, 2000);
  }

  function handleReset() {
    if (!originalRef.current) return;
    const orig = originalRef.current;
    setConfigs((prev) => prev.map((c) => c.id === resolvedId ? { ...c, model: orig.model, temperature: orig.temperature, max_tokens: orig.max_tokens, system_prompt: orig.system_prompt, schedule: orig.schedule } : c));
    setSaved(false);
    setToast('已重置');
    setTimeout(() => setToast(''), 1500);
  }

  if (loading || !selected) {
    return (
      <CardSkeleton />
    );
  }

  return (
    <div className="flex h-full">
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-success/90 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          <Check size={12} className="mr-1.5 inline" />{toast}
        </div>
      )}
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
                resolvedId === cfg.id ? 'bg-primary/10 font-semibold text-primary-2' : 'text-text-2 hover:bg-surface-2'
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
            <button onClick={handleReset} className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] text-text-3 hover:text-text">
              <RotateCcw size={10} />重置
            </button>
            <button onClick={handleSave} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-white hover:opacity-80">
              <Save size={10} />{saved ? '已保存' : '保存'}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-2xl">
          {/* Model */}
          <div>
            <label htmlFor="agent-model" className="block text-[10px] font-bold text-text-3 mb-1.5">模型</label>
            <select id="agent-model" value={selected.model} onChange={(e) => updateConfig('model', e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-primary"
            >
              {AI_MODEL_PRESETS.map((p) => (
                <option key={p.id} value={p.model}>{p.name} ({p.model})</option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label htmlFor="agent-temperature" className="block text-[10px] font-bold text-text-3 mb-1.5">Temperature: {selected.temperature}</label>
            <input id="agent-temperature" type="range" min="0" max="1" step="0.1" value={selected.temperature}
              onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[9px] text-text-3"><span>精确(0)</span><span>创意(1)</span></div>
          </div>

          {/* Max Tokens */}
          <div>
            <label htmlFor="agent-max-tokens" className="block text-[10px] font-bold text-text-3 mb-1.5">最大Token数</label>
            <input id="agent-max-tokens" type="number" value={selected.max_tokens} onChange={(e) => updateConfig('max_tokens', parseInt(e.target.value))}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-primary"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label htmlFor="agent-system-prompt" className="block text-[10px] font-bold text-text-3 mb-1.5">系统提示词</label>
            <textarea id="agent-system-prompt" value={selected.system_prompt} onChange={(e) => updateConfig('system_prompt', e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Schedule */}
          <div>
            <label htmlFor="agent-schedule" className="block text-[10px] font-bold text-text-3 mb-1.5">执行计划</label>
            <input id="agent-schedule" type="text" value={selected.schedule} onChange={(e) => updateConfig('schedule', e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>
    
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason="AI代理配置需要专业版或企业版" feature="ai_agent_config" />
</div>
  );
}
