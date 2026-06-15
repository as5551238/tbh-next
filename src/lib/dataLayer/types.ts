export interface KeyResultItem {
  id?: string;
  title?: string;
  track?: string;
  selected?: boolean;
  targetValue?: number;
  currentValue?: number;
}

export type KeyResultValue = string | KeyResultItem;

export interface GoalRow {
  id: string;
  title: string;
  progress: number;
  status: string;
  key_results: KeyResultValue[];
  owner_id: string | null;
  leader_id: string | null;
  end_date: string | null;
  start_date: string | null;
  priority?: string;
  description?: string | null;
}

export interface TaskRow {
  id: string;
  title: string;
  priority: string;
  assignee_id: string | null;
  leader_id: string | null;
  due_date: string | null;
  status: string;
  done: boolean;
  goal_id: string | null;
  completed_at?: string | null;
  /** Existing DB columns that may already have data */
  project_id?: string | null;
  owner_id?: string | null;
  category?: string | null;
  start_date?: string | null;
  progress?: number;
  parent_id?: string | null;          // DB FK to parent task — canonical field for hierarchy
  subtasks?: string[] | unknown;      // DB JSONB — existing subtask data (legacy)
  blocked_by?: string[] | unknown;    // DB JSONB — existing dependency data (legacy)
  sprint_id?: string | null;
  team_id?: string | null;
  /** 8-field model extensions (Week 1 intent parser support)
   *  NOTE: parent_task_id/dependency_ids/subtask_ids are NEW explicit columns
   *  that supersede the legacy parent_id/subtasks/blocked_by fields.
   *  Intent parser and UI should use the new fields.
   *  The old fields remain for backward compatibility with existing data.
   */
  milestone?: string | null;
  dependency_ids?: string[];          // replaces blocked_by (explicit UUID array)
  subtask_ids?: string[];             // replaces subtasks (explicit UUID array)
  description?: string | null;
  tags?: string[];
  estimated_hours?: number | null;
  actual_hours?: number | null;
}

export interface ProjectRow {
  id: string;
  title: string;
  status: string;
  progress: number;
  member_ids: string[];
  task_count: number;
  end_date: string | null;
  goal_id: string | null;
}

export interface MemberRow {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: string;
  avatar: string;
  join_date: string;
  nickname: string;
}

export interface KnowledgeDocRow {
  id: string;
  title: string;
  content: string;
  tags: string[];
  member_id: string | null;
  related_items: unknown[];
  color: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface ActionItemRow {
  id: string;
  title: string;
  description: string;
  source: 'review' | 'deviation' | 'manual' | 'ai_suggested' | 'ai_review';
  source_id: string | null;
  goal_id: string | null;
  assignee_id: string | null;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date: string | null;
  closed_loop: boolean;
  team_id: string;
  created_by: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviationAlertRow {
  id: string;
  goal_id: string | null;
  task_id: string | null;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  action_item_id: string | null;
  team_id: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  channel: string;
  sender_id: string | null;
  sender_name: string;
  sender_type: 'user' | 'ai' | 'system';
  content: string;
  team_id: string | null;
  created_at: string;
}

export interface InsightRow {
  id: string; title: string; description: string; impact: string; kpi: string;
  team_id: string; created_at: string; updated_at: string;
}

export interface WorkflowInstanceRow {
  id: string; workflow_id: string; name: string; status: string;
  current_step: number; usage_count: number; category: string;
  steps: string[]; is_built_in: boolean; team_id: string;
  created_at: string; updated_at: string;
}

export interface ChannelRow {
  id: string;
  industry: string;
  dept: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyRow {
  id: string;
  team_id: string | null;
  user_id: string;
  provider: string;
  encrypted_key: string;
  created_at: string;
}

export type {
  ReportRow, ApprovalRow, AnnouncementRow,
  MeetingRow, CollabDocRow, SharedFileRow, ContactRow,
  AgentDetailRow, RiskRow, WorkflowRow,
  ScheduleEventRow, OrgInfoRow, RoleRow, PredictionRow,
  ExperienceRow, DocRow,
  ActivityRow, NoteRow, SprintRow, TemplateRow, BookmarkRow,
  CommentRow, TagRow, CategoryRow, FeatureFlagRow, SavedViewRow,
  AutomationRuleRow, StatusFlowRuleRow, ItemLinkRow,
} from '@/lib/dataLayerMockData';

export interface AuditLogRow {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  performed_by: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  team_id: string | null;
  created_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageEventRow {
  id: string;
  user_id: string;
  event_type: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  related_id: string | null;
  related_type: string | null;
  member_id: string | null;
  read: boolean;
  created_at: string;
  team_id: string | null;
  level: string | null;
}

export interface KnowledgePackRow {
  id: string;
  industry: string;
  title: string;
  description: string;
  category: string;
  content: string | null;
  tags: string[];
  author: string;
  version: string;
  downloads: number;
  rating: number;
  is_official: boolean;
  plan: string;
  updated_at: string;
  team_id: string | null;
}

export interface MarketplaceAgentRow {
  id: string;
  name: string;
  icon: string;
  author: string;
  category: string;
  description: string;
  long_description: string | null;
  version: string;
  downloads: number;
  rating: number;
  review_count: number;
  tags: string[];
  system_prompt: string | null;
  capabilities: string[];
  is_official: boolean;
  price: string;
  team_id: string | null;
}

export interface AgentConfigRow {
  id: string;
  name: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  schedule: string;
  enabled: boolean;
  sort_order: number;
  team_id: string | null;
  member_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstalledAgentRow {
  id: string;
  agent_id: string;
  team_id: string | null;
  member_id: string | null;
  installed_at: string;
}

export interface RunningWorkflowRow {
  id: string;
  user_id: string | null;
  workflow_id: string;
  started_at: string;
}

export interface McpStatusRow {
  id: string;
  user_id: string | null;
  server_id: string;
  status: Record<string, unknown>;
  updated_at: string;
}

export interface InstalledPackRow {
  id: string;
  user_id: string | null;
  pack_id: string;
  installed_at: string;
}

export interface ReviewSessionRow {
  id: string;
  model_id: string;
  target_type: string;
  target_id: string;
  target_title: string;
  current_step: number;
  inputs: Record<string, string>;
  status: 'in_progress' | 'draft_ready' | 'completed';
  draft: string;
  action_items: unknown[];
  effectiveness_score: number | null;
  performance_score: number | null;
  team_id: string;
  created_at: string;
  updated_at: string;
}
