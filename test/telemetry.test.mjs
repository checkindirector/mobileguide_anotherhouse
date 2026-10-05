import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);
const t = require('../lib/telemetry.cjs');
const { previousWeek, buildReport } = require('../lib/weekly-report.cjs');
const reportHandler = require('../api/analytics-report.js');
const maintenanceHandler = require('../api/analytics-maintenance.js');
const eventHandler = require('../api/analytics-event.js');
const { clientFields } = require('../lib/interaction-events.cjs');
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

function browserClock({ hostname = 'anotherhouse-guide.vercel.app', optOut = false, internal = false, gpc = false, hidden = false, blockedStorage = false } = {}) {
  let now = 0; const sent = [], listeners = {}, docListeners = {}, timers = [];
  const storage = new Map([['another-analytics', JSON.stringify({ optOut, internal })]]);
  const element = (tag='div') => {
    const node={tag, style:{}, dataset:{}, attributes:{}, children:[], handlers:{},
      append(...items){this.children.push(...items);},after(){},replaceChildren(){this.children=[];},
      setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,fn){this.handlers[k]=fn;},
      click(){return this.handlers.click?.();}, querySelectorAll(selector){return this.children.flatMap(child=>child?.tag?[(child.tag===selector?child:null),...child.querySelectorAll(selector)].filter(Boolean):[]);},
      querySelector(selector){return this.children.find(child=>selector==='.'+child.className)||null;}};
    return node;
  };
  const document = { readyState:'complete', visibilityState:hidden?'hidden':'visible', head:element(),
    createElement:element, createTextNode:()=>({}), getElementById:()=>null, querySelector:()=>null, querySelectorAll:()=>[],
    addEventListener:(type, fn)=>{docListeners[type]=fn;} };
  const window = { addEventListener:(type, fn)=>{listeners[type]=fn;} };
  const DateMock = class extends Date { static now(){return 1791180000000 + now;} };
  vm.runInNewContext(readFileSync(new URL('../assets/concierge-telemetry.js',import.meta.url),'utf8'), {
    window, document, location:{hostname}, navigator:{globalPrivacyControl:gpc}, crypto:{randomUUID}, Date:DateMock,
    performance:{now:()=>now}, localStorage:{getItem:k=>{if(blockedStorage)throw Error('blocked');return storage.get(k)||null;},setItem:(k,v)=>{if(blockedStorage)throw Error('blocked');storage.set(k,v);}},
    fetch:async(path, options)=>{sent.push(JSON.parse(options.body));return {ok:true};},
    setInterval:fn=>timers.push(fn), setTimeout:fn=>fn()
  });
  return { sent, window, storage, document, advance:ms=>{now+=ms;}, tick:()=>timers.forEach(fn=>fn()),
    visibility(state){document.visibilityState=state;docListeners.visibilitychange?.();},
    fire:(type, event)=>listeners[type]?.(event), engagement:()=>sent.filter(e=>e.kind==='engagement'), element };
}
test('visible time excludes hidden gaps and BFCache gaps, without duplicate final chunks', () => {
  const b=browserClock(); b.advance(30000);b.tick();b.advance(5000);b.visibility('hidden');b.fire('pagehide');
  b.advance(120000);b.tick();b.visibility('visible');b.fire('pageshow');b.advance(10000);b.fire('pagehide');
  assert.deepEqual(b.engagement().map(e=>e.activeMs),[30000,5000,10000]);
  assert.equal(new Set(b.engagement().map(e=>e.id)).size,3);
  assert.equal(new Set(b.engagement().map(e=>e.telemetry.sessionId)).size,1);
  for(const e of b.engagement()) assert.deepEqual(Object.keys(e).sort(),['activeMs','id','kind','language','telemetry']);
});
test('visible time respects opt-out/GPC, internal flags, production scope, and delayed timers', () => {
  for(const options of [{optOut:true},{gpc:true},{hostname:'localhost'},{hidden:true}]) {
    const b=browserClock(options);b.advance(30000);b.tick();assert.equal(b.engagement().length,0);
  }
  const b=browserClock();b.advance(5000);b.window.conciergeTelemetry.preferences({optOut:true});
  b.advance(90000);b.tick();b.window.conciergeTelemetry.preferences({optOut:false,internal:true});
  b.advance(30000);b.tick(); assert.equal(b.engagement().length,1);assert.equal(b.engagement()[0].telemetry.internal,true);
  b.advance(120000);b.tick();assert.equal(b.engagement()[1].activeMs,60000);
});
test('visible time handles cross-tab preferences, session expiry and unavailable localStorage', () => {
  const b=browserClock();b.advance(30000);b.tick();const first=b.engagement()[0].telemetry.sessionId;
  b.visibility('hidden');b.advance(31*60000);b.visibility('visible');b.advance(4000);b.fire('pagehide');
  assert.notEqual(b.engagement()[1].telemetry.sessionId,first);
  const c=browserClock();c.advance(4000);c.storage.set('another-analytics',JSON.stringify({...JSON.parse(c.storage.get('another-analytics')),optOut:true}));c.fire('storage',{key:'another-analytics'});
  c.advance(30000);c.tick();assert.equal(c.engagement().length,0);
  const d=browserClock({blockedStorage:true});d.advance(30000);d.tick();assert.equal(d.engagement().length,1);
  assert.equal(d.engagement()[0].telemetry.sessionId,d.sent[0].telemetry.sessionId);
});
test('visible time server rejects unreasonable or non-numeric durations', () => {
  for(const value of [0,-1,60001,Infinity,NaN,1.5,'30000',null,undefined]) assert.equal(t.validActiveMs(value),false);
  for(const value of [1,30000,60000]) assert.equal(t.validActiveMs(value),true);
});
test('visible-time summaries exclude staff and do not turn historic missing data into zero', () => {
  const range={from:'2026-10-04T15:00:00Z',to:'2026-10-11T15:00:00Z'};
  const base={at:'2026-10-05T09:00:00Z',kind:'engagement',session:'a',activeMs:30000};
  const events=[{...base,id:'1'},{...base,id:'2',activeMs:10000},{...base,id:'3',session:'b',activeMs:20000},
    {...base,id:'4',internal:true,activeMs:60000},{...base,id:'5',session:null,activeMs:1000}];
  const report=buildReport(events,range,'2026-09-30T07:00:00Z','2026-10-05T08:00:00Z');
  const active=report.current.activeTime;
  assert.equal(active.totalMs,61000);assert.equal(active.measuredSessions,2);assert.equal(active.meanSessionMs,30000);
  assert.equal(active.medianSessionMs,20000);assert.equal(active.unknownSessionMs,1000);
  assert.equal(report.current.internalEventsExcluded,1);assert.equal(report.current.chatRequests,0);
  assert.equal(report.previous.activeTime.totalMs,null);assert.equal(report.previous.activeTime.meanSessionMs,null);
  assert.equal(report.engagementComplete,false);assert.equal(report.delta.activeTimeTotal,null);
  assert.equal(report.daily[0].activeTime.complete,false);assert.equal(report.daily[1].activeTime.complete,true);
  const before=buildReport([],range,'2026-09-30T07:00:00Z',null);
  assert.equal(before.current.activeTime.available,false);assert.equal(before.current.activeTime.totalMs,null);
});

