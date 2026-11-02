import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const handler=require('../api/chat.js'),route=require('../assets/airport-route-intent.js'),inventory=require('../assets/amenity-inventory.js'),facts=require('../lib/amenity-facts.cjs');
const {reportingIntent,classifyEvent}=require('../lib/report-intent.cjs');
const knowledge=require('../assets/guide-knowledge.json'),training=require('../api/concierge-training.json');
const cases=[
 ['ko','공항버스로 도착하려면?','공용비품',/섬유유연제/,/무료/,['체크인 방법','체크인 어떻게 하나요?'],['공항에서 숙소 가는 공항버스','숙소에서 공항으로 가는 공항버스']],
 ['en','Which airport bus do I take to arrive?','Shared amenities',/fabric softener/,/free/,['How do I check in?','check-in instructions'],['Airport bus from Incheon Airport to Another House','Airport bus from Another House to Incheon Airport']],
 ['ja','空港バスで到着するには？','共用備品',/柔軟剤/,/無料/,['チェックイン方法','チェックインはどうやってしますか？'],['空港から宿への空港バス','宿から空港への空港バス']],
 ['zh','搭几号机场巴士到达？','公共用品',/柔顺剂/,/免费/,['入住方式','怎么办理入住？'],['从机场到住宿的机场巴士','从住宿去机场的机场巴士']],
 ['zh-TW','搭幾多號機場巴士到達','共用備品',/柔軟精/,/免費/,['入住方式','怎麼辦理入住？'],['從機場到住宿的機場巴士','從住宿去機場的機場巴士']]
];
let sequence=0;
async function ask(message,language,history=[]){
 const previous=global.fetch;global.fetch=async()=>{throw new Error('Unexpected provider call');};
 const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(p){this.payload=p;return this;}};
 try{await handler({method:'POST',headers:{'x-forwarded-for':'weekly-quality-'+sequence++},body:{message,language,history,telemetry:{optOut:true}}},res);assert.equal(res.statusCode,200,message);return res.payload;}finally{global.fetch=previous;}
}
test('ambiguous arrival asks for direction in five languages without maps or external calls',async()=>{
 const app=readFileSync(new URL('../assets/master-app.js',import.meta.url),'utf8');
 const fn=app.slice(app.indexOf('function fallbackCurrentAirportBus('),app.indexOf('function airportBusMapsMarkup('));
 for(const [language,q] of cases){
  const p=await ask(q,language);assert.equal(p.meta.needsAirportDirection,true,q);assert.deepEqual(p.links,[]);assert.equal(p.answer,route.clarification(q,[],language));
  const fallback=vm.runInNewContext(fn+';fallbackCurrentAirportBus(knowledge,q)',{window:{ANOTHER_HOUSE_AIRPORT_ROUTE:route},knowledge,q,lang:language});assert.equal(fallback.answer,p.answer);assert.equal(fallback.links.length,0);
  assert.ok(route.clarification(q,[{role:'assistant',content:'숙소 → 인천공항'}],language),'An assistant assumption cannot choose for the guest');
 }
 assert.equal(route.clarification('도착은요?',[{role:'user',content:'숙소에서 공항으로 가는 길'}],'ko'),null);
 assert.equal(route.clarification('机场巴士到达后怎么办理入住？',[],'zh'),null);
});
test('direction clarification resolves to the correct stops and paired maps in each language',async()=>{
 for(const [language,q,,,,,choices] of cases){
  const prompt=route.clarification(q,[],language),history=[{role:'user',content:q},{role:'assistant',content:prompt}];
  for(const [i,choice]of choices.entries()){
   assert.equal(route.clarification(choice,history,language),null,choice);
   const p=await ask(choice,language,history);assert.equal(p.meta.guideRoute,i===0?'transport':'airport-departure',choice);assert.ok(!p.meta.needsAirportDirection);
   for(const provider of ['naver','google'])assert.ok(p.links.some(x=>x.kind==='map'&&x.provider===provider&&x.placeId==='bus-'+(i===0?'01901':'01037')),choice+' '+provider);
  }
 }
});
test('full and item amenity paths retain the latest operator facts across all five languages',async()=>{
 const app=readFileSync(new URL('../assets/master-app.js',import.meta.url),'utf8'),fn=app.slice(app.indexOf('function fallbackInventory('),app.indexOf('async function browserFallback('));
 assert.equal(training.approvedAnswers.find(x=>x.id==='Q051').answer,inventory.shared.ko);
 for(const [language,,q,softener,free]of cases){
  const p=await ask(q,language);assert.equal(p.answer,inventory.shared[language]);assert.match(p.answer,softener);assert.match(p.answer,free);assert.doesNotMatch(p.answer,/髮夾|发夹|hair clip/);
  assert.equal(facts.shared[language],inventory.shared[language]);assert.equal(knowledge.appliances[language].sharedInventory.inventory,inventory.shared[language]);
  const fallback=vm.runInNewContext(fn+';fallbackInventory(knowledge,q)',{window:{ANOTHER_HOUSE_AMENITIES:inventory},knowledge,q,lang:language,fallbackGuideLink:route=>({route})});assert.equal(fallback.answer,p.answer);
  const item={ko:'섬유유연제와 세제 있나요?',en:'Do you have fabric softener and detergent?',ja:'柔軟剤と洗濯洗剤はありますか？',zh:'有柔顺剂和洗衣液吗？','zh-TW':'有柔軟精和洗衣精嗎？'}[language];
  const individual=await ask(item,language);assert.match(individual.answer,softener);
 }
 for(const q of ['공용비품하고 가위도 있나요?','Shared amenities and scissors?','共用備品とはさみはありますか？','公共用品和剪刀有吗？','共用備品和剪刀有嗎？'])assert.equal(inventory.isOverview(q),false,q);
});
test('five-language checkin method reporting preserves mixed requests and the original record',()=>{
 for(const [language,,,,,questions]of cases)for(const question of questions){
  assert.equal(reportingIntent(question,'checkin-checkout-time'),'checkin-method',question);
  const original={kind:'chat',question,intent:'checkin-checkout-time'},snapshot=JSON.stringify(original),event=classifyEvent(original);
  assert.equal(event.intent,'checkin-method');assert.equal(event.recordedIntent,'checkin-checkout-time');assert.equal(JSON.stringify(original),snapshot);assert.equal(event.classificationVersion,'2026-11-02.checkin-method.1');
 }
 for(const q of ['체크인 방법하고 짐보관','체크인 방법과 시간','얼리체크인 방법','How do I check in and leave luggage?','early check-in instructions','チェックイン方法と時間','アーリーチェックイン方法','入住方式和行李寄存','入住方式和退房时间','怎麼辦理入住和寄放行李？'])assert.equal(reportingIntent(q,'original'),'original',q);
});
