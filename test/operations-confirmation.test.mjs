import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const require=createRequire(import.meta.url),handler=require('../api/chat.js'),{facts,reply}=require('../lib/confirmed-operations.cjs');
const training=require('../api/concierge-training.json'),knowledge=require('../assets/guide-knowledge.json');
const cases=[
 ['ko',['체크인 안내 언제 보내나요?','오늘 예약하면 체크인 안내는 언제 와요?','체크인 안내 몇 시에 발송돼요?'],['객실에서 음식 먹어도 되나요?','방에서 간식과 음료 가능?'],['배달음식 주문해도 돼요?','배달음식 어디서 받아요?','객실에서 배달음식 먹어도 되나요?']],
 ['en',['When will I receive the check-in instructions?','When are check-in instructions sent for a same-day booking?','What time are check-in messages sent?'],['Can I eat food in my room?','Are snacks and drinks allowed in the room?'],['Can I order food delivery?','Where should I receive food delivery?','Can I eat delivered food in my room?']],
 ['ja',['チェックイン案内はいつ届きますか？','当日予約のチェックイン案内はいつ届きますか？','チェックイン案内は何時に送信しますか？'],['部屋で食事してもいい？','客室でお菓子や飲み物は大丈夫？'],['出前を頼めますか？','デリバリーはどこで受け取りますか？','客室でデリバリーを食べてもいい？']],
 ['zh',['入住指南什么时候发送？','当天预订入住指南什么时候发送？','入住消息几点发送？'],['客房内可以吃东西吗？','房间里可以喝饮料和吃零食吗？'],['可以订外卖吗？','外卖在哪里领取？','可以在房间里吃外卖吗？']],
 ['zh-TW',['入住指南什麼時候傳送？','當天訂房的入住指南什麼時候傳送？','入住訊息幾點傳送？'],['客房內可以吃東西嗎？','房間裡可以喝飲料和吃零食嗎？'],['可以訂外送嗎？','外送在哪裡領取？','可以在房間裡吃外送嗎？']]
];
let seq=0;
async function ask(message,language){
 const before=global.fetch;let called=false;global.fetch=async()=>{called=true;throw Error('Provider not needed for confirmed operations');};
 const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(p){this.payload=p;return this;}};
 try{await handler({method:'POST',headers:{'x-forwarded-for':'confirmed-ops-'+seq++},body:{message,language,telemetry:{optOut:true}}},res);assert.equal(called,false,message);assert.equal(res.statusCode,200,message);assert.equal(res.payload.meta.searched,false);return res.payload;}finally{global.fetch=before;}
}
for(const [language,messages,rooms,deliveries]of cases){
 test(language+': confirmed five-event schedule, same-day exception and absent clock time',async()=>{
  for(const [i,message]of messages.entries()){
   const p=await ask(message,language);assert.equal(p.meta.trainingIntent,'checkin-message-schedule');assert.ok(p.answer.includes(facts.messageSchedule.answer[language]));assert.match(p.answer,/Booking.com|부킹닷컴/);assert.match(p.answer,/Airbnb|에어비앤비/);
   if(i===2)assert.ok(p.answer.includes(facts.messageSchedule.clockUnknown[language]));
   assert.doesNotMatch(p.answer,/09:00|9:00|오전 9|前日から当日|day before check-in and/);
   if(language!=='ko')assert.doesNotMatch(p.answer,/[가-힣]/);
  }
 });
 test(language+': room food, snacks and drinks are allowed and not restricted to the lounge',async()=>{
  for(const message of rooms){const p=await ask(message,language);assert.equal(p.meta.trainingIntent,'room-dining');assert.equal(p.answer,facts.roomDining.answer[language]);assert.doesNotMatch(p.answer,/확인해.*안내|未注明|未註明|not specify|確認して/);}
 });
 test(language+': food delivery gives personal pickup outside 1F entrance and room permission',async()=>{
  for(const message of deliveries){const p=await ask(message,language);assert.equal(p.meta.trainingIntent,'food-delivery');assert.ok(p.answer.includes(facts.foodDelivery.answer[language]));assert.ok(p.links.some(l=>l.route==='rules'));assert.doesNotMatch(p.answer,/5F|5階|5楼|5樓|5층|staff will receive|代收|대리수령이 어렵/);}
 });
}

test('same-day clarification inherits only an immediately relevant message question',()=>{
 assert.ok(reply('당일 예약은?', [{role:'user',content:'체크인 안내는 언제 와요?'}],'ko'));
 assert.equal(reply('몇시에요?', [{role:'user',content:'체크인 안내는 언제 와요?'},{role:'user',content:'드라이기 있나요?'}],'ko'),null);
});

