// Routing hints, not a source of property facts. Uncertain/compound questions
// retain their original text and are answered by the model with the guide.
function normalizeStayText(value) {
  return String(value || "").normalize("NFKC").toLowerCase()
    .replace(/첵\s*크?\s*인|체크\s*잉|체킨/g, "체크인")
    .replace(/맏기|맞기|맡키/g, "맡기")
    .replace(/lug+age/g, "luggage")
    .replace(/\s+/g, " ").trim();
}

const BAG = /짐|가방|캐리어|케리어|트렁크|수하물|러기지|\b(?:luggage|baggage|suitcases?|bags?)\b|荷物|スーツケース|行李/iu;
const STORE = /보관|맡|두고|두어|둬도|놓고|놓아|놔두|놔둬|놔도|\b(?:stor\w*|keep|leave|leaving|drop|hold)\b|預|置い|保管|寄存|寄放|存放|存行李|行李.*放/iu;
const CHECKIN = /체크\s*인|입실|체크인|check[ -]?in|チェックイン|入住/iu;
const CHECKOUT = /체크\s*아웃|퇴실|check[ -]?out|チェックアウト|退房/iu;
const LOST = /분실|잃어|두고\s*(?:왔|나왔|갔)|놓고\s*(?:왔|나왔|갔)|없어졌|사라졌|\b(?:lost|forgot|forgotten|stolen|missing)\b|忘れ|紛失|なくした|遗失|遺失|丢|丟|忘了|不见|不見/iu;
const ACCESS = /비밀\s*번호|출입|문.*(?:열|안)|카드\s*키|키\s*카드|도어락|password|passcode|door|key.?card|暗証|パスワード|ドア|密码|密碼|房卡|开门|開門/iu;
const PUBLIC_STORAGE = /(?:공항|[가-힣]+역)\s*(?:에서|에|의|근처)?\s*(?:짐|가방|수하물|캐리어|보관|코인)|(?:짐|가방|수하물|캐리어).*(?:공항|[가-힣]+역)(?:에서|에|근처)|코인\s*(?:락커|라커)|(?:airport|station|terminal|coin).*(?:luggage|baggage|storage|locker)|(?:luggage|baggage|storage).*(?:airport|station|terminal)|(?:空港|駅).*(?:荷物|ロッカー)|(?:机场|機場|车站|車站).*(?:行李|寄存|寄放)/iu;
const OTHER_CHECKIN = /항공|비행기|항공사|탑승|airline|flight|boarding|online check|搭乗|航空|登机|登機|值机|值機/iu;
const EXTRA_DETAILS = /택배|배송|청소|수건|주차|조식|와이파이|분실|도난|파손|크기|사이즈|잠금|사물함|영수증|메일|메시지|객실\s*번호|방\s*번호|예약.*(?:안|없)|안\s*(?:돼|되|됨)|못|오류|고장|실패|환불|취소|parcel|deliver|clean|towel|park|breakfast|wifi|size|lock|receipt|email|message|room number|not work|cannot|can't|error|cancel|refund|宅配|駐車|朝食|サイズ|鍵|メール|できない|エラー|快递|快遞|停车|停車|尺寸|故障|不能|無法|邮件|郵件|消息|訊息/iu;
const BAG_SHOPPING = /구매|수선|수리|파는|사려|사요|살\s*(?:곳|수)|구입|buy|shop|repair|purchase|買|修理|买|购买|購買|维修|維修/iu;
const PUBLIC_TRAVEL = /(?:공항|[가-힣]+역|버스|택시|지하철).*(?:가는|가는법|가려|어떻|노선|시간표|추천)|(?:가는|가려|갈\s*때).*(?:공항|역)|(?:get|go|bus|train|taxi).*(?:airport|station)|(?:airport|station).*(?:route|directions|timetable)|(?:空港|駅).*(?:行き|アクセス)|(?:机场|機場|车站|車站).*(?:怎么|怎麼|交通)|(?:식당|맛집|약국|restaurant|pharmacy).*(?:추천|어디|recommend|where)/iu;
const EXTENDED_STORAGE = /모레|하룻밤|며칠|이틀|사흘|다음\s*날|다른\s*(?:호텔|숙소)|숙박\s*안|예약\s*없|\d+\s*(?:일간|박)|overnight|several days|next day|not staying|not a guest|another hotel|明後日|翌日|何日|数日|泊まら|后天|後天|隔天|几天|幾天|不住|未入住/iu;
const EARLY = /얼리|조기|일찍|이른|미리\s*(?:입실|체크)|early|アーリー|早め|早く|提前|提早/iu;
const LATE = /늦|밤|새벽|자정|late|midnight|夜|深夜|遅|晚|凌晨/iu;
const METHOD = /방법|어떻|어케|어디서|절차|하는\s*법|키오스크|셀프|how|kiosk|procedure|どう|方法|手続|怎么|怎麼|如何|自助/iu;
const TIME = /몇\s*시|언제|시간|when|what time|何時|いつ|几点|幾點|时间|時間/iu;
const FOLLOWUP = /^(?:그럼|그러면|그거|거기|그건|그리고|아|그럼요|so|then|and|それ|では|那)?\s*(?:어디.*|몇\s*시.*|언제.*|얼마.*|무료.*|돈.*|비용.*|어케.*|어떻게.*|일찍.*|늦게.*|새벽.*|아침.*|밤.*|모레.*|다음\s*날.*|\d+\s*시.*|where.*|until when.*|how much.*|free.*|what time.*|earlier.*|later.*|overnight.*|どこ.*|何時.*|無料.*|翌日.*|哪里.*|哪裡.*|几点.*|幾點.*|免费.*|免費.*|隔天.*)[?？!.。\s]*$/iu;

