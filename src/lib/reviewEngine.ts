/**
 * MLOO-Lite 复盘引擎 — 隐性闭环核心
 *
 * 3个核心复盘模型：GRAI / PDCA / 5Whys
 * + rule-based推荐引擎（不调LLM，零Token消耗）
 * + AI一键复盘草稿生成（调LLM）
 * + 行动项自动转任务
 */

// --- Types ---

export interface ReviewStep {
  id: string;
  title: string;
  prompt: string;         // 分步引导提示
  placeholder: string;    // 输入占位
  required: boolean;
}

export interface ReviewModel {
  id: 'grai' | 'pdca' | '5whys';
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  scenarioTags: string[];     // 适配场景标签
  steps: ReviewStep[];
  outputTemplate: string;     // Handlebars-like模板
}

export interface ReviewSession {
  id: string;
  modelId: ReviewModel['id'];
  targetType: 'goal' | 'project' | 'task' | 'sprint';
  targetId: string;
  targetTitle: string;
  currentStep: number;
  inputs: Record<string, string>;  // stepId → user input
  status: 'in_progress' | 'draft_ready' | 'completed';
  draft: string;
  actionItems: ReviewActionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewActionItem {
  id: string;
  text: string;
  assignee: string;
  deadline: string;
  status: 'pending' | 'converted' | 'done';
  linkedTaskId: string | null;
}

// --- 3 Core Review Models ---

export const REVIEW_MODELS: ReviewModel[] = [
  {
    id: 'grai',
    name: 'GRAI 目标复盘',
    nameEn: 'Goal-Result-Analysis-Insight',
    description: '最经典的目标复盘框架，适合OKR周期复盘、季度回顾',
    icon: '🎯',
    scenarioTags: ['目标偏差', 'OKR评分', '季度复盘', '目标未达成', '目标超额完成'],
    steps: [
      { id: 'goal', title: 'Goal — 回顾目标', prompt: '当初设定的目标是什么？期望达成的结果是什么？', placeholder: '例如：Q2用户增长目标10万DAU，转化率提升5%', required: true },
      { id: 'result', title: 'Result — 评估结果', prompt: '实际达成了什么？与目标的偏差有多大？', placeholder: '例如：实际DAU 8.5万（偏差-15%），转化率提升3.2%', required: true },
      { id: 'analysis', title: 'Analysis — 分析原因', prompt: '造成偏差的核心原因是什么？（主客观因素都要分析）', placeholder: '例如：主观-投放策略调整延迟2周；客观-竞品同期大促分流', required: true },
      { id: 'insight', title: 'Insight — 提炼洞察', prompt: '从中提炼出哪些可复用的经验？下周期应如何调整？', placeholder: '例如：投放策略需提前1个月锁定；竞品大促期需准备防御方案', required: true },
    ],
    outputTemplate: `# 🎯 GRAI 目标复盘：{{targetTitle}}

## Goal — 目标
{{goal}}

## Result — 结果
{{result}}

## Analysis — 分析
{{analysis}}

## Insight — 洞察
{{insight}}

## 行动项
{{actionItems}}`,
  },
  {
    id: 'pdca',
    name: 'PDCA 流程纠偏',
    nameEn: 'Plan-Do-Check-Act',
    description: '流程优化和执行纠偏的经典框架，适合Sprint复盘、项目中期检查',
    icon: '🔄',
    scenarioTags: ['流程偏差', 'Sprint复盘', '项目延期', '质量不达标', '效率下降', '执行偏差'],
    steps: [
      { id: 'plan', title: 'Plan — 计划是什么', prompt: '原计划是什么？关键里程碑和交付标准是什么？', placeholder: '例如：3月完成V2.0上线，包含5个核心功能，通过UAT测试', required: true },
      { id: 'do', title: 'Do — 实际做了什么', prompt: '实际执行情况如何？哪些完成了，哪些没有？', placeholder: '例如：完成3个功能，2个延期至4月，UAT发现12个缺陷', required: true },
      { id: 'check', title: 'Check — 检验偏差', prompt: '计划和实际的差异在哪里？数据指标说明了什么？', placeholder: '例如：进度偏差40%，主要阻塞在API联调环节，人均产出从5点/天降至3点/天', required: true },
      { id: 'act', title: 'Act — 改进措施', prompt: '如何改进？下一步具体行动是什么？', placeholder: '例如：API联调改为前后端并行开发+契约测试；每日15min站会锁定阻塞项', required: true },
    ],
    outputTemplate: `# 🔄 PDCA 流程纠偏：{{targetTitle}}

## Plan — 计划
{{plan}}

## Do — 执行
{{do}}

## Check — 检验
{{check}}

## Act — 改进
{{act}}

## 行动项
{{actionItems}}`,
  },
  {
    id: '5whys',
    name: '5Whys 根因分析',
    nameEn: '5 Whys Root Cause Analysis',
    description: '连续追问"为什么"找到根本原因，适合问题诊断、故障复盘',
    icon: '🔍',
    scenarioTags: ['故障复盘', '问题诊断', '质量事故', '客户投诉', '安全事故', '生产异常'],
    steps: [
      { id: 'problem', title: '定义问题', prompt: '发生了什么问题？具体表现是什么？', placeholder: '例如：3月15日生产批次B的产品不合格率达3.2%（目标<0.5%）', required: true },
      { id: 'why1', title: '为什么 #1', prompt: '为什么会出现这个问题？', placeholder: '第一层原因', required: true },
      { id: 'why2', title: '为什么 #2', prompt: '为什么会产生上述原因？', placeholder: '第二层原因', required: false },
      { id: 'why3', title: '为什么 #3', prompt: '继续深挖为什么？', placeholder: '第三层原因', required: false },
      { id: 'why4', title: '为什么 #4', prompt: '再追问一层？', placeholder: '第四层原因', required: false },
      { id: 'why5', title: '为什么 #5 — 根因', prompt: '最终的根因是什么？', placeholder: '第五层——根本原因', required: true },
      { id: 'solution', title: '根治方案', prompt: '基于根因，彻底解决问题的方案是什么？', placeholder: '针对根因的根治措施，而非头痛医头', required: true },
    ],
    outputTemplate: `# 🔍 5Whys 根因分析：{{targetTitle}}

## 问题定义
{{problem}}

## 根因追溯链
1. {{why1}}
2. {{why2}}
3. {{why3}}
4. {{why4}}
5. **根因**: {{why5}}

## 根治方案
{{solution}}

## 行动项
{{actionItems}}`,
  },
];

// --- Rule-based Recommendation Engine (zero token cost) ---

export interface ReviewContext {
  targetTitle: string;
  targetType: 'goal' | 'project' | 'task' | 'sprint';
  progress: number;          // 0-100
  status: string;
  deviationPercent: number;  // deviation from plan, negative=behind, positive=ahead
  tags: string[];            // free-form context tags
  daysRemaining: number;
  isOverdue: boolean;
}

/**
 * 推荐最合适的复盘模型 — 纯规则引擎，零Token消耗
 * 返回按匹配度排序的模型列表
 */
export function recommendModels(ctx: ReviewContext): { model: ReviewModel; score: number; reason: string }[] {
  const results: { model: ReviewModel; score: number; reason: string }[] = [];

  for (const model of REVIEW_MODELS) {
    let score = 0;
    let reason = '';

    // 规则1：场景标签匹配
    for (const tag of ctx.tags) {
      if (model.scenarioTags.some((st) => tag.includes(st) || st.includes(tag))) {
        score += 40;
      }
    }

    // 规则2：目标类型匹配
    if (model.id === 'grai' && (ctx.targetType === 'goal' || ctx.targetType === 'sprint')) {
      score += 30;
      reason = '目标复盘首选GRAI框架';
    }
    if (model.id === 'pdca' && (ctx.targetType === 'project' || ctx.targetType === 'task')) {
      score += 30;
      reason = '执行纠偏首选PDCA框架';
    }
    if (model.id === '5whys' && ctx.isOverdue && ctx.deviationPercent < -20) {
      score += 30;
      reason = '严重偏差适合5Whys根因分析';
    }

    // 规则3：偏差程度
    if (ctx.deviationPercent < -30) {
      // 严重落后
      if (model.id === '5whys') score += 20;
      if (model.id === 'grai') score += 10;
    } else if (ctx.deviationPercent < -10) {
      // 轻度落后
      if (model.id === 'pdca') score += 20;
      if (model.id === 'grai') score += 15;
    } else if (ctx.deviationPercent > 10) {
      // 超额完成
      if (model.id === 'grai') score += 20;
    }

    // 规则4：逾期
    if (ctx.isOverdue && model.id === '5whys') score += 10;

    // 规则5：时间维度
    if (ctx.daysRemaining <= 7 && model.id === 'pdca') score += 10;
    if (ctx.daysRemaining <= 0 && model.id === 'grai') score += 15;

    if (score > 0) {
      if (!reason) {
        if (model.id === 'grai') reason = '适合目标周期复盘';
        if (model.id === 'pdca') reason = '适合流程纠偏';
        if (model.id === '5whys') reason = '适合问题根因分析';
      }
      results.push({ model, score, reason });
    }
  }

  // 如果没有匹配，默认推荐GRAI
  if (results.length === 0) {
    results.push({
      model: REVIEW_MODELS[0],
      score: 30,
      reason: '通用目标复盘',
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

// --- Deviation Detection (隐性闭环核心) ---

export interface DeviationAlert {
  id: string;
  targetType: 'goal' | 'project';
  targetId: string;
  targetTitle: string;
  progress: number;
  expectedProgress: number;
  deviationPercent: number;
  isOverdue: boolean;
  severity: 'info' | 'warn' | 'danger';
  recommendedModel: ReviewModel['id'];
  message: string;
}

/**
 * 偏差检测 — 比较实际进度与期望进度
 * expectedProgress 基于时间推算：(elapsed_days / total_days) * 100
 */
export function detectDeviations(items: {
  id: string; title: string; progress: number; startDate: string | null; endDate: string | null; type: 'goal' | 'project';
}[]): DeviationAlert[] {
  const now = new Date();
  const alerts: DeviationAlert[] = [];

  for (const item of items) {
    if (!item.startDate || !item.endDate) continue;
    const start = new Date(item.startDate).getTime();
    const end = new Date(item.endDate).getTime();
    const nowTs = now.getTime();
    if (nowTs < start) continue; // 未开始

    const totalDays = (end - start) / (1000 * 60 * 60 * 24);
    const elapsedDays = (nowTs - start) / (1000 * 60 * 60 * 24);
    if (totalDays <= 0) continue;

    const expectedProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
    const deviation = item.progress - expectedProgress;
    const isOverdue = nowTs > end && item.progress < 100;

    let severity: DeviationAlert['severity'] = 'info';
    let recommendedModel: ReviewModel['id'] = 'grai';

    if (deviation <= -30 || isOverdue) {
      severity = 'danger';
      recommendedModel = '5whys';
    } else if (deviation <= -15) {
      severity = 'warn';
      recommendedModel = 'pdca';
    } else if (deviation <= -5) {
      severity = 'info';
      recommendedModel = 'grai';
    } else {
      continue; // 无显著偏差，不生成告警
    }

    alerts.push({
      id: `dev_${item.id}`,
      targetType: item.type,
      targetId: item.id,
      targetTitle: item.title,
      progress: item.progress,
      expectedProgress,
      deviationPercent: deviation,
      isOverdue,
      severity,
      recommendedModel,
      message: isOverdue
        ? `「${item.title}」已逾期，进度仅${item.progress}%`
        : `「${item.title}」进度偏差${deviation}%（实际${item.progress}%/期望${expectedProgress}%）`,
    });
  }

  return alerts.sort((a, b) => {
    const sevOrder = { danger: 0, warn: 1, info: 2 };
    return sevOrder[a.severity] - sevOrder[b.severity];
  });
}

// --- Auto Progress Calculation ---

/**
 * 从任务完成率自动推算目标进度
 * 适配实际数据模型：TaskRow 只有 goal_id + status/done，无 projectId/progress
 * 规则：目标进度 = (完成任务数 / 总关联任务数) × 100
 * 无关联任务时返回 -1 表示无法推算
 */
export function computeAutoProgress(
  goalId: string,
  tasks: { goal_id: string | null; status: string; done: boolean }[],
): number {
  const related = tasks.filter((t) => t.goal_id === goalId);
  if (related.length === 0) return -1; // 无法推算

  const doneCount = related.filter(
    (t) => t.done || t.status === 'done' || t.status === 'completed'
  ).length;

  return Math.round((doneCount / related.length) * 100);
}

// --- AI Draft Generation ---

export function buildReviewDraftPrompt(
  model: ReviewModel,
  session: ReviewSession,
  industry: string,
  dept: string,
): string {
  const stepInputs = model.steps
    .map((s) => `### ${s.title}\n${session.inputs[s.id] || '（未填写）'}`)
    .join('\n\n');

  return [
    `你是「团队业务中台」的AI复盘助手，服务于「${industry} · ${dept}」部门。`,
    '',
    `## 复盘框架：${model.name}（${model.nameEn}）`,
    `## 复盘对象：${session.targetTitle}`,
    '',
    '## 用户输入的各步骤内容',
    stepInputs,
    '',
    '## 任务',
    '请基于上述输入，生成一份完整的、专业级的复盘报告。要求：',
    '1. 结构清晰，每部分有明确结论',
    '2. 分析深入，不只列举现象，要找出根因',
    '3. 行动项具体、可执行、有责任人和截止日期',
    '4. 输出3-5个具体行动项，格式为：- [ ] 行动内容（负责人，截止日期）',
    '5. 语言简洁有力，避免空话套话',
  ].join('\n');
}
