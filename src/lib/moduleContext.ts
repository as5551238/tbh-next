/**
 * Module context builder for AI.
 * Generates a text summary of the current module state,
 * injected into the AI system prompt so the assistant knows
 * what the user is currently viewing.
 */

import { useAppStore } from '@/stores/appStore';

const MODULE_LABELS: Record<string, string> = {
  overview: '总览仪表盘',
  goals: '目标OKR',
  tasks: '任务中心',
  projects: '项目管理',
  knowledge: '知识库',
  schedule: '日程安排',
  notifications: '通知中心',
  insight: '智能洞察',
  reports: '报表中心',
  prediction: 'AI预测',
  docs: '文档协作',
  experience: '经验复盘',
  members: '成员管理',
  roles: '角色权限',
  org: '组织架构',
  admin: '系统管理',
  review: '复盘评审',
  alignment: '战略对齐',
  actionItems: '行动项',
  activities: '活动日志',
  notes: '笔记',
  sprints: '迭代管理',
  templates: '模板库',
  bookmarks: '收藏',
  tags: '标签管理',
  categories: '分类管理',
  featureFlags: '功能开关',
  savedViews: '保存的视图',
  automation: '自动化',
  statusFlow: '状态流',
  main: 'AI助手',
  morning: '晨间聚焦',
  risk: '风险预警',
  agentList: 'Agent列表',
  agentConfig: 'Agent配置',
  industryView: '行业视图',
  workflows: '工作流',
  kpiDash: 'KPI仪表盘',
  subscription: '订阅管理',
  agentMarket: 'Agent市场',
  knowledgeOSP: '行业知识库',
  mcpA2a: 'MCP & A2A',
  channels: '频道',
  collabDocs: '协作文档',
  sharedFiles: '共享文件',
  contacts: '通讯录',
  meetings: '会议',
  announcements: '公告板',
  approvals: '审批中心',
  teamCal: '团队日历',
  behaviorTracker: '行为追踪',
  systemMonitor: '系统监控',
  dste: 'DSTE闭环',
  commandCenter: '指挥中心',
  usageAlerts: '用量预警',
  aiAgents: 'AI同事',
  templateWizard: '模板向导',
};

/**
 * Build a module context string for the AI system prompt.
 * Data comes from the zustand store (already loaded by each module page).
 * 
 * v2: Supports entity list injection for data-grounded AI responses.
 *   - goalList: top N goals with title + progress + status
 *   - taskList: top N tasks with title + status + priority + due_date
 *   - actionItemList: open action items with title + priority
 *   - overdueTasks: overdue task details for proactive alerts
 */
export function buildModuleContext(
  activeModule: string,
  extras?: {
    tasksTotal?: number;
    tasksOverdue?: number;
    goalsTotal?: number;
    goalsAtRisk?: number;
    projectsTotal?: number;
    actionItemsOpen?: number;
    // v2: Entity list summaries for data-grounded responses
    goalList?: Array<{ title: string; progress: number; status: string; end_date?: string }>;
    taskList?: Array<{ title: string; status: string; priority?: string; due_date?: string }>;
    actionItemList?: Array<{ title: string; priority?: string; status: string }>;
    overdueTasks?: Array<{ title: string; due_date: string; priority?: string }>;
    atRiskGoals?: Array<{ title: string; progress: number; end_date?: string }>;
  }
): string {
  const label = MODULE_LABELS[activeModule] ?? activeModule;
  const iface = useAppStore.getState().interface;
  const ifaceLabel = iface === 'workspace' ? '工作台' : iface === 'ai' ? 'AI中心' : '协作';

  const lines = [
    `用户当前在「${ifaceLabel}」→「${label}」页面`,
  ];

  if (extras) {
    // Aggregated counts
    if (extras.tasksTotal !== undefined) {
      lines.push(`- 任务总数：${extras.tasksTotal}，其中逾期：${extras.tasksOverdue ?? 0}`);
    }
    if (extras.goalsTotal !== undefined) {
      lines.push(`- 目标总数：${extras.goalsTotal}，其中风险：${extras.goalsAtRisk ?? 0}`);
    }
    if (extras.projectsTotal !== undefined) {
      lines.push(`- 项目总数：${extras.projectsTotal}`);
    }
    if (extras.actionItemsOpen !== undefined) {
      lines.push(`- 待办行动项：${extras.actionItemsOpen}`);
    }

    // v2: Entity list summaries (capped at 10 items each to control token usage)
    if (extras.goalList && extras.goalList.length > 0) {
      lines.push('', '### 当前目标列表');
      extras.goalList.slice(0, 10).forEach((g, i) => {
        const statusLabel = g.status === 'at_risk' ? '⚠️风险' : g.status === 'completed' ? '✅完成' : '进行中';
        lines.push(`${i + 1}. ${g.title} — 进度${g.progress}%，${statusLabel}${g.end_date ? `，截止${g.end_date}` : ''}`);
      });
    }

    if (extras.atRiskGoals && extras.atRiskGoals.length > 0) {
      lines.push('', '### 风险目标（需关注）');
      extras.atRiskGoals.slice(0, 5).forEach((g, i) => {
        lines.push(`${i + 1}. ${g.title} — 仅${g.progress}%完成${g.end_date ? `，截止${g.end_date}` : ''}`);
      });
    }

    if (extras.taskList && extras.taskList.length > 0) {
      lines.push('', '### 近期任务');
      extras.taskList.slice(0, 10).forEach((t, i) => {
        const prioLabel = t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : '🟢';
        lines.push(`${i + 1}. ${t.title} — ${t.status}${prioLabel}${t.due_date ? `，截止${t.due_date}` : ''}`);
      });
    }

    if (extras.overdueTasks && extras.overdueTasks.length > 0) {
      lines.push('', '### 逾期任务（需紧急处理）');
      extras.overdueTasks.slice(0, 5).forEach((t, i) => {
        lines.push(`${i + 1}. ${t.title} — 逾期至${t.due_date}${t.priority ? `，${t.priority}` : ''}`);
      });
    }

    if (extras.actionItemList && extras.actionItemList.length > 0) {
      lines.push('', '### 待办行动项');
      extras.actionItemList.slice(0, 8).forEach((a, i) => {
        lines.push(`${i + 1}. ${a.title} — ${a.status}${a.priority ? `，${a.priority}` : ''}`);
      });
    }
  }

  // Module-specific hints
  const hints: Record<string, string> = {
    goals: '用户可能想查看目标进度、调整KR、创建新目标。可以建议AI分析目标达成概率。',
    tasks: '用户可能想管理任务优先级、创建任务、更新状态。可以建议AI自动排序或拆解任务。',
    projects: '用户可能想查看项目进展、管理里程碑。可以建议AI生成项目摘要。',
    review: '用户可能在进行复盘评审。可以建议AI生成复盘草稿或分析偏差。',
    prediction: '用户可能想查看AI预测。可以建议基于当前数据的趋势分析。',
    risk: '用户可能在关注风险。可以建议AI评估风险等级或推荐缓解措施。',
    insight: '用户可能想获取智能洞察。可以建议AI分析团队效能数据。',
    main: '用户在AI助手主页面，可以进行任何对话。优先回应与当前数据相关的提问。',
  };

  if (hints[activeModule]) {
    lines.push(`- 页面提示：${hints[activeModule]}`);
  }

  return lines.join('\n');
}

export { MODULE_LABELS };
