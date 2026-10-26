// Operator sheet: 어나더 요약 items 17–18, read 2026-10-26.
// Translate fixed inventory once, rather than retranslate product names per request.
const source = { url: 'https://docs.google.com/spreadsheets/d/11-CezKy5zGxL0lQuOKa86b7DwihfSH-ieCzJ7wIjPQ0/edit?gid=472542366', sheet: '어나더 요약', verifiedAt: '2026-10-26' };
const hanger = /옷\s*걸이|행거|(?<![a-z])(?:coat[ -]?hangers?|clothes[ -]?hangers?|hangers?)(?![a-z])|ハンガー|衣架|衣服架/iu;
const overview = /^(?:(?:공용\s*(?:비품|용품)|공용\s*시설\s*비품)(?:은|이|에|에는)?\s*(?:뭐|무엇|어떤|목록|알려|있|준비|안내|좀|나요|어요|주세요|돼|되어|가|들|있는지|것|습니까|까요|\s|[?？.!])*|(?:(?:what|which)\s+)?(?:shared|common|communal)\s+(?:amenities|supplies|facilities)(?:\s+(?:are|do|you|have|available|provided|there|include|the|please|tell|me|about|what|is|list|of))*[?？.!]*|(?:共用|共有)(?:の)?(?:備品|アメニティ|設備)(?:は|が|に|を|何|なに|どんな|あります|ある|用意|教えて|ください|です|か|ます|されて|います|一覧|[?？。！\s])*|(?:公共|共用|公用)(?:备品|備品|用品|設備|设备)(?:有|哪些|什么|什麼|提供|吗|嗎|請問|请问|清单|清單|介紹|介绍|[?？。！\s])*)$/iu;
const shared = {
  ko: '라운지에 공용주방이 있으며 냉장고, 전자레인지, 인덕션, 정수기, 컵, 식기류(수저, 포크), 냄비, 프라이팬, 세탁기(건조기 겸용), 세탁세제가 있습니다. GUEST BOX에는 헤어고데기, 변환 어댑터, 여분 수건과 덴탈키트가 준비되어 있습니다. 공용 다이닝을 이용하실 때 개인물품에는 준비된 포스트잇과 펜을 사용하여 이름을 적어주세요.',
  en: 'The shared kitchen in the lounge has a refrigerator, microwave, induction cooktop, water purifier, cups, cutlery (spoons, chopsticks and forks), pots, frying pans, a washer-dryer and laundry detergent. The GUEST BOX contains a hair straightener, travel adapters, extra towels and dental kits. In the shared dining area, please use the provided sticky notes and pens to label your personal belongings with your name.',
  ja: 'ラウンジの共用キッチンには冷蔵庫、電子レンジ、IHコンロ、浄水器、カップ、食器類（スプーン・箸・フォーク）、鍋、フライパン、洗濯乾燥機、洗濯洗剤があります。GUEST BOXにはヘアアイロン、変換アダプター、予備タオル、歯ブラシセットを用意しています。共用ダイニングでは、備え付けの付箋とペンで私物に名前を書いてください。',
  zh: '休息区的公共厨房备有冰箱、微波炉、电磁炉、净水器、杯子、餐具（勺子、筷子和叉子）、锅、平底锅、洗烘一体机及洗衣液。GUEST BOX 内备有直发器、转换插头、备用毛巾和牙具套装。使用公共用餐区时，请用备好的便签和笔在个人物品上写上姓名。',
  'zh-TW': '休息區的公共廚房備有冰箱、微波爐、電磁爐、淨水器、杯子、餐具（湯匙、筷子和叉子）、鍋子、平底鍋、洗脫烘洗衣機及洗衣精。GUEST BOX 內備有直髮器、轉換插頭、備用毛巾和牙具組。使用公共用餐區時，請用準備好的便利貼和筆在個人物品上寫上姓名。'
};
const hangers = { ko: '객실에 옷걸이가 준비되어 있습니다.', en: 'Clothes hangers are provided in the guest room.', ja: '客室にハンガーを用意しています。', zh: '客房内备有衣架。', 'zh-TW': '客房內備有衣架。' };
// Provision is not live stock, a quantity/material guarantee or a shopping answer.
const detailed = /없는데|없어요|없네|안\s*보|못\s*찾|분실|잃|고장|몇\s*개|추가|더\s*주|브랜드|크기|구매|구입|파는|근처|주변|어디서.*사|\b(?:missing|broken|lost|buy|purchase|nearby|extra|more|additional|brand|size|wooden|metal|plastic)\b|how\s*many|can.?t\s*find|not\s*(?:there|available|working)|見つから|見当たら|ないん|ないです|壊|追加|何本|何個|買|購入|周辺|近く|足り|找不到|没看到|沒看到|不见|不見|没有了|沒有了|坏|壞|丢|丟|买|買|附近|几个|幾個|多少|多给|多給|额外|額外|木製|木制|塑料|塑膠/iu;
function matches(message) { return hanger.test(String(message || '').normalize('NFKC')); }
function isOverview(message) { return overview.test(String(message || '').normalize('NFKC').trim()); }
function evidence(message, language = 'ko') {
  if (!matches(message) && !isOverview(message)) return null;
  return { source, range: matches(message) ? 'D18' : 'D19', inventory: matches(message) ? hangers[language] || hangers.ko : shared[language] || shared.ko,
    instruction: 'Operator-confirmed inventory. Preserve each location and exact appliance name. Hair straightener = ヘアアイロン = 直发器 = 直髮器, never 髮夾/发夹 (hair clip) or hair dryer. Hangers are in guest rooms. Do not infer quantity, material, live stock, or replacement availability.' };
}
function directAnswer(message, language = 'ko', topics = []) {
  if (isOverview(message)) return { answer: shared[language] || shared.ko, item: 'shared-amenities', source: { ...source, range: 'D19', item: 18 } };
  if (/그리고|하고|랑|\band\b|それと|ハンガーと|還有|还有|以及|另外|衣架.*[和与與]|가져가|가지고.*가|반납|수리|take.*(?:home|away)|keep|bring|return|repair|持ち帰|持って|返却|带走|帶走|归还|歸還/iu.test(message)) return null;
  if (!matches(message) || detailed.test(message) || /steak|restaurant|스테이크|맛집|レストラン|餐厅|餐廳/iu.test(message) || topics.some(topic => !['electric-items', 'amenities', 'rooms'].includes(topic))) return null;
  return { answer: hangers[language] || hangers.ko, item: 'room-hangers', source: { ...source, range: 'D18', item: 17 } };
}
module.exports = { source, shared, hangers, matches, isOverview, evidence, directAnswer };
