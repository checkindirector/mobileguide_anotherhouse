const { normalizeGuestLanguage } = require('./guest-language.cjs');
const VERSION = '2026-11-02.checkin-method.1';

// Conservative reporting correction, not an answer selector. Preserve complex
// requests and the original routing label; only reclassify plain time questions.
function reportingIntent(question, recordedIntent = 'unclassified') {
  const text = normalizeGuestLanguage(question);
  // Correct only a self-contained method question. Unknown words, times,
  // luggage, keys, early arrival and other combined requests remain unchanged.
  const method = /체크인.{0,12}(?:방법|어떻게|절차)|어떻게.{0,12}체크인|check.?in.{0,12}(?:method|instructions|procedure|process|steps)|how.{0,25}check.?in|チェックイン.{0,12}(?:どう|方法|仕方|手順)|どう.{0,12}チェックイン|入住.{0,8}(?:方式|方法|流程|手续|手續)|(?:怎么|怎麼|如何).{0,6}(?:办理|辦理)?入住/iu;
  if (method.test(text)) {
    const rest = text.replace(/체크인|방법|어떻게|절차|알려주세요|알려줘|해주세요|해요|하나요|하죠|하나|하니|해야|돼요|되나요|해|좀|저는|저|는|은|을|이|가|요|\b(?:how|do|does|can|could|should|i|we|you|please|tell|me|the|to|a|are|is|what|check[ -]?in|method|instructions|procedure|process|steps)\b|チェックイン|方法|仕方|手順|どうやって|どうすれば|どう|すれば|したら|する|できますか|しますか|します|できます|するの|ですか|教えてください|教えて|ください|は|の|を|か|入住|方式|方法|流程|手续|手續|怎么办理|怎麼辦理|如何办理|如何辦理|怎么|怎麼|如何|办理|辦理|请问|請問|请|請|告诉我|告訴我|一下|的|是|什么|什麼|吗|嗎|呢/giu,'').replace(/[\s\p{P}\p{S}]/gu,'');
    if (!rest) return 'checkin-method';
  }
  if (!/(?:체크아웃|check[ -]?out|チェックアウト|退房)/iu.test(text)) return recordedIntent;
  if (!/(?:시간|몇\s*시|언제|\btime\b|\bwhen\b|何時|いつ|时间|時間|几点|幾點)/iu.test(text)) return recordedIntent;
  const compact = text.replace(/[^\p{L}\p{N}]/gu, '');
  const remainder = compact.replace(/체크아웃|시간|몇시|언제|까지|이야|인가요|하나요|해야하나요|해야해|해야|해요|이에요|예요|알려|주세요|해줘|좀|는|은|가|요|checkout|whattime|time|when|doihaveto|doineedto|doi|shouldi|musti|is|what|the|at|please|pls|チェックアウト|何時|いつ|時間|まで|ですか|です|は|に|退房|时间|時間|几点|幾點|什么时候|什麼時候|请问|請問|是多少|是|呢|吗|嗎/gu, '');
  return remainder === '' ? 'checkout-time' : recordedIntent;
}

function classifyEvent(event) {
  if (event.kind !== 'chat') return event;
  const recordedIntent = event.recordedIntent || event.intent || 'unclassified';
  return { ...event, recordedIntent, intent: reportingIntent(event.question, recordedIntent), classificationVersion: VERSION };
}

module.exports = { reportingIntent, classifyEvent, VERSION };
