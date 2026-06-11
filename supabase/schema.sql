-- TBH Next Database Schema v4
-- 61 tables + 1 view | RLS + audit logs + updated_at triggers + team multi-tenancy
-- Synced with live DB on 2026-06-08
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Reference data: Industries
-- ============================================================
CREATE TABLE IF NOT EXISTS industries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  color TEXT DEFAULT '#7b6cf0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Reference data: Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry TEXT NOT NULL REFERENCES industries(name) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(industry, name)
);

-- 3. KPIs
CREATE TABLE IF NOT EXISTS kpis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry TEXT NOT NULL,
  dept TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'good',
  trend TEXT NOT NULL DEFAULT 'flat',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Matrix cells (aggregated view)
CREATE TABLE IF NOT EXISTS matrix_cells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry TEXT NOT NULL,
  dept TEXT NOT NULL,
  workflow JSONB DEFAULT '[]',
  wf_current INT DEFAULT 0,
  top3 JSONB DEFAULT '[]',
  morning TEXT DEFAULT '',
  ribbon TEXT DEFAULT '',
  next_step TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(industry, dept)
);

-- 5. Agents
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry TEXT NOT NULL,
  dept TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT '在线',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Channels
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry TEXT NOT NULL,
  dept TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Goals / OKR
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  progress INT DEFAULT 0,
  status TEXT DEFAULT 'on_track',
  key_results JSONB DEFAULT '[]',
  owner TEXT DEFAULT '',
  due_date DATE,
  team_id TEXT DEFAULT '__default__',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  assignee TEXT DEFAULT '',
  due TEXT DEFAULT '',
  done BOOLEAN DEFAULT false,
  progress INT DEFAULT 0,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  team_id TEXT DEFAULT '__default__',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  progress INT DEFAULT 0,
  members INT DEFAULT 1,
  deadline TEXT DEFAULT '',
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  team_id TEXT DEFAULT '__default__',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Knowledge docs
CREATE TABLE IF NOT EXISTS knowledge_docs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT '文档',
  author TEXT DEFAULT '',
  updated TEXT DEFAULT '',
  content TEXT DEFAULT '',
  team_id TEXT DEFAULT '__default__',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Members
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  dept TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'offline',
  avatar_url TEXT DEFAULT '',
  team_id TEXT DEFAULT '__default__',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Channel messages (realtime chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL,
  sender_id UUID,
  sender_name TEXT NOT NULL DEFAULT '',
  sender_type TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL,
  team_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Team membership (multi-tenancy foundation)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, member_id)
);

-- 14. Subscriptions & billing
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 15. Usage tracking
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  detail JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Action items (MLOO loop core)
CREATE TABLE IF NOT EXISTS action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  assignee_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  closed_loop BOOLEAN DEFAULT false,
  team_id TEXT DEFAULT '__default__',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Deviation alerts (MLOO loop core)
CREATE TABLE IF NOT EXISTS deviation_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id TEXT REFERENCES goals(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  action_item_id UUID REFERENCES action_items(id) ON DELETE SET NULL,
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 19-61. Tables added in Sprint 2-4 and incremental development
-- ============================================================

-- 19. Teams
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  invite_code TEXT,
  owner_id TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 20. Agent details (per-agent instance data)
CREATE TABLE IF NOT EXISTS agent_details (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  model TEXT DEFAULT 'deepseek-v4-pro',
  status TEXT DEFAULT 'idle',
  avatar TEXT DEFAULT '',
  skills JSONB DEFAULT '[]',
  config JSONB DEFAULT '{}',
  tasks_completed INT DEFAULT 0,
  uptime TEXT DEFAULT '0%',
  enabled BOOLEAN DEFAULT true,
  capabilities JSONB DEFAULT '[]',
  team_id TEXT DEFAULT '__default__',
  system_prompt TEXT DEFAULT '' NOT NULL,
  created_by TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 21. Agent configs (agent scheduling/configuration)
CREATE TABLE IF NOT EXISTS agent_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT DEFAULT 'deepseek-chat' NOT NULL,
  temperature REAL DEFAULT 0.7 NOT NULL,
  max_tokens INT DEFAULT 2048 NOT NULL,
  system_prompt TEXT DEFAULT '' NOT NULL,
  schedule TEXT DEFAULT '' NOT NULL,
  enabled BOOLEAN DEFAULT true NOT NULL,
  sort_order INT DEFAULT 0 NOT NULL,
  team_id TEXT,
  member_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 22. Activities (activity feed)
CREATE TABLE IF NOT EXISTS activities (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  member_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_title TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__'
);

-- 23. Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT DEFAULT ('an-'::text || (gen_random_uuid())::text) PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  priority TEXT DEFAULT 'normal',
  author_id TEXT,
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 24. Approvals
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  applicant_id TEXT DEFAULT '',
  approver_id TEXT,
  description TEXT DEFAULT '',
  urgency TEXT DEFAULT 'normal',
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 25. Automation rules
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  item_type TEXT NOT NULL,
  trigger TEXT NOT NULL,
  condition JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__'
);

-- 26. Behavior events (analytics)
CREATE TABLE IF NOT EXISTS behavior_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 27. Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT '' NOT NULL,
  url TEXT DEFAULT '' NOT NULL,
  category TEXT DEFAULT '' NOT NULL,
  icon TEXT DEFAULT '' NOT NULL,
  "order" INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__'
);

-- 28. Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6' NOT NULL,
  icon TEXT DEFAULT 'tag' NOT NULL,
  applies_to TEXT[] DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  team_id TEXT DEFAULT '__default__'
);

-- 29. Collaboration docs
CREATE TABLE IF NOT EXISTS collab_docs (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  last_editor TEXT DEFAULT '',
  editors_count INT DEFAULT 0,
  status TEXT DEFAULT 'draft',
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 30. Comments
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  mentioned_member_ids JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_status TEXT DEFAULT 'none',
  team_id TEXT DEFAULT '__default__',
  parent_id TEXT,
  attachments JSONB DEFAULT '[]'
);

