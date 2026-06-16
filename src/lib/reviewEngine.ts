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
  id: string;
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
  modelId: string;
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
  {
    id: 'fmea',
    name: 'FMEA 失效模式分析',
    nameEn: 'Failure Mode and Effects Analysis',
    description: '系统性识别潜在失效模式并评估风险，适合制造业/质量管理场景',
    icon: '⚠️',
    scenarioTags: ['质量风险', '失效分析', '预防措施', '制造业', '产品缺陷', '过程改进'],
    steps: [
      { id: 'process', title: '过程/功能描述', prompt: '分析的对象是什么？其功能和预期输出是什么？', placeholder: '例如：注塑成型工序，预期产出合格率≥99.5%', required: true },
      { id: 'failure', title: '失效模式识别', prompt: '可能出现的失效模式有哪些？（每个模式单独列出）', placeholder: '例如：1.尺寸超差 2.表面缩痕 3.材料脆化', required: true },
      { id: 'effect', title: '失效影响与严重度(S)', prompt: '每种失效的影响是什么？严重度评分(1-10)？', placeholder: '例如：尺寸超差→装配失败，S=8；表面缩痕→外观不良，S=5', required: true },
      { id: 'cause', title: '失效原因与频度(O)', prompt: '导致失效的原因是什么？发生频度评分(1-10)？', placeholder: '例如：模温波动→O=6；原料含水→O=4', required: true },
      { id: 'control', title: '现有控制与探测度(D)', prompt: '现有控制措施有哪些？探测度评分(1-10)？', placeholder: '例如：首件检验→D=3；SPC监控→D=2', required: true },
      { id: 'rpn', title: 'RPN评估与优先级', prompt: '计算RPN(S×O×D)，确定优先改进项', placeholder: '例如：尺寸超差 RPN=8×6×3=144（高优先）', required: true },
      { id: 'action', title: '改进措施', prompt: '针对高RPN项的改进措施是什么？', placeholder: '例如：增加模温自动补偿系统，预计O降至2→新RPN=8×2×3=48', required: true },
    ],
    outputTemplate: `# ⚠️ FMEA 失效模式分析：{{targetTitle}}

## 过程/功能
{{process}}

## 失效模式
{{failure}}

## 失效影响与严重度
{{effect}}

## 失效原因与频度
{{cause}}

## 现有控制与探测度
{{control}}

## RPN评估
{{rpn}}

## 改进措施
{{action}}

## 行动项
{{actionItems}}`,
  },
  {
    id: '8d',
    name: '8D 问题解决',
    nameEn: 'Eight Disciplines Problem Solving',
    description: '结构化问题解决方法，适合质量事故、客户投诉等需要根因分析和永久纠正的场景',
    icon: '🔧',
    scenarioTags: ['质量事故', '客户投诉', '生产异常', '8D报告', '纠正预防', '不合格品'],
    steps: [
      { id: 'd1', title: 'D1 组建团队', prompt: '谁参与解决这个问题？各自的角色和专长是什么？', placeholder: '例如：质量工程师(组长)+工艺工程师+操作员+供应商质量', required: true },
      { id: 'd2', title: 'D2 问题描述', prompt: '5W2H描述：什么问题？何时何地发生？影响了多少？', placeholder: '例如：3月20日客户投诉XX批次产品功能失效，影响2000件', required: true },
      { id: 'd3', title: 'D3 临时遏制', prompt: '如何立即隔离问题，防止影响扩大？', placeholder: '例如：隔离该批次全部库存+通知客户暂停使用+在制品100%全检', required: true },
      { id: 'd4', title: 'D4 根本原因', prompt: '根本原因是什么？（至少问5个为什么）', placeholder: '例如：5Why分析→焊接温度超差→温控器失效→供应商变更未通知', required: true },
      { id: 'd5', title: 'D5 永久纠正措施', prompt: '针对根因的永久纠正措施是什么？', placeholder: '例如：更换高精度温控器+增加温度实时监控+供应商变更审批流程', required: true },
      { id: 'd6', title: 'D6 实施验证', prompt: '如何验证纠正措施有效？验证结果如何？', placeholder: '例如：连续5批次产品焊接强度测试全部达标，Cpk从0.8提升至1.5', required: true },
      { id: 'd7', title: 'D7 预防再发', prompt: '如何防止同类问题在其他产品/产线上发生？', placeholder: '例如：更新温控器验收标准+所有焊接工艺增加温度监控+供应商变更管理流程系统化', required: true },
      { id: 'd8', title: 'D8 团队肯定', prompt: '总结经验教训，肯定团队贡献', placeholder: '例如：本次8D从投诉到验证关闭共7天，团队协作高效；关键教训是供应商变更必须提前通知并验证', required: true },
    ],
    outputTemplate: `# 🔧 8D 问题解决报告：{{targetTitle}}

## D1 组建团队
{{d1}}

## D2 问题描述
{{d2}}

## D3 临时遏制
{{d3}}

## D4 根本原因
{{d4}}

## D5 永久纠正措施
{{d5}}

## D6 实施验证
{{d6}}

## D7 预防再发
{{d7}}

## D8 团队肯定
{{d8}}

## 行动项
{{actionItems}}`,
  },
  {
    id: 'kpt',
    name: 'KPT 复盘',
    nameEn: 'Keep-Problem-Try',
    description: '最轻量的复盘框架，适合周/日维度的快速回顾，从保持、问题、尝试三个维度反思',
    icon: '💡',
    scenarioTags: ['周回顾', '日复盘', '快速回顾', '团队例会', '持续改进', '轻量复盘'],
    steps: [
      { id: 'keep', title: 'Keep — 保持什么', prompt: '哪些做法效果好，应该继续保持？', placeholder: '例如：每日站会制度有效减少了阻塞；代码评审制度提升了质量', required: true },
      { id: 'problem', title: 'Problem — 什么问题', prompt: '遇到了什么问题和困难？', placeholder: '例如：跨部门沟通响应慢；需求变更导致返工；测试环境不稳定', required: true },
      { id: 'try', title: 'Try — 尝试什么', prompt: '下一步想尝试什么新做法来解决上述问题？', placeholder: '例如：尝试异步沟通工具替代部分会议；需求冻结期制度', required: true },
    ],
    outputTemplate: `# 💡 KPT 复盘：{{targetTitle}}

## Keep — 保持
{{keep}}

## Problem — 问题
{{problem}}

## Try — 尝试
{{try}}

## 行动项
{{actionItems}}`,
  },
  {
    id: 'ssc',
    name: 'Start-Stop-Continue',
    nameEn: 'Start-Stop-Continue',
    description: '行为导向的复盘框架，从"开始做/停止做/继续做"三个角度明确行动方向',
    icon: '🚦',
    scenarioTags: ['团队行为改进', '习惯养成', '流程优化', '团队反思', '领导力发展'],
    steps: [
      { id: 'start', title: 'Start — 应该开始做什么', prompt: '有哪些新的做法、习惯或流程应该开始引入？', placeholder: '例如：开始做代码覆盖率报告；开始每周技术分享', required: true },
      { id: 'stop', title: 'Stop — 应该停止做什么', prompt: '有哪些无效的做法、坏习惯或浪费时间的流程应该停止？', placeholder: '例如：停止无议程的会议；停止跳过单元测试直接提交', required: true },
      { id: 'continue', title: 'Continue — 应该继续做什么', prompt: '哪些做法已经证明有效，应该继续坚持和加强？', placeholder: '例如：继续CI/CD自动化部署；继续双周迭代节奏', required: true },
    ],
    outputTemplate: `# 🚦 Start-Stop-Continue 复盘：{{targetTitle}}

## Start — 开始做
{{start}}

## Stop — 停止做
{{stop}}

## Continue — 继续做
{{continue}}

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
    if (model.id === '8d' && ctx.isOverdue) {
      score += 25;
      reason = '逾期项目适合8D结构化解决';
    }
    if (model.id === 'fmea' && ctx.tags.some(t => /质量|缺陷|不合格|失效|风险/.test(t))) {
      score += 35;
      reason = '质量风险适合FMEA失效模式分析';
    }
    if (model.id === 'kpt' && ctx.deviationPercent >= -10 && ctx.deviationPercent <= 10) {
      score += 25;
      reason = '小幅偏差适合KPT轻量复盘';
    }
    if (model.id === 'ssc' && ctx.tags.some(t => /行为|习惯|流程优化|团队/.test(t))) {
      score += 25;
      reason = '行为改进适合Start-Stop-Continue框架';
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
  recommendedModel: string;
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

// --- Performance Scoring (MLOO-Lite 轻量化绩效) ---

export interface PerformanceScore {
  goalId: string;
  goalTitle: string;
  achievementRate: number;      // 目标达成率 (actual/expected * 100), capped at 100
  taskCompletionRate: number;   // 任务完成率 (completed/total * 100)
  onTimeRate: number;           // 按时完成率 (tasks done before due / all completed * 100)
  actionItemCloseRate: number;  // 行动项闭环率 (closed_loop / total * 100)
  overall: number;              // 综合分 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
}

/**
 * 计算目标绩效评分 — 轻量化，无需manager校准
 * 公式：overall = achievementRate * 0.4 + taskCompletionRate * 0.25 + onTimeRate * 0.2 + actionItemCloseRate * 0.15
 */
export function computePerformanceScore(params: {
  goalId: string;
  goalTitle: string;
  targetProgress: number;        // 目标预期进度
  actualProgress: number;        // 目标实际进度
  totalTasks: number;
  completedTasks: number;
  onTimeTasks: number;           // 在截止日期前完成的任务数
  totalActionItems: number;
  closedActionItems: number;
}): PerformanceScore {
  const achievementRate = params.targetProgress > 0
    ? Math.min(100, Math.round((params.actualProgress / params.targetProgress) * 100))
    : params.actualProgress;
  const taskCompletionRate = params.totalTasks > 0
    ? Math.round((params.completedTasks / params.totalTasks) * 100)
    : 0;
  const onTimeRate = params.completedTasks > 0
    ? Math.round((params.onTimeTasks / params.completedTasks) * 100)
    : 100;
  const actionItemCloseRate = params.totalActionItems > 0
    ? Math.round((params.closedActionItems / params.totalActionItems) * 100)
    : 100;

  const overall = Math.round(
    achievementRate * 0.4 + taskCompletionRate * 0.25 + onTimeRate * 0.2 + actionItemCloseRate * 0.15
  );

  let grade: PerformanceScore['grade'] = 'D';
  if (overall >= 95) grade = 'S';
  else if (overall >= 85) grade = 'A';
  else if (overall >= 70) grade = 'B';
  else if (overall >= 50) grade = 'C';

  return {
    goalId: params.goalId,
    goalTitle: params.goalTitle,
    achievementRate,
    taskCompletionRate,
    onTimeRate,
    actionItemCloseRate,
    overall,
    grade,
  };
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

// --- Review Effectiveness Tracking (DSTE 闭环增强) ---

export interface ReviewEffectiveness {
  reviewId: string;
  /** 行动项总数 */
  totalActionItems: number;
  /** 已完成行动项 */
  completedActionItems: number;
  /** 已闭环行动项 (closed_loop=true) */
  closedActionItems: number;
  /** 行动项完成率 */
  actionCompletionRate: number;
  /** 闭环率 */
  closeRate: number;
  /** 复盘前目标进度 (snapshotted at review time) */
  goalProgressBefore: number;
  /** 当前目标进度 */
  goalProgressNow: number;
  /** 目标进度改善量 */
  progressDelta: number;
  /** 有效天数 (review完成至今) */
  daysSinceReview: number;
  /** 综合有效性评分 0-100 */
  effectivenessScore: number;
  /** 评级 */
  effectivenessGrade: 'excellent' | 'good' | 'moderate' | 'poor';
}

/**
 * 计算复盘有效性 — 量化"复盘是否真正推动了目标前进"
 *
 * 评分公式：
 *   effectivenessScore = actionCompletionRate * 30 + closeRate * 20 + progressImprovement * 30 + speedBonus * 20
 *   - actionCompletionRate: 行动项执行率 (执行力)
 *   - closeRate: 闭环率 (质量)
 *   - progressImprovement: 目标进度改善 (结果)
 *   - speedBonus: 速度加分 (效率)
 */
export function computeReviewEffectiveness(params: {
  reviewId: string;
  goalProgressBefore: number;
  goalProgressNow: number;
  totalActionItems: number;
  completedActionItems: number;
  closedActionItems: number;
  reviewCompletedAt: string;
}): ReviewEffectiveness {
  const actionCompletionRate = params.totalActionItems > 0
    ? Math.round((params.completedActionItems / params.totalActionItems) * 100)
    : 0;
  const closeRate = params.totalActionItems > 0
    ? Math.round((params.closedActionItems / params.totalActionItems) * 100)
    : 0;

  const progressDelta = params.goalProgressNow - params.goalProgressBefore;
  // progressImprovement: 0-100, based on how much progress improved (capped at +30% delta = 100)
  const progressImprovement = Math.min(100, Math.max(0, Math.round((progressDelta / 30) * 100)));

  // speedBonus: faster improvement = higher score. 7 days = baseline, 14+ days = penalty
  const daysSinceReview = Math.max(1, Math.floor(
    (Date.now() - new Date(params.reviewCompletedAt).getTime()) / (1000 * 60 * 60 * 24),
  ));
  let speedBonus = 100;
  if (daysSinceReview <= 3 && progressDelta > 0) speedBonus = 100;
  else if (daysSinceReview <= 7) speedBonus = 80;
  else if (daysSinceReview <= 14) speedBonus = 60;
  else if (daysSinceReview <= 30) speedBonus = 40;
  else speedBonus = 20;

  const effectivenessScore = Math.round(
    actionCompletionRate * 0.3 + closeRate * 0.2 + progressImprovement * 0.3 + speedBonus * 0.2,
  );

  let effectivenessGrade: ReviewEffectiveness['effectivenessGrade'] = 'poor';
  if (effectivenessScore >= 80) effectivenessGrade = 'excellent';
  else if (effectivenessScore >= 60) effectivenessGrade = 'good';
  else if (effectivenessScore >= 40) effectivenessGrade = 'moderate';

  return {
    reviewId: params.reviewId,
    totalActionItems: params.totalActionItems,
    completedActionItems: params.completedActionItems,
    closedActionItems: params.closedActionItems,
    actionCompletionRate,
    closeRate,
    goalProgressBefore: params.goalProgressBefore,
    goalProgressNow: params.goalProgressNow,
    progressDelta,
    daysSinceReview,
    effectivenessScore,
    effectivenessGrade,
  };
}

/**
 * 为 ReviewSession 创建进度快照 — 复盘完成时调用
 * 存储到 localStorage 用于后续有效性对比
 */
export function snapshotGoalProgress(reviewId: string, goalId: string, progress: number): void {
  const key = 'tbh_review_snapshots';
  try {
    const snapshots: Array<{ reviewId: string; goalId: string; progress: number; snappedAt: string }> =
      JSON.parse(localStorage.getItem(key) ?? '[]');
    snapshots.push({ reviewId, goalId, progress, snappedAt: new Date().toISOString() });
    // Keep last 100
    if (snapshots.length > 100) snapshots.splice(0, snapshots.length - 100);
    localStorage.setItem(key, JSON.stringify(snapshots));
  } catch { /* ignore */ }
}

/**
 * 获取复盘时的目标进度快照
 */
export function getReviewSnapshot(reviewId: string, _goalId?: string): number | null {
  const key = 'tbh_review_snapshots';
  try {
    const snapshots: Array<{ reviewId: string; goalId: string; progress: number }> =
      JSON.parse(localStorage.getItem(key) ?? '[]');
    const snap = snapshots.find((s) => s.reviewId === reviewId);
    return snap?.progress ?? null;
  } catch { return null; }
}
