/**
 * Contract-First Type Definitions
 *
 * 所有 dataLayer CRUD 函数的输入参数类型集中定义于此。
 * 原则：编译能发现的错误，不该到运行时才暴露。
 *
 * 命名规范：
 * - XxxInput  = createXxx() 的参数类型
 * - XxxUpdate = updateXxx() 的参数类型（所有字段可选）
 * - XxxRow    = 数据库返回的完整行类型（定义在 dataLayerMockData.ts）
 */

// ═══════════════════════════════════════════════════════════════
// 核心业务实体（高频使用，优先严格类型化）
// ═══════════════════════════════════════════════════════════════

export interface GoalInput {
  title: string;
  description?: string;
  type?: string;
  status?: string;
  parent_id?: string | null;
  level?: number;
  start_date?: string | null;
  end_date?: string | null;
  owner_id?: string | null;
  key_results?: unknown[];
  progress?: number;
  priority?: string;
  tags?: string[];
  category?: string;
  leader_id?: string | null;
  supporter_ids?: string[];
  team_id?: string;
}

export type GoalUpdate = Partial<GoalInput>;

export interface TaskInput {
  title: string;
  description?: string;
  project_id?: string | null;
  goal_id?: string | null;
  status?: string;
  priority?: string;
  assignee_id?: string | null;
  owner_id?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  subtasks?: unknown[];
  tags?: string[];
  parent_id?: string | null;
  category?: string;
  leader_id?: string | null;
  supporter_ids?: string[];
  team_id?: string;
}

export type TaskUpdate = Partial<TaskInput>;

export interface ProjectInput {
  title: string;
  description?: string;
  goal_id?: string | null;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  owner_id?: string | null;
  member_ids?: string[];
  progress?: number;
  priority?: string;
  leader_id?: string | null;
  supporter_ids?: string[];
  team_id?: string;
}

export type ProjectUpdate = Partial<ProjectInput>;

export interface MemberInput {
  name: string;
  department?: string;
  role?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status?: string;
  team_id?: string;
}

export type MemberUpdate = Partial<MemberInput>;

// ═══════════════════════════════════════════════════════════════
// 协作实体
// ═══════════════════════════════════════════════════════════════

export interface NotificationInput {
  title: string;
  message: string;
  type: string;
  level?: string;
  related_id?: string | null;
  related_type?: string | null;
  member_id?: string | null;
  read?: boolean;
  team_id?: string;
}

export interface AnnouncementInput {
  title: string;
  content: string;
  author?: string;
  department?: string;
  priority?: string;
  pinned?: boolean;
}

export type AnnouncementUpdate = Partial<AnnouncementInput>;

export interface MeetingInput {
  title: string;
  time?: string;
  duration?: string;
  type?: string;
  location?: string;
  organizer?: string;
  attendees?: number;
  status?: string;
  agenda?: string[] | null;
}

export type MeetingUpdate = Partial<MeetingInput>;

export interface SharedFileInput {
  name: string;
  type?: string;
  size?: string;
  uploaded_by?: string;
  downloads?: number;
}

export type SharedFileUpdate = Partial<SharedFileInput>;

export interface ContactInput {
  name: string;
  role?: string;
  department?: string;
  email?: string;
  phone?: string;
  status?: string;
  avatar?: string;
}

export type ContactUpdate = Partial<ContactInput>;

// ═══════════════════════════════════════════════════════════════
// AI / 智能实体
// ═══════════════════════════════════════════════════════════════

export interface AgentDetailInput {
  name: string;
  description?: string;
  model?: string;
  status?: string;
  avatar?: string;
  skills?: string[];
  config?: Record<string, unknown>;
  tasks_completed?: number;
  uptime?: string;
  enabled?: boolean;
  capabilities?: string[];
  team_id?: string;
  created_by?: string | null;
  sort_order?: number;
}

export type AgentDetailUpdate = Partial<AgentDetailInput>;

export interface ApprovalInput {
  title: string;
  type?: string;
  applicant_id?: string;
  approver_id?: string;
  description?: string;
  urgency?: string;
  status?: string;
  created_at?: string;
}