-- 31. Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT DEFAULT ('c-'::text || (gen_random_uuid())::text) PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT DEFAULT '',
  role TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'offline',
  is_ai BOOLEAN DEFAULT false,
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 32. Docs (document management)
CREATE TABLE IF NOT EXISTS docs (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  author TEXT DEFAULT '',
  editors INT DEFAULT 0,
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 33. Email settings (global singleton)
CREATE TABLE IF NOT EXISTS email_settings (
  id INT DEFAULT 1 PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  resend_api_key TEXT DEFAULT '',
  from_email TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 34. Experiences (knowledge precipitation)
CREATE TABLE IF NOT EXISTS experiences (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  category TEXT DEFAULT '',
  tags JSONB DEFAULT '[]',
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 35. Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false NOT NULL,
  team_ids JSONB DEFAULT '[]',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 36. Insights (AI-generated)
CREATE TABLE IF NOT EXISTS insights (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  impact TEXT DEFAULT 'positive' NOT NULL,
  kpi TEXT DEFAULT '',
  team_id TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 37. Item links (cross-entity relationships)
CREATE TABLE IF NOT EXISTS item_links (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__'
);

-- 38. Knowledge (user knowledge base)
CREATE TABLE IF NOT EXISTS knowledge (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  member_id TEXT NOT NULL,
  related_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__'
);

-- 39. Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  title TEXT NOT NULL,
  time TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  location TEXT DEFAULT '',
  organizer TEXT DEFAULT '',
  attendees INT DEFAULT 0,
  status TEXT DEFAULT 'scheduled',
  type TEXT DEFAULT 'regular',
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 40. Notes
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '' NOT NULL,
  folder TEXT DEFAULT '' NOT NULL,
  color TEXT DEFAULT '#ffffff' NOT NULL,
  is_pinned BOOLEAN DEFAULT false NOT NULL,
  linked_item_id TEXT,
  linked_item_type TEXT,
  created_by TEXT NOT NULL,
  updated_by TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  category TEXT DEFAULT '',
  tags JSONB DEFAULT '[]',
  team_id TEXT DEFAULT '__default__'
);

-- 41. Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT DEFAULT replace((gen_random_uuid())::text, '-', '') PRIMARY KEY,
  member_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  muted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT
);

-- 42. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id TEXT NOT NULL,
  related_type TEXT NOT NULL,
  member_id TEXT,
  read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__',
  level TEXT DEFAULT 'normal'
);

-- 43. Org info
CREATE TABLE IF NOT EXISTS org_info (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  name TEXT DEFAULT '' NOT NULL,
  industry TEXT DEFAULT '',
  size TEXT DEFAULT '',
  plan TEXT DEFAULT 'free',
  created TEXT DEFAULT '',
  departments JSONB DEFAULT '[]',
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 44. Predictions (AI prediction model)
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  title TEXT NOT NULL,
  impact TEXT DEFAULT 'medium',
  probability REAL DEFAULT 0.5,
  trend TEXT DEFAULT 'flat',
  reason TEXT DEFAULT '',
  suggestion TEXT DEFAULT '',
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 45. Reports
CREATE TABLE IF NOT EXISTS reports (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT '',
  content TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  generated_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 46. Reviews (performance/cycle reviews)
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  period TEXT,
  period_start TEXT,
  period_end TEXT,
  member_id TEXT,
  content TEXT,
  improvements JSONB DEFAULT '[]',
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__'
);

-- 47. Risks
CREATE TABLE IF NOT EXISTS risks (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  level TEXT DEFAULT 'medium' NOT NULL,
  source TEXT DEFAULT '',
  detected_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  affected_kpi TEXT,
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 48. Roles
CREATE TABLE IF NOT EXISTS roles (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  members INT DEFAULT 0,
  permissions JSONB DEFAULT '[]',
  color TEXT DEFAULT '#7b6cf0',
  description TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 49. Saved views
CREATE TABLE IF NOT EXISTS saved_views (
  id TEXT PRIMARY KEY,
  name TEXT DEFAULT '' NOT NULL,
  type TEXT DEFAULT 'goal' NOT NULL,
  filters JSONB DEFAULT '[]',
  filter_logic TEXT DEFAULT 'and' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__'
);

-- 50. Schedule events
CREATE TABLE IF NOT EXISTS schedule_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '' NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  all_day BOOLEAN DEFAULT false NOT NULL,
  color TEXT DEFAULT '#3b82f6' NOT NULL,
  linked_item_id TEXT,
  linked_item_type TEXT,
  member_id TEXT NOT NULL,
  repeat_cycle TEXT DEFAULT 'none' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  team_id TEXT DEFAULT '__default__',
  type TEXT DEFAULT 'event'
);

-- 51. Shared files
CREATE TABLE IF NOT EXISTS shared_files (
  id TEXT DEFAULT ('f-'::text || (gen_random_uuid())::text) PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'document',
  size_kb INT DEFAULT 0,
  uploader_id TEXT,
  team_id TEXT DEFAULT '__default__',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 52. Sprints
CREATE TABLE IF NOT EXISTS sprints (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  goal_ids JSONB DEFAULT '[]',
  status TEXT DEFAULT 'planning' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__'
);

-- 53. Status flow rules
CREATE TABLE IF NOT EXISTS status_flow_rules (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  allowed_roles JSONB DEFAULT '[]',
  auto_actions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__'
);

-- 54. Tags
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT DEFAULT '' NOT NULL,
  color TEXT DEFAULT '#6366f1' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  team_id TEXT DEFAULT '__default__'
);

-- 55. Templates
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '' NOT NULL,
  type TEXT NOT NULL,
  content TEXT DEFAULT '' NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true NOT NULL,
  category TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  team_id TEXT DEFAULT '__default__'
);

-- 56. Workflow instances
CREATE TABLE IF NOT EXISTS workflow_instances (
  id TEXT DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'idle' NOT NULL,
  current_step INT DEFAULT 0,
  usage_count INT DEFAULT 0,
  category TEXT DEFAULT '',
  steps JSONB DEFAULT '[]',
  is_built_in BOOLEAN DEFAULT false,
  team_id TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 57. Team industry profile
CREATE TABLE IF NOT EXISTS team_industry_profile (
  team_id TEXT NOT NULL,
  industry_key TEXT NOT NULL,
  industry_name TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT now(),
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ,
  custom_overrides JSONB DEFAULT '{}',
  PRIMARY KEY (team_id, industry_key)
);

-- 58. User behavior profile
CREATE TABLE IF NOT EXISTS user_behavior_profile (
  user_id TEXT NOT NULL PRIMARY KEY,
  efficiency_score INT DEFAULT 0,
  collaboration_score INT DEFAULT 0,
  proactivity_score INT DEFAULT 0,
  stability_score INT DEFAULT 0,
  goal_alignment_score INT DEFAULT 0,
  ai_adoption_score INT DEFAULT 0,
  profile_tags TEXT[] DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT now(),
  period_days INT DEFAULT 30
);

-- ============================================================
-- 59. View: members_safe (member info without sensitive fields)
-- ============================================================
-- This view is created by migration; included here for reference only.
-- CREATE OR REPLACE VIEW members_safe AS SELECT id, name, role, department, avatar, status, join_date, created_at, updated_at, nickname, permissions, team_id, email, phone, wechat_id FROM members;

-- ============================================================
-- RLS: Enable Row Level Security on ALL tables
-- ============================================================
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrix_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deviation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE collab_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_flow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_industry_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_profile ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Helper Functions (must be created before policies)
-- ============================================================

-- Check if current user is member of a team
CREATE OR REPLACE FUNCTION is_team_member(team_uuid TEXT)
RETURNS BOOLEAN AS $func$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team_uuid AND member_id::uuid = auth.uid()
  );
$func$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin/owner/leader of a team
CREATE OR REPLACE FUNCTION is_team_admin(team_uuid TEXT)
RETURNS BOOLEAN AS $func$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team_uuid AND member_id::uuid = auth.uid()
    AND role IN ('admin', 'owner', 'leader')
  );
$func$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user is admin of any team
CREATE OR REPLACE FUNCTION is_any_team_admin()
RETURNS BOOLEAN AS $func$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE member_id::uuid = auth.uid() AND role IN ('admin', 'owner', 'leader')
  );
