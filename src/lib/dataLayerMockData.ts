/**
 * Local mock data fallbacks for dataLayer.
 *
 * When Supabase is not configured, these provide realistic
 * demo data for every entity type.
 */

// --- Types (must match dataLayer.ts) ---

export interface NotificationRow {
  id: string; title: string; message: string; type: string;
  related_id: string | null; related_type: string | null;
  member_id: string | null; read: boolean; level: string;
  created_at: string; team_id: string;
  /** Computed display fields (for UI, not stored in DB) */
  source?: string; time?: string; action_url?: string | null;
}
export interface ReportRow {
  id: string; title: string; type: string; generated_at: string;
  status: string; content?: string;
}
export interface ApprovalRow {
  id: string; title: string; type: string; applicant_id: string;
  approver_id?: string; description?: string; urgency: string; status: string;
  created_at: string;
}
export interface AnnouncementRow {
  id: string; title: string; content: string; author: string;
  department: string; priority: string; pinned: boolean;
  time: string; views: number; comments: number;
}
export interface MeetingRow {
  id: string; title: string; time: string; duration: string;
  type: string; location: string; organizer: string;
  attendees: number; status: string; agenda: string[] | null;
}
export interface CollabDocRow {
  id: string; title: string; type: string; owners: string[];
  last_edited: string; last_edited_by: string;
  editors: number; viewers: number; status: string;
}
export interface SharedFileRow {
  id: string; name: string; type: string; size: string;
  uploaded_by: string; uploaded_at: string; downloads: number;
}
export interface ContactRow {
  id: string; name: string; role: string; department: string;
  email: string; phone: string; status: string;
}
export interface AgentDetailRow {
  id: string; name: string; description: string; model: string;
  status: string; tasks_completed: number; uptime: string;
  enabled: boolean; capabilities: string[];
  avatar: string; skills: string[]; team_id: string;
  system_prompt: string;
  created_at: string; updated_at: string;
}
export interface AgentConfigRow {
  id: string; name: string; model: string; temperature: number;
  max_tokens: number; system_prompt: string; schedule: string;
  enabled: boolean;
}
export interface RiskRow {
  id: string; title: string; description: string; level: string;
  source: string; detected_at: string; status: string;
  affected_kpi: string | null;
  severity?: string; impact?: string; likelihood?: string;
  owner_id?: string | null; due_date?: string | null;
}
export interface WorkflowRow {
  id: string; name: string; steps: string[]; category: string;
  usage_count: number; is_built_in: boolean;
}
export interface ScheduleEventRow {
  id: string;
  title: string;
  type: string;
  /** UI-friendly time extracted from start_date (HH:mm) or empty string for all-day */
  time: string;
  /** Location placeholder — not in DB schema, always null from Supabase */
  location: string | null;
  /** Date string (YYYY-MM-DD) extracted from start_date */
  date?: string;
  start_date?: string;
  end_date?: string;
  all_day?: boolean;
  color?: string | null;
  description?: string | null;
  created_at?: string;
}
export interface OrgInfoRow {
  id: string; name: string; industry: string; size: string;
  plan: string; created: string;
  /** 4-level hierarchy: company → department → team → individual */
  departments: Array<{
    name: string; head: string; members: number; goals: number; color: string;
    /** Sub-teams within a department */
    teams?: Array<{
      name: string; lead: string; members: number; goals: number;
      /** Individual members in this team */
      individuals?: Array<{ id: string; name: string; role: string }>;
    }>;
  }>;
}
export interface RoleRow {
  id: string; name: string; key: string; members: number;
  permissions: string[]; color: string; description?: string;
}
export interface PredictionRow {
  id: string; title: string; probability: number; impact: string;
  trend: string; reason: string; suggestion: string;
}
export interface ExperienceRow {
  id: string; title: string; tags: string[]; author?: string;
  content?: string; category?: string;
}
export interface DocRow {
  id: string; title: string; type: string; editors: number;
  updated: string; status: string; author: string;
}
export interface ActivityRow {
  id: string; title: string; description: string; type: string;
  actor: string; target_type: string | null; target_id: string | null;
  created_at: string; team_id: string;
}
export interface NoteRow {
  id: string; title: string; content: string; tags: string[];
  color: string; pinned: boolean; member_id: string | null;
  team_id: string; created_at: string; updated_at: string;
}
export interface SprintRow {
  id: string; name: string; goal_id: string | null; status: string;
  start_date: string; end_date: string; total_tasks: number;
  completed_tasks: number; team_id: string; created_at: string; updated_at: string;
}
export interface TemplateRow {
  id: string; name: string; category: string; content: string;
  usage_count: number; is_built_in: boolean; team_id: string;
  created_at: string; updated_at: string;
}
export interface BookmarkRow {
  id: string; title: string; url: string; target_type: string;
  target_id: string; category: string; member_id: string | null;
  team_id: string; created_at: string;
}
export interface CommentRow {
  id: string; content: string; author_id: string | null;
  target_type: string; target_id: string; parent_id: string | null;
  team_id: string; created_at: string; updated_at: string;
}
export interface TagRow {
  id: string; name: string; color: string; target_type: string;
  usage_count: number; team_id: string; created_at: string; updated_at: string;
}
export interface CategoryRow {
  id: string; name: string; type: string; icon: string; color: string;
  sort_order: number; team_id: string; created_at: string; updated_at: string;
}
export interface FeatureFlagRow {
  id: string; key: string; name: string; description: string;
  enabled: boolean; rollout_percentage: number; target_plan: string;
  team_id: string; created_at: string; updated_at: string;
}
export interface SavedViewRow {
  id: string; name: string; module: string; filters: string;
  sort_by: string; columns: string; is_default: boolean;
  member_id: string | null; team_id: string; created_at: string; updated_at: string;
}
export interface AutomationRuleRow {
  id: string; name: string; trigger_type: string; trigger_config: string;
  action_type: string; action_config: string; is_active: boolean;
  priority: number; team_id: string; created_at: string; updated_at: string;
}
export interface StatusFlowRuleRow {
  id: string; entity_type: string; from_status: string; to_status: string;
  condition_config: string; auto_transition: boolean; require_comment: boolean;
  team_id: string; created_at: string; updated_at: string;
}
export interface ItemLinkRow {
  id: string; source_id: string; source_type: string;
  target_id: string; target_type: string; label: string | null;
  created_at: string; team_id: string;
}

