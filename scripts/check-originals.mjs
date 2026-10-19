import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const originals = require('../lib/message-originals.cjs');
const telemetry = require('../lib/telemetry.cjs');
const reportHandler = require('../api/analytics-report.js');
process.env.ANALYTICS_REPORT_TOKEN = 'test-originals-admin-token-'.repeat(3);

test('original messages retain guest details, codes, URLs and exact whitespace, encrypted at rest', () => {
  const question = '제 이름은 테스트. test@example.com 010-1234-5678\n룸키 두고나옴';
  const answer = '테스트 공용문\n2468 → ENT https://example.com/guide  ';
  const a = originals.seal('event-a', question, answer), b = originals.seal('event-a', question, answer);
  assert.notEqual(a.ciphertext, b.ciphertext);
  assert.ok(!JSON.stringify(a).includes('test@example.com'));
  assert.deepEqual(originals.open('event-a', a), { question, answer });
  assert.throws(() => originals.open('event-b', a));
  assert.throws(() => originals.open('event-a', { ...a, tag: Buffer.alloc(16).toString('base64') }));
});

test('server infrastructure secrets never enter original messages; guest entrance code remains', () => {
  process.env.OPENAI_API_KEY = 'test-infrastructure-secret';
  process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE = '2468';
  try {
    const a = originals.open('id', originals.seal('id', 'test-infrastructure-secret', '2468'));
    assert.equal(a.question, '[SERVER_SECRET_REMOVED]'); assert.equal(a.answer, '2468');
  } finally { delete process.env.OPENAI_API_KEY; delete process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE; }
});

test('only updated privacy-notice clients collect originals; opt-out and legacy clients do not', () => {
  const event = policy => telemetry.chatEvent({body:{message:'test@example.com',telemetry:policy}},{answer:'2468'},200,Date.now(),'test-id');
  const current = event({messagePolicy:originals.POLICY});
  assert.equal(current.question,'[EMAIL]'); assert.equal(current.answer,'[NUMBER]');
  assert.deepEqual(originals.open(current.id,current.encryptedOriginal),{question:'test@example.com',answer:'2468'});
  assert.equal(event({}).encryptedOriginal,undefined);
  assert.equal(event({messagePolicy:originals.POLICY,optOut:true}).encryptedOriginal,undefined);
});

test('reports omit ciphertext and originals by default, and explicitly distinguish historical gaps and decryption failures', () => {
  const event={id:'a',kind:'chat',question:'[EMAIL]',encryptedOriginal:originals.seal('a','test@example.com','2468')};
  const safe=originals.forReport(event);
  assert.equal(safe.encryptedOriginal,undefined); assert.equal(safe.originalMessages,undefined);
  assert.equal(safe.originalMessagesStatus,'available_on_request');
  assert.equal(originals.forReport(event,true).originalMessages.question,'test@example.com');
  assert.equal(originals.forReport({id:'old',kind:'chat'},true).originalMessagesStatus,'unavailable_legacy');
  const old=process.env.ANALYTICS_REPORT_TOKEN;
  try { process.env.ANALYTICS_REPORT_TOKEN='different-token-'.repeat(4); assert.equal(originals.forReport(event,true).originalMessagesStatus,'decryption_failed'); }
  finally { process.env.ANALYTICS_REPORT_TOKEN=old; }
  assert.ok(event.encryptedOriginal); // Report conversion never mutates storage.
});

test('original-report query never bypasses admin authentication', async () => {
  const res={statusCode:200,setHeader(){},status(c){this.statusCode=c;return this;},json(x){this.payload=x;return this;}};
  await reportHandler({method:'GET',headers:{},query:{includeOriginals:'1'}},res);
  assert.equal(res.statusCode,401); assert.equal(res.payload.originalMessages,undefined);
});

test('five-language notice discloses original-message storage and keeps privacy controls', () => {
  const source=readFileSync(new URL('../assets/concierge-telemetry.js',import.meta.url),'utf8');
  for(const phrase of ['질문과 실제 답변 원문','Original messages include','質問と実際の回答の原文','实际回答原文','實際回答原文']) assert.ok(source.includes(phrase),phrase);
  assert.ok(source.includes("messagePolicy: 'internal-original-v1'"));
  assert.ok(source.includes('navigator.globalPrivacyControl === true'));
  assert.ok(!source.includes('automatically masked'));
});

test('deployment build and report entry points retain the original-message recovery contract', () => {
  const source = file => readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const api=source('api/analytics-report.js'), script=source('scripts/weekly-report.cjs');
  assert.ok(api.includes('forReport(x.data, includeOriginals)'));
  for(const field of ['originalMessagesCoverage','originalMessagesCollectionStartedAt','originalMessagesRequested']) assert.ok(api.includes(field),field);
  assert.ok(api.indexOf('if (!authorized(req))') < api.indexOf('includeOriginals ='));
  assert.ok(script.includes("includeOriginals: '1'"));
  assert.ok(JSON.parse(source('package.json')).scripts.build.includes('check:telemetry'));
  for(const file of ['index.html','guide-anotherhouse.html']) assert.ok(source(file).includes('concierge-telemetry.js?v=20261019-1'));
});
