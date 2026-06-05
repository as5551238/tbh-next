/**
 * Agent Harness — 行为约束 + 审计追踪 + 自动回滚
 *
 * 守门人要求(R1): AI Agent必须具备Harness三要素:
 * 1. 行为约束: 输入/输出边界检查, 禁止操作拦截
 * 2. 审计追踪: 所有Agent交互可追溯, 可审查
 * 3. 自动回滚: 约束违反或执行失败时自动降级到安全状态
 *
 * 参考: OpenClaw事件(77万Agent同时沦陷)证明Harness是刚需
 */

// ─── 行为约束 ───

export interface AgentConstraints {
  maxOutputTokens: number;
  maxConversationTurns: number;
  forbiddenActionPatterns: RegExp[];
  maxExecutionTimeMs: number;
  maxRetryCount: number;
  /** If true, agent output must not contain PII-like patterns */
  requirePiiFilter: boolean;
}

export const DEFAULT_CONSTRAINTS: Record<string, AgentConstraints> = {
  'morning-brief': {
    maxOutputTokens: 512,
    maxConversationTurns: 10,
    forbiddenActionPatterns: [
      /删除|drop|delete|remove.*数据/i,
      /修改权限|grant|revoke/i,
      /系统配置|admin.*setting/i,
    ],
    maxExecutionTimeMs: 30_000,
    maxRetryCount: 2,
    requirePiiFilter: true,
  },
  'progress-tracker': {
    maxOutputTokens: 1024,
    maxConversationTurns: 15,
    forbiddenActionPatterns: [
      /删除|drop|delete|remove.*数据/i,
      /修改权限|grant|revoke/i,
      /系统配置|admin.*setting/i,
    ],
    maxExecutionTimeMs: 30_000,
    maxRetryCount: 2,
    requirePiiFilter: true,
  },
  'risk-monitor': {
    maxOutputTokens: 1024,
    maxConversationTurns: 15,
    forbiddenActionPatterns: [
      /删除|drop|delete|remove.*数据/i,
      /修改权限|grant|revoke/i,
      /系统配置|admin.*setting/i,
    ],
    maxExecutionTimeMs: 30_000,
    maxRetryCount: 2,
    requirePiiFilter: true,
  },
  _general: {
    maxOutputTokens: 1024,
    maxConversationTurns: 20,
    forbiddenActionPatterns: [
      /删除|drop|delete|remove.*数据/i,
      /修改权限|grant|revoke/i,
      /系统配置|admin.*setting/i,
    ],
    maxExecutionTimeMs: 30_000,
    maxRetryCount: 2,
    requirePiiFilter: true,
  },
};

// ─── 审计追踪 ───

export interface AuditEntry {
  id: string;
  agentId: string;
  timestamp: string;
  input: string;
  output: string;
  route: 'direct' | 'edge' | 'local';
  constraintsViolated: string[];
  executionTimeMs: number;
  tokenUsage?: { prompt: number; completion: number };
  status: 'success' | 'violation' | 'error' | 'rolled_back';
}

const MAX_AUDIT_ENTRIES = 500;

class AgentAuditStore {
  private entries: AuditEntry[] = [];

  constructor() {
    this.load();
  }

  add(entry: AuditEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_AUDIT_ENTRIES) {
      this.entries = this.entries.slice(-MAX_AUDIT_ENTRIES);
    }
    this.persist();
  }

  getAll(): AuditEntry[] {
    return [...this.entries];
  }

  getByAgent(agentId: string): AuditEntry[] {
    return this.entries.filter((e) => e.agentId === agentId);
  }

  getViolations(): AuditEntry[] {
    return this.entries.filter(
      (e) => e.status === 'violation' || e.constraintsViolated.length > 0
    );
  }

  getRecent(count: number): AuditEntry[] {
    return this.entries.slice(-count);
  }

  private load(): void {
    try {
      const raw = localStorage.getItem('tbh-agent-audit');
      if (raw) this.entries = JSON.parse(raw);
    } catch {
      this.entries = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem('tbh-agent-audit', JSON.stringify(this.entries));
    } catch {
      // storage full — drop oldest half
      this.entries = this.entries.slice(-Math.floor(MAX_AUDIT_ENTRIES / 2));
    }
  }
}

export const auditStore = new AgentAuditStore();

// ─── 自动回滚 ───

export interface RollbackResult {
  rolledBack: boolean;
  reason: string;
  fallbackOutput: string;
}

function safeFallback(agentId: string, reason: string): string {
  return [
    `⚠️ Agent「${agentId}」响应已被安全拦截。`,
    `原因：${reason}`,
    '',
    '该请求可能涉及不允许的操作。如需执行此操作，请联系管理员。',
  ].join('\n');
}

// ─── Harness 主入口 ───

export function createHarness(agentId: string) {
  const constraints = DEFAULT_CONSTRAINTS[agentId] ?? DEFAULT_CONSTRAINTS._general;

  return {
    constraints,

    /** 校验用户输入是否触发禁止操作 */
    validateInput(input: string): { valid: boolean; violations: string[] } {
      const violations: string[] = [];
      for (const pattern of constraints.forbiddenActionPatterns) {
        if (pattern.test(input)) {
          violations.push(`输入触发禁止模式: ${pattern.source}`);
        }
      }
      return { valid: violations.length === 0, violations };
    },

    /** 校验AI输出是否越界 */
    validateOutput(output: string): { valid: boolean; violations: string[] } {
      const violations: string[] = [];

      // Token limit check (rough: 1 token ≈ 4 chars for Chinese)
      const estimatedTokens = Math.ceil(output.length / 3.5);
      if (estimatedTokens > constraints.maxOutputTokens) {
        violations.push(
          `输出预估${estimatedTokens}tokens, 超过限制${constraints.maxOutputTokens}`
        );
      }

      // PII leak check
      if (constraints.requirePiiFilter) {
        const piiPatterns = [
          /\b\d{11}\b/g, // phone number
          /\b[\w.-]+@[\w.-]+\.\w+\b/, // email
          /\b\d{6,19}\b/, // ID card or bank card
        ];
        for (const p of piiPatterns) {
          if (p.test(output)) {
            violations.push('输出中可能包含个人敏感信息(PII)');
            break;
          }
        }
      }

      // Output should not contain system prompt leakage
      if (/你是|你是一个|system prompt/i.test(output) && output.length < 50) {
        violations.push('输出疑似系统提示词泄露');
      }

      return { valid: violations.length === 0, violations };
    },

    /** 执行回滚 — 用安全回退替代违规输出 */
    rollback(reason: string): RollbackResult {
      return {
        rolledBack: true,
        reason,
        fallbackOutput: safeFallback(agentId, reason),
      };
    },

    /** 记录审计日志 */
    audit(params: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
      const entry: AuditEntry = {
        ...params,
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
      };
      auditStore.add(entry);
      return entry;
    },
  };
}

export type AgentHarness = ReturnType<typeof createHarness>;