// --- Mock Data Functions ---

export function localNotifications(): NotificationRow[] {
  return [
    { id: 'N-001', title: 'Q3路线图评审截止', message: '明天是Q3路线图评审截止日，3个需求待确认', type: 'alert', related_id: null, related_type: null, member_id: null, read: false, level: 'warn', created_at: new Date(Date.now() - 600000).toISOString(), team_id: '__default__', source: 'AI产品分析师', time: '10分钟前' },
    { id: 'N-002', title: '导出功能使用率下降', message: '本周使用率降至12%，较上周下降3个百分点', type: 'alert', related_id: null, related_type: null, member_id: null, read: false, level: 'warn', created_at: new Date(Date.now() - 3600000).toISOString(), team_id: '__default__', source: 'AI数据看门人', time: '1小时前' },
    { id: 'N-003', title: '张明在PRD中@了你', message: '「导出功能技术方案」v2.1 需要你的评审意见', type: 'mention', related_id: null, related_type: null, member_id: null, read: false, level: 'info', created_at: new Date(Date.now() - 7200000).toISOString(), team_id: '__default__', source: '协作', time: '2小时前' },
    { id: 'N-004', title: 'Sprint Review会议提醒', message: '明天09:00 Sprint Review，请准备演示内容', type: 'system', related_id: null, related_type: null, member_id: null, read: true, level: 'info', created_at: new Date(Date.now() - 10800000).toISOString(), team_id: '__default__', source: '日历', time: '3小时前' },
    { id: 'N-005', title: 'PRD模板v2.0已更新', message: '你关注的「PRD模板」已更新至v2.0', type: 'update', related_id: null, related_type: null, member_id: null, read: true, level: 'info', created_at: new Date(Date.now() - 18000000).toISOString(), team_id: '__default__', source: '知识库', time: '5小时前' },
    { id: 'N-006', title: '竞品动态', message: 'XX产品发布了AI辅助决策功能', type: 'update', related_id: null, related_type: null, member_id: null, read: true, level: 'info', created_at: new Date(Date.now() - 86400000).toISOString(), team_id: '__default__', source: 'AI竞品侦探', time: '1天前' },
  ];
}

export function localReports(): ReportRow[] {
  return [
    { id: 'R-001', title: '周报 - 产品部W23', type: 'weekly', generated_at: '6月2日', status: 'ready' },
    { id: 'R-002', title: '月度OKR进展报告', type: 'monthly', generated_at: '6月1日', status: 'ready' },
    { id: 'R-003', title: '竞品功能对比分析', type: 'custom', generated_at: '5月30日', status: 'ready' },
    { id: 'R-004', title: '用户行为分析报告', type: 'custom', generated_at: '5月28日', status: 'ready' },
    { id: 'R-005', title: '周报 - 产品部W24', type: 'weekly', generated_at: '生成中...', status: 'generating' },
  ];
}

export function localApprovals(): ApprovalRow[] {
  return [
    { id: 'AP-001', title: 'Q3路线图预算申请', type: 'project', applicant_id: '张明', urgency: 'urgent', status: 'pending', created_at: '2小时前', description: 'Q3产品路线图所需额外预算' },
    { id: 'AP-002', title: '服务器扩容审批', type: 'purchase', applicant_id: '李工', urgency: 'normal', status: 'pending', created_at: '5小时前', description: '研发服务器扩容至32核' },
    { id: 'AP-003', title: '年假申请（6/15-6/19）', type: 'leave', applicant_id: '王琳', urgency: 'low', status: 'pending', created_at: '1天前' },
    { id: 'AP-004', title: '客户数据访问权限', type: 'access', applicant_id: '陈亮', urgency: 'normal', status: 'approved', created_at: '2天前' },
    { id: 'AP-005', title: '差旅报销（深圳出差）', type: 'expense', applicant_id: '赵磊', urgency: 'low', status: 'approved', created_at: '3天前' },
    { id: 'AP-006', title: '办公设备采购', type: 'purchase', applicant_id: '孙婷', urgency: 'normal', status: 'rejected', created_at: '4天前' },
  ];
}

