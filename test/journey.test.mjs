import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { clientFields } = require('../lib/interaction-events.cjs');
const { summarizeJourney } = require('../lib/journey-report.cjs');
const { buildReport } = require('../lib/weekly-report.cjs');
const code = readFileSync(new URL('../assets/marketing-journey.js',import.meta.url),'utf8');
function browser({storage=new Map(), path='/ja', referrer='https://www.google.co.jp/search?q=private', lang='ja', screen='home', hidden=false, gpc=false, blocked=false, host='anotherhouse-guide.vercel.app', now=1792120000000}={}) {
  const sent=[], listeners={}, docListeners={}, observers=[];
  const on=(map,k,fn)=>{(map[k] ||= []).push(fn);};
  const node=()=>({dataset:{},style:{},append(){},after(){},replaceChildren(){},setAttribute(){},addEventListener(){}});
  const document={readyState:'complete',referrer,visibilityState:hidden?'hidden':'visible',documentElement:{lang,dataset:screen?{siteLanguage:lang}: {}},head:node(),body:node(),
    querySelector:s=>s==='.screen.active'&&screen?{dataset:{screen}}:null,querySelectorAll:()=>[],getElementById:()=>null,createElement:node,createTextNode:()=>({}),addEventListener:(k,f)=>on(docListeners,k,f)};
  const window={addEventListener:(k,f)=>on(listeners,k,f)};
  const clock={now};
  const scope={window,document,navigator:{globalPrivacyControl:gpc},location:{hostname:host,pathname:path,origin:'https://'+host},URL,crypto:{randomUUID},
    Date:class extends Date {static now(){return clock.now;}},performance:{now:()=>0},
    localStorage:{getItem:k=>{if(blocked)throw Error();return storage.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error();storage.set(k,v);}},
    fetch:async(_url,options)=>{sent.push(JSON.parse(options.body));return {ok:true};},
    MutationObserver:class{constructor(fn){observers.push(fn);}observe(){}},setInterval(){},setTimeout(){}};
  vm.createContext(scope);vm.runInContext(code,scope);
  return {sent,storage,scope,clock,window,document,loadConcierge(){vm.runInContext(readFileSync(new URL('../assets/concierge-telemetry.js',import.meta.url),'utf8'),scope);},
    screen(value){screen=value;observers.forEach(f=>f());},fire(k){(listeners[k]||[]).forEach(f=>f({key:'another-analytics'}));},
    click(){const link={dataset:{ota:'booking'},href:'https://www.booking.com/hotel/kr/test?private=secret',closest:s=>s==='.home-support-card'?{}:null};(docListeners.click||[]).forEach(f=>f({type:'click',button:0,target:{closest:()=>link}}));}};
}
const j=(step,page='home',source='google')=>({version:1,source,landingPage:'home',landingLanguage:'ja',page,step});
test('external entry -> rooms -> home -> OTA remains one source/session across full page loads',()=>{
  const a=browser();a.loadConcierge();
  const b=browser({storage:a.storage,path:'/ja/rooms',screen:null,referrer:'https://anotherhouse-guide.vercel.app/ja'});
  const c=browser({storage:a.storage,referrer:'https://anotherhouse-guide.vercel.app/ja/rooms'});c.loadConcierge();c.click();
  const events=[...a.sent,...b.sent,...c.sent].filter(e=>e.journey);
  assert.deepEqual(events.map(e=>[e.kind,e.journey.page,e.journey.step]),[['journey_view','home',1],['journey_view','rooms',2],['journey_view','home',3],['ota_click','home',4]]);
  assert.equal(new Set(events.map(e=>e.telemetry.sessionId)).size,1);
  assert.ok(events.every(e=>e.journey.source==='google'&&e.journey.landingPage==='home'));
  assert.doesNotMatch(JSON.stringify(events),/private|secret|https|search\?/);
  assert.deepEqual(events.map(e=>e.language),['ja','ja','ja','ja']);
});
test('direct room landings, locale mappings, SPA gallery and BFCache deduplication',()=>{
  for (const [lang,language,path] of [['ja','ja','ja'],['zh-CN','zh','zh-cn'],['zh-TW','zh-TW','zh-tw']]) {
    const b=browser({path:`/${path}/rooms`,screen:null,lang,referrer:''});
    assert.equal(b.sent[0].journey.landingPage,'rooms');assert.equal(b.sent[0].language,language);
    b.fire('pageshow');assert.equal(b.sent.length,1);
  }
  const b=browser();b.screen('gallery');b.screen('gallery');b.screen('home');
  assert.deepEqual(b.sent.map(e=>e.journey.page),['home','gallery','home']);
});
test('source classification is bounded and rejects lookalike domains; missing referrers remain unknown',()=>{
  for(const [referrer,expected] of [['https://chatgpt.com/c/private','chatgpt'],['https://gemini.google.com/app/private','gemini'],['https://www.bing.com/search','bing'],['https://google.com.evil.test/?q=private','other_referral'],['','direct_unknown']]) {
    assert.equal(browser({referrer}).sent[0].journey.source,expected);
  }
});
test('opt-out, GPC, hidden pages, test-mode flags, unavailable storage and session expiration',()=>{
  for(const options of [{gpc:true},{storage:new Map([['another-analytics',JSON.stringify({optOut:true})]])},{storage:new Map([['va-disable','1']])},{hidden:true},{host:'localhost'}]) assert.equal(browser(options).sent.length,0);
  const b=browser({storage:new Map([['another-analytics',JSON.stringify({internal:true})]])});b.loadConcierge();b.click();assert.ok(b.sent.every(e=>e.telemetry.internal));
  b.window.conciergeTelemetry.preferences({optOut:true});b.click();assert.equal(b.sent.filter(e=>e.kind==='ota_click').length,1);
  const c=browser({blocked:true});c.loadConcierge();c.screen('gallery');c.click();assert.equal(new Set(c.sent.map(e=>e.telemetry.sessionId)).size,1);
  assert.equal(c.window.conciergeTelemetry.next().turn,1);const count=c.sent.length;c.window.conciergeTelemetry.preferences({optOut:true});c.click();assert.equal(c.sent.length,count);
  const d=browser();const old=d.sent[0].telemetry.sessionId;d.clock.now+=31*60000;d.screen('gallery');assert.notEqual(d.sent[1].telemetry.sessionId,old);assert.equal(d.sent[1].journey.step,1);
  const saved=d.storage.get('another-analytics');d.clock.now+=100;d.fire('storage');assert.equal(d.storage.get('another-analytics'),saved);
  const e=browser();e.loadConcierge();const before=e.sent[0].telemetry.sessionId;e.window.conciergeTelemetry.preferences({optOut:true});e.window.conciergeTelemetry.preferences({optOut:false});e.click();assert.notEqual(e.sent.at(-1).telemetry.sessionId,before);
});
test('server validates categories and strips arbitrary nested fields',()=>{
  const clean=j(1);
  assert.deepEqual(clientFields({kind:'journey_view',journey:{...clean,url:'private',search:'secret'},text:'guest'}),{journey:clean});
  for(const patch of [{source:'https://google.com'},{page:'Guest name'},{step:-1},{step:1.5},{landingLanguage:'private'},{version:2}]) assert.equal(clientFields({kind:'journey_view',journey:{...clean,...patch}}),null);
  assert.equal(clientFields({kind:'ota_click',provider:'booking',surface:'home',journey:{}}),null);
});
test('ordered report excludes internal events and never converts click-before-room or missing views',()=>{
  const from=Date.parse('2026-10-16T00:00Z'),to=from+86400000,at='2026-10-16T01:00Z';
  const event=(session,kind,step,page,extra={})=>({session,kind,at,journey:j(step,page),...extra});
  const events=[event('a','ota_click',3,'home'),event('a','journey_view',2,'rooms'),event('a','journey_view',1,'home'),
    event('b','journey_view',1,'home'),event('b','ota_click',2,'home'),event('b','journey_view',3,'gallery'),
    event('c','ota_click',2,'home'),event('staff','journey_view',1,'rooms',{internal:true}),event('staff','ota_click',2,'home',{internal:true})];
  const r=summarizeJourney(events,new Date(from).toISOString(),from,to);
  assert.equal(r.measuredSessions,2);assert.equal(r.roomViewedSessions,2);assert.equal(r.roomGuideSessions,1);assert.equal(r.gallerySessions,1);assert.equal(r.roomThenClickSessions,1);assert.equal(r.roomToClickRate,.5);assert.equal(r.unlinkedClicks,1);
  assert.equal(r.bySource[0].label,'google');
  assert.equal(summarizeJourney(events,null,from,to).measuredSessions,null);
  const report=buildReport(events,{from:new Date(from).toISOString(),to:new Date(to).toISOString()},new Date(from).toISOString(),null,null,null,new Date(from).toISOString());
  assert.equal(report.current.journey.roomThenClickSessions,1);assert.equal(report.previous.journey.measuredSessions,null);
  assert.equal(report.daily[0].journey.roomThenClickSessions,1);
});
test('report boundaries do not borrow future room views or earlier-period steps',()=>{
  const from=Date.parse('2026-10-16T00:00Z'),to=from+86400000;
  const events=[{at:'2026-10-15T23:59Z',session:'a',kind:'journey_view',journey:j(1,'rooms')},{at:'2026-10-16T00:01Z',session:'a',kind:'ota_click',journey:j(2)}];
  const r=summarizeJourney(events,'2026-10-15T00:00Z',from,to);assert.equal(r.roomThenClickSessions,0);assert.equal(r.unlinkedClicks,1);
});