$func$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get all team IDs the current user belongs to
CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS SETOF TEXT AS $func$
  SELECT team_id FROM team_members WHERE member_id::uuid = auth.uid();
$func$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS Policies
-- ============================================================

-- --- Reference data: public read, admin write ---
CREATE POLICY "public_read_industries" ON industries FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_industries" ON industries FOR INSERT TO authenticated WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_update_industries" ON industries FOR UPDATE TO authenticated USING (is_any_team_admin()) WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_delete_industries" ON industries FOR DELETE TO authenticated USING (is_any_team_admin());

CREATE POLICY "public_read_departments" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_departments" ON departments FOR INSERT TO authenticated WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_update_departments" ON departments FOR UPDATE TO authenticated USING (is_any_team_admin()) WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_delete_departments" ON departments FOR DELETE TO authenticated USING (is_any_team_admin());

CREATE POLICY "public_read_kpis" ON kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_kpis" ON kpis FOR INSERT TO authenticated WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_update_kpis" ON kpis FOR UPDATE TO authenticated USING (is_any_team_admin()) WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_delete_kpis" ON kpis FOR DELETE TO authenticated USING (is_any_team_admin());

CREATE POLICY "public_read_matrix_cells" ON matrix_cells FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_matrix_cells" ON matrix_cells FOR INSERT TO authenticated WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_update_matrix_cells" ON matrix_cells FOR UPDATE TO authenticated USING (is_any_team_admin()) WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_delete_matrix_cells" ON matrix_cells FOR DELETE TO authenticated USING (is_any_team_admin());

CREATE POLICY "public_read_agents" ON agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_agents" ON agents FOR INSERT TO authenticated WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_update_agents" ON agents FOR UPDATE TO authenticated USING (is_any_team_admin());
CREATE POLICY "admin_delete_agents" ON agents FOR DELETE TO authenticated USING (is_any_team_admin());

CREATE POLICY "public_read_channels" ON channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_channels" ON channels FOR INSERT TO authenticated WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_update_channels" ON channels FOR UPDATE TO authenticated USING (is_any_team_admin());
CREATE POLICY "admin_delete_channels" ON channels FOR DELETE TO authenticated USING (is_any_team_admin());

-- --- Business data: team-based access (using app.current_team) ---
CREATE POLICY "team_select_goals" ON goals FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_goals" ON goals FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_goals" ON goals FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_goals" ON goals FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

CREATE POLICY "team_select_tasks" ON tasks FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_tasks" ON tasks FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_tasks" ON tasks FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

CREATE POLICY "team_select_projects" ON projects FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_projects" ON projects FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_projects" ON projects FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_projects" ON projects FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

CREATE POLICY "team_select_knowledge_docs" ON knowledge_docs FOR SELECT TO authenticated USING (is_team_member(team_id::text));
CREATE POLICY "team_insert_knowledge_docs" ON knowledge_docs FOR INSERT TO authenticated WITH CHECK (is_team_member(team_id::text));
CREATE POLICY "team_update_knowledge_docs" ON knowledge_docs FOR UPDATE TO authenticated USING (is_team_member(team_id::text));
CREATE POLICY "team_delete_knowledge_docs" ON knowledge_docs FOR DELETE TO authenticated USING (is_team_admin(team_id::text));

CREATE POLICY "team_select_members" ON members FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_members" ON members FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_members" ON members FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_members" ON members FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

CREATE POLICY "team_select_messages" ON messages FOR SELECT TO authenticated USING (is_team_member(team_id::text));
CREATE POLICY "team_insert_messages" ON messages FOR INSERT TO authenticated WITH CHECK (is_team_member(team_id::text));

