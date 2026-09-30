import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const t = require('../lib/telemetry.cjs');
const { previousWeek, buildReport } = require('../lib/weekly-report.cjs');
const reportHandler = require('../api/analytics-report.js');
const maintenanceHandler = require('../api/analytics-maintenance.js');
const eventHandler = require('../api/analytics-event.js');
function recorder() { return { statusCode: 200, setHeader(){}, status(c){this.statusCode=c;return this;}, json(v){this.payload=v;return this;}, end(){return this;} }; }
test('telemetry masks contact information, numeric access codes, configured credentials and URLs', () => {
  process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE = 'PRIVATE_TEST_CODE';
  const value=t.redact('제 이름은 홍길동. 010-1234-5678 test@example.com PRIVATE_TEST_CODE 8282 → ENT password: secret999 https://x.test/?token=abc');
  for(const forbidden of ['홍길동','010-1234','test@example','PRIVATE_TEST_CODE','8282','secret999','token=abc']) assert.ok(!value.includes(forbidden), forbidden);
  delete process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE;
  assert.equal(t.redact('짐보관실은 503호 앞, 체크인 15:00, 세탁 9kg'), '짐보관실은 503호 앞, 체크인 15:00, 세탁 9kg');
});
test('client context ignores identifying fields and hashes only UUID identifiers', () => {
  const ctx=t.context({language:'en',telemetry:{visitorId:'fake-email@example.com',sessionId:'b195409e-67c2-4888-a362-94c845f2c693',internal:true,ip:'1.2.3.4',name:'Guest'}});
  assert.equal(ctx.visitor,null); assert.equal(ctx.session.length,32); assert.equal(ctx.internal,true);
  assert.equal(ctx.ip,undefined); assert.equal(ctx.name,undefined);
});
test('reports require configured authorization including unicode-safe rejection', async () => {
  const old=process.env.ANALYTICS_REPORT_TOKEN; process.env.ANALYTICS_REPORT_TOKEN='a'.repeat(32);
  for(const token of ['', 'wrong', '가'.repeat(32)]) { const res=recorder(); await reportHandler({method:'GET',headers:{authorization:'Bearer '+token}},res); assert.equal(res.statusCode,401); }
  assert.equal(t.authorized({headers:{authorization:'Bearer '+'a'.repeat(32)}}),true);
  if(old===undefined)delete process.env.ANALYTICS_REPORT_TOKEN;else process.env.ANALYTICS_REPORT_TOKEN=old;
});
test('maintenance never runs without its own secret', async () => { const res=recorder(); await maintenanceHandler({method:'GET',headers:{}},res); assert.equal(res.statusCode,401); });
test('events fail closed before storage is configured', async () => { const res=recorder(); await eventHandler({method:'POST',headers:{},body:{}},res); assert.equal(res.statusCode,503); });
test('previous week boundaries use Korean time, not host timezone', () => {
  assert.deepEqual(previousWeek(new Date('2026-10-05T00:00:00Z')), {from:'2026-09-27T15:00:00.000Z',to:'2026-10-04T15:00:00.000Z'});
});
test('weekly report excludes tests, deduplicates sessions and avoids fabricated comparisons', () => {
  const base={at:'2026-09-30T03:00:00Z',session:'s1',visitor:'v1',internal:false};
  const events=[{...base,id:'1',kind:'visit'},{...base,id:'2',kind:'visit'},
    {...base,id:'3',kind:'chat',question:'짐?',answer:'가능합니다',status:200,intent:'luggage',language:'ko',durationMs:20},
    {...base,id:'4',kind:'chat',question:'짐',status:502,intent:'luggage',language:'ko',durationMs:12000},
    {...base,id:'5',kind:'chat',internal:true,status:200,durationMs:1000}];
  const result=buildReport(events,{from:'2026-09-27T15:00:00Z',to:'2026-10-04T15:00:00Z'},'2026-09-30T02:00:00Z');
  assert.equal(result.current.visitors,1); assert.equal(result.current.pageViews,2); assert.equal(result.current.chatRequests,2);
  assert.equal(result.current.chatSessions,1); assert.equal(result.current.repeatedQuestionSessions,1);
  assert.equal(result.current.failureRate,.5); assert.equal(result.current.slowResponses,1);
  assert.equal(result.current.internalEventsExcluded,1); assert.equal(result.conversations.length,2);
  assert.equal(result.delta.visitors,null); assert.equal(result.complete,false);
});
test('chat event captures approved answers without raw history, IP or credentials', () => {
  const e=t.chatEvent({body:{message:'짐',history:[{text:'private history'}]},headers:{'x-forwarded-for':'1.2.3.4'}},{answer:'보관 가능',model:'approved',meta:{trainingIntent:'luggage',sourceRows:[9]}},200,Date.now(),'id');
  assert.equal(e.intent,'luggage'); assert.deepEqual(e.sourceRows,[9]); assert.doesNotMatch(JSON.stringify(e),/private history|1\.2\.3\.4/);
});
test('private report files and API responses cannot be served from service-worker cache', () => {
  const ignore=readFileSync(new URL('../.vercelignore',import.meta.url),'utf8'); assert.match(ignore,/reports\//);
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8'); assert.match(sw,/pathname.startsWith\('\/api\/'\)/); assert.match(sw,/no-store\|private/);
});
test('all chat paths record start and completion; opt-out records nothing', async () => {
  const keys=['TELEMETRY_ENABLED','DATABASE_URL','ANALYTICS_REPORT_TOKEN'], old=keys.map(k=>process.env[k]);
  Object.assign(process.env,{TELEMETRY_ENABLED:'true',DATABASE_URL:'postgres://test',ANALYTICS_REPORT_TOKEN:'a'.repeat(64)});
  try {
    for(const status of [200,400,429,502]) {
      const records=[], jobs=[];
      const wrapped=t.observeChat(async(req,res)=>res.status(status).json({answer:status===200?'보관 가능':'',meta:{trainingIntent:'luggage'}}),{persist:async(e)=>{records.push(e);},background:p=>{jobs.push(p);return p.catch(()=>{});}});
      const res=recorder(); await wrapped({method:'POST',headers:{},body:{message:'짐'}},res); await Promise.all(jobs);
      assert.equal(res.statusCode,status); assert.equal(records.length,2); assert.equal(records[0].state,'pending'); assert.equal(records[1].state,'complete'); assert.equal(records[0].id,records[1].id);
      await wrapped({method:'POST',body:{message:'짐',telemetry:{optOut:true}}},recorder()); assert.equal(records.length,2);
    }
  } finally {keys.forEach((k,i)=>{if(old[i]===undefined)delete process.env[k];else process.env[k]=old[i];});}
});
test('storage failure does not break a successful answer',async()=>{
  const keys=['TELEMETRY_ENABLED','DATABASE_URL','ANALYTICS_REPORT_TOKEN'], old=keys.map(k=>process.env[k]);
  Object.assign(process.env,{TELEMETRY_ENABLED:'true',DATABASE_URL:'postgres://test',ANALYTICS_REPORT_TOKEN:'a'.repeat(64)});
  try {const jobs=[];const wrapped=t.observeChat(async(req,res)=>res.json({answer:'정상 답변'}),{persist:async()=>{throw Error('storage_down')},background:p=>{const safe=p.catch(()=>{});jobs.push(safe);return safe;}});const res=recorder();await wrapped({method:'POST',body:{message:'짐'}},res);await Promise.all(jobs);assert.equal(res.payload.answer,'정상 답변');}
  finally{keys.forEach((k,i)=>{if(old[i]===undefined)delete process.env[k];else process.env[k]=old[i];});}
});