export function localAnnouncements(): AnnouncementRow[] {
  return [
    { id: 'AN-001', title: 'Q3战略目标全员对齐会', content: '本周五14:00在主会议室召开Q3战略目标对齐会，请各部门负责人准备5分钟述职报告，重点汇报进展偏差和资源需求。', author: 'CEO办公室', department: '管理层', priority: 'top', pinned: true, time: '1小时前', views: 128, comments: 12 },
    { id: 'AN-002', title: '新办公区域6/15正式启用', content: 'B座3楼整修完成，6月15日起研发部和设计部将搬迁至新区域，请提前整理个人物品，行政部会协助搬迁。', author: '行政部', department: '行政', priority: 'normal', pinned: true, time: '3小时前', views: 86, comments: 5 },
    { id: 'AN-003', title: '6月团建活动报名开始', content: '本月底团建前往莫干山，含徒步、篝火晚会等项目，6/10前完成报名，费用公司承担，家属可参加（自费50%）。', author: 'HR', department: '人力', priority: 'info', pinned: false, time: '1天前', views: 203, comments: 28 },
    { id: 'AN-004', title: 'VPN升级维护通知', content: '6月12日22:00-23:00进行VPN系统升级，期间远程访问将中断，请提前做好工作安排。', author: 'IT部', department: 'IT', priority: 'normal', pinned: false, time: '2天前', views: 67, comments: 3 },
  ];
}

export function localMeetings(): MeetingRow[] {
  return [
    { id: 'M-001', title: 'Q3路线图评审', time: '14:00-15:30', duration: '90min', type: 'offline', location: '主会议室', organizer: '我', attendees: 15, status: 'upcoming', agenda: ['路线图回顾', '优先级调整讨论', '资源分配确认'] },
    { id: 'M-002', title: '产品-研发周同步', time: '09:30-10:00', duration: '30min', type: 'online', location: '腾讯会议', organizer: 'AI产品分析师', attendees: 8, status: 'upcoming', agenda: null },
    { id: 'M-003', title: '1:1 with 研发负责人', time: '10:00-10:30', duration: '30min', type: 'online', location: '腾讯会议', organizer: '我', attendees: 2, status: 'upcoming', agenda: null },
    { id: 'M-004', title: '设计走查', time: '11:00-11:30', duration: '30min', type: 'hybrid', location: '设计区 / 线上', organizer: '设计-周', attendees: 5, status: 'upcoming', agenda: null },
    { id: 'M-005', title: '导出功能技术评审', time: '昨天 15:00', duration: '60min', type: 'online', location: '腾讯会议', organizer: 'AI技术助手', attendees: 6, status: 'ended', agenda: null },
  ];
}

export function localCollabDocs(): CollabDocRow[] {
  return [
    { id: 'D-001', title: 'Q3产品路线图 v2.3', type: 'doc', owners: ['我', 'AI产品分析师'], last_edited: '5分钟前', last_edited_by: '我', editors: 3, viewers: 8, status: 'editing' },
    { id: 'D-002', title: '导出功能优化技术方案', type: 'doc', owners: ['AI技术助手'], last_edited: '1小时前', last_edited_by: 'AI技术助手', editors: 2, viewers: 5, status: 'review' },
    { id: 'D-003', title: 'Q3预算表', type: 'sheet', owners: ['财务'], last_edited: '2小时前', last_edited_by: '财务-刘', editors: 2, viewers: 12, status: 'final' },
    { id: 'D-004', title: '竞品分析报告', type: 'slide', owners: ['AI竞品侦探'], last_edited: '1天前', last_edited_by: 'AI竞品侦探', editors: 1, viewers: 15, status: 'final' },
    { id: 'D-005', title: 'PRD模板v2.0', type: 'doc', owners: ['我'], last_edited: '3天前', last_edited_by: '我', editors: 4, viewers: 20, status: 'final' },
    { id: 'D-006', title: '用户反馈汇总（6月）', type: 'sheet', owners: ['AI数据看门人'], last_edited: '1天前', last_edited_by: 'AI数据看门人', editors: 1, viewers: 6, status: 'editing' },
  ];
}

export function localSharedFiles(): SharedFileRow[] {
  return [
    { id: 'F-001', name: 'Q3路线图.pdf', type: 'pdf', size: '2.3 MB', uploaded_by: '我', uploaded_at: '1小时前', downloads: 8 },
    { id: 'F-002', name: 'PRD模板v2.0.docx', type: 'doc', size: '156 KB', uploaded_by: '我', uploaded_at: '3小时前', downloads: 12 },
    { id: 'F-003', name: '竞品功能对比.xlsx', type: 'sheet', size: '890 KB', uploaded_by: 'AI竞品侦探', uploaded_at: '1天前', downloads: 15 },
    { id: 'F-004', name: '产品架构图.png', type: 'image', size: '1.2 MB', uploaded_by: '设计-周', uploaded_at: '2天前', downloads: 5 },
    { id: 'F-005', name: '导出功能源码.zip', type: 'archive', size: '4.5 MB', uploaded_by: 'AI技术助手', uploaded_at: '3天前', downloads: 3 },
    { id: 'F-006', name: '用户反馈6月.csv', type: 'sheet', size: '340 KB', uploaded_by: 'AI数据看门人', uploaded_at: '4天前', downloads: 7 },
    { id: 'F-007', name: '会议纪要-06-03.pdf', type: 'pdf', size: '89 KB', uploaded_by: '行政-刘', uploaded_at: '5天前', downloads: 20 },
  ];
}

