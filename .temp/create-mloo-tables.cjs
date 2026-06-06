const { Client } = require('pg');
const client = new Client({
  host: 'db.atexvoyvnnuaonvrgzhn.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Liconghe1985@',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();

  // 1. action_items — MLOO闭环核心表
  console.log('Creating action_items table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS action_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',  -- 'review' | 'deviation' | 'manual' | 'ai_suggested'
      source_id UUID,                          -- FK to the originating review/deviation
      goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
      assignee_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',     -- 'open' | 'in_progress' | 'completed' | 'cancelled'
      priority TEXT DEFAULT 'medium',          -- 'low' | 'medium' | 'high' | 'critical'
      due_date DATE,
      completed_at TIMESTAMPTZ,
      closed_loop BOOLEAN DEFAULT false,       -- true when action item feeds back to goal
      team_id TEXT DEFAULT '__default__',
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('  OK');

  // 2. deviation_alerts — 偏差告警持久化
  console.log('Creating deviation_alerts table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS deviation_alerts (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
      task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
      alert_type TEXT NOT NULL,                -- 'progress_behind' | 'overdue' | 'stalled' | 'kr_off_track'
      severity TEXT NOT NULL DEFAULT 'warning', -- 'info' | 'warning' | 'critical'
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      is_resolved BOOLEAN DEFAULT false,
      resolved_at TIMESTAMPTZ,
      action_item_id UUID REFERENCES action_items(id) ON DELETE SET NULL,
      team_id TEXT DEFAULT '__default__',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('  OK');

  // Enable RLS
  console.log('Enabling RLS...');
  await client.query('ALTER TABLE action_items ENABLE ROW LEVEL SECURITY');
  await client.query('ALTER TABLE deviation_alerts ENABLE ROW LEVEL SECURITY');
  console.log('  OK');

  // RLS policies
  console.log('Creating RLS policies...');
  
  // action_items: team members can CRUD
  await client.query(`
    CREATE POLICY "team_select_action_items" ON action_items FOR SELECT TO authenticated 
    USING (is_team_member(team_id));
  `);
  await client.query(`
    CREATE POLICY "team_insert_action_items" ON action_items FOR INSERT TO authenticated 
    WITH CHECK (is_team_member(team_id));
  `);
  await client.query(`
    CREATE POLICY "team_update_action_items" ON action_items FOR UPDATE TO authenticated 
    USING (is_team_member(team_id)) WITH CHECK (is_team_member(team_id));
  `);
  await client.query(`
    CREATE POLICY "team_delete_action_items" ON action_items FOR DELETE TO authenticated 
    USING (is_team_admin(team_id));
  `);

  // deviation_alerts: team members can read, system can insert
  await client.query(`
    CREATE POLICY "team_select_deviation_alerts" ON deviation_alerts FOR SELECT TO authenticated 
    USING (is_team_member(team_id));
  `);
  await client.query(`
    CREATE POLICY "team_insert_deviation_alerts" ON deviation_alerts FOR INSERT TO authenticated 
    WITH CHECK (is_team_member(team_id));
  `);
  await client.query(`
    CREATE POLICY "team_update_deviation_alerts" ON deviation_alerts FOR UPDATE TO authenticated 
    USING (is_team_member(team_id)) WITH CHECK (is_team_member(team_id));
  `);

  console.log('  OK');

  // Indexes
  console.log('Creating indexes...');
  await client.query('CREATE INDEX IF NOT EXISTS idx_action_items_goal_id ON action_items(goal_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_action_items_source ON action_items(source, source_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_action_items_team_id ON action_items(team_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_deviation_alerts_goal_id ON deviation_alerts(goal_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_deviation_alerts_team_id ON deviation_alerts(team_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_deviation_alerts_unread ON deviation_alerts(is_read, is_resolved)');
  console.log('  OK');

  // Audit triggers
  console.log('Adding audit triggers...');
  await client.query(`
    DROP TRIGGER IF EXISTS audit_action_items ON action_items;
    CREATE TRIGGER audit_action_items AFTER INSERT OR UPDATE OR DELETE ON action_items FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
  `);
  await client.query(`
    DROP TRIGGER IF EXISTS audit_deviation_alerts ON deviation_alerts;
    CREATE TRIGGER audit_deviation_alerts AFTER INSERT OR UPDATE OR DELETE ON deviation_alerts FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
  `);
  console.log('  OK');

  // Updated_at triggers
  await client.query(`
    DROP TRIGGER IF EXISTS set_updated_at ON action_items;
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON action_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  `);
  console.log('  OK');

  // Add to realtime
  try {
    await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE action_items');
    console.log('  action_items added to realtime');
  } catch (e) {
    console.log('  action_items already in realtime');
  }
  try {
    await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE deviation_alerts');
    console.log('  deviation_alerts added to realtime');
  } catch (e) {
    console.log('  deviation_alerts already in realtime');
  }

  // Verify
  console.log('\n=== Verification ===');
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('action_items', 'deviation_alerts') AND table_schema = 'public'
  `);
  console.log('New tables:', tables.rows.map(r => r.table_name).join(', '));

  await client.end();
  console.log('\nAll done!');
}

run().catch(err => { console.error(err); process.exit(1); });