-- --- Team membership ---
CREATE POLICY "member_read_teams" ON team_members FOR SELECT TO authenticated USING (member_id::uuid = auth.uid() OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.member_id::uuid = auth.uid() AND tm.role IN ('admin', 'owner', 'leader')));
CREATE POLICY "admin_insert_team_member" ON team_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.member_id::uuid = auth.uid() AND tm.role IN ('admin', 'owner')));
CREATE POLICY "admin_update_team_member" ON team_members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.member_id::uuid = auth.uid() AND tm.role IN ('admin', 'owner')));
CREATE POLICY "admin_delete_team_member" ON team_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.member_id::uuid = auth.uid() AND tm.role IN ('admin', 'owner')));

-- --- Subscriptions: users own only ---
CREATE POLICY "auth_read_own_subscription" ON subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_insert_own_subscription" ON subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "auth_update_own_subscription" ON subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- --- Usage events ---
CREATE POLICY "auth_read_own_usage" ON usage_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_insert_own_usage" ON usage_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- --- Action items: team-based ---
CREATE POLICY "team_select_action_items" ON action_items FOR SELECT TO authenticated USING (is_team_member(team_id));
CREATE POLICY "team_insert_action_items" ON action_items FOR INSERT TO authenticated WITH CHECK (is_team_member(team_id));
CREATE POLICY "team_update_action_items" ON action_items FOR UPDATE TO authenticated USING (is_team_member(team_id));
CREATE POLICY "team_delete_action_items" ON action_items FOR DELETE TO authenticated USING (is_team_admin(team_id));

-- --- Deviation alerts: team-based ---
CREATE POLICY "team_select_deviation_alerts" ON deviation_alerts FOR SELECT TO authenticated USING (is_team_member(team_id));
CREATE POLICY "team_insert_deviation_alerts" ON deviation_alerts FOR INSERT TO authenticated WITH CHECK (is_team_member(team_id));
CREATE POLICY "team_update_deviation_alerts" ON deviation_alerts FOR UPDATE TO authenticated USING (is_team_member(team_id));

-- --- Audit logs: admin-only ---
CREATE POLICY "admin_read_audit_logs" ON audit_logs FOR SELECT TO authenticated USING (is_any_team_admin());

-- --- Teams ---
CREATE POLICY "member_read_teams" ON teams FOR SELECT TO authenticated USING (is_team_member(id) OR owner_id::uuid = auth.uid());
CREATE POLICY "owner_insert_teams" ON teams FOR INSERT TO authenticated WITH CHECK (owner_id::uuid = auth.uid());
CREATE POLICY "owner_update_teams" ON teams FOR UPDATE TO authenticated USING (owner_id::uuid = auth.uid() OR is_team_admin(id));
CREATE POLICY "owner_delete_teams" ON teams FOR DELETE TO authenticated USING (owner_id::uuid = auth.uid());

-- --- Agent details ---
CREATE POLICY "team_select_agent_details" ON agent_details FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_agent_details" ON agent_details FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "team_update_agent_details" ON agent_details FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_agent_details" ON agent_details FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Agent configs ---
CREATE POLICY "Users can view own team configs" ON agent_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own team configs" ON agent_configs FOR ALL TO authenticated USING (true);

-- --- Activities ---
CREATE POLICY "team_select_activities" ON activities FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_activities" ON activities FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_activities" ON activities FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_activities" ON activities FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Announcements ---
CREATE POLICY "announcements_authenticated_all" ON announcements FOR ALL TO authenticated;

-- --- Approvals ---
CREATE POLICY "team_select_approvals" ON approvals FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_insert_approvals" ON approvals FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_update_approvals" ON approvals FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_delete_approvals" ON approvals FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true));

-- --- Automation rules ---
CREATE POLICY "team_select_automation_rules" ON automation_rules FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_automation_rules" ON automation_rules FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_automation_rules" ON automation_rules FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_automation_rules" ON automation_rules FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Behavior events ---
CREATE POLICY "Users can see own behavior events" ON behavior_events FOR SELECT TO authenticated USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM members m WHERE m.id = auth.uid()::text AND m.role = ANY(ARRAY['admin','manager'])));
CREATE POLICY "Users can insert own behavior events" ON behavior_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

-- --- Bookmarks ---
CREATE POLICY "team_select_bookmarks" ON bookmarks FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_bookmarks" ON bookmarks FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_bookmarks" ON bookmarks FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_bookmarks" ON bookmarks FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Categories ---
CREATE POLICY "team_select_categories" ON categories FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_categories" ON categories FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_categories" ON categories FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_categories" ON categories FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Collab docs ---
CREATE POLICY "team_select_collab_docs" ON collab_docs FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_insert_collab_docs" ON collab_docs FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_update_collab_docs" ON collab_docs FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_delete_collab_docs" ON collab_docs FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true));

-- --- Comments ---
CREATE POLICY "team_select_comments" ON comments FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_comments" ON comments FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_comments" ON comments FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_comments" ON comments FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Contacts ---
CREATE POLICY "contacts_authenticated_all" ON contacts FOR ALL TO authenticated;

-- --- Docs ---
CREATE POLICY "team_select_docs" ON docs FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_insert_docs" ON docs FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_update_docs" ON docs FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_delete_docs" ON docs FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true));

-- --- Email settings: admin-only ---
CREATE POLICY "admin_read_email_settings" ON email_settings FOR SELECT TO authenticated USING (is_any_team_admin());
CREATE POLICY "admin_write_email_settings" ON email_settings FOR INSERT TO authenticated WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_update_email_settings" ON email_settings FOR UPDATE TO authenticated USING (is_any_team_admin());

-- --- Experiences ---
CREATE POLICY "team_select_experiences" ON experiences FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_insert_experiences" ON experiences FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_update_experiences" ON experiences FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_delete_experiences" ON experiences FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true));

-- --- Feature flags: admin-only ---
CREATE POLICY "admin_read_feature_flags" ON feature_flags FOR SELECT TO authenticated USING (is_any_team_admin());
CREATE POLICY "admin_insert_feature_flags" ON feature_flags FOR INSERT TO authenticated WITH CHECK (is_any_team_admin());
CREATE POLICY "admin_update_feature_flags" ON feature_flags FOR UPDATE TO authenticated USING (is_any_team_admin());
CREATE POLICY "admin_delete_feature_flags" ON feature_flags FOR DELETE TO authenticated USING (is_any_team_admin());

