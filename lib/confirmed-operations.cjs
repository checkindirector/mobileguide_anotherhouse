const facts=require('../assets/operations-policies.js');
const {normalizeGuestLanguage,propertyQuestionHint}=require('./guest-language.cjs');
const {analyze}=require('../assets/amenity-inventory.js');
const MESSAGE=/(?:체크인|입실).{0,18}(?:안내|메시지|메세지|문자|발송)|check.?in.{0,20}(?:message|instructions|guidance)|(?:チェックイン|入館).{0,15}(?:案内|メッセージ)|入住.{0,15}(?:消息|訊息|指南|指引|通知)/iu;
const SAME_DAY=/당일\s*예약|오늘.{0,8}예약|same.?day\s*(?:book|reserv)|book.{0,15}today|当日予約|今日.{0,8}予約|当天预订|今天.{0,8}预订|當天訂房|當日預訂|今天.{0,8}(?:訂房|預訂)/iu;
const SCHEDULE=/발송|언제|몇\s*시|어느\s*(?:채널|사이트)|어디|when|what\s*time|which\s*(?:site|channel)|send|何時|いつ|どこ|送信|发送|發送|几点|幾點|什么时候|什麼時候|哪|傳送/iu;
const MISSING=/안\s*(?:왔|와|받)|못\s*받|받지\s*못|없|미수신|not.{0,15}(?:receiv|sent)|haven.t.{0,10}receiv|missing|didn.t.{0,10}(?:get|receiv)|届(?:いていない|いていません|かない|きません|いてない)|知らせ[られ]*てい(?:ない|ません)|未收到|没收到|沒收到|没有收到|沒有收到/iu;
const EARLY=/얼리|일찍\s*(?:체크인|입실)|early.{0,10}check.?in|アーリー|早め.{0,10}チェックイン|提前入住|提早入住/iu;
const FOOD_DELIVERY=/배달\s*음식|음식\s*배달|배달.{0,8}(?:시켜|주문|먹|받|수령)|^배달(?:되나요|가능한가요|가능|돼요|되요)?[?？.!\s]*$|배민|배달의민족|쿠팡\s*이츠|food\s*deliver|deliver(?:y|ed).{0,15}(?:food|meal)|uber\s*eats|出前|料理.{0,12}(?:配達|デリバリー)|デリバリー|外卖|外賣|外送|送餐/iu;
const ROOM_FOOD=/(?:방|객실).{0,14}(?:음식|간식|음료|식사|먹|취식)|(?:eat|food|dine|snacks?|drinks?|beverages?).{0,22}(?:room)|(?:room).{0,22}(?:eat|food|dine|snacks?|drinks?|beverages?)|(?:部屋|客室).{0,14}(?:食事|食べ|飲食|お菓子|飲み物)|房(?:间|間|内|內)?.{0,14}(?:吃|用餐|食物|零食|饮料|飲料|喝)/iu;
const DETAILS=/얼마|배달비|수수료|무료|결제|쿠폰|최소.{0,4}(?:금액|주문)|시간\s*제한|몇\s*시|\bcost\b|\bfee\b|\bfree\b|\bprice\b|\bpay\b|\bwhen\b|what\s*time|料金|配達料|何時|费用|費用|配送费|運費|免费|免費|几点|幾點|\d{1,2}(?::\d{2})?\s*(?:시|am|pm|時|点|點)|새벽|자정|overnight|夜中|凌晨/iu;
const OUTSIDE=/약국|공항|pharmacy|airport|薬局|空港|药店|藥局|机场|機場|추천|recommend|おすすめ|推荐|推薦/iu;
const MESSAGE_ACTION=/재발송|다시.{0,8}보내|resend|send.{0,8}again|再送|重发|重發|重寄|再寄|틀렸|잘못|wrong|incorrect|間違|错误|錯誤/iu;
const FOOD_ISSUE=/택배|소포|parcel|package|宅配便|快递|快遞|包裹|냄새|흘렸|쏟|더럽|odor|smell|spill|stain|汚|こぼ|臭|灑|污/iu;

function reply(message,history=[],language='ko'){
 const text=normalizeGuestLanguage(message),previous=history.filter(x=>x.role==='user').at(-1)?.content||'';
 const topics=propertyQuestionHint(message)?.topics||[];
 const scheduleTopic=MESSAGE.test(text)||SAME_DAY.test(text)||(MESSAGE.test(previous)&&text.length<70&&SCHEDULE.test(text));
 if(scheduleTopic&&!MISSING.test(text)&&!MESSAGE_ACTION.test(text)&&!OUTSIDE.test(text)&&!topics.some(t=>!['checkin','booking','contact','address'].includes(t))){
  let answer=facts.messageSchedule.answer[language];
  if(/몇\s*시|시각|what\s*time|何時|几点|幾點/iu.test(text))answer+='\n\n'+facts.messageSchedule.clockUnknown[language];
  if(EARLY.test(text))answer=facts.earlyArrival[language]+'\n\n'+answer;
  return {answer,route:'checkin',intent:'checkin-message-schedule',sourceRows:[45]};
 }
 const delivery=FOOD_DELIVERY.test(text),room=ROOM_FOOD.test(text);
 if((delivery||room)&&!DETAILS.test(text)&&!FOOD_ISSUE.test(text)&&!OUTSIDE.test(text)&&!analyze(message).items.length&&!topics.some(t=>!['dining','rooms','rules','parcel','kitchen'].includes(t))){
  return {answer:[...(room?[facts.roomDining.answer[language]]:[]),...(delivery?[facts.foodDelivery.answer[language]]:[])].join('\n\n'),route:'rules',intent:delivery?'food-delivery':'room-dining',sourceRows:delivery?[46]:[22]};
 }
 return null;
}
module.exports={facts,reply};