function analyzeStayQuestion(message, history = []) {
  const text = normalizeStayText(message);
  const compact = text.replace(/[^\p{L}\p{N}]/gu, "");
  let bag = BAG.test(text);
  let checkin = CHECKIN.test(text);
  if (!checkin && !/공항|airport|空港|机场|機場/iu.test(text)) {
    checkin = /(?:일찍|몇\s*시부터).*(?:들어|들가)|(?:밤|새벽|자정|아침|오전|오후|\d+\s*시).{0,12}도착|(?:late|early|midnight).{0,16}arriv|arriv.{0,16}(?:late|early|midnight)|夜.*到着|早く.*到着|凌晨.*到|晚上.*到/iu.test(text);
  }
  let checkout = CHECKOUT.test(text);
  let followup = false;
  // Only inherit an immediately continuing topic. A new topic terminates it.
  if (!bag && !checkin && !checkout && FOLLOWUP.test(text)) {
    const users = history.filter(item => item?.role === "user");
    const previous = users.at(-1);
    const prior = previous && analyzeStayQuestion(previous.content || previous.text, users.slice(0, -1));
    if (prior && ["luggage", "checkin"].includes(prior.topic)) {
      bag = prior.topic === "luggage";
      checkin = prior.topic === "checkin";
      followup = true;
    }
  }
  if (PUBLIC_STORAGE.test(text) || OTHER_CHECKIN.test(text)) return null;
  if (bag && BAG_SHOPPING.test(text)) return null;
  const publicTravel = PUBLIC_TRAVEL.test(text);
  if (publicTravel && !STORE.test(text) && !checkin) return null;
  if (bag && LOST.test(text)) return { id: "lost-property", topic: "rules", route: "rules", needsModel: true };
  const bareBag = /^(?:짐|가방|캐리어|케리어|트렁크|수하물|러기지룸|luggage|baggage|suitcase|bags?|荷物|スーツケース|行李(?:箱)?)(?:좀|만)?(?:요|여|은요|는요|이요|있나요|가능|가능해요|가능한가요|보관|보관가능|보관되나요)?$/iu.test(compact);
  const storage = bag && (STORE.test(text) || bareBag || followup || /(?:짐|가방|캐리어|수하물).*(?:어디|언제|몇\s*시|무료|얼마|비용)|(?:where|when|free|cost).*(?:luggage|bags?)|荷物.*(?:どこ|何時)|行李.*(?:哪里|哪裡|几点|幾點|费用|費用)/iu.test(text));
  if (bag && !storage && !checkin && !checkout) return { id: "luggage", topic: "luggage", route: "checkin", needsModel: true };
  if (!storage && !checkin && !checkout) return null;
  const access = ACCESS.test(text);
  const compound = storage && /(?:체크\s*인|입실).*(?:방법|몇\s*시|언제|어떻게)|(?:check.?in).*(?:how|time)|how.*check.?in|チェックイン.*(?:方法|何時)|入住.*(?:时间|時間|方法)/iu.test(text);
  let id = storage ? (access ? "luggage-access" : compound ? "checkin-luggage" : "luggage")
    : checkout && !checkin ? "checkout-method"
    : EARLY.test(text) ? "early-checkin"
    : LATE.test(text) ? "late-checkin"
    : METHOD.test(text) ? "checkin-method" : "checkin-checkout-time";
  const numericArrival = checkin && /\d|한\s*시|두\s*시|세\s*시|오전|아침|noon|morning|午前|朝|上午|中午/iu.test(text);
  // Fast check-in replies are limited to a bare topic/time request. Other nouns
  // (e.g. "check-in + towels") must not be discarded by a generic time answer.
  const basicCheckin = compact.replace(/체크인|입실|시간|언제|몇시|부터|까지|가능|한가요|인가요|이야|이에요|예요|알려|주세요|해줘|좀|요|임|checkin|whattime|time|when|please|pls|is|チェックイン|何時|いつ|ですか|から|まで|入住|几点|幾點|时间|時間|可以|吗|嗎|呢/gu, "") === "";
  const needsModel = publicTravel || access || compound || EXTRA_DETAILS.test(text) || /배달|물건.*받아/iu.test(text) || (storage && EXTENDED_STORAGE.test(text))
    || text.length > 110 || numericArrival || (checkout && !storage)
    || (storage && /(?:얼리|early|提前|提早)/iu.test(text))
    || /그리고|또한|및|그런데|않|말고|아니|안\s*(?:맡|하)|instead|rather|don't|それと|另外|還有|还有/iu.test(text)
    || (id === "checkin-checkout-time" && !basicCheckin);
  return { id, topic: storage ? "luggage" : "checkin", route: "checkin", needsModel, followup,
    allowPublicSearch: publicTravel,
    simpleCheckin: checkin && !storage && !needsModel && basicCheckin && id === "checkin-checkout-time",
    asksTime: TIME.test(text) };
}

module.exports = { analyzeStayQuestion, normalizeStayText };