-- --- Insights ---
CREATE POLICY "insights_read" ON insights FOR SELECT TO authenticated;
CREATE POLICY "insights_insert" ON insights FOR INSERT TO authenticated;
CREATE POLICY "insights_update" ON insights FOR UPDATE TO authenticated;
CREATE POLICY "insights_delete" ON insights FOR DELETE TO authenticated;

-- --- Item links ---
CREATE POLICY "team_select_item_links" ON item_links FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_item_links" ON item_links FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_item_links" ON item_links FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_item_links" ON item_links FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Knowledge ---
CREATE POLICY "team_select_knowledge" ON knowledge FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_knowledge" ON knowledge FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_knowledge" ON knowledge FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_knowledge" ON knowledge FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Meetings ---
CREATE POLICY "team_select_meetings" ON meetings FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_insert_meetings" ON meetings FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_update_meetings" ON meetings FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_delete_meetings" ON meetings FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true));

-- --- Notes ---
CREATE POLICY "team_select_notes" ON notes FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_notes" ON notes FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_notes" ON notes FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_notes" ON notes FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Notification preferences ---
CREATE POLICY "user_read_notification_prefs" ON notification_preferences FOR SELECT TO authenticated USING (member_id::uuid = auth.uid() OR is_any_team_admin());
CREATE POLICY "user_insert_notification_prefs" ON notification_preferences FOR INSERT TO authenticated WITH CHECK (member_id::uuid = auth.uid() OR is_any_team_admin());
CREATE POLICY "user_update_notification_prefs" ON notification_preferences FOR UPDATE TO authenticated USING (member_id::uuid = auth.uid() OR is_any_team_admin());
CREATE POLICY "user_delete_notification_prefs" ON notification_preferences FOR DELETE TO authenticated USING (member_id::uuid = auth.uid() OR is_any_team_admin());

-- --- Notifications ---
CREATE POLICY "team_select_notifications" ON notifications FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_notifications" ON notifications FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_notifications" ON notifications FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Org info ---
CREATE POLICY "team_select_org_info" ON org_info FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_insert_org_info" ON org_info FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_update_org_info" ON org_info FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true));

-- --- Predictions ---
CREATE POLICY "team_select_predictions" ON predictions FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_insert_predictions" ON predictions FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_update_predictions" ON predictions FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_delete_predictions" ON predictions FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true));

-- --- Reports ---
CREATE POLICY "team_select_reports" ON reports FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_insert_reports" ON reports FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_update_reports" ON reports FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_delete_reports" ON reports FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true));

-- --- Reviews ---
CREATE POLICY "team_select_reviews" ON reviews FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_reviews" ON reviews FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_reviews" ON reviews FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_reviews" ON reviews FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Risks ---
CREATE POLICY "team_select_risks" ON risks FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_insert_risks" ON risks FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_update_risks" ON risks FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_delete_risks" ON risks FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true));

-- --- Roles ---
CREATE POLICY "team_select_roles" ON roles FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_insert_roles" ON roles FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_update_roles" ON roles FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true));
CREATE POLICY "team_delete_roles" ON roles FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true));

-- --- Saved views ---
CREATE POLICY "team_select_saved_views" ON saved_views FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_saved_views" ON saved_views FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_saved_views" ON saved_views FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_saved_views" ON saved_views FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Schedule events ---
CREATE POLICY "team_select_schedule_events" ON schedule_events FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_schedule_events" ON schedule_events FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_schedule_events" ON schedule_events FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_schedule_events" ON schedule_events FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Shared files ---
CREATE POLICY "shared_files_authenticated_all" ON shared_files FOR ALL TO authenticated;

-- --- Sprints ---
CREATE POLICY "team_select_sprints" ON sprints FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_sprints" ON sprints FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_sprints" ON sprints FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_sprints" ON sprints FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Status flow rules ---
CREATE POLICY "team_select_status_flow_rules" ON status_flow_rules FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_status_flow_rules" ON status_flow_rules FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_status_flow_rules" ON status_flow_rules FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_status_flow_rules" ON status_flow_rules FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Tags ---
CREATE POLICY "team_select_tags" ON tags FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_tags" ON tags FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_tags" ON tags FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_tags" ON tags FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Templates ---
CREATE POLICY "team_select_templates" ON templates FOR SELECT TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_insert_templates" ON templates FOR INSERT TO authenticated WITH CHECK (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_update_templates" ON templates FOR UPDATE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);
CREATE POLICY "team_delete_templates" ON templates FOR DELETE TO authenticated USING (team_id = current_setting('app.current_team', true) OR current_setting('app.current_team', true) IS NULL);

-- --- Team industry profile ---
CREATE POLICY "Team members can view industry" ON team_industry_profile FOR SELECT TO authenticated;
CREATE POLICY "Admins can manage industry" ON team_industry_profile FOR INSERT TO authenticated;
CREATE POLICY "Admins can update industry" ON team_industry_profile FOR UPDATE TO authenticated;

-- --- User behavior profile ---
CREATE POLICY "Admins and managers can view profiles" ON user_behavior_profile FOR SELECT TO authenticated USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM members m WHERE m.id = auth.uid()::text AND m.role = ANY(ARRAY['admin','manager'])));
CREATE POLICY "System can insert profiles" ON user_behavior_profile FOR INSERT TO authenticated;
CREATE POLICY "System can update profiles" ON user_behavior_profile FOR UPDATE TO authenticated;

-- --- Workflow instances ---
CREATE POLICY "wf_read" ON workflow_instances FOR SELECT TO authenticated;
CREATE POLICY "wf_insert" ON workflow_instances FOR INSERT TO authenticated;
CREATE POLICY "wf_update" ON workflow_instances FOR UPDATE TO authenticated;
CREATE POLICY "wf_delete" ON workflow_instances FOR DELETE TO authenticated;

