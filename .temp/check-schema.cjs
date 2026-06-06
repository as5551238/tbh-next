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
  const result = await client.query(`
    SELECT column_name, data_type, udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'team_members' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  console.log('team_members columns:');
  result.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (${r.udt_name})`));

  // Also check auth.uid() return type
  const uidType = await client.query("SELECT pg_typeof(auth.uid()) as uid_type");
  console.log('\nauth.uid() type:', uidType.rows[0].uid_type);

  await client.end();
}
run().catch(err => { console.error(err); process.exit(1); });