export function localContacts(): ContactRow[] {
  return [
    { id: 'C-001', name: '张明', role: '高级产品经理', department: '产品部', email: 'zhangming@team.com', phone: '138****1234', status: 'online' },
    { id: 'C-002', name: '李工', role: '技术负责人', department: '研发部', email: 'ligong@team.com', phone: '139****5678', status: 'busy' },
    { id: 'C-003', name: '王琳', role: 'UI设计师', department: '设计部', email: 'wanglin@team.com', phone: '137****9012', status: 'online' },
    { id: 'C-004', name: '陈亮', role: '销售总监', department: '销售部', email: 'chenliang@team.com', phone: '136****3456', status: 'away' },
    { id: 'C-005', name: '赵磊', role: '市场经理', department: '市场部', email: 'zhaolei@team.com', phone: '135****7890', status: 'offline' },
    { id: 'C-006', name: '孙婷', role: '行政主管', department: '行政部', email: 'sunting@team.com', phone: '134****2345', status: 'online' },
    { id: 'C-007', name: 'AI产品分析师', role: 'AI同事', department: 'AI Team', email: '-', phone: '-', status: 'online' },
    { id: 'C-008', name: 'AI竞品侦探', role: 'AI同事', department: 'AI Team', email: '-', phone: '-', status: 'online' },
    { id: 'C-009', name: 'AI数据看门人', role: 'AI同事', department: 'AI Team', email: '-', phone: '-', status: 'busy' },
  ];
}

export function localAgentDetails(): AgentDetailRow[] {
  return [
    { id: 'AG-001', name: '产品分析师', description: 'PRD与需求分析，市场趋势洞察', model: 'GPT-4o', status: 'running', tasks_completed: 142, uptime: '99.8%', enabled: true, capabilities: ['PRD生成', '需求排序', '用户画像分析'], avatar: '', skills: [], team_id: '__default__', system_prompt: '', created_at: '', updated_at: '' },
    { id: 'AG-002', name: '竞品侦探', description: '竞品动态监控与对比分析', model: 'Claude-3.5', status: 'running', tasks_completed: 89, uptime: '99.5%', enabled: true, capabilities: ['竞品监控', '功能对比', '趋势预警'], avatar: '', skills: [], team_id: '__default__', system_prompt: '', created_at: '', updated_at: '' },
    { id: 'AG-003', name: '数据看门人', description: '功能使用率追踪与异常检测', model: 'GPT-4o', status: 'running', tasks_completed: 213, uptime: '99.9%', enabled: true, capabilities: ['指标追踪', '异常告警', '报表生成'], avatar: '', skills: [], team_id: '__default__', system_prompt: '', created_at: '', updated_at: '' },
    { id: 'AG-004', name: '技术助手', description: '架构评审与技术债务追踪', model: 'Claude-3.5', status: 'idle', tasks_completed: 67, uptime: '98.2%', enabled: true, capabilities: ['代码审查', '架构评估', '性能诊断'], avatar: '', skills: [], team_id: '__default__', system_prompt: '', created_at: '', updated_at: '' },
    { id: 'AG-005', name: '日报编辑', description: '每日工作总结与进展汇编', model: 'GPT-4o-mini', status: 'idle', tasks_completed: 31, uptime: '99.1%', enabled: false, capabilities: ['日报生成', '进展汇总'], avatar: '', skills: [], team_id: '__default__', system_prompt: '', created_at: '', updated_at: '' },
  ];
}

export function localAgentConfigs(): AgentConfigRow[] {
  return [
    { id: 'AG-001', name: '产品分析师', model: 'gpt-4o', temperature: 0.3, max_tokens: 4096, system_prompt: '你是一位专业的产品分析师，负责PRD撰写和需求分析。始终基于数据做判断，保持客观中立。', schedule: '每日08:00自动运行', enabled: true },
    { id: 'AG-002', name: '竞品侦探', model: 'claude-3.5-sonnet', temperature: 0.5, max_tokens: 4096, system_prompt: '你是竞品监控专家，持续追踪竞品动态并提供深度分析。', schedule: '每日09:00自动运行', enabled: true },
    { id: 'AG-003', name: '数据看门人', model: 'gpt-4o', temperature: 0.2, max_tokens: 2048, system_prompt: '你是数据监控专家，追踪核心KPI指标，发现异常立即告警。', schedule: '每小时检测', enabled: true },
  ];
}

export function localRisks(): RiskRow[] {
  return [
    { id: 'R-001', title: 'Q3路线图评审明天截止', description: '3个核心需求待确认，评审超期将影响Q3整体交付节奏', level: 'critical', source: 'AI产品分析师', detected_at: '2小时前', status: 'active', affected_kpi: '需求交付周期' },
    { id: 'R-002', title: '导出功能使用率持续走低', description: '使用率仅12%，远低于60%目标，用户反馈集中在操作复杂', level: 'high', source: 'AI数据看门人', detected_at: '5小时前', status: 'watching', affected_kpi: '功能使用率' },
    { id: 'R-003', title: 'Sprint完成率连续2周下降', description: '当前72%，目标85%，主要阻塞：跨部门依赖未对齐', level: 'medium', source: 'AI技术助手', detected_at: '1天前', status: 'watching', affected_kpi: 'Sprint完成率' },
    { id: 'R-004', title: 'NPS评分低于警戒线', description: '当前42，目标45，3个用户反馈差评集中在Onboarding流程', level: 'medium', source: 'AI产品分析师', detected_at: '2天前', status: 'watching', affected_kpi: 'NPS' },
    { id: 'R-005', title: '竞品XX发布新功能', description: '直接竞品发布了AI辅助决策模块，可能影响客户选择', level: 'low', source: 'AI竞品侦探', detected_at: '3天前', status: 'active', affected_kpi: null },
    { id: 'R-006', title: 'VPN中断风险', description: '6/12升级窗口与Sprint Review冲突', level: 'low', source: '系统监控', detected_at: '4天前', status: 'resolved', affected_kpi: null },
  ];
}