test('quality schema accepts fixed categories only and strips input text, links and coordinates', () => {
  const interactionId=randomUUID(),requestId=randomUUID();
  const body={kind:'answer_link',interactionId,requestId,linkKind:'map',destination:'naver_map',url:'https://x.test/?code=secret',question:'unsent private text',latitude:37};
  assert.deepEqual(clientFields(body),{interactionId,requestId,linkKind:'map',destination:'naver_map'});
  for(const input of [{...body,destination:body.url},{...body,requestId:'guest@email.com'},{kind:'unknown'},
    {kind:'answer_feedback',interactionId,requestId,vote:'freeform private text'},
    {kind:'chat_pause',interactionId,stage:'waiting_answer',reason:'freeform'},
    {kind:'faq_click',faqId:'짐보관실 암호',surface:'home',accepted:true}]) assert.equal(clientFields(input),null);
  assert.deepEqual(clientFields({kind:'faq_click',faqId:'luggage',surface:'chat',accepted:false}),{faqId:'luggage',surface:'chat',accepted:false});
});
test('quality lifecycle distinguishes close, hidden pause, resume and guide navigation', () => {
  const b=browserClock(),api=b.window.conciergeTelemetry;
  api.open('ko');api.open('ko');const tracking=api.begin('ko');
  b.visibility('hidden');api.finish(tracking,'answer');
  assert.equal(b.sent.filter(x=>x.kind==='answer_view').length,0);
  b.visibility('visible');api.finish(tracking,'answer'); // caller retries must not double exposure
  const views=b.sent.filter(x=>x.kind==='answer_view');
  assert.equal(views.length,1);
  assert.equal(views[0].requestId,tracking.requestId);
  api.link(tracking,{kind:'map',url:'https://map.naver.com/p/search/private',route:null});api.close('guide');
  api.open('en');api.close();api.open('ja');const pending=api.begin('ja');api.close();api.finish(pending);
  assert.equal(b.sent.filter(x=>x.kind==='chat_open').length,3);
  const closes=b.sent.filter(x=>x.kind==='chat_close');
  assert.deepEqual(closes.map(x=>[x.stage,x.reason]),[['after_answer','guide'],['before_question','close'],['waiting_answer','close']]);
  assert.equal(b.sent.find(x=>x.kind==='chat_pause').reason,'hidden');
  assert.equal(b.sent.filter(x=>x.kind==='chat_resume').length,1);
  assert.ok(!JSON.stringify(b.sent).includes('private'));
});
test('five-language feedback buttons send per-answer votes, allow changes and respect opt-out', async () => {
  const labels={ko:['도움됐어요','해결되지 않았어요'],en:['Helpful','Not resolved'],ja:['役に立った','解決しなかった'],zh:['有帮助','未解决'],'zh-TW':['有幫助','未解決']};
  for(const [language,text] of Object.entries(labels)) {
    const b=browserClock(),api=b.window.conciergeTelemetry,tracking=api.begin(language),message=b.element();api.decorate(message,tracking);
    const buttons=message.querySelectorAll('button');assert.deepEqual(buttons.map(x=>x.textContent),text);
    await buttons[0].click();await buttons[0].click();await buttons[1].click();
    const ratings=b.sent.filter(x=>x.kind==='answer_feedback');assert.deepEqual(ratings.map(x=>x.vote),['helpful','unresolved']);
    assert.equal(ratings[0].requestId,tracking.requestId);assert.equal(ratings[0].language,language);
    api.preferences({optOut:true});await buttons[0].click();assert.equal(b.sent.filter(x=>x.kind==='answer_feedback').length,2);
  }
});
test('quality events respect internal flags, disabled collection, consent changes and FAQ identities', () => {
  for(const options of [{optOut:true},{gpc:true},{hostname:'localhost'}]) {
    const b=browserClock(options),api=b.window.conciergeTelemetry;
    api.open('en');const t=api.begin('en');api.finish(t);api.faq(4,'home',true,'en');api.close();
    assert.equal(b.sent.filter(x=>!['visit','engagement'].includes(x.kind)).length,0);
  }
  const b=browserClock({internal:true}),api=b.window.conciergeTelemetry;
  api.faq(4,'home',true,'ko');api.faq(0,'chat',false,'ja');
  const tracking=api.begin('ko');api.preferences({optOut:true});api.preferences({optOut:false});api.finish(tracking);
  api.link(tracking,{kind:'guide',url:'https://anotherhouse-guide.vercel.app/',route:'checkin'});
  assert.equal(b.sent.filter(x=>x.kind==='answer_view'||x.kind==='answer_link').length,0);
  assert.deepEqual(b.sent.filter(x=>x.kind==='faq_click').map(x=>[x.faqId,x.surface,x.accepted]),[['luggage','home',true],['checkin_time','chat',false]]);
  assert.ok(b.sent.every(x=>x.telemetry.internal===true));
});
test('quality report deduplicates rating changes and separates participation from correctness', () => {
  const range={from:'2026-10-04T15:00:00Z',to:'2026-10-11T15:00:00Z'},at='2026-10-05T10:00:00Z';
  const base={at,session:'s',visitor:'v',internal:false,language:'ko',interactionId:'i',requestId:'q'};
  const events=[{...base,kind:'chat_open'},{...base,kind:'chat_submit'},
    {...base,kind:'chat',id:'server-id',question:'짐',answer:'안내',status:200,durationMs:10,intent:'luggage',links:[{kind:'guide',route:'checkin'}]},
    {...base,kind:'answer_view',outcome:'answer'},
    {...base,kind:'answer_feedback',vote:'helpful'}, {...base,at:'2026-10-05T10:01:00Z',kind:'answer_feedback',vote:'unresolved'},
    {...base,kind:'answer_link',linkKind:'guide',destination:'checkin'},
    {...base,kind:'faq_click',faqId:'luggage',surface:'home',accepted:true},
    {...base,kind:'chat_close',stage:'after_answer',reason:'guide'},
    {...base,kind:'answer_feedback',internal:true,requestId:'test',vote:'helpful'}];
  const report=buildReport(events,range,'2026-09-30T07:00:00Z',at,at),quality=report.current.quality;
  assert.equal(quality.feedback.ratings,1);assert.equal(quality.feedback.helpful,0);assert.equal(quality.feedback.unresolved,1);
  assert.equal(quality.feedback.participationRate,1);assert.equal(quality.links.clickThroughRate,1);
  assert.equal(quality.faq.byQuestion.find(x=>x.faqId==='luggage').home,1);assert.equal(quality.flow.questionSendRate,1);
  assert.equal(quality.flow.waitingAnswerClosed,0);assert.equal(report.conversations[0].quality.feedback.vote,'unresolved');
  assert.equal(report.qualityReviewCases[0].question,'짐');assert.equal(report.qualityComplete,false);
  assert.equal(report.previous.quality.available,false);assert.equal(report.previous.quality.feedback,null);
  assert.equal(report.current.chatRequests,1);assert.equal(report.current.internalEventsExcluded,1);
});
test('feedback received across a report boundary is counted without a fabricated view denominator', () => {
  const range={from:'2026-10-04T15:00:00Z',to:'2026-10-11T15:00:00Z'};
  const events=[{at:'2026-10-04T14:59:00Z',kind:'chat',session:'s',requestId:'q',question:'기존 질문',answer:'안내',status:200,links:[{kind:'guide'}]},
    {at:'2026-10-05T01:00:00Z',kind:'answer_feedback',session:'s',requestId:'q',vote:'unresolved'}];
  const report=buildReport(events,range,'2026-09-01T00:00:00Z',null,'2026-10-01T00:00:00Z');
  assert.equal(report.current.quality.feedback.ratings,1);assert.equal(report.current.quality.feedback.participationRate,null);
  assert.equal(report.current.quality.feedback.ratingsWithoutViewInPeriod,1);assert.equal(report.qualityReviewCases[0].parentFound,true);
});