-- ============================================================
-- Audit trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (current_user_id, 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (current_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (current_user_id, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit triggers to core business tables
DROP TRIGGER IF EXISTS audit_goals ON goals;
CREATE TRIGGER audit_goals AFTER INSERT OR UPDATE OR DELETE ON goals FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
DROP TRIGGER IF EXISTS audit_tasks ON tasks;
CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON tasks FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
DROP TRIGGER IF EXISTS audit_projects ON projects;
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
DROP TRIGGER IF EXISTS audit_knowledge_docs ON knowledge_docs;
CREATE TRIGGER audit_knowledge_docs AFTER INSERT OR UPDATE OR DELETE ON knowledge_docs FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
DROP TRIGGER IF EXISTS audit_members ON members;
CREATE TRIGGER audit_members AFTER INSERT OR UPDATE OR DELETE ON members FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================
-- Auto-update timestamp triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers to ALL tables with updated_at column
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'industries','departments','kpis','matrix_cells','agents','channels',
    'goals','tasks','projects','knowledge_docs','members',
    'agent_configs','agent_details','announcements','approvals',
    'automation_rules','collab_docs','contacts','docs',
    'experiences','feature_flags','insights','meetings',
    'notes','notifications','org_info','predictions',
    'reports','reviews','risks','roles','schedule_events',
    'shared_files','sprints','status_flow_rules','tags',
    'teams','templates','workflow_instances','knowledge'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
  END LOOP;
END;
$$;

-- ============================================================
-- Realtime publication
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE goals;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE action_items;
ALTER PUBLICATION supabase_realtime ADD TABLE deviation_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE automation_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE email_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE item_links;
ALTER PUBLICATION supabase_realtime ADD TABLE knowledge;
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE saved_views;
ALTER PUBLICATION supabase_realtime ADD TABLE schedule_events;
ALTER PUBLICATION supabase_realtime ADD TABLE sprints;
ALTER PUBLICATION supabase_realtime ADD TABLE status_flow_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE tags;
ALTER PUBLICATION supabase_realtime ADD TABLE templates;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_details;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_configs;
ALTER PUBLICATION supabase_realtime ADD TABLE approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE collab_docs;
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE docs;
ALTER PUBLICATION supabase_realtime ADD TABLE experiences;
ALTER PUBLICATION supabase_realtime ADD TABLE insights;
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE org_info;
ALTER PUBLICATION supabase_realtime ADD TABLE predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
ALTER PUBLICATION supabase_realtime ADD TABLE risks;
ALTER PUBLICATION supabase_realtime ADD TABLE roles;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_files;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE user_behavior_profile;
ALTER PUBLICATION supabase_realtime ADD TABLE team_industry_profile;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;

-- ============================================================
-- Performance indexes
-- ============================================================

-- Reference data indexes
CREATE INDEX IF NOT EXISTS idx_kpis_industry_dept ON kpis(industry, dept);
CREATE INDEX IF NOT EXISTS idx_agents_industry_dept ON agents(industry, dept);
CREATE INDEX IF NOT EXISTS idx_channels_industry_dept ON channels(industry, dept);

-- Core business indexes
CREATE INDEX IF NOT EXISTS idx_goals_team_id ON goals(team_id);
CREATE INDEX IF NOT EXISTS idx_goals_created_by ON goals(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_members_team_id ON members(team_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);

-- Action items & deviation alerts
CREATE INDEX IF NOT EXISTS idx_action_items_team_id ON action_items(team_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_goal_id ON action_items(goal_id);
CREATE INDEX IF NOT EXISTS idx_deviation_alerts_team_id ON deviation_alerts(team_id);
CREATE INDEX IF NOT EXISTS idx_deviation_alerts_goal_id ON deviation_alerts(goal_id);

-- Audit & logging
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Auth & subscription
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_usage_events_created ON usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON team_members(member_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Agent system
CREATE INDEX IF NOT EXISTS idx_agent_details_team_id ON agent_details(team_id);
CREATE INDEX IF NOT EXISTS idx_agent_configs_team_id ON agent_configs(team_id);

-- Activity feed
CREATE INDEX IF NOT EXISTS idx_activities_team_id ON activities(team_id);
CREATE INDEX IF NOT EXISTS idx_activities_member_id ON activities(member_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- New module indexes (team_id for RLS performance, status for filtering)
CREATE INDEX IF NOT EXISTS idx_announcements_team_id ON announcements(team_id);
CREATE INDEX IF NOT EXISTS idx_approvals_team_id ON approvals(team_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_automation_rules_team_id ON automation_rules(team_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_team_id ON bookmarks(team_id);
CREATE INDEX IF NOT EXISTS idx_categories_team_id ON categories(team_id);
CREATE INDEX IF NOT EXISTS idx_collab_docs_team_id ON collab_docs(team_id);
CREATE INDEX IF NOT EXISTS idx_comments_item_id ON comments(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_comments_team_id ON comments(team_id);
CREATE INDEX IF NOT EXISTS idx_contacts_team_id ON contacts(team_id);
CREATE INDEX IF NOT EXISTS idx_docs_team_id ON docs(team_id);
CREATE INDEX IF NOT EXISTS idx_experiences_team_id ON experiences(team_id);
CREATE INDEX IF NOT EXISTS idx_insights_team_id ON insights(team_id);
CREATE INDEX IF NOT EXISTS idx_item_links_source ON item_links(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_item_links_target ON item_links(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_item_links_team_id ON item_links(team_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_team_id ON knowledge(team_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_member_id ON knowledge(member_id);
CREATE INDEX IF NOT EXISTS idx_meetings_team_id ON meetings(team_id);
CREATE INDEX IF NOT EXISTS idx_notes_team_id ON notes(team_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_member_id ON notifications(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_team_id ON notifications(team_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(member_id, read);
CREATE INDEX IF NOT EXISTS idx_org_info_team_id ON org_info(team_id);
CREATE INDEX IF NOT EXISTS idx_predictions_team_id ON predictions(team_id);
CREATE INDEX IF NOT EXISTS idx_reports_team_id ON reports(team_id);
CREATE INDEX IF NOT EXISTS idx_reviews_team_id ON reviews(team_id);
CREATE INDEX IF NOT EXISTS idx_reviews_member_id ON reviews(member_id);
CREATE INDEX IF NOT EXISTS idx_risks_team_id ON risks(team_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_roles_team_id ON roles(team_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_team_id ON saved_views(team_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_team_id ON schedule_events(team_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_member_id ON schedule_events(member_id);
CREATE INDEX IF NOT EXISTS idx_sprints_team_id ON sprints(team_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON sprints(status);
CREATE INDEX IF NOT EXISTS idx_status_flow_rules_team_id ON status_flow_rules(team_id);
CREATE INDEX IF NOT EXISTS idx_tags_team_id ON tags(team_id);
CREATE INDEX IF NOT EXISTS idx_templates_team_id ON templates(team_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_team_id ON workflow_instances(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_user_id ON behavior_events(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_type ON behavior_events(user_id, event_type);

-- ============================================================
-- 62. API Keys (encrypted storage, replaces localStorage plaintext)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id, provider)
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own keys" ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keys" ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keys" ON api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own keys" ON api_keys FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 63. Agent Configs (replaces localStorage tbh-agent-configs)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_configs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, agent_id)
);
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own agent configs" ON agent_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own agent configs" ON agent_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agent configs" ON agent_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own agent configs" ON agent_configs FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 64. Installed Agents (replaces localStorage tbh-installed-agents)
-- ============================================================
CREATE TABLE IF NOT EXISTS installed_agents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, agent_id)
);
ALTER TABLE installed_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own installed agents" ON installed_agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own installed agents" ON installed_agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own installed agents" ON installed_agents FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 65. Running Workflows (replaces localStorage tbh-running-workflows)
-- ============================================================
CREATE TABLE IF NOT EXISTS running_workflows (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, workflow_id)
);
ALTER TABLE running_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own running workflows" ON running_workflows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own running workflows" ON running_workflows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own running workflows" ON running_workflows FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 66. MCP Status (replaces localStorage tbh-mcp-status)
-- ============================================================
CREATE TABLE IF NOT EXISTS mcp_status (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id TEXT NOT NULL,
  status JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, server_id)
);
ALTER TABLE mcp_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own mcp status" ON mcp_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mcp status" ON mcp_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mcp status" ON mcp_status FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mcp status" ON mcp_status FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 67. Installed Packs (replaces localStorage tbh-installed-packs)
-- ============================================================
CREATE TABLE IF NOT EXISTS installed_packs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, pack_id)
);
ALTER TABLE installed_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own installed packs" ON installed_packs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own installed packs" ON installed_packs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own installed packs" ON installed_packs FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 68. Automation Chains (replaces localStorage tbh-automation-chains)
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_chains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  source_dept TEXT DEFAULT '',
  conditions JSONB DEFAULT '[]',
  then_steps JSONB DEFAULT '[]',
  else_steps JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT false,
  priority INT DEFAULT 0,
  auto_execute BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE automation_chains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can read automation chains" ON automation_chains FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM members m WHERE m.id = auth.uid()::text AND m.role = ANY(ARRAY['admin','manager']))
);
CREATE POLICY "Users can create automation chains" ON automation_chains FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own automation chains" ON automation_chains FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Users can delete own automation chains" ON automation_chains FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE INDEX IF NOT EXISTS idx_automation_chains_team ON automation_chains(team_id);
CREATE INDEX IF NOT EXISTS idx_automation_chains_trigger ON automation_chains(trigger_type);

-- ============================================================
-- 69. Automation Execution Logs (replaces localStorage tbh-automation-exec-logs)
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id UUID REFERENCES automation_chains(id) ON DELETE CASCADE,
  chain_name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  source_dept TEXT DEFAULT '',
  condition_result BOOLEAN DEFAULT true,
  steps_executed JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success','partial','failed')),
  error TEXT,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  duration_ms INT DEFAULT 0,
  executed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can read execution logs" ON automation_execution_logs FOR SELECT TO authenticated USING (
  executed_by = auth.uid() OR EXISTS (SELECT 1 FROM members m WHERE m.id = auth.uid()::text AND m.role = ANY(ARRAY['admin','manager']))
);
CREATE POLICY "Users can create execution logs" ON automation_execution_logs FOR INSERT TO authenticated WITH CHECK (executed_by = auth.uid());
CREATE INDEX IF NOT EXISTS idx_exec_logs_chain ON automation_execution_logs(chain_id);
CREATE INDEX IF NOT EXISTS idx_exec_logs_time ON automation_execution_logs(executed_at DESC);

-- ============================================================
-- 70. Usage Alerts (replaces localStorage tbh-usage-alerts)
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('threshold_warning','threshold_critical','downgrade_blocked','quota_exceeded')),
  metric TEXT NOT NULL,
  current_value INT NOT NULL DEFAULT 0,
  limit_value INT NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'free',
  message TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own usage alerts" ON usage_alerts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own usage alerts" ON usage_alerts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own usage alerts" ON usage_alerts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own usage alerts" ON usage_alerts FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_usage_alerts_user ON usage_alerts(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_usage_alerts_created ON usage_alerts(created_at DESC);

-- ============================================================
-- 71. Reports (weekly/monthly report persistence)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL DEFAULT '__default__',
  type TEXT NOT NULL DEFAULT 'weekly' CHECK (type IN ('weekly', 'monthly', 'custom')),
  title TEXT NOT NULL,
  period TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  ai_summary TEXT,
  structured_data JSONB DEFAULT '{}',
  model TEXT DEFAULT 'deepseek',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can read reports" ON reports FOR SELECT TO authenticated USING (
  team_id = '__default__' OR EXISTS (SELECT 1 FROM members m WHERE m.id = auth.uid()::text)
);
CREATE POLICY "Users can create reports" ON reports FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admin can delete reports" ON reports FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM members m WHERE m.id = auth.uid()::text AND m.role = ANY(ARRAY['admin','manager']))
);
CREATE INDEX IF NOT EXISTS idx_reports_team ON reports(team_id, type);
CREATE INDEX IF NOT EXISTS idx_reports_period ON reports(period_start DESC);

-- ============================================================
-- 72. DSTE Seasons (replaces localStorage tbh-dste-seasons)
-- ============================================================
CREATE TABLE IF NOT EXISTS dste_seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL DEFAULT '__default__' UNIQUE,
  seasons_json JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE dste_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members can read DSTE seasons" ON dste_seasons FOR SELECT TO authenticated USING (
  team_id = '__default__' OR EXISTS (SELECT 1 FROM members m WHERE m.id = auth.uid()::text)
);
CREATE POLICY "Admin can manage DSTE seasons" ON dste_seasons FOR ALL TO authenticated USING (
  team_id = '__default__' OR EXISTS (SELECT 1 FROM members m WHERE m.id = auth.uid()::text AND m.role = ANY(ARRAY['admin','manager']))
);

-- ============================================================
-- 73. pg_cron: Scheduled jobs (daily digest, weekly report, risk scan)
-- ============================================================
-- NOTE: These require pg_cron and pg_net extensions enabled in Supabase Dashboard.
-- Run: CREATE EXTENSION IF NOT EXISTS pg_cron; CREATE EXTENSION IF NOT EXISTS pg_net;
-- Then execute the functions below in SQL Editor.

-- Daily digest: aggregate tasks/goals summary, store in reports table
CREATE OR REPLACE FUNCTION daily_digest()
RETURNS void AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_period TEXT := to_char(v_today, 'YYYY-MM-DD');
  v_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_tasks', (SELECT count(*) FROM tasks WHERE team_id = '__default__'),
    'completed_tasks', (SELECT count(*) FROM tasks WHERE team_id = '__default__' AND status = 'done'),
    'overdue_tasks', (SELECT count(*) FROM tasks WHERE team_id = '__default__' AND status != 'done' AND due_date < v_today),
    'total_goals', (SELECT count(*) FROM goals),
    'at_risk_goals', (SELECT count(*) FROM goals WHERE status != 'done' AND progress < 50)
  ) INTO v_summary;

  INSERT INTO reports (team_id, type, title, period, period_start, period_end, ai_summary, structured_data)
  VALUES ('__default__', 'daily', '每日摘要 ' || v_period, v_period, v_today, v_today, '自动生成每日摘要', v_summary);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Weekly report generation: runs every Monday at 00:05
CREATE OR REPLACE FUNCTION weekly_report_generate()
RETURNS void AS $$
DECLARE
  v_week_start DATE := date_trunc('week', CURRENT_DATE)::date;
  v_week_end DATE := v_week_start + 6;
  v_period TEXT := to_char(v_week_start, 'YYYY-MM-DD') || ' ~ ' || to_char(v_week_end, 'YYYY-MM-DD');
  v_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_tasks', (SELECT count(*) FROM tasks WHERE team_id = '__default__'),
    'completed_tasks', (SELECT count(*) FROM tasks WHERE team_id = '__default__' AND status = 'done' AND completed_at >= v_week_start),
    'overdue_tasks', (SELECT count(*) FROM tasks WHERE team_id = '__default__' AND status != 'done' AND due_date < CURRENT_DATE),
    'total_goals', (SELECT count(*) FROM goals),
    'avg_goal_progress', COALESCE((SELECT avg(progress) FROM goals), 0),
    'unresolved_alerts', (SELECT count(*) FROM deviation_alerts WHERE is_resolved = false)
  ) INTO v_data;

  INSERT INTO reports (team_id, type, title, period, period_start, period_end, ai_summary, structured_data)
  VALUES ('__default__', 'weekly', '周报 ' || v_period, v_period, v_week_start, v_week_end, '自动生成周报（AI摘要需前端手动触发）', v_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Risk auto-scan: check for overdue tasks and at-risk goals
CREATE OR REPLACE FUNCTION risk_auto_scan()
RETURNS void AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_new_alerts INT := 0;
  v_task RECORD;
  v_goal RECORD;
BEGIN
  -- Scan overdue tasks (not done, past due_date)
  FOR v_task IN SELECT id, title, due_date FROM tasks WHERE team_id = '__default__' AND status != 'done' AND due_date < v_today AND due_date >= v_today - interval '7 days'
  LOOP
    INSERT INTO deviation_alerts (goal_id, type, severity, message, is_resolved)
    SELECT g.id, 'task_overdue', 'warning', '任务逾期: ' || v_task.title || ' (截止' || v_task.due_date || ')', false
    FROM goals g WHERE g.id = (SELECT goal_id FROM tasks WHERE id = v_task.id)
    ON CONFLICT DO NOTHING;
    v_new_alerts := v_new_alerts + 1;
  END LOOP;

  -- Scan at-risk goals (progress < 30% and end_date within 14 days)
  FOR v_goal IN SELECT id, title, progress, end_date FROM goals WHERE status != 'done' AND progress < 30 AND end_date IS NOT NULL AND end_date <= v_today + interval '14 days' AND end_date >= v_today
  LOOP
    INSERT INTO deviation_alerts (goal_id, type, severity, message, is_resolved)
    VALUES (v_goal.id, 'goal_at_risk', 'critical', '目标风险: ' || v_goal.title || ' (进度' || v_goal.progress || '%, 截止' || v_goal.end_date || ')', false)
    ON CONFLICT DO NOTHING;
    v_new_alerts := v_new_alerts + 1;
  END LOOP;

  RAISE NOTICE 'Risk auto-scan completed: % new alerts', v_new_alerts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule pg_cron jobs (run these in Supabase SQL Editor after enabling extensions):
-- SELECT cron.schedule('daily-digest', '0 6 * * *', $$SELECT daily_digest()$$);
-- SELECT cron.schedule('weekly-report', '5 0 * * 1', $$SELECT weekly_report_generate()$$);
-- SELECT cron.schedule('risk-scan', '30 7 * * *', $$SELECT risk_auto_scan()$$);
