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

  // Check goals.id and tasks.id types
  const goalIdType = await client.query(`
    SELECT data_type, udt_name FROM information_schema.columns 
    WHERE table_name = 'goals' AND column_name = 'id' AND table_schema = 'public'
  `);
  console.log('goals.id type:', goalIdType.rows[0]);

  const taskIdType = await client.query(`
    SELECT data_type, udt_name FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'id' AND table_schema = 'public'
  `);
  console.log('tasks.id type:', taskIdType.rows[0]);

  await client.end();
}
run().catch(err => { console.error(err); process.exit(1); });
