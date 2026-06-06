// Create missing tables for TBH-Next data persistence
const pg = require('pg');

const client = new pg.Client({
  host: 'db.atexvoyvnnuaonvrgzhn.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Liconghe1985@',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase');

  const tables = [
    `CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY DEFAULT 'an-' || gen_random_uuid()::text,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
      author_id TEXT,
      team_id TEXT DEFAULT '__default__',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS shared_files (
      id TEXT PRIMARY KEY DEFAULT 'f-' || gen_random_uuid()::text,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'document',
      size_kb INTEGER DEFAULT 0,
      uploader_id TEXT,
      team_id TEXT DEFAULT '__default__',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY DEFAULT 'c-' || gen_random_uuid()::text,
      name TEXT NOT NULL,
      department TEXT DEFAULT '',
      role TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      status TEXT DEFAULT 'offline' CHECK (status IN ('online','busy','away','offline')),
      is_ai BOOLEAN DEFAULT false,
      team_id TEXT DEFAULT '__default__',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`,
  ];

  for (const sql of tables) {
    try {
      await client.query(sql);
      console.log('OK:', sql.slice(0, 60).replace(/\n/g, ' '));
    } catch (e) {
      console.warn('SKIP:', e.message.slice(0, 80));
    }
  }

  // Add updated_at triggers for new tables
  const triggerTables = ['announcements', 'shared_files', 'contacts'];
  for (const t of triggerTables) {
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION update_${t}_updated_at()
        RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
      `);
      await client.query(`DROP TRIGGER IF EXISTS trg_${t}_updated_at ON ${t}`);
      await client.query(`CREATE TRIGGER trg_${t}_updated_at BEFORE UPDATE ON ${t} FOR EACH ROW EXECUTE FUNCTION update_${t}_updated_at()`);
      console.log(`Trigger OK: ${t}`);
    } catch (e) {
      console.warn(`Trigger SKIP: ${t}:`, e.message.slice(0, 60));
    }
  }

  // Enable RLS on new tables
  for (const t of triggerTables) {
    try {
      await client.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      // Add permissive policy for authenticated users
      await client.query(`CREATE POLICY "${t}_authenticated_all" ON ${t} FOR ALL USING (true) WITH CHECK (true)`);
      console.log(`RLS OK: ${t}`);
    } catch (e) {
      console.warn(`RLS SKIP: ${t}:`, e.message.slice(0, 60));
    }
  }

  // Ensure schedule_events table has proper columns (it should already exist)
  try {
    const { rows } = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'schedule_events'`);
    const cols = rows.map(r => r.column_name);
    if (!cols.includes('type')) {
      await client.query(`ALTER TABLE schedule_events ADD COLUMN type TEXT DEFAULT 'event'`);
      console.log('Added type column to schedule_events');
    }
    console.log('schedule_events columns:', cols.join(', '));
  } catch (e) {
    console.warn('schedule_events check:', e.message.slice(0, 60));
  }

  await client.end();
  console.log('Done!');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
