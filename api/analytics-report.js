const { authorized, enabled, db } = require('../lib/telemetry.cjs');
const { previousWeek, buildReport } = require('../lib/weekly-report.cjs');
const { forReport } = require('../lib/message-originals.cjs');
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
    const includeOriginals = req.query?.includeOriginals === '1';
    const report = buildReport(rows.map(x => forReport(x.data, includeOriginals)), { from: new Date(start).toISOString(), to: new Date(end).toISOString() }, config.collection_started_at || null, config.engagement_started_at || null, config.quality_started_at || null, config.marketing_started_at || null, config.journey_started_at || null);
    report.originalMessagesCollectionStartedAt = config.message_originals_started_at || null;
    report.originalMessagesRequested = includeOriginals;
    report.originalMessagesCoverage = Object.fromEntries(['available', 'available_on_request', 'unavailable_legacy', 'capture_failed', 'decryption_failed'].map(status => [status, report.conversations.filter(x => x.originalMessagesStatus === status).length]));
    report.caveats.push('originalMessages는 이름·연락처·게스트용 출입코드가 포함될 수 있는 사내 보고서용 원문입니다. 원문 미수집·복호화 실패는 상태로 구분하며, 과거 가림 값은 추정 복구하지 않습니다. 외부에 공유하지 않습니다.');
    report.retentionCleanupAt = config.last_retention_cleanup || null;
    if (Buffer.byteLength(JSON.stringify(report)) > 3500000) return res.status(413).json({ error: 'Report exceeds safe response size; request a shorter range. No partial report emitted.' });
    return res.status(200).json(report);
  } catch { return res.status(503).json({ error: 'Report storage unavailable' }); }
};