export function localWorkflows(): WorkflowRow[] {
  return [
    { id: 'WF-001', name: '需求→交付标准流程', steps: ['需求采集', '优先级排序', 'PRD编写', '评审', '排入迭代', '验收'], category: '产品', usage_count: 342, is_built_in: true },
    { id: 'WF-002', name: 'Bug修复流程', steps: ['Bug报告', '分级确认', '排期修复', '代码审查', '测试验证', '上线'], category: '研发', usage_count: 256, is_built_in: true },
    { id: 'WF-003', name: '项目立项审批', steps: ['立项申请', '预算审核', '技术评审', '管理层审批', '启动'], category: '管理', usage_count: 89, is_built_in: true },
    { id: 'WF-004', name: '竞品分析SOP', steps: ['数据采集', '功能对比', 'SWOT分析', '策略建议', '汇报'], category: '产品', usage_count: 45, is_built_in: false },
    { id: 'WF-005', name: '版本发布流程', steps: ['Release分支', 'QA验证', '灰度发布', '全量发布', '监控'], category: '研发', usage_count: 128, is_built_in: true },
  ];
}

export function localScheduleEvents(): ScheduleEventRow[] {
  return [
    { id: 'se1', time: '09:00', title: '晨站会', type: 'meeting', location: null },
    { id: 'se2', time: '09:30', title: '产品周会', type: 'meeting', location: '会议室A' },
    { id: 'se3', time: '14:00', title: 'Q3路线图评审截止', type: 'deadline', location: null },
    { id: 'se4', time: '17:30', title: '30min有氧运动', type: 'reminder', location: null },
  ];
}

export function localOrgInfo(): OrgInfoRow {
  return {
    id: 'org1',
    name: '星辰科技',
    industry: '信息技术',
    size: '50-200人',
    plan: '专业版',
    created: '2025-03-15',
    departments: [
      { name: '产品部', head: '赵PM', members: 5, goals: 4, color: 'var(--brand-accent)', teams: [
        { name: '产品规划组', lead: '赵PM', members: 3, goals: 2, individuals: [
          { id: 'm1', name: '赵PM', role: 'manager' },
          { id: 'm2', name: '小李', role: 'member' },
          { id: 'm3', name: '小王', role: 'member' },
        ]},
        { name: '用户研究组', lead: '小陈', members: 2, goals: 2, individuals: [
          { id: 'm4', name: '小陈', role: 'leader' },
          { id: 'm5', name: '小刘', role: 'member' },
        ]},
      ]},
      { name: '研发部', head: '张工', members: 12, goals: 6, color: '#00d4aa', teams: [
        { name: '前端组', lead: '张工', members: 5, goals: 2, individuals: [
          { id: 'm6', name: '张工', role: 'leader' },
          { id: 'm7', name: '小孙', role: 'member' },
        ]},
        { name: '后端组', lead: '老钱', members: 4, goals: 2, individuals: [] },
        { name: 'QA组', lead: '小周', members: 3, goals: 2, individuals: [] },
      ]},
      { name: '设计部', head: '刘设计', members: 3, goals: 2, color: '#ffc44d', teams: [] },
      { name: '运营部', head: '待定', members: 4, goals: 3, color: '#ff5c6a', teams: [] },
      { name: 'AI团队', head: 'AI同事', members: 1, goals: 0, color: '#00d4aa', teams: [] },
    ],
  };
}

export function localRoles(): RoleRow[] {
  return [
    { id: 'r1', name: '管理员', key: 'admin', members: 1, permissions: ['全部权限', '系统配置', '成员管理', '数据导出', 'API访问'], color: '#ff5c6a' },
    { id: 'r2', name: '经理', key: 'manager', members: 1, permissions: ['团队管理', '目标管理', '审批', '报表', '成员查看'], color: '#ffc44d' },
    { id: 'r3', name: '成员', key: 'member', members: 3, permissions: ['任务管理', '文档协作', '知识库', '个人数据'], color: 'var(--brand-accent)' },
    { id: 'r4', name: 'AI同事', key: 'agent', members: 1, permissions: ['数据分析', '报表生成', '文档阅读', '通知发送'], color: '#00d4aa' },
    { id: 'r5', name: '访客', key: 'viewer', members: 0, permissions: ['只读访问', '公开文档查看'], color: '#8892a4' },
  ];
}

export function localPredictions(): PredictionRow[] {
  return [
    { id: 'p1', title: 'Q3 路线图延期风险', probability: 72, impact: 'high', trend: 'up', reason: '当前进度仅75%，关键路径上3个任务资源不足', suggestion: '建议将导出优化任务拆分为两期，优先交付核心格式' },
    { id: 'p2', title: 'PRD标准化目标提前完成', probability: 85, impact: 'positive', trend: 'up', reason: '团队采纳率已达78%，模板v2.0获一致好评', suggestion: '可将节省资源投入Q4标准化扩展' },
    { id: 'p3', title: '导出功能使用率下降', probability: 45, impact: 'medium', trend: 'flat', reason: '近2周数据波动，可能与竞品更新有关', suggestion: '建议本周进行用户访谈确认原因' },
  ];
}

