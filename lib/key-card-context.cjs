const { normalizeGuestLanguage } = require('./guest-language.cjs');

const KEY = /카드키|열쇠|재발급|key\s*card|\bkeys?\b|replacement|キーカード|鍵|再発行|房卡|钥匙|鑰匙|补办|補辦|补发|補發/iu;
const OTHER_KEY = /차키|자동차|집\s*열쇠|car key|house key|bike key|車の鍵|家の鍵|车钥匙|車鑰匙/iu;
const LOSS = /분실|잃|없어졌|없어져|lost|missing|紛失|なくし|無くし|失くし|遺失|遗失|丢|丟|不见|不見/iu;
const AGAIN = /또|다시|재분실|again|another time|また|再び|又|再次/iu;
const HYPOTHETICAL = /잃.*(?:면|경우)|분실.*(?:하면|시에는|할\s*경우)|만약|what if|if i (?:lose|lost)|in case|なくしたら|紛失したら|もし|如果|要是/iu;
const DENIED_LOSS = /안\s*잃|잃.*(?:않았|않아)|분실.*(?:아니|안\s*했)|not\s*lost|didn.t\s*lose|紛失していない|没有丢|沒有丟/iu;
const NOT_RECEIVED = /(?:재발급|새\s*카드키).{0,20}(?:못|안\s*받|받지\s*못|받지\s*않|아직|실패|받은\s*적\s*없|받은\s*게\s*아니|받아야|받아도|받을|받으면)|아직.{0,20}(?:재발급|못\s*받)|haven.t|have not|didn.t|not (?:received|got|issued)|couldn.t|まだ|もらっていない|受け取っていない|没.{0,12}(?:补|拿到|收到)|沒.{0,12}(?:補|拿到|收到)|尚未|还没|還沒/iu;
const RECEIVED = /재발급\s*(?:을\s*)?(?:받았|받은|받아서|해\s*주셨|한\s*카드키|된\s*카드키|완료)|(?:received|got|collected).{0,24}(?:replacement|new key)|(?:lost|missing).{0,15}replacement\s*(?:key|card)|replacement\s*(?:key|card).{0,24}(?:issued|received|lost|missing)|再発行.{0,16}(?:受け取|もらっ|された|済み)|(?:补办|補辦|补发|補發).{0,16}(?:了|过|過|拿到|收到)/iu;
const NEW_RECEIVED = /(?:새\s*(?:카드키|키|카드)|카드키.*다시).{0,12}받았|새로\s*받았|got a new one|received a new one|新しい.*受け取|新房卡.*(?:拿到|收到)/iu;
const ACCESS_FOLLOWUP = /비밀\s*번호|비번|암호|코드|전화|키오스크|못\s*들어|안\s*열|알려\s*줘|알려\s*주세요|어떡|어떻게|code|password|phone|kiosk|tell me|what now|cannot enter|暗証|電話|教えて|密码|密碼|電話|电话|告诉|告訴|怎么办|怎麼辦/iu;

// This is reported conversational state, not a verified issuance ledger.
// Assistant instructions alone must NEVER consume the one replacement.
function keyCardSituation(message, history = []) {
  const previous = history.filter(item => item?.role === 'user').map(item => item.content || item.text || '');
  let keyContext = false, received = false, lostReplacement = false;
  const events = [...previous, message];
  let result;
  for (let i = 0; i < events.length; i++) {
    const text = normalizeGuestLanguage(events[i]);
    const explicitKey = KEY.test(text) && !OTHER_KEY.test(text);
    const related = explicitKey || (keyContext && (LOSS.test(text) || ACCESS_FOLLOWUP.test(text) || NEW_RECEIVED.test(text)));
    const hypothetical = HYPOTHETICAL.test(text);
    const receipt = related && !hypothetical && !NOT_RECEIVED.test(text) && (RECEIVED.test(text) || (keyContext && NEW_RECEIVED.test(text)));
    const loss = related && LOSS.test(text) && !hypothetical && !DENIED_LOSS.test(text);
    const repeated = loss && (received || receipt || /replacement.*(?:lost|missing)|(?:lost|missing).*replacement/iu.test(text));
    if (receipt) received = true;
    if (repeated) lostReplacement = true;
    if (i === events.length - 1) result = {
      related, hypothetical, loss, receipt, replacementReceived: received,
      lostReplacement, ambiguousRepeat: loss && AGAIN.test(text) && !received && !repeated
    };
    if (explicitKey) keyContext = true;
  }
  return result;
}

