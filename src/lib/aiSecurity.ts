/**
 * AI Security — 输入消毒 + 提示注入检测 + 输出校验
 *
 * 守门人要求(R2): EchoLeak(CVE-2025-32711, CVSS9.3)证明
 * 间接提示注入是AI系统致命攻击面。用户输入直传LLM
 * 无消毒=零防护。
 *
 * 策略:
 * 1. 输入消毒: 移除/转义注入模式, 截断超长输入
 * 2. 注入检测: 标记已知攻击模式, 注入率统计
 * 3. 输出校验: 检测系统提示泄露, 越权指令注入
 */

// ─── 输入消毒 ───

const INPUT_MAX_LENGTH = 4000;
const INPUT_MAX_LINES = 50;

/** 已知提示注入模式 */
const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string; severity: 'high' | 'medium' }> = [
  // Classic jailbreak
  { pattern: /ignore\s+(previous|above|all)\s+instructions/i, label: '经典越狱', severity: 'high' },
  { pattern: /forget\s+(everything|all|previous)/i, label: '遗忘指令', severity: 'high' },
  { pattern: /you\s+are\s+now\s+a/i, label: '角色替换', severity: 'high' },
  { pattern: /pretend\s+(you\s+are|to\s+be)/i, label: '伪装指令', severity: 'high' },
  { pattern: /act\s+as\s+(if\s+you|a)/i, label: '角色扮演', severity: 'high' },
  { pattern: /system\s*:\s*/i, label: '伪系统消息', severity: 'high' },
  { pattern: /\[system\]/i, label: '系统标签注入', severity: 'high' },
  // Data exfiltration
  { pattern: /reveal\s+(your|the)\s+(system|prompt|instructions)/i, label: '提示词窃取', severity: 'high' },
  { pattern: /show\s+me\s+(your|the)\s+(system|initial)/i, label: '初始指令探测', severity: 'high' },
  { pattern: /output\s+your\s+(system|prompt)/i, label: '提示词输出', severity: 'high' },
  // Command injection
  { pattern: /execute\s+(SQL|command|query|code)/i, label: '命令注入', severity: 'high' },
  { pattern: /DROP\s+TABLE/i, label: 'SQL注入', severity: 'high' },
  { pattern: /UNION\s+SELECT/i, label: 'SQL注入', severity: 'high' },
  // Lower severity
  { pattern: /repeat\s+(after\s+me|the\s+following)/i, label: '重复注入', severity: 'medium' },
  { pattern: /translate\s+this\s+to/i, label: '翻译通道', severity: 'medium' },
];

export interface SanitizeResult {
  sanitized: string;
  warnings: string[];
  blocked: boolean;
  blockReason?: string;
  injectionDetected: Array<{ label: string; severity: string }>;
}

/**
 * 消毒用户输入:
 * 1. 检测提示注入 -> 标记高危
 * 2. 截断超长/多行输入
 * 3. 移除零宽字符
 * 4. 转义系统消息伪装
 */
export function sanitizeInput(raw: string): SanitizeResult {
  const warnings: string[] = [];
  const injectionDetected: Array<{ label: string; severity: string }> = [];
  let input = raw;

  // Remove zero-width characters
  input = input.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');

  // Detect injection patterns (don't modify, just flag)
  for (const { pattern, label, severity } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      injectionDetected.push({ label, severity });
    }
  }

  // Block if any high-severity injection detected
  const hasHighSeverity = injectionDetected.some((i) => i.severity === 'high');
  if (hasHighSeverity) {
    return {
      sanitized: '',
      warnings: ['检测到高风险提示注入攻击, 输入已被拦截'],
      blocked: true,
      blockReason: injectionDetected.filter((i) => i.severity === 'high').map((i) => i.label).join(', '),
      injectionDetected,
    };
  }

  // Warn for medium-severity
  if (injectionDetected.length > 0) {
    warnings.push(`检测到可疑模式: ${injectionDetected.map((i) => i.label).join(', ')}`);
  }

  // Strip [system] tags to prevent role confusion
  input = input.replace(/\[(system|assistant|user)\]\s*/gi, '');

  // Truncate overly long input
  if (input.length > INPUT_MAX_LENGTH) {
    warnings.push(`输入已截断: ${input.length} → ${INPUT_MAX_LENGTH} 字符`);
    input = input.slice(0, INPUT_MAX_LENGTH);
  }

  // Limit line count
  const lines = input.split('\n');
  if (lines.length > INPUT_MAX_LINES) {
    warnings.push(`行数已截断: ${lines.length} → ${INPUT_MAX_LINES} 行`);
    input = lines.slice(0, INPUT_MAX_LINES).join('\n');
  }

  return {
    sanitized: input,
    warnings,
    blocked: false,
    injectionDetected,
  };
}

// ─── 输出校验 ───

export interface OutputValidation {
  valid: boolean;
  violations: string[];
}

/** 检测AI输出中的安全违规 */
export function validateAIOutput(output: string): OutputValidation {
  const violations: string[] = [];

  // System prompt leakage
  if (/你是一个|你是「团队业务中台」|buildSystemPrompt/.test(output)) {
    violations.push('输出中包含系统提示词内容');
  }

  // Generated code that could be harmful
  if (/eval\s*\(|Function\s*\(|document\.write/i.test(output)) {
    violations.push('输出中包含潜在危险代码');
  }

  // Data exfiltration indicator
  if (/VITE_|API_KEY|SUPABASE|ANON_KEY|password|secret/i.test(output)) {
    violations.push('输出中可能包含敏感环境变量/凭证');
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// ─── 注入统计 ───

const injectionStats = {
  totalChecked: 0,
  totalBlocked: 0,
  byPattern: {} as Record<string, number>,
};

export function getInjectionStats() {
  return { ...injectionStats };
}

export function recordInjectionCheck(result: SanitizeResult) {
  injectionStats.totalChecked++;
  if (result.blocked) injectionStats.totalBlocked++;
  for (const det of result.injectionDetected) {
    injectionStats.byPattern[det.label] = (injectionStats.byPattern[det.label] ?? 0) + 1;
  }
}
