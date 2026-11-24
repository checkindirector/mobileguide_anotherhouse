import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const handler=require('../api/chat.js');
const {supportReply,COPY}=require('../lib/operational-support.cjs');
const {isRoomKeyProblem}=require('../lib/guest-language.cjs');
let seq=0;
const languages=['ko','en','ja','zh','zh-TW'];
const messages={
 ko:{missing:'출입코드를 아직 못 받았어요',details:'아고다 예약번호 12345678로 예약했어요',reply:'답장이 없어서 곤란해요',method:'체크인 방법',checkout:'체크아웃 시간',contact:'사장님 전화번호',wifi:'와이파이어나드가 없어요',hair:'드라이기 있나요?',hours:'몇시까지사용',dining:'객실에서 식사해도 되나요?',lock:'방키를 안에 놔드고 잠굼'},
 en:{missing:"I haven't received the entry code",details:'I booked on Agoda, reservation ID 12345678',reply:'There is no reply and I need help',method:'How do I check in?',checkout:'What time is check-out?',contact:'Owner phone number',wifi:'I cannot see another Wi-Fi in the list',hair:'Is there a hair dryer?',hours:'Until what time can I use it?',dining:'Can I eat in the room?',lock:'I left my room key in the power slot and shut the door'},
 ja:{missing:'予約メーセージにて入館コード等知らせれていません',details:'agodaで予約しました。予約IDは12345678です',reply:'返事がなくて困っています',method:'チェックイン方法',checkout:'チェックアウト時間',contact:'オーナーの電話番号',wifi:'anotherのWi-Fiが表示されない',hair:'ヘアドライヤーはありますか？',hours:'何時まで使える？',dining:'部屋の中で食事できる？',lock:'ルームキーをさしたままドアを閉めた'},
 zh:{missing:'还没收到入馆码',details:'我在Agoda预订了，预订编号12345678',reply:'没有回复，很困扰',method:'怎么办理入住？',checkout:'退房时间',contact:'房东电话号码',wifi:'找不到another无线网',hair:'有吹风机吗？',hours:'能用到几点？',dining:'可以在房间里吃饭吗？',lock:'房卡插着就把门关了'},
 'zh-TW':{missing:'還沒收到入館碼',details:'我在Agoda訂房，訂房編號12345678',reply:'沒有回覆，很困擾',method:'怎麼辦理入住？',checkout:'退房時間',contact:'房東電話號碼',wifi:'找不到another無線網',hair:'有吹風機嗎？',hours:'可以用到幾點？',dining:'可以在房間裡吃飯嗎？',lock:'房卡插著就把門關了'}
};
async function ask(message,language,history=[],expectModel=false){
 const oldFetch=global.fetch,oldCode=process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE,oldKey=process.env.OPENAI_API_KEY;
 process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE='TESTACCESSCODE';process.env.OPENAI_API_KEY='test-key';let calls=0;
 global.fetch=async()=>{calls++;return {ok:true,status:200,json:async()=>({output_text:'Model handled the complete request.'})};};
 const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(p){this.payload=p;return this;}};
 try{await handler({method:'POST',headers:{'x-forwarded-for':'support-'+seq++},body:{message,language,history,telemetry:{optOut:true}}},res);assert.equal(res.statusCode,200,message);if(!expectModel)assert.equal(calls,0,message);return res.payload;}
 finally{global.fetch=oldFetch;if(oldCode===undefined)delete process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE;else process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE=oldCode;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}
}

