// Operator sheet: 어나더 요약 items 17–18; shared list rechecked 2026-11-02.
// Translate fixed inventory once, rather than retranslate product names per request.
const inventory = require('../assets/amenity-inventory.js');
const {source, shared} = inventory;
const hanger = /옷\s*걸이|행거|(?<![a-z])(?:coat[ -]?hangers?|clothes[ -]?hangers?|hangers?)(?![a-z])|ハンガー|衣架|衣服架/iu;
const hangers = { ko: '객실에 옷걸이가 준비되어 있습니다.', en: 'Clothes hangers are provided in the guest room.', ja: '客室にハンガーを用意しています。', zh: '客房内备有衣架。', 'zh-TW': '客房內備有衣架。' };
// Provision is not live stock, a quantity/material guarantee or a shopping answer.
const detailed = /없는데|없어요|없네|안\s*보|못\s*찾|분실|잃|고장|몇\s*개|추가|더\s*주|브랜드|크기|구매|구입|파는|근처|주변|어디서.*사|\b(?:missing|broken|lost|buy|purchase|nearby|extra|more|additional|brand|size|wooden|metal|plastic)\b|how\s*many|can.?t\s*find|not\s*(?:there|available|working)|見つから|見当たら|ないん|ないです|壊|追加|何本|何個|買|購入|周辺|近く|足り|找不到|没看到|沒看到|不见|不見|没有了|沒有了|坏|壞|丢|丟|买|買|附近|几个|幾個|多少|多给|多給|额外|額外|木製|木制|塑料|塑膠/iu;
function matches(message) { return hanger.test(String(message || '').normalize('NFKC')); }
function isOverview(message) { return inventory.isOverview(message); }
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
