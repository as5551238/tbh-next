// Fix team_members RLS policies
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

  // Drop existing broken policies first
  const dropPolicies = [
    'DROP POLICY IF EXISTS member_read_teams ON team_members',
    'DROP POLICY IF EXISTS admin_insert_team_member ON team_members',
    'DROP POLICY IF EXISTS admin_update_team_member ON team_members',
    'DROP POLICY IF EXISTS admin_delete_team_member ON team_members',
  ];

  for (const sql of dropPolicies) {
    await client.query(sql);
  }
  console.log('Dropped old policies');

  // Recreate with correct types — member_id is UUID, auth.uid() is UUID
  // The self-reference needs table alias to avoid ambiguity
  const policies = [
    `CREATE POLICY "member_read_teams" ON team_members FOR SELECT TO authenticated 
     USING (
       member_id = auth.uid() 
       OR EXISTS (
         SELECT 1 FROM team_members AS tm 
         WHERE tm.team_id = team_members.team_id 
         AND tm.member_id = auth.uid() 
         AND tm.role IN ('admin', 'owner', 'leader')
       )
     )`,
    `CREATE POLICY "admin_insert_team_member" ON team_members FOR INSERT TO authenticated 
     WITH CHECK (
       EXISTS (
         SELECT 1 FROM team_members AS tm 
         WHERE tm.team_id = team_members.team_id 
         AND tm.member_id = auth.uid() 
         AND tm.role IN ('admin', 'owner')
       )
     )`,
    `CREATE POLICY "admin_update_team_member" ON team_members FOR UPDATE TO authenticated 
     USING (
       EXISTS (
         SELECT 1 FROM team_members AS tm 
         WHERE tm.team_id = team_members.team_id 
         AND tm.member_id = auth.uid() 
         AND tm.role IN ('admin', 'owner')
       )
     )`,
    `CREATE POLICY "admin_delete_team_member" ON team_members FOR DELETE TO authenticated 
     USING (
       EXISTS (
         SELECT 1 FROM team_members AS tm 
         WHERE tm.team_id = team_members.team_id 
         AND tm.member_id = auth.uid() 
         AND tm.role IN ('admin', 'owner')
       )
     )`,
  ];

  for (const sql of policies) {
    try {
      await client.query(sql);
      console.log(`OK: policy created`);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  // Verify policies
  const result = await client.query(`
    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'team_members'
  `);
  console.log('\nteam_members policies:');
  result.rows.forEach(r => console.log(`  ${r.policyname} (${r.cmd})`));

  await client.end();
  console.log('\nDone!');
}

run().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