export type ApprovalUpdate = Partial<Pick<ApprovalInput, 'status' | 'urgency' | 'description'>>;

export interface RiskInput {
  title: string;
  description?: string;
  level?: string;
  source?: string;
  status?: string;
  affected_kpi?: string | null;
}

export type RiskUpdate = Partial<RiskInput>;

export interface ReportInput {
  title: string;
  type?: string;
  content?: string;
  status?: string;
  generated_at?: string;
}

export type ReportUpdate = Partial<ReportInput>;

export interface PredictionInput {
  title: string;
  probability?: number;
  impact?: string;
  trend?: string;
  reason?: string;
  suggestion?: string;
}

export type PredictionUpdate = Partial<PredictionInput>;

export interface ExperienceInput {
  title: string;
  tags?: string[];
  author?: string;
  content?: string;
  category?: string;
}

export type ExperienceUpdate = Partial<ExperienceInput>;

export interface RoleInput {
  name: string;
  key?: string;
  members?: number;
  permissions?: string[];
  color?: string;
}

export type RoleUpdate = Partial<RoleInput>;

// ═══════════════════════════════════════════════════════════════
// 知识 / 文档实体
// ═══════════════════════════════════════════════════════════════

export interface KnowledgeInput {
  title: string;
  category?: string;
  tags?: string[];
  content?: string;
  team_id?: string;
}

export type KnowledgeUpdate = Partial<KnowledgeInput>;

export interface DocInput {
  title: string;
  type?: string;
  editors?: number;
  status?: string;
  author?: string;
}

export type DocUpdate = Partial<DocInput>;

export interface ScheduleEventInput {
  title: string;
  time?: string;
  type?: string;
  location?: string | null;
}

export type ScheduleEventUpdate = Partial<ScheduleEventInput>;

// ═══════════════════════════════════════════════════════════════
// 工作流 / 消息
// ═══════════════════════════════════════════════════════════════

export interface WorkflowInstanceInput {
  workflow_id: string;
  name: string;
  category?: string;
  is_built_in?: boolean;
  usage_count?: number;
  steps?: unknown[];
  current_step?: number;
  status?: string;
  team_id?: string;
}

export type WorkflowInstanceUpdate = Partial<WorkflowInstanceInput>;

export interface MessageInput {
  content: string;
  sender?: string;
  sender_type?: 'user' | 'ai' | 'system' | 'tool';
  sender_name?: string;
  channel?: string;
  channel_id?: string;
  type?: string;
}

export interface InsightInput {
  title: string;
  type?: string;
  priority?: string;
  summary?: string;
  recommendation?: string;
  team_id?: string;
}

export type InsightUpdate = Partial<InsightInput>;

// ═══════════════════════════════════════════════════════════════
// 业务闭环核心 — ActionItem + DeviationAlert
// ═══════════════════════════════════════════════════════════════

export interface ActionItemInput {
  title: string;
  description?: string;
  source?: 'review' | 'deviation' | 'manual' | 'ai_suggested' | 'ai_review';
  source_id?: string | null;
  goal_id?: string | null;
  assignee_id?: string | null;
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string | null;
  closed_loop?: boolean;
  team_id?: string;
  created_by?: string | null;
  completed_at?: string | null;
}

export type ActionItemUpdate = Partial<ActionItemInput>;

export interface DeviationAlertInput {
  goal_id?: string | null;
  task_id?: string | null;
  alert_type?: string;
  severity?: 'info' | 'warning' | 'critical';
  message?: string;
  is_read?: boolean;
  is_resolved?: boolean;
  resolved_at?: string | null;
  action_item_id?: string | null;
  team_id?: string;
}

export type DeviationAlertUpdate = Partial<DeviationAlertInput>;

// ═══════════════════════════════════════════════════════════════
// 组织信息
// ═══════════════════════════════════════════════════════════════

export interface OrgInfoInput {
  name: string;
  industry?: string;
  size?: string;
  plan?: string;
  departments?: Array<{ name: string; head: string; members: number; goals: number; color: string }>;
}

export type OrgInfoUpdate = Partial<OrgInfoInput>;