export function localExperiences(): ExperienceRow[] {
  return [
    { id: 'e1', title: '敏捷迭代避坑指南', tags: ['敏捷', '迭代', '流程'], author: 'AI同事', content: '总结了3个季度敏捷迭代的7个常见陷阱及应对方案，被团队反复引用。' },
    { id: 'e2', title: '导出功能性能优化实战', tags: ['性能', '导出', '优化'], author: '张工', content: '从内存泄漏到批量导出，记录了完整的性能优化路径，导出速度提升4倍。' },
    { id: 'e3', title: 'PRD评审高效技巧', tags: ['PRD', '评审', '协作'], author: '我', content: '提炼自20+次PRD评审，3个关键问题模板让评审效率提升60%。' },
    { id: 'e4', title: '跨团队协作沟通模板', tags: ['协作', '沟通', '模板'], author: '李工', content: '标准化的跨团队沟通话术和邮件模板，减少协作摩擦。' },
  ];
}

export function localDocs(): DocRow[] {
  return [
    { id: 'd1', title: 'Q3产品路线图', type: '在线文档', editors: 3, updated: '10分钟前', status: 'editing', author: '我' },
    { id: 'd2', title: '导出功能技术方案', type: '在线文档', editors: 2, updated: '1小时前', status: 'editing', author: '张工' },
    { id: 'd3', title: '竞品分析报告', type: '在线文档', editors: 1, updated: '昨天', status: 'review', author: 'AI同事' },
    { id: 'd4', title: 'PRD模板v2.0', type: '模板', editors: 0, updated: '3天前', status: 'published', author: '我' },
    { id: 'd5', title: 'API接口文档', type: '在线文档', editors: 1, updated: '5天前', status: 'draft', author: '李工' },
    { id: 'd6', title: '新人onboarding手册', type: '在线文档', editors: 0, updated: '1周前', status: 'published', author: 'HR' },
  ];
}

export function localActivities(): ActivityRow[] {
  return [
    { id: 'act1', title: '创建了目标', description: '创建了目标「Q3用户增长20%」', type: 'created', actor: '我', target_type: 'goal', target_id: 'g1', created_at: new Date(Date.now() - 600000).toISOString(), team_id: '__default__' },
    { id: 'act2', title: '完成了任务', description: '完成了任务「首页改版设计稿」', type: 'completed', actor: '王琳', target_type: 'task', target_id: 't3', created_at: new Date(Date.now() - 3600000).toISOString(), team_id: '__default__' },
    { id: 'act3', title: '评论了PRD', description: '评论了「导出功能PRD v2.1」', type: 'commented', actor: '张明', target_type: 'doc', target_id: 'd2', created_at: new Date(Date.now() - 7200000).toISOString(), team_id: '__default__' },
    { id: 'act4', title: '更新了风险', description: '将风险「Sprint完成率下降」级别提升为high', type: 'updated', actor: 'AI数据看门人', target_type: 'risk', target_id: 'R-003', created_at: new Date(Date.now() - 10800000).toISOString(), team_id: '__default__' },
    { id: 'act5', title: '@了你', description: '在PRD中@了你「导出功能技术方案」', type: 'mentioned', actor: '张明', target_type: 'doc', target_id: 'd2', created_at: new Date(Date.now() - 18000000).toISOString(), team_id: '__default__' },
    { id: 'act6', title: '创建了任务', description: '创建了任务「竞品功能对比分析」', type: 'created', actor: 'AI竞品侦探', target_type: 'task', target_id: 't8', created_at: new Date(Date.now() - 86400000).toISOString(), team_id: '__default__' },
  ];
}

export function localNotes(): NoteRow[] {
  return [
    { id: 'n1', title: 'Q3路线图要点', content: '1. 用户增长20%\n2. 导出功能优化\n3. PRD标准化推进\n4. NPS提升至45+', tags: ['Q3', '路线图'], color: 'var(--brand-accent)', pinned: true, member_id: null, team_id: '__default__', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'n2', title: '晨会待确认事项', content: '- 研发资源是否充足\n- 设计稿交付时间\n- QA回归测试覆盖率', tags: ['会议', '待确认'], color: '#00d4aa', pinned: true, member_id: null, team_id: '__default__', created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'n3', title: '竞品观察笔记', content: '竞品XX发布AI辅助决策模块，交互设计值得参考，特别是智能推荐列表的实现方式', tags: ['竞品', 'AI'], color: '#ffc44d', pinned: false, member_id: null, team_id: '__default__', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'n4', title: '技术债务清单', content: '1. 旧版API兼容层清理\n2. 单元测试覆盖率提升\n3. 日志规范化', tags: ['技术', '债务'], color: '#ff5c6a', pinned: false, member_id: null, team_id: '__default__', created_at: new Date(Date.now() - 172800000).toISOString(), updated_at: new Date(Date.now() - 172800000).toISOString() },
  ];
}

