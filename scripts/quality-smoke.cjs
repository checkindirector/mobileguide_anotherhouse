// Production tests are synthetic and staff-marked. Never print guest text or secrets.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { db, context } = require('../lib/telemetry.cjs');
const { buildReport } = require('../lib/weekly-report.cjs');
(async () => {
  const root = 'https://anotherhouse-guide.vercel.app', sql = db();
  const telemetry = { visitorId: randomUUID(), sessionId: randomUUID(), internal: true, turn: 1 };
  const interactionId = randomUUID(), requestId = randomUUID(), ids = [];
  const send = (path, body) => fetch(root + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: root }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
  const event = async (kind, fields = {}) => {
    const id = randomUUID(); ids.push(id);
    assert.equal((await send('/api/analytics-event', { id, kind, language: 'ko', telemetry, ...fields })).status, 202);
    return id;
  };
  await event('faq_click', { faqId: 'checkin_time', surface: 'home', accepted: true });
  await event('chat_open', { interactionId });
  await event('chat_submit', { interactionId, requestId });
  await event('chat_pause', { interactionId, requestId, stage: 'waiting_answer', reason: 'hidden' });
  const response = await send('/api/chat', { message: '체크인 시간', requestId, language: 'ko', telemetry });
  assert.equal(response.status, 200); const answer = await response.json(); assert.ok(answer.answer);
  assert.ok(answer.links.some(link => link.kind === 'guide' && link.route === 'checkin'));
  await event('chat_resume', { interactionId, requestId, stage: 'waiting_answer' });
  await event('answer_view', { interactionId, requestId, outcome: 'answer' });
  await event('answer_feedback', { interactionId, requestId, vote: 'helpful' });
  const negativeId = await event('answer_feedback', { interactionId, requestId, vote: 'unresolved' });
  await event('answer_link', { interactionId, requestId, linkKind: 'guide', destination: 'checkin', url: 'https://fake.test/?secret=DO_NOT_STORE', question: 'DO_NOT_STORE' });
  await event('chat_close', { interactionId, requestId, stage: 'after_answer', reason: 'guide' });
  assert.equal((await send('/api/analytics-event', { id: negativeId, kind: 'answer_feedback', interactionId, requestId, vote: 'unresolved', language: 'ko', telemetry })).status, 202);
  assert.equal((await send('/api/analytics-event', { id: randomUUID(), kind: 'answer_feedback', interactionId, requestId, vote: 'helpful', telemetry: { ...telemetry, optOut: true } })).status, 204);
  assert.equal((await send('/api/analytics-event', { id: randomUUID(), kind: 'answer_link', interactionId, requestId, linkKind: 'map', destination: 'https://fake.test/', telemetry })).status, 400);
  const session = context({ telemetry }).session;
  let rows = [];
  for (let i = 0; i < 8; i++) {
    rows = await sql`SELECT data FROM concierge_events WHERE data->>'session'=${session}`;
    if (rows.length === ids.length + 1 && rows.some(x => x.data.kind === 'chat' && x.data.state === 'complete')) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.equal(rows.length, ids.length + 1); assert.ok(rows.every(x => x.data.internal === true));
  assert.ok(!JSON.stringify(rows).includes('DO_NOT_STORE')); assert.ok(!JSON.stringify(rows).includes('https://fake.test'));
  assert.equal(rows.find(x => x.data.kind === 'chat').data.requestId, requestId);
  const range = { from: new Date(Date.now() - 3600000).toISOString(), to: new Date(Date.now() + 60000).toISOString() };
  const reportResponse = await fetch(root + '/api/analytics-report?' + new URLSearchParams(range), { headers: { Authorization: 'Bearer ' + process.env.ANALYTICS_REPORT_TOKEN }, signal: AbortSignal.timeout(25000) });
  assert.equal(reportResponse.status, 200); const report = await reportResponse.json();
  assert.ok(report.qualityCollectionStartedAt); assert.ok(report.current.quality.available);
  assert.ok(report.current.internalEventsExcluded >= rows.length);
  assert.ok(!report.conversations.some(x => x.session === session)); assert.ok(!report.qualityReviewCases.some(x => x.requestId === requestId));
  // Verify derivation on isolated test records only; never change their stored staff flags.
  const isolated = buildReport(rows.map(x => ({ ...x.data, internal: false })), range, report.collectionStartedAt, report.engagementCollectionStartedAt, report.qualityCollectionStartedAt);
  assert.equal(isolated.current.quality.feedback.ratings, 1); assert.equal(isolated.current.quality.feedback.unresolved, 1);
  assert.equal(isolated.current.quality.links.clickThroughRate, 1); assert.equal(isolated.current.quality.faq.clicks, 1);
  assert.equal(isolated.current.quality.flow.waitingAnswerPageHidden, 1); assert.equal(isolated.current.quality.flow.waitingAnswerClosed, 0);
  assert.equal(isolated.conversations[0].quality.feedback.vote, 'unresolved');
  assert.equal((await fetch(root + '/api/analytics-report')).status, 401);
  console.log(JSON.stringify({ storage: 'verified', fourMetrics: 'verified', questionAssociation: 'verified', lastVoteDeduplication: 'verified', staffExclusion: 'verified', optOut: 'verified', allowlistedMetadata: 'verified', privateReport: 'verified', qualityCollectionStartedAt: report.qualityCollectionStartedAt }));
})().catch(error => { console.error('Quality telemetry verification failed:', error.code || error.name); process.exitCode = 1; });
