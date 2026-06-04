-- TBH Next Database Schema
-- Run this in Supabase SQL Editor

-- 1. Industries table
CREATE TABLE IF NOT EXISTS industries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  color TEXT DEFAULT '#7b6cf0',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry TEXT NOT NULL REFERENCES industries(name) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  UNIQUE(industry, name),
  created_at TIMESTAMPTZ DEFAULT now()
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
  created_at TIMESTAMPTZ DEFAULT now()
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
  UNIQUE(industry, dept),
  created_at TIMESTAMPTZ DEFAULT now()
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Channels
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry TEXT NOT NULL,
  dept TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
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
  created_at TIMESTAMPTZ DEFAULT now()
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  progress INT DEFAULT 0,
  members INT DEFAULT 1,
  deadline TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Knowledge docs
CREATE TABLE IF NOT EXISTS knowledge_docs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT DEFAULT '文档',
  author TEXT DEFAULT '',
  updated TEXT DEFAULT '',
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. RLS Policies (allow anon read for now)
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

CREATE POLICY "Allow public read on industries" ON industries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read on departments" ON departments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read on kpis" ON kpis FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read on matrix_cells" ON matrix_cells FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read on agents" ON agents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read on channels" ON channels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read on goals" ON goals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read on tasks" ON tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read on projects" ON projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read on knowledge_docs" ON knowledge_docs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read on members" ON members FOR SELECT TO anon, authenticated USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated write on goals" ON goals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write on tasks" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write on projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write on knowledge_docs" ON knowledge_docs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated write on members" ON members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 13. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE goals;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE members;

-- 14. Auto-update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime for collaboration tables
-- (Run in Supabase Dashboard > Database > Replication if needed)
