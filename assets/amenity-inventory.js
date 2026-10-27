// Verified operator sheet, 어나더 요약 D17:D20 (2026-10-26).
// Recognition selects evidence. Only a fully understood availability/location
// question may use a fixed answer; unknown words and conditions go to the model.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ANOTHER_HOUSE_AMENITIES=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const source = {url:'https://docs.google.com/spreadsheets/d/11-CezKy5zGxL0lQuOKa86b7DwihfSH-ieCzJ7wIjPQ0/edit?gid=472542366',sheet:'어나더 요약',verifiedAt:'2026-10-26'};
const languages = ['ko', 'en', 'ja', 'zh', 'zh-TW'];
const row = (id, location, range, pattern, names) => ({id, location, range, pattern, names: Object.fromEntries(languages.map((l,i)=>[l,names[i]]))});
const items = [
  row('bedding','room','D18',/침구|이불|bed(?:ding| linen)|寝具|布団|床上用品|寢具|被子/giu,['침구','bedding','寝具','床上用品','寢具']),
  row('charger','room','D18',/(?:휴대폰\s*)?충전기|(?<![a-z])(?:(?:phone|mobile)\s*)?chargers?(?![a-z])|(?:携帯電話)?充電器|(?:手机|手機)?充[电電]器/giu,['휴대폰 충전기','phone chargers','携帯電話充電器','手机充电器','手機充電器']),
  row('towel','room','D18',/수건|타올|타월|(?<![a-z])(?:bath\s*|face\s*)?towels?(?![a-z])|(?:バス|フェイス)?タオル|毛巾|浴巾/giu,['수건','towels','タオル','毛巾','毛巾']),
  row('slippers','room','D18',/슬리퍼|(?<![a-z])(?:disposable\s*)?slippers?(?![a-z])|(?:使い捨て)?スリッパ|(?:一次性|拋棄式)?拖鞋/giu,['일회용 슬리퍼','disposable slippers','使い捨てスリッパ','一次性拖鞋','拋棄式拖鞋']),
  row('hanger','room','D18',/옷\s*걸이|행거|(?<![a-z])(?:(?:coat|clothes)[ -]?)?hangers?(?![a-z])|ハンガー|衣服架|衣架/giu,['옷걸이','clothes hangers','ハンガー','衣架','衣架']),
  row('dental','room','D18,D19',/덴탈\s*키트|칫솔|치약|(?<![a-z])(?:dental\s*kits?|toothbrush(?:es)?|toothpaste)(?![a-z])|歯ブラシ(?:セット)?|歯磨き|歯みがき|デンタルキット|牙具(?:套装|組)?|牙刷|牙膏/giu,['일회용 덴탈키트(칫솔·치약)','disposable dental kits (toothbrush and toothpaste)','使い捨て歯ブラシセット','一次性牙具套装（牙刷、牙膏）','拋棄式牙具組（牙刷、牙膏）']),
  row('fridge','kitchen','D19',/냉장고|냉장|(?<![a-z])(?:refrigerators?|fridges?)(?![a-z])|冷蔵庫|冰箱/giu,['냉장고','a refrigerator','冷蔵庫','冰箱','冰箱']),
  row('microwave','kitchen','D19',/전자레인지|렌지|(?<![a-z])microwave(?:\s*oven)?s?(?![a-z])|電子レンジ|レンジ|微波[炉爐]/giu,['전자레인지','a microwave','電子レンジ','微波炉','微波爐']),
  row('cooktop','kitchen','D19',/인덕션|전기레인지|(?<![a-z])(?:induction\s*(?:cooktop|hob|stove)|cooktop|stove)s?(?![a-z])|IHコンロ|電気コンロ|[电電]磁[炉爐]|[电電][炉爐]/giu,['인덕션','an induction cooktop','IHコンロ','电磁炉','電磁爐']),
  row('purifier','kitchen','D19',/정수기|마실\s*물|(?<![a-z])(?:water\s*(?:purifier|dispenser)s?|drinking water)(?![a-z])|浄水器|飲み水|[净淨]水器|[饮飲]水[机機]/giu,['정수기','a water purifier','浄水器','净水器','淨水器']),
  row('cup','kitchen','D19',/머그컵|컵|(?<![a-z])(?:cups?|mugs?)(?![a-z])|コップ|カップ|杯子|水杯/giu,['컵','cups','カップ','杯子','杯子']),
  row('cutlery','kitchen','D19',/수저|숟가락|숫가락|젓가락|포크|식기류?|(?<![a-z])(?:spoons?|forks?|chop\s*sticks?|cutlery|utensils?|silverware)(?![a-z])|スプーン|フォーク|お箸|箸|カトラリー|食器|勺子|勺|汤匙|湯匙|调羹|調羹|筷子|筷|叉子|餐具/giu,['수저(숟가락·젓가락)와 포크','spoons, chopsticks and forks','スプーン・箸・フォーク','勺子、筷子和叉子','湯匙、筷子和叉子']),
  row('pot','kitchen','D19',/냄비|(?<![a-z])(?:(?:cooking\s*)?pots?|saucepans?)(?![a-z])|お鍋|鍋子|鍋|煮锅|湯鍋|锅/giu,['냄비','cooking pots','鍋','锅','鍋子']),
  row('pan','kitchen','D19',/프라이팬|후라이팬|(?<![a-z])(?:frying\s*pans?|frypans?|skillets?)(?![a-z])|フライパン|平底[锅鍋]|煎[锅鍋]/giu,['프라이팬','frying pans','フライパン','平底锅','平底鍋']),
  row('washer','kitchen','D19',/세탁기|빨래|(?<![a-z])(?:washing\s*machines?|washers?)(?![a-z])|洗濯機|洗濯|洗衣[机機]/giu,['세탁기(건조기 겸용)','a washer-dryer combination','洗濯乾燥機','洗烘一体机','洗脫烘洗衣機']),
  row('dryer','kitchen','D19',/(?:빨래\s*|의류\s*)?건조기|(?<![a-z])(?:(?:clothes|tumble)\s*)?dryers?(?![a-z])|(?:衣類)?乾燥機|(?:衣物)?烘干机|(?:衣物)?烘乾機|烘衣機/giu,['건조 기능이 있는 세탁기(별도 건조기가 아닌 겸용 기기)','a washer-dryer combination (not a separate tumble dryer)','乾燥機能付き洗濯機（独立した乾燥機ではありません）','带烘干功能的洗衣机（不是独立烘干机）','有烘衣功能的洗衣機（非獨立烘衣機）']),
  row('detergent','kitchen','D19',/세탁\s*세제|세제|(?<![a-z])(?:laundry\s*detergent|washing\s*powder|detergent)(?![a-z])|洗濯洗剤|洗剤|洗衣液|洗衣精|洗衣粉/giu,['세탁세제','laundry detergent','洗濯洗剤','洗衣液','洗衣精']),
  row('softener','kitchen','D19',/섬유\s*유연제|유연제|fabric\s*softener|柔軟剤|柔顺剂|柔順劑|柔軟精/giu,['섬유유연제','fabric softener','柔軟剤','柔顺剂','柔軟精']),
  row('straightener','guestbox','D19',/헤어\s*고데기|고데기|(?<![a-z])(?:hair\s*(?:straightener|iron)|flat\s*iron|straightening\s*iron)s?(?![a-z])|ヘアアイロン|ストレートアイロン|コテ|直发器|直髮器|夹板|夾板|离子夹|離子夾/giu,['헤어고데기','a hair straightener','ヘアアイロン','直发器','直髮器']),
  row('adapter','guestbox','D19',/(?:변환\s*|여행용\s*)?어댑터|아답터|돼지코|(?<![a-z])(?:(?:travel|plug|power)\s*)?adapt(?:er|or)s?(?![a-z])|(?:旅行用|変換|電源)(?:アダプター|プラグ)|转换插头|转换器|轉換插頭|轉接頭/giu,['변환 어댑터','travel adapters','変換アダプター','转换插头','轉換插頭']),
  row('stationery','dining','D19',/볼펜|펜|포스트\s*잇|포스트잍|메모지|붙임쪽지|스티키\s*노트|(?<![a-z])(?:pens?|ball\s*point(?:\s*pens?)?|sticky\s*notes?|post[ -]?its?)(?![a-z])|ボールペン|ペン|付箋|ふせん|ポストイット|便签|便簽|便條紙|便利贴|便利貼|签字笔|簽字筆|圆珠笔|原子筆|(?<![铅鉛])笔(?!记本)|(?<!鉛)筆(?!記本)/giu,['펜과 포스트잇','pens and sticky notes','ペンと付箋','笔和便签','筆和便利貼']),
  row('bodywash','bathroom','D20',/바디\s*(?:워시|샤워)|보디\s*워시|(?<![a-z])(?:body\s*wash|shower\s*gel)(?![a-z])|ボディ(?:ソープ|ウォッシュ)|沐浴[露液乳]/giu,['바디워시','body wash (shower gel)','ボディソープ','沐浴露','沐浴乳']),
  row('shampoo','bathroom','D20',/샴푸|(?<![a-z])shampoo(?![a-z])|シャンプー|洗发水|洗髮精|洗髮水|洗头水/giu,['샴푸','shampoo','シャンプー','洗发水','洗髮精']),
  row('hairdryer','bathroom','D20',/(?:헤어\s*)?드라이[기어]|(?<![a-z])(?:hair\s*dryers?|hairdryers?|blow\s*dryers?)(?![a-z])|(?:ヘア)?ドライヤー|吹风机|吹風機|电吹风|電吹風/giu,['헤어드라이어','hair dryers','ヘアドライヤー','吹风机','吹風機'])
];
function matching(message) {
  const text=String(message||'').normalize('NFKC'), spans=[];
  for(const item of items) for(const match of text.matchAll(item.pattern)) spans.push({item,start:match.index,end:match.index+match[0].length});
  // Longest match owns its span: 平底鍋 is a pan, not also a pot;
  // hair dryer is not a clothes dryer, and ballpoint pen is not two items.
  const selected=[];
  for(const span of spans.sort((a,b)=>(b.end-b.start)-(a.end-a.start))) if(!selected.some(s=>span.start<s.end&&span.end>s.start)) selected.push(span);
  return {text,spans:selected,items:[...new Set(selected.sort((a,b)=>a.start-b.start).map(s=>s.item))]};
}
// Only neutral question grammar is removed. An unknown object, quantity,
// compatibility, negation, failure, shopping or other policy remains -> model.
const grammar = /\b(?:is|are|a|an|the|there|do|does|you|your|have|has|we|i|our|my|in|at|of|on|and|or|also|please|provided|provide|available|where|located|can|find|tell|me|about|any|shared|common|communal|guest|room|rooms|bathroom|kitchen|lounge|hotel|property|hostel|inside|extra|spare)\b|있습니까|있나요|있어요|있나여|있어|있음|있나|있냐|있죠|있니|있|인가요|인가|돼있나요|준비되어|준비된|준비|비치|구비|제공|어디에|어디|알려주세요|알려줘|주세요|좀|혹시|객실|공용|숙소|라운지|주방|욕실|방\s*안|방|여분|추가|더|그리고|하고|이랑|이[나랑]|랑|와|과|및|도|는|은|가|이|을|를|에|안|요|ありますか|あります|ある|用意されていますか|用意|提供|されていますか|されています|どこに|どこ|ですか|です|ください|教えて|客室|部屋|共用|共有|キッチン|浴室|予備の|予備|追加の|に|の|は|が|を|と|も|それと|有沒有|有没有|有没有|請問|请问|是否|提供|備有|备有|有|嗎|吗|哪些|在哪里|在哪裡|哪里|哪裡|客房|房间|房間|公共|共用|公用|厨房|廚房|浴室|备用|備用|额外|額外|和|与|與|以及|還有|还有|的|里|裡|內|内/giu;
function analyze(message) {
  const result=matching(message);
  let rest=result.text;
  for(const span of [...result.spans].sort((a,b)=>b.start-a.start))rest=rest.slice(0,span.start)+' '.repeat(span.end-span.start)+rest.slice(span.end);
  rest=rest.replace(/빌릴\s*수|둘\s*다|어디있어|어딨어|\bnotes\b|ある|や/giu,' ');
  const residue=rest.replace(grammar,' ').replace(/[\s\p{P}\p{S}]/gu,'');
  const condition=/안\s*(?:있|돼|되)|없|고장|못\s*찾|분실|가져가|반납|\b(?:missing|broken|lost|buy|repair|return|not|no|keep)\b|見つから|壊|ない|買|返却|没有|沒有|找不到|坏|壞|買|买|带走|帶走/iu.test(result.text);
  return {...result,complete:result.items.length>0&&!residue&&!condition,room:/객실|방\s*(?:안|에)|\b(?:in|inside)\s+(?:(?:the|my|a|your)\s+)?(?:guest\s*)?room\b|客室|部屋|客房|房间|房間/iu.test(result.text),residue};
}
const locations={room:['객실','the guest room','客室','客房','客房'],kitchen:['라운지의 공용주방','the shared kitchen in the lounge','ラウンジの共用キッチン','休息区的公共厨房','休息區的公共廚房'],guestbox:['공용주방 냉장고 옆 GUEST BOX','the GUEST BOX beside the shared-kitchen refrigerator','共用キッチンの冷蔵庫横のGUEST BOX','公共厨房冰箱旁的GUEST BOX','公共廚房冰箱旁的GUEST BOX'],bathroom:['공용 욕실','the shared bathroom','共用バスルーム','公共浴室','公共浴室'],dining:['공용 다이닝','the shared dining area','共用ダイニング','公共用餐区','公共用餐區']};
function compose(analysis,language='ko') {
  const i=Math.max(0,languages.indexOf(language));
  return analysis.items.map(item=>{
    const name=item.names[language]||item.names.ko,place=locations[item.location][i];
    return [`${name} — ${place}에 준비되어 있습니다.`,`Available in ${place}: ${name}.`,`${place}に${name}を用意しています。`,`${place}备有${name}。`,`${place}備有${name}。`][i];
  }).join('\n\n');
}
function evidence(message,language='ko') {
  const analysis=analyze(message);if(!analysis.items.length)return null;
  return {source,range:[...new Set(analysis.items.flatMap(x=>x.range.split(',')))].join(','),requestedItems:analysis.items.map(x=>x.id),inventory:compose(analysis,language),
    instruction:'Verified operator inventory. Address EVERY requested item and condition, including unknown additional items. Room towels and dental kits are provided IN rooms; spare supplies are also in GUEST BOX. Used towels go in the shower basket, not GUEST BOX. Hairdryer: shared bathroom. Straightener: GUEST BOX (return after use). Washer and dryer are one combination machine. Do not infer conditioner, soap, scissors, quantities, live stock, brands or compatibility. Q045 in the question sheet is mislinked to item 17; use bathroom item 19 for hairdryer, never the unrelated room list.'};
}
// Older website-confirmed Guest Box supplies are not newly added sheet facts.
// Keep their existing answers, but never let one swallow a second item/condition.
const legacyPatterns={
  bandage:/밴드|반창고|(?<![a-z])(?:band-?aids?|bandages?|plasters?)(?![a-z])|絆創膏|ばんそうこう|创可贴|創可貼|止血贴|OK繃/giu,
  'wet-wipes':/물티슈|(?<![a-z])wet\s*wipes?(?![a-z])|ウェットティッシュ|湿巾|溼巾|濕巾|湿紙巾|溼紙巾|濕紙巾/giu,
  'plastic-bag':/비닐\s*봉투|(?<![a-z])plastic\s*bags?(?![a-z])|ビニール袋|ポリ袋|塑料袋|塑膠袋/giu,
  'emergency-medicine':/(?:비상|상비|구급|응급)\s*(?:용\s*)?약|구급\s*함|진통제|소화제|감기약|해열제|(?<!예)약|(?<![a-z])(?:emergency\s*medicines?|first[\s-]*aid\s*(?:medicines?|kits?)|pain\s*(?:killers?|relievers?)|cold\s*medicine|digestive\s*medicine|fever\s*medicine|medicines?|medications?)(?![a-z])|常備薬|救急薬|救急箱|痛み止め|風邪薬|胃腸薬|解熱剤|薬|常备药|常備藥|急救药|急救藥|急救箱|止痛药|止痛藥|感冒药|感冒藥|消化药|腸胃藥|退烧药|退燒藥|药|藥/giu
};
function legacyComplete(message,item){
  const pattern=legacyPatterns[item];if(!pattern)return true;
  const masked=String(message||'').normalize('NFKC').replace(pattern,'shampoo');
  const result=analyze(masked);
  return result.complete&&result.items.length===1&&result.items[0].id==='shampoo';
}
function legacyMatching(message){
  const text=String(message||'').normalize('NFKC');
  return Object.entries(legacyPatterns).filter(([,pattern])=>new RegExp(pattern.source,'iu').test(text)).map(([id])=>id);
}
return {items,matching,analyze,compose,evidence,legacyComplete,legacyMatching};
});