test('unconfirmed delivery fees, late-night conditions and additional unrelated items are not swallowed',()=>{
 for(const [lang,message]of [['ko','배달음식 배달비는 얼마야?'],['en','Can I order food delivery at 2am?'],['ja','デリバリーは何時まで？'],['zh','外卖配送费是多少？'],['zh-TW','外送運費多少？'],['ko','배달음식이랑 수건도 더 받을 수 있어요?'],['ko','체크인 안내랑 주차도 알려줘'],['ko','체크인 안내 다시 보내주세요'],['en','Resend my check-in instructions'],['ja','チェックイン案内を再送してください'],['zh','请重发入住指南'],['zh-TW','請重寄入住指南'],['ko','배달음식이랑 택배도 받아주나요?'],['en','Do you accept food delivery and parcels?'],['ja','出前と宅配便を受け取れますか？'],['zh','可以收外卖和快递吗？'],['zh-TW','可以收外送和包裹嗎？']])assert.equal(reply(message,[],lang),null,message);
});

test('current website, generated model evidence and the approved records share the same confirmed policies',()=>{
 assert.equal(facts.messageSchedule.events.length,5);assert.equal(facts.messageSchedule.identicalContent,true);assert.equal(facts.messageSchedule.fixedClockTime,null);assert.equal(facts.foodDelivery.pickupFloor,1);assert.equal(facts.foodDelivery.pickupLocation,'outside-entrance');
 assert.equal(training.approvedAnswers.find(a=>a.id==='Q054').answer,facts.roomDining.answer.ko);
 assert.ok(training.approvedAnswers.find(a=>a.id==='Q097').answer.includes(facts.messageSchedule.answer.ko));
 assert.deepEqual(knowledge.confirmedOperations,facts);
 const window={};for(const file of ['site-data','gallery-data','operations-policies','content-updates'])vm.runInNewContext(fs.readFileSync(new URL('../assets/'+file+'.js',import.meta.url),'utf8'),{window});
 for(const [language]of cases){const d=window.ANOTHER_HOUSE_DATA;
  assert.ok(d.pages.checkin.sections.some(s=>s.steps?.[language]?.includes(facts.messageSchedule.answer[language])));
  assert.ok(d.pages.rules.sections.some(s=>s.steps?.[language]?.includes(facts.foodDelivery.answer[language])));
  assert.ok(d.pages.appliances.devices.some(s=>s.steps?.[language]?.includes(facts.roomDining.answer[language])));
  const model=handler._internals.relevantGuideKnowledge(language,'rules','food delivery');assert.equal(model.confirmedOperations.foodDelivery.answer,facts.foodDelivery.answer[language]);
 }
});

test('the actual check-in renderer displays the confirmed message schedule in all five languages',()=>{
 const window={};
 for(const file of ['site-data','gallery-data','operations-policies','content-updates'])vm.runInNewContext(fs.readFileSync(new URL('../assets/'+file+'.js',import.meta.url),'utf8'),{window});
 const source=fs.readFileSync(new URL('../assets/master-app.js',import.meta.url),'utf8');
 const renderer=source.slice(source.indexOf('function renderCheckin(){'),source.indexOf('function renderTransport(){'));
 const helpers=['steps','imageFigure'].map(name=>source.split('\n').find(line=>line.startsWith('function '+name+'('))).join('\n');
 for(const [language]of cases){
  const {document}=parseHTML('<div class="checkin-hero"><h2></h2></div><div id="checkinContent"></div>');
  vm.runInNewContext(`const D=window.ANOTHER_HOUSE_DATA;const $=s=>document.querySelector(s);const t=v=>v&&typeof v==='object'&&!Array.isArray(v)&&('ko'in v)?(v[lang]||v.ko):v;const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');const parkingOverviewMarkup=()=>'',parkingGuideMarkup=()=>'';${helpers}${renderer}renderCheckin();`,{window,document,lang:language});
  const cards=[...document.querySelectorAll('#checkinContent .checkin-guide-card')];
  const messageCards=cards.filter(card=>card.querySelector('.airport-copy small')?.textContent==='MESSAGES');
  assert.equal(messageCards.length,1,language);
  assert.ok(messageCards[0].textContent.includes(facts.messageSchedule.answer[language]),language);
  assert.equal(messageCards[0].closest('details'),null,'schedule must be visible without opening an accordion');
  assert.ok(cards.some(card=>card.querySelector('.airport-copy small')?.textContent==='SELF CHECK-IN'));
 }
});