const COPY = {
  ko: {
    warning: '카드키 재발급은 1회만 가능합니다. 다시 분실하면 추가 재발급이 불가능하니 재분실에 유의해 주세요.',
    exhausted: '이미 한 번 재발급받은 카드키를 다시 분실하셨군요. 추가 재발급은 불가능합니다. 예약하신 플랫폼 메시지로 운영팀에 현재 상황을 알려주세요.',
    confirm: '분실 후 카드키를 이미 한 번 재발급받으셨나요? 재발급받은 키를 다시 분실한 것인지 확인해 주세요.',
    received: '새 카드키를 받으셨군요. 다시 분실하면 추가 재발급이 불가능하니 꼭 소지하고 주의해 주세요.',
    after: '이미 한 번 재발급받으셨다면 추가 재발급은 불가능하니 재분실에 유의해 주세요.'
  },
  en: {
    warning: 'A key card can be replaced only once. If you lose it again, no further replacement is available, so please keep it safe.',
    exhausted: 'You have lost the replacement key card. No further replacement is available. Please tell the operations team what happened through your booking-platform messages.',
    confirm: 'Have you already received a replacement key card after losing the original? Please confirm whether it is that replacement you have now lost.',
    received: 'You have received the replacement key card. No further replacement is available if it is lost again, so please keep it safe.',
    after: 'If you have already received one replacement, no further replacement is available. Please keep the card safe.'
  },
  ja: {
    warning: 'キーカードの再発行は1回のみです。再び紛失した場合は追加の再発行ができませんので、大切に保管してください。',
    exhausted: '再発行済みのキーカードを再び紛失されたのですね。追加の再発行はできません。予約サイトのメッセージで運営スタッフに現在の状況をお知らせください。',
    confirm: '紛失後、キーカードをすでに1回再発行してもらいましたか？今回紛失したのが再発行済みのカードか確認してください。',
    received: '新しいキーカードを受け取られたのですね。再び紛失した場合は追加の再発行ができませんので、ご注意ください。',
    after: 'すでに1回再発行を受けている場合、追加の再発行はできません。再紛失にご注意ください。'
  },
  zh: {
    warning: '房卡只能补办1次。如再次遗失，将无法再次补办，请妥善保管。',
    exhausted: '您再次遗失了已补办的房卡，无法再次补办。请通过预订平台消息向运营人员说明目前的情况。',
    confirm: '您遗失房卡后，是否已经补办过1次？请确认这次遗失的是不是补办后的房卡。',
    received: '您已领取补办的房卡。如再次遗失，将无法再次补办，请妥善保管。',
    after: '如果您已经补办过1次，就无法再次补办，请注意不要再次遗失。'
  },
  'zh-TW': {
    warning: '房卡只能補發1次。如再次遺失，將無法再次補發，請妥善保管。',
    exhausted: '您再次遺失了已補發的房卡，無法再次補發。請透過訂房平台訊息向營運人員說明目前的情況。',
    confirm: '您遺失房卡後，是否已經補發過1次？請確認這次遺失的是不是補發後的房卡。',
    received: '您已領取補發的房卡。如再次遺失，將無法再次補發，請妥善保管。',
    after: '如果您已經補發過1次，就無法再次補發，請注意不要再次遺失。'
  }
};

function keyCardContextReply(situation, language) {
  if (!situation.related) return null;
  const copy = COPY[language] || COPY.ko;
  if (situation.lostReplacement) return { stage: 'replacement-exhausted', answer: copy.exhausted };
  if (situation.ambiguousRepeat) return { stage: 'replacement-confirm', answer: copy.confirm };
  if (situation.receipt) return { stage: 'replacement-received', answer: copy.received };
  if (situation.replacementReceived) return { stage: 'replacement-warning', answer: copy.after };
  return null;
}

function withReplacementWarning(answer, language) {
  const warning = (COPY[language] || COPY.ko).warning;
  return answer.includes(warning) ? answer : `${answer}\n\n${warning}`;
}

module.exports = { keyCardSituation, keyCardContextReply, withReplacementWarning };
