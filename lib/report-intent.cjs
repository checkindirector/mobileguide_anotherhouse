const { normalizeGuestLanguage } = require('./guest-language.cjs');
const VERSION = '2026-10-05.checkout-time.1';

// Conservative reporting correction, not an answer selector. Preserve complex
// requests and the original routing label; only reclassify plain time questions.
function reportingIntent(question, recordedIntent = 'unclassified') {
  const text = normalizeGuestLanguage(question);
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
