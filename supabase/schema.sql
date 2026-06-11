-- TBH-Next Schema v6 (auto-generated from production DB)
-- Generated: 2026-06-11T16:03:40.379Z

CREATE TABLE IF NOT EXISTS action_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT ''::text,
  source text NOT NULL DEFAULT 'manual'::text,
  source_id text,
  goal_id text,
  assignee_id text,
  status text NOT NULL DEFAULT 'open'::text,
  priority text DEFAULT 'medium'::text,
  due_date date,
  completed_at timestamp with time zone,
  closed_loop boolean DEFAULT false,
  team_id text DEFAULT '__default__'::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  member_id text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  target_title text NOT NULL,
  details text,
  created_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS agent_configs (
  id text NOT NULL,
  name text NOT NULL,
  model text NOT NULL DEFAULT 'deepseek-chat'::text,
  temperature real NOT NULL DEFAULT 0.7,
  max_tokens integer NOT NULL DEFAULT 2048,
  system_prompt text NOT NULL DEFAULT ''::text,
  schedule text NOT NULL DEFAULT ''::text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  team_id text,
  member_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_details (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  name text NOT NULL,
  description text DEFAULT ''::text,
  model text DEFAULT 'deepseek-v4-pro'::text,
  status text DEFAULT 'idle'::text,
  avatar text DEFAULT ''::text,
  skills jsonb DEFAULT '[]'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  tasks_completed integer DEFAULT 0,
  uptime text DEFAULT '0%'::text,
  enabled boolean DEFAULT true,
  capabilities jsonb DEFAULT '[]'::jsonb,
  team_id text DEFAULT '__default__'::text,
  created_by text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  system_prompt text NOT NULL DEFAULT ''::text
);

CREATE TABLE IF NOT EXISTS agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry text NOT NULL,
  dept text NOT NULL,
  name text NOT NULL,
  description text DEFAULT ''::text,
  status text DEFAULT '在线'::text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_call_logs (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  team_id text NOT NULL,
  user_id text NOT NULL,
  call_date date NOT NULL DEFAULT CURRENT_DATE,
  call_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_push_log (
  id bigint NOT NULL DEFAULT nextval('ai_push_log_id_seq'::regclass),
  push_type text NOT NULL,
  target_user_id uuid,
  target_team_id text,
  status text DEFAULT 'sent'::text,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  team_id text NOT NULL,
  user_id text,
  suggestion_type text NOT NULL DEFAULT 'general'::text,
  context_type text,
  context_id text,
  content text NOT NULL DEFAULT ''::text,
  action_payload jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  source text NOT NULL DEFAULT 'local'::text,
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS announcements (
  id text NOT NULL DEFAULT ('an-'::text || (gen_random_uuid())::text),
  title text NOT NULL,
  content text DEFAULT ''::text,
  priority text DEFAULT 'normal'::text,
  author_id text,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id text,
  user_id text NOT NULL,
  provider text NOT NULL,
  encrypted_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  team_id text NOT NULL,
  name text NOT NULL,
  token_hash text NOT NULL,
  token_prefix text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  created_by text,
  last_used_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS app_config (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  title text NOT NULL,
  type text DEFAULT ''::text,
  status text DEFAULT 'pending'::text,
  applicant_id text DEFAULT ''::text,
  approver_id text,
  description text DEFAULT ''::text,
  urgency text DEFAULT 'normal'::text,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  performed_by text,
  team_id text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_rules (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  name text NOT NULL,
  enabled boolean DEFAULT true,
  item_type text NOT NULL,
  trigger text NOT NULL,
  condition jsonb DEFAULT '{}'::jsonb,
  actions jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS behavior_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id text NOT NULL,
  title text NOT NULL DEFAULT ''::text,
  url text NOT NULL DEFAULT ''::text,
  category text NOT NULL DEFAULT ''::text,
  icon text NOT NULL DEFAULT ''::text,
  order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS budgets (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  team_id text NOT NULL,
  project_id text,
  season_id text,
  name text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CNY'::text,
  status text NOT NULL DEFAULT 'draft'::text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id text NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6'::text,
  icon text NOT NULL DEFAULT 'tag'::text,
  applies_to text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry text NOT NULL,
  dept text NOT NULL,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collab_docs (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  title text NOT NULL,
  content text DEFAULT ''::text,
  last_editor text DEFAULT ''::text,
  editors_count integer DEFAULT 0,
  status text DEFAULT 'draft'::text,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id text NOT NULL,
  item_id text NOT NULL,
  item_type text NOT NULL,
  member_id text NOT NULL,
  member_name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  mentioned_member_ids jsonb DEFAULT '[]'::jsonb,
  is_read boolean DEFAULT false,
  follow_up_required boolean DEFAULT false,
  follow_up_status text DEFAULT 'none'::text,
  team_id text DEFAULT '__default__'::text,
  parent_id text,
  attachments jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS contacts (
  id text NOT NULL DEFAULT ('c-'::text || (gen_random_uuid())::text),
  name text NOT NULL,
  department text DEFAULT ''::text,
  role text DEFAULT ''::text,
  email text DEFAULT ''::text,
  phone text DEFAULT ''::text,
  status text DEFAULT 'offline'::text,
  is_ai boolean DEFAULT false,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cost_entries (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  team_id text NOT NULL,
  project_id text,
  task_id text,
  category text NOT NULL DEFAULT 'other'::text,
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT ''::text,
  recorded_by text,
  recorded_at timestamp with time zone DEFAULT now(),
  approved_by text,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry text,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  org_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  parent_id uuid,
  code text,
  head_member_id text,
  settings jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS deviation_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  goal_id text,
  task_id text,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning'::text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  is_resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  action_item_id uuid,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS docs (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  title text NOT NULL,
  type text DEFAULT ''::text,
  status text DEFAULT 'draft'::text,
  author text DEFAULT ''::text,
  editors integer DEFAULT 0,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dste_seasons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id text NOT NULL DEFAULT '__default__'::text,
  seasons_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS effectiveness_metrics (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  team_id text NOT NULL,
  season_id text,
  goal_id text,
  metric_type text NOT NULL DEFAULT 'effectiveness'::text,
  metric_name text NOT NULL,
  planned_value numeric,
  actual_value numeric,
  unit text DEFAULT ''::text,
  period text DEFAULT ''::text,
  measured_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_settings (
  id integer NOT NULL DEFAULT 1,
  enabled boolean DEFAULT false,
  resend_api_key text DEFAULT ''::text,
  from_email text DEFAULT ''::text,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS experiences (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  title text NOT NULL,
  content text DEFAULT ''::text,
  category text DEFAULT ''::text,
  tags jsonb DEFAULT '[]'::jsonb,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  team_ids jsonb DEFAULT '[]'::jsonb,
  description text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'okr'::text,
  status text NOT NULL DEFAULT 'in_progress'::text,
  parent_id text,
  level integer NOT NULL DEFAULT 0,
  start_date text NOT NULL,
  end_date text NOT NULL,
  owner_id text,
  key_results jsonb DEFAULT '[]'::jsonb,
  progress integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  leader_id text,
  supporter_ids jsonb DEFAULT '[]'::jsonb,
  canvas_x double precision,
  canvas_y double precision,
  priority text NOT NULL DEFAULT 'medium'::text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  category text NOT NULL DEFAULT ''::text,
  repeat_cycle text NOT NULL DEFAULT 'none'::text,
  discussion_thread_id text,
  summary text NOT NULL DEFAULT ''::text,
  tracking_records jsonb DEFAULT '[]'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,
  selected_kr_ids jsonb DEFAULT '[]'::jsonb,
  team_id text DEFAULT '__default__'::text,
  deleted_at timestamp with time zone,
  app_type text NOT NULL DEFAULT 'personal'::text
);

CREATE TABLE IF NOT EXISTS industries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  color text DEFAULT '#7b6cf0'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insights (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  title text NOT NULL,
  description text DEFAULT ''::text,
  impact text NOT NULL DEFAULT 'positive'::text,
  kpi text DEFAULT ''::text,
  team_id text DEFAULT 'default'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS installed_agents (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  agent_id text NOT NULL,
  team_id text NOT NULL,
  member_id text NOT NULL,
  installed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS installed_packs (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  user_id uuid,
  pack_id text NOT NULL,
  installed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_links (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  source_id text NOT NULL,
  source_type text NOT NULL,
  target_id text NOT NULL,
  target_type text NOT NULL,
  label text,
  created_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS knowledge (
  id text NOT NULL,
  title text NOT NULL,
  content text DEFAULT ''::text,
  tags text[] DEFAULT '{}'::text[],
  member_id text NOT NULL,
  related_items jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS knowledge_docs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text DEFAULT '文档'::text,
  author text DEFAULT ''::text,
  updated text DEFAULT ''::text,
  content text DEFAULT ''::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  team_id uuid
);

CREATE TABLE IF NOT EXISTS kpis (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry text NOT NULL,
  dept text NOT NULL,
  name text NOT NULL,
  value text NOT NULL,
  target text NOT NULL,
  status text NOT NULL DEFAULT 'good'::text,
  trend text NOT NULL DEFAULT 'flat'::text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matrix_cells (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry text NOT NULL,
  dept text NOT NULL,
  workflow jsonb DEFAULT '[]'::jsonb,
  wf_current integer DEFAULT 0,
  top3 jsonb DEFAULT '[]'::jsonb,
  morning text DEFAULT ''::text,
  ribbon text DEFAULT ''::text,
  next_step text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mcp_status (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  user_id uuid,
  server_id text NOT NULL,
  status jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meetings (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  title text NOT NULL,
  time text DEFAULT ''::text,
  duration text DEFAULT ''::text,
  location text DEFAULT ''::text,
  organizer text DEFAULT ''::text,
  attendees integer DEFAULT 0,
  status text DEFAULT 'scheduled'::text,
  type text DEFAULT 'regular'::text,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'member'::text,
  department text NOT NULL,
  avatar text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  join_date text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  nickname text DEFAULT ''::text,
  phone text DEFAULT ''::text,
  wechat_id text DEFAULT ''::text,
  permissions jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text,
  user_id uuid
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  channel text NOT NULL,
  topic text NOT NULL,
  sender_id uuid,
  sender_name text NOT NULL DEFAULT ''::text,
  extension text NOT NULL,
  sender_type text NOT NULL DEFAULT 'user'::text,
  payload jsonb,
  event text,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  private boolean DEFAULT false,
  team_id uuid,
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  inserted_at timestamp without time zone NOT NULL DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  binary_payload bytea
);

CREATE TABLE IF NOT EXISTS notes (
  id text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT ''::text,
  folder text NOT NULL DEFAULT ''::text,
  color text NOT NULL DEFAULT '#ffffff'::text,
  is_pinned boolean NOT NULL DEFAULT false,
  linked_item_id text,
  linked_item_type text,
  created_by text NOT NULL,
  updated_by text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  category text DEFAULT ''::text,
  tags jsonb DEFAULT '[]'::jsonb,
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id text NOT NULL DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text),
  member_id text NOT NULL,
  item_id text NOT NULL,
  item_type text NOT NULL,
  muted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  team_id text
);

CREATE TABLE IF NOT EXISTS notifications (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_id text NOT NULL,
  related_type text NOT NULL,
  member_id text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text,
  level text DEFAULT 'normal'::text
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  team_id text NOT NULL,
  member_id text NOT NULL,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamp with time zone,
  scope text,
  connected_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS okr_seasons (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'quarter'::text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  team_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_info (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  name text NOT NULL DEFAULT ''::text,
  industry text DEFAULT ''::text,
  size text DEFAULT ''::text,
  plan text DEFAULT 'free'::text,
  created text DEFAULT ''::text,
  departments jsonb DEFAULT '[]'::jsonb,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  department_id uuid,
  role_id uuid,
  user_id uuid,
  member_id text,
  status text DEFAULT 'active'::text,
  joined_at timestamp with time zone DEFAULT now(),
  left_at timestamp with time zone,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  department_id uuid,
  name text NOT NULL,
  level integer DEFAULT 0,
  permissions text[] DEFAULT '{}'::text[],
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  industry text,
  size_range text,
  plan text DEFAULT 'free'::text,
  trial_ends_at timestamp with time zone,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  team_id text NOT NULL,
  season_id text,
  reviewee_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  self_review jsonb,
  peer_reviews jsonb DEFAULT '[]'::jsonb,
  manager_review jsonb,
  direct_report_reviews jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  final_score numeric,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS predictions (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  title text NOT NULL,
  impact text DEFAULT 'medium'::text,
  probability real DEFAULT 0.5,
  trend text DEFAULT 'flat'::text,
  reason text DEFAULT ''::text,
  suggestion text DEFAULT ''::text,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  title text NOT NULL,
  description text,
  goal_id text,
  status text NOT NULL DEFAULT 'planning'::text,
  start_date text NOT NULL,
  end_date text NOT NULL,
  owner_id text,
  member_ids jsonb DEFAULT '[]'::jsonb,
  task_count integer NOT NULL DEFAULT 0,
  progress integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  leader_id text,
  supporter_ids jsonb DEFAULT '[]'::jsonb,
  parent_id text,
  canvas_x double precision,
  canvas_y double precision,
  priority text NOT NULL DEFAULT 'medium'::text,
  category text NOT NULL DEFAULT ''::text,
  repeat_cycle text NOT NULL DEFAULT 'none'::text,
  discussion_thread_id text,
  summary text NOT NULL DEFAULT ''::text,
  tracking_records jsonb DEFAULT '[]'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,
  tags jsonb DEFAULT '[]'::jsonb,
  team_id text DEFAULT '__default__'::text,
  deleted_at timestamp with time zone,
  app_type text NOT NULL DEFAULT 'personal'::text
);

CREATE TABLE IF NOT EXISTS push_notifications (
  id bigint NOT NULL DEFAULT nextval('push_notifications_id_seq'::regclass),
  user_id uuid,
  team_id text,
  type text NOT NULL,
  payload jsonb NOT NULL,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id text NOT NULL DEFAULT '__default__'::text,
  type text NOT NULL DEFAULT 'weekly'::text,
  title text NOT NULL,
  period text NOT NULL,
  period_start date,
  period_end date,
  ai_summary text,
  structured_data jsonb DEFAULT '{}'::jsonb,
  model text DEFAULT 'deepseek'::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id text NOT NULL,
  period text,
  period_start text,
  period_end text,
  member_id text,
  content text,
  improvements jsonb DEFAULT '[]'::jsonb,
  metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS risk_escalation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id text NOT NULL DEFAULT '__default__'::text,
  alert_id text NOT NULL,
  from_severity text NOT NULL,
  to_severity text NOT NULL,
  channels text[] NOT NULL DEFAULT '{}'::text[],
  notification_sent boolean DEFAULT false,
  escalation_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  alerts jsonb NOT NULL DEFAULT '[]'::jsonb,
  alert_count integer NOT NULL DEFAULT 0,
  critical_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risks (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  title text NOT NULL,
  description text DEFAULT ''::text,
  level text NOT NULL DEFAULT 'medium'::text,
  source text DEFAULT ''::text,
  detected_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active'::text,
  affected_kpi text,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  name text NOT NULL,
  key text NOT NULL,
  members integer DEFAULT 0,
  permissions jsonb DEFAULT '[]'::jsonb,
  color text DEFAULT '#7b6cf0'::text,
  description text DEFAULT ''::text,
  sort_order integer DEFAULT 0,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS running_workflows (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  user_id uuid,
  workflow_id text NOT NULL,
  started_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_views (
  id text NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  type text NOT NULL DEFAULT 'goal'::text,
  filters jsonb DEFAULT '[]'::jsonb,
  filter_logic text NOT NULL DEFAULT 'and'::text,
  created_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS schedule_events (
  id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  start_date text NOT NULL,
  end_date text NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  color text NOT NULL DEFAULT '#3b82f6'::text,
  linked_item_id text,
  linked_item_type text,
  member_id text NOT NULL,
  repeat_cycle text NOT NULL DEFAULT 'none'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  team_id text DEFAULT '__default__'::text,
  type text DEFAULT 'event'::text
);

CREATE TABLE IF NOT EXISTS shared_files (
  id text NOT NULL DEFAULT ('f-'::text || (gen_random_uuid())::text),
  name text NOT NULL,
  type text DEFAULT 'document'::text,
  size_kb integer DEFAULT 0,
  uploader_id text,
  team_id text DEFAULT '__default__'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sprints (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  name text NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  goal_ids jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'planning'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS status_flow_rules (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  from_status text NOT NULL,
  to_status text NOT NULL,
  allowed_roles jsonb DEFAULT '[]'::jsonb,
  auto_actions jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'free'::text,
  status text NOT NULL DEFAULT 'active'::text,
  current_period_start timestamp with time zone DEFAULT now(),
  current_period_end timestamp with time zone,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tags (
  id text NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  color text NOT NULL DEFAULT '#6366f1'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS tasks (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  title text NOT NULL,
  description text,
  project_id text,
  goal_id text,
  status text NOT NULL DEFAULT 'todo'::text,
  priority text NOT NULL DEFAULT 'medium'::text,
  assignee_id text,
  owner_id text,
  due_date text,
  reminder_date text,
  completed_at timestamp with time zone,
  subtasks jsonb DEFAULT '[]'::jsonb,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  leader_id text,
  supporter_ids jsonb DEFAULT '[]'::jsonb,
  canvas_x double precision,
  canvas_y double precision,
  parent_id text,
  category text NOT NULL DEFAULT ''::text,
  repeat_cycle text NOT NULL DEFAULT 'none'::text,
  discussion_thread_id text,
  summary text NOT NULL DEFAULT ''::text,
  tracking_records jsonb DEFAULT '[]'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,
  start_date date,
  blocked_by jsonb DEFAULT '[]'::jsonb,
  sprint_id text,
  team_id text DEFAULT '__default__'::text,
  deleted_at timestamp with time zone,
  progress integer DEFAULT 0,
  milestone text,
  dependency_ids uuid[] DEFAULT '{}'::uuid[],
  subtask_ids uuid[] DEFAULT '{}'::uuid[],
  estimated_hours numeric(6,1),
  actual_hours numeric(6,1),
  app_type text NOT NULL DEFAULT 'personal'::text
);

CREATE TABLE IF NOT EXISTS team_industry_profile (
  team_id text NOT NULL,
  industry_key text NOT NULL,
  industry_name text NOT NULL,
  detected_at timestamp with time zone DEFAULT now(),
  confirmed_by text,
  confirmed_at timestamp with time zone,
  custom_overrides jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS team_members (
  id text NOT NULL,
  team_id text NOT NULL,
  member_id text NOT NULL,
  role text NOT NULL DEFAULT 'member'::text,
  permissions jsonb DEFAULT '[]'::jsonb,
  joined_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_settings (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  team_id text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id text NOT NULL,
  name text NOT NULL,
  description text DEFAULT ''::text,
  avatar text DEFAULT ''::text,
  invite_code text,
  owner_id text NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS templates (
  id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT ''::text,
  type text NOT NULL,
  content text NOT NULL DEFAULT ''::text,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  category text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  team_id text DEFAULT '__default__'::text
);

CREATE TABLE IF NOT EXISTS usage_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  detail jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_behavior_profile (
  user_id text NOT NULL,
  efficiency_score integer DEFAULT 0,
  collaboration_score integer DEFAULT 0,
  proactivity_score integer DEFAULT 0,
  stability_score integer DEFAULT 0,
  goal_alignment_score integer DEFAULT 0,
  ai_adoption_score integer DEFAULT 0,
  profile_tags text[] DEFAULT '{}'::text[],
  computed_at timestamp with time zone DEFAULT now(),
  period_days integer DEFAULT 30
);

CREATE TABLE IF NOT EXISTS workflow_instances (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  workflow_id text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'idle'::text,
  current_step integer DEFAULT 0,
  usage_count integer DEFAULT 0,
  category text DEFAULT ''::text,
  steps jsonb DEFAULT '[]'::jsonb,
  is_built_in boolean DEFAULT false,
  team_id text DEFAULT 'default'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

