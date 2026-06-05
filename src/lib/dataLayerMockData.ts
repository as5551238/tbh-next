/**
 * Local mock data fallbacks for dataLayer.
 *
 * When Supabase is not configured, these provide realistic
 * demo data for every entity type.
 */

// --- Types (must match dataLayer.ts) ---

export interface NotificationRow {
  id: string; title: string; content: string; type: string;
  source: string; time: string; read: boolean; action_url: string | null;
}
export interface ReportRow {
  id: string; name: string; type: string; generated_at: string;
  generated_by: string; status: string; size: string;
}
export interface ApprovalRow {
  id: string; title: string; type: string; requester: string;
  department: string; urgency: string; status: string;
  created_at: string; amount: string | null;
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
  id: string; name: string; desc: string; model: string;
  status: string; tasks_completed: number; uptime: string;
  enabled: boolean; capabilities: string[];
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
}
export interface WorkflowRow {
  id: string; name: string; steps: string[]; category: string;
  usage_count: number; is_built_in: boolean;
}
export interface ScheduleEventRow {
  id: string; time: string; title: string; type: string;
  location: string | null;
}
export interface OrgInfoRow {
  id: string; name: string; industry: string; size: string;
  plan: string; created: string;
  departments: Array<{ name: string; head: string; members: number; goals: number; color: string }>;
}
export interface RoleRow {
  id: string; name: string; key: string; members: number;
  permissions: string[]; color: string;
}
export interface PredictionRow {
  id: string; title: string; probability: number; impact: string;
  trend: string; reason: string; suggestion: string;
}
export interface ExperienceRow {
  id: string; title: string; tags: string[]; author: string;
  likes: number; comments: number; summary: string;
}
export interface DocRow {
  id: string; title: string; type: string; editors: number;
  updated: string; status: string; author: string;
}

// --- Mock Data Functions ---

export function localNotifications(): NotificationRow[] {
  return [
    { id: 'N-001', title: 'Q3路线图评审截止', content: '明天是Q3路线图评审截止日，3个需求待确认', type: 'alert', source: 'AI产品分析师', time: '10分钟前', read: false, action_url: null },
    { id: 'N-002', title: '导出功能使用率下降', content: '本周使用率降至12%，较上周下降3个百分点', type: 'alert', source: 'AI数据看门人', time: '1小时前', read: false, action_url: null },
    { id: 'N-003', title: '张明在PRD中@了你', content: '「导出功能技术方案」v2.1 需要你的评审意见', type: 'mention', source: '协作', time: '2小时前', read: false, action_url: null },
    { id: 'N-004', title: 'Sprint Review会议提醒', content: '明天09:00 Sprint Review，请准备演示内容', type: 'system', source: '日历', time: '3小时前', read: true, action_url: null },
    { id: 'N-005', title: 'PRD模板v2.0已更新', content: '你关注的「PRD模板」已更新至v2.0', type: 'update', source: '知识库', time: '5小时前', read: true, action_url: null },
    { id: 'N-006', title: '竞品动态', content: 'XX产品发布了AI辅助决策功能', type: 'update', source: 'AI竞品侦探', time: '1天前', read: true, action_url: null },
  ];
}

export function localReports(): ReportRow[] {
  return [
    { id: 'R-001', name: '周报 - 产品部W23', type: 'weekly', generated_at: '6月2日', generated_by: 'AI产品分析师', status: 'ready', size: '2.1 MB' },
    { id: 'R-002', name: '月度OKR进展报告', type: 'monthly', generated_at: '6月1日', generated_by: '系统', status: 'ready', size: '4.5 MB' },
    { id: 'R-003', name: '竞品功能对比分析', type: 'custom', generated_at: '5月30日', generated_by: 'AI竞品侦探', status: 'ready', size: '1.8 MB' },
    { id: 'R-004', name: '用户行为分析报告', type: 'custom', generated_at: '5月28日', generated_by: 'AI数据看门人', status: 'ready', size: '3.2 MB' },
    { id: 'R-005', name: '周报 - 产品部W24', type: 'weekly', generated_at: '生成中...', generated_by: 'AI产品分析师', status: 'generating', size: '-' },
  ];
}

