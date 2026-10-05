const { authorized, enabled, db } = require('../lib/telemetry.cjs');
const { previousWeek, buildReport } = require('../lib/weekly-report.cjs');
module.exports = async function(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!enabled()) return res.status(503).json({ error: 'Collection not configured' });
  const defaults = previousWeek(), from = req.query?.from || defaults.from, to = req.query?.to || defaults.to;
  const start = Date.parse(from), end = Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 8 * 86400000) return res.status(400).json({ error: 'Invalid range (max 8 days)' });
  try {
    const sql = db(), before = new Date(start - (end - start)).toISOString();
    const rows = await sql`SELECT data FROM concierge_events WHERE created_at >= ${before} AND created_at < ${new Date(end).toISOString()} ORDER BY created_at LIMIT 20001`;
    if (rows.length > 20000) return res.status(413).json({ error: 'Too many records; request a shorter range. No partial report emitted.' });
    const settings = await sql`SELECT key, value FROM concierge_settings`;
    const config = Object.fromEntries(settings.map(x => [x.key, x.value]));
    const report = buildReport(rows.map(x => x.data), { from: new Date(start).toISOString(), to: new Date(end).toISOString() }, config.collection_started_at || null, config.engagement_started_at || null, config.quality_started_at || null);
    report.retentionCleanupAt = config.last_retention_cleanup || null;
    if (Buffer.byteLength(JSON.stringify(report)) > 3500000) return res.status(413).json({ error: 'Report exceeds safe response size; request a shorter range. No partial report emitted.' });
    return res.status(200).json(report);
  } catch { return res.status(503).json({ error: 'Report storage unavailable' }); }
};
