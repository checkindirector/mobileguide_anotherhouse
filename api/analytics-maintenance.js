const { timingSafeEqual } = require('node:crypto');
const { db, enabled } = require('../lib/telemetry.cjs');
module.exports = async function(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const expected = process.env.CRON_SECRET, token = String(req.headers?.authorization || '').replace(/^Bearer /, '');
  if (!expected || expected.length < 32 || Buffer.byteLength(token) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!enabled()) return res.status(503).json({ error: 'Not configured' });
  try {
    const sql = db();
    await sql`DELETE FROM concierge_events WHERE created_at < NOW() - INTERVAL '90 days'`;
    await sql`INSERT INTO concierge_settings (key, value) VALUES ('last_retention_cleanup', ${new Date().toISOString()}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    return res.status(200).json({ ok: true });
  } catch { return res.status(503).json({ error: 'Maintenance failed' }); }
};