export function localSprints(): SprintRow[] {
  return [
    { id: 'sp1', name: 'Sprint 24 (6/2-6/13)', goal_id: 'g1', status: 'active', start_date: '2026-06-02', end_date: '2026-06-13', total_tasks: 12, completed_tasks: 8, team_id: '__default__', created_at: '2026-06-02T00:00:00Z', updated_at: new Date().toISOString() },
    { id: 'sp2', name: 'Sprint 25 (6/16-6/27)', goal_id: 'g2', status: 'planning', start_date: '2026-06-16', end_date: '2026-06-27', total_tasks: 10, completed_tasks: 0, team_id: '__default__', created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z' },
    { id: 'sp3', name: 'Sprint 23 (5/19-5/30)', goal_id: null, status: 'completed', start_date: '2026-05-19', end_date: '2026-05-30', total_tasks: 14, completed_tasks: 12, team_id: '__default__', created_at: '2026-05-19T00:00:00Z', updated_at: '2026-05-30T00:00:00Z' },
  ];
}

export function localTemplates(): TemplateRow[] {
  return [
    { id: 'tpl1', name: 'PRD模板 v2.0', category: 'PRD', content: '# 产品需求文档\n\n## 背景\n## 目标\n## 用户场景\n## 功能需求\n## 非功能需求\n## 里程碑', usage_count: 34, is_built_in: true, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-15T00:00:00Z' },
    { id: 'tpl2', name: '周报模板', category: '报告', content: '# 周报 W__\n\n## 本周完成\n## 下周计划\n## 风险&求助', usage_count: 89, is_built_in: true, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-04-20T00:00:00Z' },
    { id: 'tpl3', name: '复盘模板（GRAI）', category: '评审', content: '# GRAI复盘\n\n## Goal回顾\n## Result对比\n## Analysis分析\n## Insight洞察', usage_count: 22, is_built_in: true, team_id: '__default__', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'tpl4', name: 'Bug报告模板', category: '流程', content: '# Bug报告\n\n## 复现步骤\n## 期望行为\n## 实际行为\n## 环境\n## 截图', usage_count: 56, is_built_in: false, team_id: '__default__', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-04-10T00:00:00Z' },
  ];
}

export function localBookmarks(): BookmarkRow[] {
  return [
    { id: 'bk1', title: 'Q3用户增长20%', url: '', target_type: 'goal', target_id: 'g1', category: '核心目标', member_id: null, team_id: '__default__', created_at: new Date().toISOString() },
    { id: 'bk2', title: '导出功能PRD', url: '', target_type: 'doc', target_id: 'd2', category: '产品设计', member_id: null, team_id: '__default__', created_at: new Date().toISOString() },
    { id: 'bk3', title: '敏捷迭代避坑指南', url: '', target_type: 'knowledge', target_id: 'e1', category: '最佳实践', member_id: null, team_id: '__default__', created_at: new Date().toISOString() },
    { id: 'bk4', title: 'Sprint 24进度', url: '', target_type: 'task', target_id: 'sp1', category: '迭代', member_id: null, team_id: '__default__', created_at: new Date().toISOString() },
  ];
}

export function localComments(targetType?: string, targetId?: string): CommentRow[] {
  const all: CommentRow[] = [
    { id: 'cmt1', content: '这个目标的KPI需要和运营对齐后再确认', author_id: '张明', target_type: 'goal', target_id: 'g1', parent_id: null, team_id: '__default__', created_at: new Date(Date.now() - 3600000).toISOString(), updated_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'cmt2', content: '已和运营确认，KPI调整为月活增长15%', author_id: '我', target_type: 'goal', target_id: 'g1', parent_id: 'cmt1', team_id: '__default__', created_at: new Date(Date.now() - 1800000).toISOString(), updated_at: new Date(Date.now() - 1800000).toISOString() },
    { id: 'cmt3', content: '技术方案已评审通过，可以开始开发', author_id: '李工', target_type: 'task', target_id: 't3', parent_id: null, team_id: '__default__', created_at: new Date(Date.now() - 7200000).toISOString(), updated_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 'cmt4', content: '设计稿需在周三前交付', author_id: '我', target_type: 'task', target_id: 't8', parent_id: null, team_id: '__default__', created_at: new Date(Date.now() - 86400000).toISOString(), updated_at: new Date(Date.now() - 86400000).toISOString() },
  ];
  if (targetType && targetId) return all.filter((c) => c.target_type === targetType && c.target_id === targetId);
  return all;
}

export function localTags(): TagRow[] {
  return [
    { id: 'tag1', name: '高优先级', color: '#ef4444', target_type: 'task', usage_count: 23, team_id: '__default__', created_at: '2026-01-15T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'tag2', name: '技术债', color: '#f59e0b', target_type: 'task', usage_count: 15, team_id: '__default__', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-18T00:00:00Z' },
    { id: 'tag3', name: 'Q3核心', color: 'var(--brand-accent)', target_type: 'goal', usage_count: 8, team_id: '__default__', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-05-22T00:00:00Z' },
    { id: 'tag4', name: '客户需求', color: '#00d4aa', target_type: 'task', usage_count: 31, team_id: '__default__', created_at: '2026-01-20T00:00:00Z', updated_at: '2026-05-21T00:00:00Z' },
    { id: 'tag5', name: '内部优化', color: '#6366f1', target_type: 'project', usage_count: 12, team_id: '__default__', created_at: '2026-03-10T00:00:00Z', updated_at: '2026-05-15T00:00:00Z' },
    { id: 'tag6', name: '安全相关', color: '#dc2626', target_type: 'risk', usage_count: 6, team_id: '__default__', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-04-28T00:00:00Z' },
  ];
}

export function localCategories(): CategoryRow[] {
  return [
    { id: 'cat1', name: '产品', type: 'module', icon: '📦', color: 'var(--brand-accent)', sort_order: 1, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'cat2', name: '技术', type: 'module', icon: '⚙️', color: '#00d4aa', sort_order: 2, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'cat3', name: '运营', type: 'module', icon: '📊', color: '#f59e0b', sort_order: 3, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'cat4', name: '设计', type: 'module', icon: '🎨', color: '#ec4899', sort_order: 4, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'cat5', name: '市场', type: 'module', icon: '📢', color: '#06b6d4', sort_order: 5, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'cat6', name: '紧急', type: 'priority', icon: '🔥', color: '#ef4444', sort_order: 1, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
  ];
}

export function localFeatureFlags(): FeatureFlagRow[] {
  return [
    { id: 'ff1', key: 'batchOperations', name: '批量操作', description: '允许批量编辑、删除、指派任务/目标', enabled: true, rollout_percentage: 100, target_plan: 'pro', team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'ff2', key: 'advancedAnalytics', name: '高级数据分析', description: 'KPI趋势分析、预测模型、异常检测', enabled: true, rollout_percentage: 80, target_plan: 'pro', team_id: '__default__', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-18T00:00:00Z' },
    { id: 'ff3', key: 'customWorkflows', name: '自定义工作流', description: '创建和编辑自定义自动化工作流', enabled: false, rollout_percentage: 0, target_plan: 'enterprise', team_id: '__default__', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-04-10T00:00:00Z' },
    { id: 'ff4', key: 'aiCocreate', name: 'AI共创', description: 'AI辅助生成行业/部门矩阵内容', enabled: true, rollout_percentage: 100, target_plan: 'free', team_id: '__default__', created_at: '2026-01-15T00:00:00Z', updated_at: '2026-05-22T00:00:00Z' },
    { id: 'ff5', key: 'realtimeCollab', name: '实时协作', description: '多人实时编辑文档和光标位置同步', enabled: false, rollout_percentage: 20, target_plan: 'enterprise', team_id: '__default__', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-05-10T00:00:00Z' },
  ];
}

export function localSavedViews(): SavedViewRow[] {
  return [
    { id: 'sv1', name: '我的待办', module: 'tasks', filters: '{"status":"todo","assignee":"me"}', sort_by: 'priority', columns: 'title,status,priority,due_date', is_default: true, member_id: null, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'sv2', name: '本周目标进度', module: 'goals', filters: '{"status":"on_track"}', sort_by: 'progress', columns: 'title,progress,status,end_date', is_default: false, member_id: null, team_id: '__default__', created_at: '2026-02-15T00:00:00Z', updated_at: '2026-05-18T00:00:00Z' },
    { id: 'sv3', name: '风险任务', module: 'tasks', filters: '{"priority":"urgent"}', sort_by: 'due_date', columns: 'title,priority,due_date,assignee', is_default: false, member_id: null, team_id: '__default__', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-05-10T00:00:00Z' },
  ];
}

export function localAutomationRules(): AutomationRuleRow[] {
  return [
    { id: 'ar1', name: '逾期任务自动标记', trigger_type: 'schedule', trigger_config: '{"check":"overdue"}', action_type: 'update_task', action_config: '{"status":"blocked"}', is_active: true, priority: 10, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'ar2', name: '目标完成时发送通知', trigger_type: 'goal_completed', trigger_config: '{}', action_type: 'send_notification', action_config: '{"template":"goal_completed"}', is_active: true, priority: 5, team_id: '__default__', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-15T00:00:00Z' },
    { id: 'ar3', name: '风险偏差自动生成行动项', trigger_type: 'deviation_created', trigger_config: '{"severity":"danger"}', action_type: 'create_action_item', action_config: '{"source":"deviation"}', is_active: true, priority: 8, team_id: '__default__', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-05-10T00:00:00Z' },
    { id: 'ar4', name: '新成员入职自动分配任务', trigger_type: 'member_joined', trigger_config: '{}', action_type: 'assign_tasks', action_config: '{"template":"onboarding"}', is_active: false, priority: 3, team_id: '__default__', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-15T00:00:00Z' },
  ];
}

export function localStatusFlowRules(): StatusFlowRuleRow[] {
  return [
    { id: 'sfr1', entity_type: 'task', from_status: 'todo', to_status: 'in_progress', condition_config: '{}', auto_transition: false, require_comment: false, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'sfr2', entity_type: 'task', from_status: 'in_progress', to_status: 'done', condition_config: '{}', auto_transition: false, require_comment: true, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'sfr3', entity_type: 'task', from_status: 'todo', to_status: 'cancelled', condition_config: '{}', auto_transition: false, require_comment: true, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'sfr4', entity_type: 'goal', from_status: 'on_track', to_status: 'at_risk', condition_config: '{"progressThreshold":50}', auto_transition: true, require_comment: false, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'sfr5', entity_type: 'approval', from_status: 'pending', to_status: 'approved', condition_config: '{}', auto_transition: false, require_comment: false, team_id: '__default__', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
    { id: 'sfr6', entity_type: 'action_item', from_status: 'in_progress', to_status: 'completed', condition_config: '{}', auto_transition: false, require_comment: true, team_id: '__default__', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-05-15T00:00:00Z' },
  ];
}

export function localItemLinks(sourceId?: string, sourceType?: string): ItemLinkRow[] {
  const all: ItemLinkRow[] = [
    { id: 'il1', source_id: 'g1', source_type: 'goal', target_id: 't3', target_type: 'task', label: '关键交付', created_at: '2026-02-15T00:00:00Z', team_id: '__default__' },
    { id: 'il2', source_id: 'g1', source_type: 'goal', target_id: 'r1', target_type: 'risk', label: '潜在阻碍', created_at: '2026-03-01T00:00:00Z', team_id: '__default__' },
    { id: 'il3', source_id: 't5', source_type: 'task', target_id: 't8', target_type: 'task', label: '阻塞', created_at: '2026-04-10T00:00:00Z', team_id: '__default__' },
    { id: 'il4', source_id: 'g2', source_type: 'goal', target_id: 't1', target_type: 'task', label: '主要任务', created_at: '2026-03-15T00:00:00Z', team_id: '__default__' },
  ];
  if (sourceId && sourceType) return all.filter((l) => l.source_id === sourceId && l.source_type === sourceType);
  return all;
}
