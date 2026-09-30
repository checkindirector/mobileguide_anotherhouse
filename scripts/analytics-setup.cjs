const { db } = require('../lib/telemetry.cjs');
(async () => {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS concierge_events (id uuid PRIMARY KEY, created_at timestamptz NOT NULL, kind text NOT NULL, data jsonb NOT NULL)`;
  await sql`CREATE INDEX IF NOT EXISTS concierge_events_time ON concierge_events (created_at)`;
  await sql`CREATE TABLE IF NOT EXISTS concierge_settings (key text PRIMARY KEY, value text NOT NULL)`;
  console.log('Telemetry schema ready. First successful event will set collection_started_at.');
})().catch(() => { console.error('Schema setup failed. Check the private DATABASE_URL setting.'); process.exitCode = 1; });
