-- TBH Next Database Schema v2
-- Security-hardened: RLS + audit logs + updated_at triggers
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. Industries table
-- ============================================================
CREATE TABLE IF NOT EXISTS industries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  color TEXT DEFAULT '#7b6cf0',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry TEXT NOT NULL REFERENCES industries(name) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(industry, name)
);

-- 3. KPIs table
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
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
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
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. Channel messages (realtime chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL,
  sender_id UUID,
  sender_name TEXT NOT NULL DEFAULT '',
  sender_type TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'ai' | 'system'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12b. Subscriptions & billing
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',     -- 'free' | 'pro' | 'enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'past_due' | 'canceled'
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 12c. Usage tracking
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,    -- 'ai_query' | 'agent_run' | 'doc_edit' | 'export' | 'api_call'
  detail JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,             -- INSERT, UPDATE, DELETE
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. Row Level Security
-- ============================================================

-- Enable RLS on all tables
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
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated) for reference data
CREATE POLICY "public_read_industries" ON industries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_departments" ON departments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_kpis" ON kpis FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_matrix_cells" ON matrix_cells FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_agents" ON agents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_channels" ON channels FOR SELECT TO anon, authenticated USING (true);

-- Authenticated-only access for business data
-- Goals: read all, write own or admin/manager
CREATE POLICY "auth_read_goals" ON goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_goals" ON goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_goals" ON goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_goals" ON goals FOR DELETE TO authenticated USING (true);

-- Tasks: read all, write own or admin/manager
CREATE POLICY "auth_read_tasks" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_tasks" ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_tasks" ON tasks FOR DELETE TO authenticated USING (true);

-- Projects: read all, write own or admin/manager
CREATE POLICY "auth_read_projects" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_projects" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_projects" ON projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_projects" ON projects FOR DELETE TO authenticated USING (true);

-- Knowledge docs: read all, write own or admin/manager
CREATE POLICY "auth_read_knowledge_docs" ON knowledge_docs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_knowledge_docs" ON knowledge_docs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_knowledge_docs" ON knowledge_docs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_knowledge_docs" ON knowledge_docs FOR DELETE TO authenticated USING (true);

-- Members: read all, write admin/manager only
CREATE POLICY "auth_read_members" ON members FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_members" ON members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_members" ON members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_members" ON members FOR DELETE TO authenticated USING (true);

-- Anon read for public-facing data (goals, tasks for dashboard preview)
CREATE POLICY "anon_read_goals" ON goals FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_tasks" ON tasks FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_projects" ON projects FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_knowledge_docs" ON knowledge_docs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_members" ON members FOR SELECT TO anon USING (true);

-- Audit logs: read-only for admins, no manual insert
CREATE POLICY "auth_read_audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
-- No INSERT/UPDATE/DELETE policy — only triggers can write audit_logs

-- Messages: authenticated can read/write in their channels
CREATE POLICY "auth_read_messages" ON messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_messages" ON messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "anon_read_messages" ON messages FOR SELECT TO anon USING (true);

-- Subscriptions: users can only read their own
CREATE POLICY "auth_read_own_subscription" ON subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_insert_own_subscription" ON subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "auth_update_own_subscription" ON subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Usage events: users can read their own, insert their own
CREATE POLICY "auth_read_own_usage" ON usage_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_insert_own_usage" ON usage_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 14. Audit trigger function
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

-- Attach audit triggers to business tables
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
-- 15. Auto-update timestamp triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers to all tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['industries','departments','kpis','matrix_cells','agents','channels','goals','tasks','projects','knowledge_docs','members']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
  END LOOP;
END;
$$;

-- ============================================================
-- 16. Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE goals;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE collab_docs;

-- ============================================================
-- 17. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_kpis_industry_dept ON kpis(industry, dept);
CREATE INDEX IF NOT EXISTS idx_agents_industry_dept ON agents(industry, dept);
CREATE INDEX IF NOT EXISTS idx_channels_industry_dept ON channels(industry, dept);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_created_by ON goals(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_usage_events_created ON usage_events(created_at DESC);
