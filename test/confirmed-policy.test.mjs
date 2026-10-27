import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), handler=require('../api/chat.js'), k=require('../assets/guide-knowledge.json');
const locales=[
 ['ko',['카드키','환불','같은 방','세탁기 무료','인덕션 있나요?'],[/최대 3장/,/2주.*환불이 불가.*대한민국.*천재지변/s,/메시지.*수동/s,/무료.*섬유 유연제/s,/인덕션/]],
 ['en',['Keycard','Refund policy','Same room','Is the washing machine free?','Is there an induction cooktop?'],[/up to 3.*cannot be reissued/s,/2 weeks.*non-refundable.*South Korea/s,/message.*manually/s,/free.*fabric softener/s,/induction/]],
 ['ja',['カードキー','返金','同じ部屋','洗濯機は無料ですか？','IHコンロはありますか？'],[/最大3枚.*再発行はできません/s,/2週間.*返金できません.*韓国/s,/自動.*メッセージ/s,/無料.*柔軟剤/s,/IHコンロ/]],
 ['zh',['房卡','退款政策','同一间房','洗衣机免费吗？','有电磁炉吗？'],[/3张.*无法补办/s,/两周.*不予退款.*韩国/s,/不会自动.*提醒消息/s,/免费.*柔顺剂/s,/电磁炉/]],
 ['zh-TW',['房卡','退款政策','同一間房','洗衣機免費嗎？','有電磁爐嗎？'],[/3張.*無法補發/s,/兩週.*不予退款.*韓國/s,/不會自動.*提醒訊息/s,/免費.*柔軟精/s,/電磁爐/]]
];
let seq=0;
async function ask(message,language,output){
 const previous=global.fetch,key=process.env.OPENAI_API_KEY; let request;
 process.env.OPENAI_API_KEY='fixture';global.fetch=async(_,options)=>{request=JSON.parse(options.body);return{ok:true,json:async()=>({output_text:output||'UNEXPECTED MODEL CALL'})}};
 const res={statusCode:200,setHeader(){},status(code){this.statusCode=code;return this},json(p){this.payload=p;return this}};
 try{await handler({method:'POST',headers:{'x-forwarded-for':'policy-fixture-'+seq++},body:{message,language,telemetry:{optOut:true}}},res);return{res,request};}
 finally{global.fetch=previous;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
}
for(const [language,questions,patterns]of locales){
 test(`five confirmed policies are consistent in ${language}`,async()=>{
  for(let i=0;i<questions.length;i++){const{res,request}=await ask(questions[i],language);assert.equal(request,undefined,questions[i]);assert.equal(res.statusCode,200);assert.match(res.payload.answer,patterns[i],questions[i]);assert.ok(res.payload.links.some(x=>x.kind==='guide'));}
  const policies=k.confirmedPolicies;
  for(const id of ['keycard','refund','extension','laundry','cooktop'])assert.ok(policies[id].answer[language]);
  const pages=k.stay[language];assert.ok(JSON.stringify(pages).includes(policies.refund.answer[language]));assert.ok(JSON.stringify(k.laundry[language]).includes(policies.laundry.answer[language]));
  assert.doesNotMatch(JSON.stringify(k.appliances[language]),/HEC-1050|Ceramic cooktop|ハイライト|电陶炉|電陶爐/);
 });
 test(`browser fallback uses confirmed policy in ${language}`,()=>{
  const app=readFileSync(new URL('../assets/master-app.js',import.meta.url),'utf8');const fn=app.split('\n').find(x=>x.startsWith('function fallbackConfirmedPolicy('));
  const ctx=vm.createContext({lang:language,fallbackGuideLink:route=>({route})});vm.runInContext(fn,ctx);
  for(let i=0;i<questions.length;i++)assert.match(ctx.fallbackConfirmedPolicy(k,questions[i]).answer,patterns[i]);
  for(const q of ['세탁기 용량 몇 kg?','How do I use the induction cooktop?','洗濯機は何時まで？','洗衣机怎么用？','電磁爐的型號？'])assert.equal(ctx.fallbackConfirmedPolicy(k,q),null,q);
 });
}
test('fully covered compound questions combine exact owner wording in every language',async()=>{
 const nativeCompounds={
  ko:'룸키를 잃어버렸어요. 1회 재발급된다던데 맞나요? 취소 환불 규정, 연박할 때 같은 방, 세탁·건조 비용과 공용주방의 인덕션도 알려주세요.',
  en:'I lost my room key. Is a one-time replacement still allowed? Also tell me the refund policy, whether consecutive bookings keep the same room, laundry and drying charges, and whether the shared kitchen has an induction cooktop.',
  ja:'ルームキーを紛失しました。1回だけ再発行できますか？返金条件、連泊で同じ部屋に泊まる手続き、洗濯と乾燥の料金、共用キッチンにIHコンロがあるかも教えてください。',
  zh:'房卡丢了，还能补办一次吗？也请说明退款条件、连续两笔预订如何住同一间房、洗衣烘干的费用，以及公共厨房有没有电磁炉。',
  'zh-TW':'房卡遺失了，還能補發一次嗎？也請說明退款條件、連續兩筆訂房如何住同一間房、洗衣烘衣費用，以及公共廚房有沒有電磁爐。'
 };
 for(const [language]of locales){
  const native=await ask(nativeCompounds[language],language,'fixture');assert.equal(native.request,undefined,language);
  for(const id of ['keycard','refund','extension','laundry','cooktop'])assert.ok(native.res.payload.answer.includes(k.confirmedPolicies[id].answer[language]),language+': '+id);
  const{request,res}=await ask('카드키를 분실했고 세탁비랑 같은 방 연박도 궁금해요',language,'fixture');assert.equal(request,undefined);
  for(const id of ['keycard','extension','laundry'])assert.ok(res.payload.answer.includes(k.confirmedPolicies[id].answer[language]));
  const unsupported=await ask('카드키 분실했고 세탁기 용량과 가위도 궁금해요',language,'fixture');assert.ok(unsupported.request);
  assert.match(unsupported.request.instructions,/OWNER CONFIRMATION 2026-10-27/);assert.doesNotMatch(unsupported.request.instructions,/KEY-CARD SITUATION POLICY|one-time exception after an actual loss|원격으로 재발급 해드립니다|연장하시면 같은 방으로 배정됩니다/);
 }
});
