const { randomUUID, createHmac, timingSafeEqual } = require('node:crypto');
const { QUALITY_KINDS } = require('./interaction-events.cjs');
const LANGUAGES = new Set(['ko', 'en', 'ja', 'zh', 'zh-TW']);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function enabled() { return process.env.TELEMETRY_ENABLED === 'true' && !!process.env.DATABASE_URL && !!process.env.ANALYTICS_REPORT_TOKEN; }
function db() {
  const { neon } = require('@neondatabase/serverless');
  return neon(process.env.DATABASE_URL, { fetchOptions: { signal: AbortSignal.timeout(8000) } });
}
function redact(input) {
  let value = String(input || '').slice(0, 12000);
  for (const key of ['ANOTHER_HOUSE_COMMON_ENTRANCE_CODE', 'OPENAI_API_KEY', 'ANALYTICS_REPORT_TOKEN']) {
    const secret = process.env[key];
    if (secret) value = value.split(secret).join('[REDACTED]');
  }
  return value
    .replace(/https?:\/\/\S+/giu, '[URL]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu, '[EMAIL]')
    .replace(/(?:\+?\d[\d ()-]{6,}\d)/gu, '[NUMBER]')
    .replace(/\b\d{4,}\b/gu, '[NUMBER]')
    .replace(/((?:비밀번호|비번|도어락|password|passcode|pin|密码|密碼|暗証番号|暗証碼)\s*[:：=]?\s*)[^\s,.;/→]+/giu, '$1[REDACTED]')
    .replace(/((?:제?\s*이름은?|예약자(?:명)?|성함|my name is|name\s*:|我叫|姓名[:：]?|名前[は:：])\s*)[^\n,.!?]{1,45}/giu, '$1[NAME]');
}
function hashId(value) {
  if (!UUID.test(String(value || ''))) return null;
  return createHmac('sha256', process.env.ANALYTICS_REPORT_TOKEN || 'disabled').update(value).digest('hex').slice(0, 32);
}
function context(body = {}) {
  const t = body.telemetry || {};
  return { visitor: hashId(t.visitorId), session: hashId(t.sessionId), internal: t.internal === true,
    turn: Number.isInteger(t.turn) ? Math.min(Math.max(t.turn, 0), 10000) : null,
    language: LANGUAGES.has(body.language) ? body.language : 'ko' };
}
function authorized(req) {
  const expected = process.env.ANALYTICS_REPORT_TOKEN;
  const actual = String(req.headers?.authorization || '').replace(/^Bearer /, '');
  return !!expected && expected.length >= 32 && Buffer.byteLength(actual) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
async function persist(event) {
  if (!enabled()) return;
  const sql = db();
  const queries = [
    sql`INSERT INTO concierge_events (id, created_at, kind, data) VALUES (${event.id}, ${event.at}, ${event.kind}, ${JSON.stringify(event)}::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data WHERE concierge_events.kind = 'chat' AND concierge_events.data->>'state' = 'pending'`,
    sql`INSERT INTO concierge_settings (key, value) VALUES ('collection_started_at', ${event.at}) ON CONFLICT (key) DO NOTHING`
  ];
  if (event.kind === 'engagement') queries.push(sql`INSERT INTO concierge_settings (key, value) VALUES ('engagement_started_at', ${event.at}) ON CONFLICT (key) DO NOTHING`);
  if (QUALITY_KINDS.has(event.kind)) queries.push(sql`INSERT INTO concierge_settings (key, value) VALUES ('quality_started_at', ${event.at}) ON CONFLICT (key) DO NOTHING`);
  await sql.transaction(queries);
}
function validActiveMs(value) { return Number.isInteger(value) && value > 0 && value <= 60000; }
function background(promise) {
  const safe = promise.catch(() => console.error(JSON.stringify({ event: 'telemetry_write_failed' })));
  require('@vercel/functions').waitUntil(safe);
  return safe;
}
function bodyOf(req) {
  try { const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; return body && typeof body === 'object' && !Array.isArray(body) ? body : {}; } catch { return {}; }
}
function chatEvent(req, payload, status, started, id) {
  const body = bodyOf(req), meta = payload.meta || {};
  return { id, at: new Date(started).toISOString(), kind: 'chat', ...context(body),
    requestId: UUID.test(body.requestId || '') ? body.requestId : null,
    question: redact(body.message).slice(0, 1000), answer: redact(payload.answer),
    status, state: status === 102 ? 'pending' : 'complete', durationMs: Math.max(0, Date.now() - started), model: String(payload.model || '').slice(0, 80),
    intent: String(meta.trainingIntent || meta.guideRoute || 'unclassified').slice(0, 80),
    approvedAnswerId: meta.approvedAnswerId || null, sourceRows: meta.sourceRows || [],
    knowledgeVersion: meta.knowledgeVersion || null, searched: !!meta.searched,
    inputTokens: Number(meta.inputTokens || 0), outputTokens: Number(meta.outputTokens || 0),
    cachedTokens: Number(meta.cachedTokens || 0), retried: !!meta.retriedForCompletion,
    links: (payload.links || []).map(link => ({ kind: link.kind, route: link.route || null })),
    error: status >= 400 ? 'request_failed' : null };
}
function observeChat(handler, options = {}) {
  return async function(req, res) {
    const started = Date.now(), id = randomUUID();
    if (!enabled() || req.method !== 'POST' || bodyOf(req).telemetry?.optOut === true) return handler(req, res);
    const save = options.persist || persist, defer = options.background || background;
    const pending = defer(save(chatEvent(req, {}, 102, started, id)));
    const original = res.json.bind(res);
    let recorded = false;
    res.json = payload => {
      if (!recorded) {
        recorded = true;
        const event = chatEvent(req, payload, res.statusCode || 200, started, id);
        defer(pending.then(() => save(event)));
      }
      return original(payload);
    };
    try { return await handler(req, res); }
    catch (error) { if (!recorded) defer(pending.then(() => save(chatEvent(req, {}, 500, started, id)))); throw error; }
  };
}
module.exports = { enabled, db, redact, context, authorized, persist, background, bodyOf, chatEvent, observeChat, UUID, randomUUID, validActiveMs };