for(const lang of languages){const m=messages[lang];
 test(lang+': missing entry message and both follow-ups give usable steps without promising staff actions',async()=>{
  const history=[];
  for(const [i,message]of [m.missing,m.details,m.reply].entries()){
   const p=await ask(message,lang,history);assert.equal(p.meta.trainingIntent,'entry-instructions',message);assert.equal(p.meta.searched,false);assert.match(p.answer,/TESTACCESSCODE → ENT/);assert.match(p.answer,/15:00|3시/);assert.match(p.answer,/09:00.*18:00/);assert.doesNotMatch(p.answer,/12345678|確認します|確認いたします|We will check|再送します|확인하겠습니다|전달했습니다|2026|9:00까지/);
   assert.ok(p.links.some(x=>x.route==='checkin'));if(i>0)assert.ok(p.answer.includes(COPY[lang].noAction));
   history.push({role:'user',content:message},{role:'assistant',content:p.answer});
  }
 });
 test(lang+': method and checkout time are localized stable facts, not another translation request',async()=>{
  const method=await ask(m.method,lang);assert.equal(method.answer,COPY[lang].method);assert.match(method.answer,/4|four|네\s*자리/);assert.equal(method.meta.trainingIntent,'checkin-method');
  if(lang!=='ko')assert.doesNotMatch(method.answer,/[가-힣]/);
  const checkout=await ask(m.checkout,lang);assert.equal(checkout.answer,COPY[lang].checkout);assert.match(checkout.answer,/11/);assert.doesNotMatch(checkout.answer,/15:00|체크인|チェックイン/);
 });
 test(lang+': internal tool hours inherit only the immediate facility, with no maps or public notice',async()=>{
  const p=await ask(m.hours,lang,[{role:'user',content:m.hair},{role:'assistant',content:'Provided in the shared bathroom.'}]);
  assert.equal(p.meta.trainingIntent,'amenity-hours');assert.equal(p.meta.searched,false);assert.equal(p.answer,COPY[lang].toolHours);assert.ok(p.links.every(x=>x.kind==='guide'));assert.equal(p.links[0].route,'appliances');assert.doesNotMatch(p.answer,/※|Naver|Google|22:00|10\s*PM/);
  assert.equal(supportReply(m.hours,[{role:'user',content:m.hair},{role:'user',content:'Wi-Fi'}],lang),null);
 });
 test(lang+': contact question after room lockout answers contact, not the old key reply',async()=>{
  assert.equal(isRoomKeyProblem(m.lock),true,m.lock);const key=await ask(m.lock,lang);assert.match(key.answer,/TESTACCESSCODE/);assert.doesNotMatch(key.answer,/1回|one.?time|1회|一次/);
  const p=await ask(m.contact,lang,[{role:'user',content:m.lock},{role:'assistant',content:key.answer}]);assert.equal(p.meta.trainingIntent,'contact');assert.equal(p.answer,COPY[lang].contact);assert.doesNotMatch(p.answer,/TESTACCESSCODE/);
 });
 test(lang+': Wi-Fi failure and room dining get the actual requested detail without invented policies',async()=>{
  const wifi=await ask(m.wifi,lang);assert.equal(wifi.answer,COPY[lang].wifiIssue);assert.equal(wifi.meta.trainingIntent,'wifi-troubleshooting');
  const dine=await ask(m.dining,lang);assert.equal(dine.answer,COPY[lang].dining);assert.equal(dine.meta.trainingIntent,'room-dining');assert.doesNotMatch(dine.answer,/確認します|We will check|확인해.*안내하겠습니다/);
 });
}

test('positive receipt and unrelated topics cannot be turned into missing entry messages',()=>{
 for(const [lang,text]of [['ko','출입 안내 받았습니다'],['en','I received the entry code'],['ja','入館コードが届いています'],['zh','已收到入馆码'],['zh-TW','已收到入館碼']])assert.equal(supportReply(text,[],lang),null,text);
 const h=[{role:'user',content:messages.ja.missing},{role:'user',content:'Wi-Fiが表示されない'}];assert.equal(supportReply(messages.ja.reply,h,'ja'),null);
});

test('compounds and external venue questions stay intact for semantic handling',()=>{
 for(const [lang,text]of [['ko','체크인 방법과 짐보관 알려줘'],['en','How do I check in and park?'],['ja','チェックイン方法と荷物預かり'],['zh','怎么办理入住和行李寄存？'],['zh-TW','怎麼辦理入住和寄放行李？'],['ko','드라이기랑 세탁기는 몇시까지 사용해?'],['en','What time does the nearby pharmacy close?'],['ja','近くのレストランの電話番号'],['zh','附近餐厅电话号码'],['zh-TW','附近藥局的電話號碼']])assert.equal(supportReply(text,[],lang),null,text);
});

test('missing server code is stated as unavailable, never guessed or sent back to a missing message',()=>{
 for(const lang of languages){const p=supportReply(messages[lang].missing,[],lang,null);assert.ok(p);assert.ok(p.answer.includes(COPY[lang].unavailableCode));assert.doesNotMatch(p.answer,/\{\{|8282|TESTACCESSCODE/);}
});

test('short code, key problem and mail fragments have distinct localized meanings',async()=>{
 const code=['입구 비번','entry code','入館コード','入口密码','入口密碼'];
 const key=['카드키 문제','key card problem','キーカード問題','房卡有问题','房卡有問題'];
 const mail=['메일','email','メール','邮件','郵件'];
 for(const [i,language]of languages.entries()){
  const p=await ask(code[i],language);assert.equal(p.meta.trainingIntent,'shared-entrance-code');assert.match(p.answer,/TESTACCESSCODE/);
  const k=await ask(key[i],language);assert.equal(k.meta.trainingIntent,'key-card-clarification');assert.doesNotMatch(k.answer,/TESTACCESSCODE/);
  const m=await ask(mail[i],language);assert.equal(m.meta.trainingIntent,'contact-clarification');assert.doesNotMatch(m.answer,/確認します|We will check|확인하겠습니다/);
 }
});