export function localApprovals(): ApprovalRow[] {
  return [
    { id: 'AP-001', title: 'Q3路线图预算申请', type: 'project', requester: '张明', department: '产品部', urgency: 'urgent', status: 'pending', created_at: '2小时前', amount: '¥50,000' },
    { id: 'AP-002', title: '服务器扩容审批', type: 'purchase', requester: '李工', department: '研发部', urgency: 'normal', status: 'pending', created_at: '5小时前', amount: '¥120,000' },
    { id: 'AP-003', title: '年假申请（6/15-6/19）', type: 'leave', requester: '王琳', department: '设计部', urgency: 'low', status: 'pending', created_at: '1天前', amount: null },
    { id: 'AP-004', title: '客户数据访问权限', type: 'access', requester: '陈亮', department: '销售部', urgency: 'normal', status: 'approved', created_at: '2天前', amount: null },
    { id: 'AP-005', title: '差旅报销（深圳出差）', type: 'expense', requester: '赵磊', department: '市场部', urgency: 'low', status: 'approved', created_at: '3天前', amount: null },
    { id: 'AP-006', title: '办公设备采购', type: 'purchase', requester: '孙婷', department: '行政部', urgency: 'normal', status: 'rejected', created_at: '4天前', amount: '¥8,500' },
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
    { id: 'AG-001', name: '产品分析师', desc: 'PRD与需求分析，市场趋势洞察', model: 'GPT-4o', status: 'running', tasks_completed: 142, uptime: '99.8%', enabled: true, capabilities: ['PRD生成', '需求排序', '用户画像分析'] },
    { id: 'AG-002', name: '竞品侦探', desc: '竞品动态监控与对比分析', model: 'Claude-3.5', status: 'running', tasks_completed: 89, uptime: '99.5%', enabled: true, capabilities: ['竞品监控', '功能对比', '趋势预警'] },
    { id: 'AG-003', name: '数据看门人', desc: '功能使用率追踪与异常检测', model: 'GPT-4o', status: 'running', tasks_completed: 213, uptime: '99.9%', enabled: true, capabilities: ['指标追踪', '异常告警', '报表生成'] },
    { id: 'AG-004', name: '技术助手', desc: '架构评审与技术债务追踪', model: 'Claude-3.5', status: 'idle', tasks_completed: 67, uptime: '98.2%', enabled: true, capabilities: ['代码审查', '架构评估', '性能诊断'] },
    { id: 'AG-005', name: '日报编辑', desc: '每日工作总结与进展汇编', model: 'GPT-4o-mini', status: 'idle', tasks_completed: 31, uptime: '99.1%', enabled: false, capabilities: ['日报生成', '进展汇总'] },
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
      { name: '产品部', head: '赵PM', members: 5, goals: 4, color: '#7b6cf0' },
      { name: '研发部', head: '张工', members: 12, goals: 6, color: '#00d4aa' },
      { name: '设计部', head: '刘设计', members: 3, goals: 2, color: '#ffc44d' },
      { name: '运营部', head: '待定', members: 4, goals: 3, color: '#ff5c6a' },
      { name: 'AI团队', head: 'AI同事', members: 1, goals: 0, color: '#00d4aa' },
    ],
  };
}

export function localRoles(): RoleRow[] {
  return [
    { id: 'r1', name: '管理员', key: 'admin', members: 1, permissions: ['全部权限', '系统配置', '成员管理', '数据导出', 'API访问'], color: '#ff5c6a' },
    { id: 'r2', name: '经理', key: 'manager', members: 1, permissions: ['团队管理', '目标管理', '审批', '报表', '成员查看'], color: '#ffc44d' },
    { id: 'r3', name: '成员', key: 'member', members: 3, permissions: ['任务管理', '文档协作', '知识库', '个人数据'], color: '#7b6cf0' },
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
    { id: 'e1', title: '敏捷迭代避坑指南', tags: ['敏捷', '迭代', '流程'], author: 'AI同事', likes: 23, comments: 8, summary: '总结了3个季度敏捷迭代的7个常见陷阱及应对方案，被团队反复引用。' },
    { id: 'e2', title: '导出功能性能优化实战', tags: ['性能', '导出', '优化'], author: '张工', likes: 15, comments: 5, summary: '从内存泄漏到批量导出，记录了完整的性能优化路径，导出速度提升4倍。' },
    { id: 'e3', title: 'PRD评审高效技巧', tags: ['PRD', '评审', '协作'], author: '我', likes: 31, comments: 12, summary: '提炼自20+次PRD评审，3个关键问题模板让评审效率提升60%。' },
    { id: 'e4', title: '跨团队协作沟通模板', tags: ['协作', '沟通', '模板'], author: '李工', likes: 19, comments: 6, summary: '标准化的跨团队沟通话术和邮件模板，减少协作摩擦。' },
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
