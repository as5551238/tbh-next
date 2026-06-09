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
}

export interface ProjectRow {
  id: string;
  title: string;
  status: string;
  progress: number;
  member_ids: string[];
  task_count: number;
  end_date: string | null;
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
}

export interface ActionItemRow {
  id: string;
  title: string;
  description: string;
  source: 'review' | 'deviation' | 'manual' | 'ai_suggested';
  source_id: string | null;
  goal_id: string | null;
  assignee_id: string | null;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date: string | null;
  completed_at: string | null;
  closed_loop: boolean;
  team_id: string;
  created_by: string | null;
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
  NotificationRow, ReportRow, ApprovalRow, AnnouncementRow,
  MeetingRow, CollabDocRow, SharedFileRow, ContactRow,
  AgentDetailRow, AgentConfigRow, RiskRow, WorkflowRow,
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
