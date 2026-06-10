/**
 * Intent Fallback Form — shown when AI intent parsing fails.
 *
 * Instead of blocking the user, we give them a structured form
 * so they can complete their action manually.
 *
 * DR-52: 兜底原则 — AI交互/自动操作必须配备人工表单/手动修正入口
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

export function IntentFallbackForm({ open, onClose, guessedIntent, rawText, onSubmit }: FallbackFormProps) {
  const [title, setTitle] = useState(rawText.slice(0, 100));
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done' | 'blocked'>('in_progress');

  const handleSubmit = () => {
    if (guessedIntent === 'create_task' || guessedIntent === 'unknown') {
      onSubmit('create_task', { title, priority, due_date: dueDate || null });
    } else if (guessedIntent === 'update_task') {
      onSubmit('update_task', { status });
    } else {
      // Default: create a task from what user said
      onSubmit('create_task', { title, priority, due_date: dueDate || null });
    }
    onClose();
  };

  const isCreate = guessedIntent === 'create_task' || guessedIntent === 'create_goal' || guessedIntent === 'unknown';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCreate ? '创建任务' : '更新任务'}
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

        {/* Title */}
        {isCreate && (
          <ModalField label="任务标题">
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入任务标题"
              aria-label="任务标题"
            />
          </ModalField>
        )}

        {/* Priority */}
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

        {/* Due date */}
        {isCreate && (
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
