// Verify synthetic staff events only. No guest conversations or credentials printed.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { db, context } = require('../lib/telemetry.cjs');
(async () => {
  const root = 'https://anotherhouse-guide.vercel.app', sql = db();
  const telemetry = { visitorId: randomUUID(), sessionId: randomUUID(), internal: true };
  const body = { id: randomUUID(), kind: 'engagement', activeMs: 1200, language: 'ko', telemetry };
  const send = payload => fetch(root + '/api/analytics-event', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: root }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
  assert.equal((await send(body)).status, 202);
  assert.equal((await send(body)).status, 202); // replay: same ID must be stored only once
  assert.equal((await send({ ...body, id: randomUUID(), activeMs: 60001 })).status, 400);
  assert.equal((await send({ ...body, id: randomUUID(), telemetry: { ...telemetry, optOut: true } })).status, 204);
  const session = context({ telemetry }).session;
  let rows = [];
  for (let i = 0; i < 8; i++) {
    rows = await sql`SELECT data FROM concierge_events WHERE data->>'session'=${session}`;
    if (rows.length) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.equal(rows.length, 1); assert.equal(rows[0].data.activeMs, 1200); assert.equal(rows[0].data.internal, true);
  const range = { from: new Date(Date.now() - 3600000).toISOString(), to: new Date(Date.now() + 60000).toISOString() };
  const response = await fetch(root + '/api/analytics-report?' + new URLSearchParams(range), { headers: { Authorization: 'Bearer ' + process.env.ANALYTICS_REPORT_TOKEN }, signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200);
  const report = await response.json();
  assert.ok(report.engagementCollectionStartedAt); assert.ok(report.current.activeTime.available);
  assert.ok(report.current.internalEventsExcluded >= 1); assert.ok(report.current.activeTime);
  assert.equal((await fetch(root + '/api/analytics-report')).status, 401);
  console.log(JSON.stringify({ storage: 'verified', duplicateSuppression: 'verified', optOut: 'verified', durationValidation: 'verified', internalFlag: 'verified', privateReport: 'verified', engagementCollectionStartedAt: report.engagementCollectionStartedAt }));
})().catch(error => { console.error('Visible-time verification failed:', error.code || error.name); process.exitCode = 1; });
