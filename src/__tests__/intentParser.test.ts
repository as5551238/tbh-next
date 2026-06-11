import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  supabase: null,
}));
vi.mock('@/lib/dataLayer', () => ({
  fetchGoals: vi.fn(),
  fetchTasks: vi.fn(),
  fetchRisks: vi.fn(),
}));
vi.mock('@/stores/appStore', () => ({
  useAppStore: { getState: () => ({ activeModule: 'tasks' }) },
}));
vi.mock('@/lib/aiTools', () => ({
  executeToolCall: vi.fn(),
  isValidTool: vi.fn(),
}));

import { detectIntentFast } from '@/lib/intentParser';
import type { IntentType } from '@/lib/intentParser';

const KNOWN_INTENTS: IntentType[] = [
  'create_task',
  'update_task',
  'create_goal',
  'query_progress',
  'query_risks',
  'query_schedule',
  'create_action_item',
  'chitchat',
];

describe('parseIntentL0 (detectIntentFast) — keyword matches', () => {
  it('returns create_task for "创建任务"', () => {
    const result = detectIntentFast('创建任务');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('create_task');
  });

  it('returns query_progress for "查看进度"', () => {
    const result = detectIntentFast('查看进度');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('query_progress');
  });

  it('returns query_risks for "查看风险报告"', () => {
    const result = detectIntentFast('查看风险报告');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('query_risks');
  });

  it('returns chitchat for greeting "你好"', () => {
    const result = detectIntentFast('你好');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('chitchat');
  });

  it('returns create_goal for "创建目标"', () => {
    const result = detectIntentFast('创建目标');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('create_goal');
  });

  it('returns update_task for "修改任务状态"', () => {
    const result = detectIntentFast('修改任务状态');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('update_task');
  });

  it('returns create_action_item for "创建行动项"', () => {
    const result = detectIntentFast('创建行动项');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('create_action_item');
  });

  it('returns query_schedule for "查看日程"', () => {
    const result = detectIntentFast('查看日程');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('query_schedule');
  });
});

describe('parseIntentL0 — unrecognized input', () => {
  it('returns null for unrecognized input', () => {
    const result = detectIntentFast('xyzzy foobar baz');
    expect(result).toBeNull();
  });
});

describe('isValidIntent (via detectIntentFast behavior)', () => {
  it('all known intents produce non-null results with valid structure', () => {
    const inputs: Record<string, string> = {
      create_task: '创建任务',
      update_task: '修改任务状态',
      create_goal: '创建目标',
      query_progress: '查看进度',
      query_risks: '查看风险',
      query_schedule: '查看日程',
      create_action_item: '创建行动项',
      chitchat: '你好',
    };
    for (const [intent, input] of Object.entries(inputs)) {
      const result = detectIntentFast(input);
      expect(result, `intent "${intent}" should be detected`).not.toBeNull();
      expect(result!.intent).toBe(intent);
      expect(result!.intent).not.toBe('unknown');
    }
  });

  it('unrecognized input yields null (treated as unknown)', () => {
    const result = detectIntentFast('完全无法识别的asdkjfh');
    expect(result).toBeNull();
  });
});

describe('INTENT_REGISTRY — all known intents observable via detectIntentFast', () => {
  it('each known intent can be triggered and returns correct toolName and params', () => {
    const cases: Array<{
      input: string;
      expectedIntent: IntentType;
      expectedToolName: string;
    }> = [
      { input: '创建任务', expectedIntent: 'create_task', expectedToolName: 'create_task' },
      { input: '修改任务状态', expectedIntent: 'update_task', expectedToolName: 'update_task_status' },
      { input: '创建目标', expectedIntent: 'create_goal', expectedToolName: 'create_goal' },
      { input: '查看进度', expectedIntent: 'query_progress', expectedToolName: 'get_team_metrics' },
      { input: '查看风险预警', expectedIntent: 'query_risks', expectedToolName: 'get_deviation_alerts' },
      { input: '查看日程安排', expectedIntent: 'query_schedule', expectedToolName: 'get_schedule_events' },
      { input: '创建行动项', expectedIntent: 'create_action_item', expectedToolName: 'create_action_item' },
      { input: '你好', expectedIntent: 'chitchat', expectedToolName: '' },
    ];

    for (const { input, expectedIntent, expectedToolName } of cases) {
      const result = detectIntentFast(input);
      expect(result, `input "${input}" should match intent "${expectedIntent}"`).not.toBeNull();
      expect(result!.intent).toBe(expectedIntent);
      expect(result!.toolName).toBe(expectedToolName);
      expect(typeof result!.params).toBe('object');
    }
  });
});

describe('extractParams — basic cases', () => {
  it('extracts title from "新建任务重构代码"', () => {
    const result = detectIntentFast('新建任务重构代码');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('create_task');
    expect(result!.params.title).toBeTruthy();
  });

  it('extracts title from "创建任务：重构代码" (colon-separated)', () => {
    const result = detectIntentFast('创建任务：重构代码');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('create_task');
    expect(result!.params).toHaveProperty('title');
  });

  it('extracts urgent priority', () => {
    const result = detectIntentFast('紧急创建任务');
    expect(result).not.toBeNull();
    expect(result!.params.priority).toBe('urgent');
  });

  it('extracts high priority', () => {
    const result = detectIntentFast('创建任务 高优先');
    expect(result).not.toBeNull();
    expect(result!.params.priority).toBe('high');
  });

  it('defaults to medium priority when none specified', () => {
    const result = detectIntentFast('创建任务');
    expect(result).not.toBeNull();
    expect(result!.params.priority).toBe('medium');
  });

  it('extracts done status from "完成任务"', () => {
    const result = detectIntentFast('完成任务');
    expect(result).not.toBeNull();
    expect(result!.intent).toBe('update_task');
    expect(result!.params.status).toBe('done');
  });

  it('chitchat returns empty params', () => {
    const result = detectIntentFast('你好');
    expect(result).not.toBeNull();
    expect(result!.params).toEqual({});
  });

  it('detectIntentFast result has fallback=false for recognized inputs', () => {
    const result = detectIntentFast('创建任务');
    expect(result).not.toBeNull();
    expect(result!.fallback).toBe(false);
  });

  it('detectIntentFast result has rawText equal to input', () => {
    const result = detectIntentFast('查看进度');
    expect(result).not.toBeNull();
    expect(result!.rawText).toBe('查看进度');
  });
});
