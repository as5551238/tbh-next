// Execute SQL migrations against Supabase PostgreSQL
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
  console.log('Connected to Supabase PostgreSQL');

  // Migration 1: Create team_members table
  console.log('\n=== Migration 1: Create team_members table ===');
  await client.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      team_id TEXT NOT NULL,
      member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(team_id, member_id)
    );
  `);
  console.log('team_members table created');

  // Migration 2: Add team_id columns to business tables
  console.log('\n=== Migration 2: Add team_id columns ===');
  
  const alterStatements = [
    "ALTER TABLE goals ADD COLUMN IF NOT EXISTS team_id TEXT DEFAULT '__default__'",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS team_id TEXT DEFAULT '__default__'",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_id TEXT DEFAULT '__default__'",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE SET NULL",
    "ALTER TABLE knowledge_docs ADD COLUMN IF NOT EXISTS team_id TEXT DEFAULT '__default__'",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS team_id TEXT DEFAULT '__default__'",
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS team_id UUID",
  ];

  for (const sql of alterStatements) {
    try {
      await client.query(sql);
      console.log(`  OK: ${sql.substring(7, 60)}...`);
    } catch (err) {
      console.log(`  SKIP: ${sql.substring(7, 60)}... (${err.message})`);
    }
  }

  // Migration 3: Enable RLS on team_members
  console.log('\n=== Migration 3: Enable RLS on team_members ===');
  await client.query('ALTER TABLE team_members ENABLE ROW LEVEL SECURITY');
  console.log('RLS enabled on team_members');

  // Migration 4: Add RLS policies for team_members
  console.log('\n=== Migration 4: Add RLS policies for team_members ===');
  
  const policies = [
    `CREATE POLICY "member_read_teams" ON team_members FOR SELECT TO authenticated 
     USING (member_id = auth.uid() OR EXISTS (
       SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.member_id = auth.uid() AND tm.role IN ('admin', 'owner', 'leader')
     ))`,
    `CREATE POLICY "admin_insert_team_member" ON team_members FOR INSERT TO authenticated 
     WITH CHECK (EXISTS (
       SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.member_id = auth.uid() AND tm.role IN ('admin', 'owner')
     ))`,
    `CREATE POLICY "admin_update_team_member" ON team_members FOR UPDATE TO authenticated 
     USING (EXISTS (
       SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.member_id = auth.uid() AND tm.role IN ('admin', 'owner')
     ))`,
    `CREATE POLICY "admin_delete_team_member" ON team_members FOR DELETE TO authenticated 
     USING (EXISTS (
       SELECT 1 FROM team_members tm WHERE tm.team_id = team_members.team_id AND tm.member_id = auth.uid() AND tm.role IN ('admin', 'owner')
     ))`,
  ];

  for (const sql of policies) {
    try {
      await client.query(sql);
      console.log(`  OK: policy created`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`  SKIP: policy already exists`);
      } else {
        console.log(`  ERROR: ${err.message}`);
      }
    }
  }

  // Migration 5: Add new indexes
  console.log('\n=== Migration 5: Add indexes ===');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)',
    'CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON team_members(member_id)',
    'CREATE INDEX IF NOT EXISTS idx_goals_team_id ON goals(team_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON tasks(team_id)',
    'CREATE INDEX IF NOT EXISTS idx_members_team_id ON members(team_id)',
  ];

  for (const sql of indexes) {
    await client.query(sql);
    console.log(`  OK: index created`);
  }

  // Migration 6: Add realtime for team_members
  console.log('\n=== Migration 6: Add realtime for team_members ===');
  try {
    await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE team_members');
    console.log('  OK: team_members added to realtime');
  } catch (err) {
    if (err.message.includes('already a member')) {
      console.log('  SKIP: already in realtime publication');
    } else {
      console.log(`  ERROR: ${err.message}`);
    }
  }

  // Fix: Remove collab_docs from realtime (doesn't exist)
  try {
    await client.query('ALTER PUBLICATION supabase_realtime DROP TABLE collab_docs');
    console.log('  OK: removed non-existent collab_docs from realtime');
  } catch (err) {
    console.log(`  SKIP: ${err.message}`);
  }

  // Verify
  console.log('\n=== Verification ===');
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

  const tmCount = await client.query('SELECT count(*) FROM team_members');
  console.log('team_members count:', tmCount.rows[0].count);

  // Check team_id columns exist
  const cols = await client.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE column_name = 'team_id' AND table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('Tables with team_id:', cols.rows.map(r => r.table_name).join(', '));

  await client.end();
  console.log('\nAll migrations complete!');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
