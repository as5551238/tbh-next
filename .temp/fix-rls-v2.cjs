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

  // Drop existing broken policies
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

  // Recreate with cast: member_id::uuid = auth.uid()
  const policies = [
    `CREATE POLICY "member_read_teams" ON team_members FOR SELECT TO authenticated 
     USING (
       member_id::uuid = auth.uid() 
       OR EXISTS (
         SELECT 1 FROM team_members AS tm 
         WHERE tm.team_id = team_members.team_id 
         AND tm.member_id::uuid = auth.uid() 
         AND tm.role IN ('admin', 'owner', 'leader')
       )
     )`,
    `CREATE POLICY "admin_insert_team_member" ON team_members FOR INSERT TO authenticated 
     WITH CHECK (
       EXISTS (
         SELECT 1 FROM team_members AS tm 
         WHERE tm.team_id = team_members.team_id 
         AND tm.member_id::uuid = auth.uid() 
         AND tm.role IN ('admin', 'owner')
       )
     )`,
    `CREATE POLICY "admin_update_team_member" ON team_members FOR UPDATE TO authenticated 
     USING (
       EXISTS (
         SELECT 1 FROM team_members AS tm 
         WHERE tm.team_id = team_members.team_id 
         AND tm.member_id::uuid = auth.uid() 
         AND tm.role IN ('admin', 'owner')
       )
     )`,
    `CREATE POLICY "admin_delete_team_member" ON team_members FOR DELETE TO authenticated 
     USING (
       EXISTS (
         SELECT 1 FROM team_members AS tm 
         WHERE tm.team_id = team_members.team_id 
         AND tm.member_id::uuid = auth.uid() 
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

  // Also fix the RLS helper functions that reference team_members
  console.log('\nFixing RLS helper functions...');
  
  await client.query(`
    CREATE OR REPLACE FUNCTION is_team_member(team_uuid TEXT)
    RETURNS BOOLEAN AS $func$
      SELECT EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = team_uuid AND member_id::uuid = auth.uid()
      );
    $func$ LANGUAGE sql SECURITY DEFINER STABLE;
  `);
  console.log('OK: is_team_member');

  await client.query(`
    CREATE OR REPLACE FUNCTION is_team_admin(team_uuid TEXT)
    RETURNS BOOLEAN AS $func$
      SELECT EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = team_uuid AND member_id::uuid = auth.uid()
        AND role IN ('admin', 'owner', 'leader')
      );
    $func$ LANGUAGE sql SECURITY DEFINER STABLE;
  `);
  console.log('OK: is_team_admin');

  await client.query(`
    CREATE OR REPLACE FUNCTION is_any_team_admin()
    RETURNS BOOLEAN AS $func$
      SELECT EXISTS (
        SELECT 1 FROM team_members
        WHERE member_id::uuid = auth.uid() AND role IN ('admin', 'owner', 'leader')
      );
    $func$ LANGUAGE sql SECURITY DEFINER STABLE;
  `);
  console.log('OK: is_any_team_admin');

  await client.query(`
    CREATE OR REPLACE FUNCTION get_user_team_ids()
    RETURNS SETOF TEXT AS $func$
      SELECT team_id FROM team_members WHERE member_id::uuid = auth.uid();
    $func$ LANGUAGE sql SECURITY DEFINER STABLE;
  `);
  console.log('OK: get_user_team_ids');

  // Verify
  const result = await client.query(`
    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'team_members'
  `);
  console.log('\nteam_members policies:');
  result.rows.forEach(r => console.log(`  ${r.policyname} (${r.cmd})`));

  await client.end();
  console.log('\nDone!');
}

run().catch(err => { console.error(err); process.exit(1); });
