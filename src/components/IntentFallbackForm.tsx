/**
 * Intent Fallback Form — shown when AI intent parsing fails.
 *
 * Instead of blocking the user, we give them a structured form
 * so they can complete their action manually.
 *
 * DR-52: 兜底原则 — AI交互/自动操作必须配备人工表单/手动修正入口
 *
 * v2: Supports create_task, update_task, create_goal, create_action_item
 *     and provides quick-suggestion chips based on recent context.
 */

import { useState } from 'react';
import { Modal, ModalField, inputCls, btnPrimary, btnSecondary } from '@/components/Modal';
import type { IntentType } from '@/lib/intentParser';

interface FallbackFormProps {
  open: boolean;
  onClose: () => void;
  guessedIntent: IntentType;
  rawText: string;
  onSubmit: (intent: IntentType, params: Record<string, unknown>) => void;
}

type FormMode = 'create_task' | 'update_task' | 'create_goal' | 'create_action_item';

const MODE_LABELS: Record<FormMode, string> = {
  create_task: '创建任务',
  update_task: '更新任务',
  create_goal: '创建目标',
  create_action_item: '创建行动项',
};

const INTENT_TO_MODE: Partial<Record<IntentType, FormMode>> = {
  create_task: 'create_task',
  update_task: 'update_task',
  create_goal: 'create_goal',
  create_action_item: 'create_action_item',
};

const QUICK_SUGGESTIONS = [
  { label: '创建任务', intent: 'create_task' as IntentType },
  { label: '更新任务状态', intent: 'update_task' as IntentType },
  { label: '创建目标', intent: 'create_goal' as IntentType },
  { label: '创建行动项', intent: 'create_action_item' as IntentType },
];

export function IntentFallbackForm({ open, onClose, guessedIntent, rawText, onSubmit }: FallbackFormProps) {
  const initialMode = INTENT_TO_MODE[guessedIntent] ?? 'create_task';
  const [mode, setMode] = useState<FormMode>(initialMode);
  const [title, setTitle] = useState(rawText.slice(0, 100));
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done' | 'blocked'>('in_progress');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    switch (mode) {
      case 'create_task':
        onSubmit('create_task', { title, priority, due_date: dueDate || null, description: description || undefined });
        break;
      case 'create_goal':
        onSubmit('create_goal', { title, description: description || undefined });
        break;
      case 'create_action_item':
        onSubmit('create_action_item', { title, priority, description: description || undefined });
        break;
      case 'update_task':
        onSubmit('update_task', { status });
        break;
    }
    onClose();
  };

  const handleSuggestionClick = (intent: IntentType) => {
    const m = INTENT_TO_MODE[intent];
    if (m) setMode(m);
  };

  const isCreate = mode !== 'update_task';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={MODE_LABELS[mode]}
      footer={
        <div className="flex gap-2 justify-end">
          <button className={btnSecondary} onClick={onClose}>取消</button>
          <button className={btnPrimary} onClick={handleSubmit}>{isCreate ? '创建' : '更新'}</button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Hint about what user tried to do */}
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-text-2">
          AI未能完全理解您的意图，请手动填写以下信息：
        </div>

        {/* Quick suggestion chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s.intent}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                mode === INTENT_TO_MODE[s.intent]
                  ? 'bg-primary text-white'
                  : 'bg-bg-2 text-text-2 hover:bg-bg-3'
              }`}
              onClick={() => handleSuggestionClick(s.intent)}
              type="button"
              aria-label={s.label}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Title */}
        {isCreate && (
          <ModalField label="标题">
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'create_goal' ? '输入目标标题' : mode === 'create_action_item' ? '输入行动项描述' : '输入任务标题'}
              aria-label="标题"
            />
          </ModalField>
        )}

        {/* Description (for create modes) */}
        {isCreate && mode !== 'update_task' && (
          <ModalField label="描述">
            <textarea
              className={inputCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选：添加描述说明"
              rows={2}
              aria-label="描述"
            />
          </ModalField>
        )}

        {/* Priority */}
        {mode !== 'create_goal' && (
          <ModalField label="优先级">
            <select
              className={inputCls}
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              aria-label="优先级"
            >
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </ModalField>
        )}

        {/* Due date */}
        {isCreate && (mode === 'create_task' || mode === 'create_action_item') && (
          <ModalField label="截止日期">
            <input
              type="date"
              className={inputCls}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="截止日期"
            />
          </ModalField>
        )}

        {/* Status (for update intent) */}
        {!isCreate && (
          <ModalField label="任务状态">
            <select
              className={inputCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              aria-label="任务状态"
            >
              <option value="todo">待办</option>
              <option value="in_progress">进行中</option>
              <option value="done">已完成</option>
              <option value="blocked">阻塞</option>
            </select>
          </ModalField>
        )}
      </div>
    </Modal>
  );
}
