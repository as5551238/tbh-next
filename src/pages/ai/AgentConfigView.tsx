import { useState, useRef, useEffect } from 'react';
import { useAgentConfigs, useMatrixCell } from '@/hooks/useMatrix';
import { useAppStore } from '@/stores/appStore';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useMatrix';
import { setStoredModelId, AI_MODEL_PRESETS } from '@/lib/aiService';
import { Settings, Bot, Save, RotateCcw, Check } from 'lucide-react';
import { CardSkeleton } from '@/components/Skeleton';
import PaywallModal from '@/components/PaywallModal';
import { usePersistedState } from '@/hooks/usePersistedState';
import { t } from '@/lib/i18n';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const CONFIG_STORAGE_KEY = 'tbh-agent-configs';

function loadSavedConfigs(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveConfigsToStorage(configs: { id: string; model: string; temperature: number; max_tokens: number; system_prompt: string; schedule: string }[]) {
  try {
    const map: Record<string, unknown> = {};
    configs.forEach((c) => { map[c.id] = { model: c.model, temperature: c.temperature, max_tokens: c.max_tokens, system_prompt: c.system_prompt, schedule: c.schedule }; });
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(map));
    // Persist to Supabase
    if (isSupabaseConfigured() && supabase) {
      for (const [name, cfg] of Object.entries(map)) {
        const c = cfg as Record<string, unknown>;
        await supabase.from('agent_configs').upsert({
          name,
          model: c.model ?? '',
          temperature: c.temperature ?? 0.5,
          max_tokens: c.max_tokens ?? 2000,
          system_prompt: c.system_prompt ?? '',
          schedule: c.schedule ?? '',
          enabled: true,
          sort_order: 0,
          team_id: '__default__',
          member_id: 'demo',
        }, { onConflict: 'name' });
      }
    }
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
    setConfigs((prev) => prev.map((c) => saved[c.id] ? { ...c, ...(saved[c.id] as Record<string, unknown>) } : c));
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
    setToast(t('agentConfig.configSaved'));
    setTimeout(() => { setSaved(false); setToast(''); }, 2000);
  }

  function handleReset() {
    if (!originalRef.current) return;
    const orig = originalRef.current;
    setConfigs((prev) => prev.map((c) => c.id === resolvedId ? { ...c, model: orig.model, temperature: orig.temperature, max_tokens: orig.max_tokens, system_prompt: orig.system_prompt, schedule: orig.schedule } : c));
    setSaved(false);
    setToast(t('agentConfig.configReset'));
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
          <span className="text-xs font-bold">{t('agentConfig.selectAgent')}</span>
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
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <Settings size={16} className="text-primary-2" />
          <span className="text-sm font-bold">{selected.name} {t('agentConfig.configLabel')}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={handleReset} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-[10px] text-text-3 hover:text-text">
              <RotateCcw size={10} />{t('agentConfig.reset')}
            </button>
            <button onClick={handleSave} className="flex flex-wrap items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-semibold text-white hover:opacity-80">
              <Save size={10} />{saved ? t('agentConfig.saved') : t('agentConfig.save')}
            </button>
          </div>
        </div>

        <div className="p-3 md:p-4 space-y-4 max-w-2xl">
          {/* Model */}
          <div>
            <label htmlFor="agent-model" className="block text-[10px] font-bold text-text-3 mb-1.5">{t('agentConfig.model')}</label>
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
            <div className="flex justify-between text-[9px] text-text-3"><span>{t('agentConfig.precise')}</span><span>{t('agentConfig.creative')}</span></div>
          </div>

          {/* Max Tokens */}
          <div>
            <label htmlFor="agent-max-tokens" className="block text-[10px] font-bold text-text-3 mb-1.5">{t('agentConfig.maxTokens')}</label>
            <input id="agent-max-tokens" type="number" value={selected.max_tokens} onChange={(e) => updateConfig('max_tokens', parseInt(e.target.value))}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-primary"
            />
          </div>

          {/* System Prompt */}
          <div>
            <label htmlFor="agent-system-prompt" className="block text-[10px] font-bold text-text-3 mb-1.5">{t('agentConfig.systemPrompt')}</label>
            <textarea id="agent-system-prompt" value={selected.system_prompt} onChange={(e) => updateConfig('system_prompt', e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Schedule */}
          <div>
            <label htmlFor="agent-schedule" className="block text-[10px] font-bold text-text-3 mb-1.5">{t('agentConfig.schedule')}</label>
            <input id="agent-schedule" type="text" value={selected.schedule} onChange={(e) => updateConfig('schedule', e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>
    
      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason={t('agentConfig.paywallReason')} feature="ai_agent_config" />
</div>
  );
}
