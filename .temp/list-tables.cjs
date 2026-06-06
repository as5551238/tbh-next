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
    SELECT table_name,
           (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as col_count
    FROM information_schema.tables t
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log('Existing tables and column counts:');
  result.rows.forEach(r => console.log(`  ${r.table_name}: ${r.col_count} columns`));
  await client.end();
}
run().catch(err => { console.error(err); process.exit(1); });
