const { normalizeGuestLanguage, propertyQuestionHint } = require('./guest-language.cjs');
function matching(knowledge, message) {
  const text = normalizeGuestLanguage(message);
  if (/항공권|비행기\s*표|flight ticket|airline|航空券|机票|機票|car key|house key|차키|車の鍵|车钥匙|車鑰匙/iu.test(text)) return [];
  return Object.entries(knowledge.confirmedPolicies || {}).filter(([id, p]) => id !== 'version' && p.keywords.some(k => text.includes(normalizeGuestLanguage(k)))).map(([id]) => id);
}
function direct(knowledge, message, language, needsSemanticAnswer) {
  if (needsSemanticAnswer) return null;
  const ids = matching(knowledge, message), text = normalizeGuestLanguage(message);
  if (ids.length !== 1) return null;
  const id = ids[0], topics = propertyQuestionHint(message)?.topics || [];
  const allowed = { keycard:['key','rooms'], refund:['booking'], extension:['extension','booking','rooms'], laundry:['laundry'], cooktop:['kitchen','amenities'] }[id];
  if (topics.some(t => !allowed.includes(t))) return null;
  // A policy noun alone cannot answer device controls or unknown booking facts.
  if (id === 'laundry' && !/무료|유료|요금|비용|얼마|free|cost|price|pay|無料|料金|有料|免费|免費|收费|收費|費用|费用/iu.test(text)) return null;
  if (id === 'laundry' && /예약|사용법|고장|용량|몇\s*시|\bkg\b|reserv|book|hours|how.*use|broken|capacity|予約|操作|故障|何時|容量|预约|預約|几点|幾點|怎么用|怎麼用/iu.test(text)) return null;
  if (id === 'cooktop' && /사용법|조작|고장|작동|모델|how|operate|broken|model|使い方|操作|故障|型号|型號|怎么用|怎麼用/iu.test(text)) return null;
  if (id === 'extension' && /요금|가격|빈\s*방|가능\s*날짜|price|cost|available on|空室|料金|房价|房價|空房/iu.test(text)) return null;
  const p = knowledge.confirmedPolicies[id];
  return { id, route:p.route, answer:p.answer[language] || p.answer.ko };
}
module.exports = { matching, direct };
