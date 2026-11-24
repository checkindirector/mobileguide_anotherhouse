// Approved operations, not reservation-system actions. No guest identity or
// credential is embedded here. The common entrance code is supplied by server env.
const { normalizeGuestLanguage, propertyQuestionHint, hasMultipleGuestQuestions } = require('./guest-language.cjs');
const { reportingIntent } = require('./report-intent.cjs');
const { analyzeStayQuestion } = require('./stay-intent.cjs');

const COPY = {
  ko: {
    method: '입구 키오스크에서 예약자 이름 또는 예약번호를 입력하면 객실키가 발급됩니다. 예약번호는 바우처에 표시된 예약번호 끝 4자리를 이용해주세요. ★ 카드키는 재발급되지 않습니다, 분실에 유의하십시오. 예약자 이름은 예약한 이름 그대로 입력해주세요.',
    time: '체크인은 오후 3시부터 가능합니다. 오후 3시 이후에는 키오스크를 이용해 언제든지 비대면 체크인할 수 있습니다.',
    checkout: '체크아웃은 오전 11시까지입니다.',
    entrance: code => `카드키 없이 공용 출입구에 들어가야 할 경우 입구 왼쪽 기기에 ${code} → ENT를 입력해주세요. 공용 출입구용이며 객실 문을 여는 번호가 아닙니다.`,
    missingCode: '입장 안내 메시지를 받지 못하셨다면, 다음의 공용 출입·셀프 체크인 절차를 이용해주세요.',
    contact: '숙소에는 예약한 채널의 메시지로 연락해주세요. 직원 응대시간은 09:00~18:00이며 시간 외에는 바로 답변받기 어려울 수 있습니다.',
    noAction: '이 AI 채팅에서는 예약 조회나 안내 메시지 재발송, 직원에게 문의 전달을 직접 처리할 수 없습니다.',
    details: '예약 확인은 운영팀이 진행합니다. 예약자 이름·예약 채널·체크인 날짜를 예약한 채널의 메시지로 보내주세요.',
    unavailableCode: '현재 공용 출입번호를 확인할 수 없습니다. 예약한 채널의 메시지로 숙소에 출입 상황을 알려주세요.',
    toolHours: '방금 문의하신 비품의 사용 가능 시간이 궁금하신가요? 현재 승인된 안내에는 해당 비품의 이용시간 제한이 명시되어 있지 않습니다. 확인이 필요하면 예약한 채널의 메시지로 숙소에 문의해주세요.',
    dining: '객실이 협소해 별도 테이블이 없는 경우 음식은 공용주방 라운지 테이블을 이용해주세요. 식기 사용 후에는 설거지 후 제자리에 놓아주세요. 객실 내 식사나 음식 배달의 허용 범위는 현재 승인된 안내에 명시되어 있지 않아 예약한 채널의 메시지로 숙소에 확인해주세요.',
    wifiIssue: 'Wi-Fi 이름은 another입니다. 목록에 네트워크가 보이지 않는지, 표시되지만 연결이 안 되는지 알려주세요. 연결 문제가 계속되면 예약한 채널의 메시지로 숙소에 현재 상황을 알려주세요.'
  },
  en: {
    method: 'At the entrance kiosk, enter the reservation name or booking number to receive your room key card. Use the last four digits of the booking number on your voucher. Key cards cannot be reissued, so please take care not to lose yours. Enter the name exactly as it appears on the reservation.',
    time: 'Check-in starts at 15:00. After 15:00 on your booked check-in day, you can check in at any time using the self-service kiosk.',
    checkout: 'Check-out is by 11:00 AM.',
    entrance: code => `To enter the shared entrance without a key card, enter ${code} → ENT on the device to the left of the entrance. This opens the shared entrance, not your room door.`,
    missingCode: 'If you have not received the entry instructions, use the following shared-entrance and self-check-in steps.',
    contact: 'Contact the property through the messaging service of the channel you booked with. Staff respond from 09:00 to 18:00; an immediate reply outside those hours may not be available.',
    noAction: 'This AI chat cannot look up your reservation, resend check-in messages, or forward a request to staff.',
    details: 'The operations team handles reservation checks. Send your reservation name, booking channel and check-in date through your booking-channel messages.',
    unavailableCode: 'The shared entrance code is not available here right now. Tell the property about your access problem through your booking-channel messages.',
    toolHours: 'Are you asking about the usage hours of the item you just mentioned? The approved guide does not specify a time limit for that item. Please ask the property through your booking-channel messages if you need confirmation.',
    dining: 'If your room is small and has no separate table, use the shared kitchen lounge tables for meals. Wash used dishes and return them to their places. The approved guide does not specify whether eating in the room or food delivery is allowed; please confirm through your booking-channel messages.',
    wifiIssue: 'The Wi-Fi network name is another. Is it missing from your network list, or is it visible but you cannot connect? If the problem continues, tell the property what is happening through your booking-channel messages.'
  },
  ja: {
    method: '入口のキオスクで予約者名または予約番号を入力すると客室キーが発行されます。予約番号はバウチャーに記載された予約番号の下4桁をご利用ください。キーカードは再発行できませんので、紛失にご注意ください。予約者名は予約時の表記どおりに入力してください。',
    time: 'チェックインは15:00からです。ご予約のチェックイン日の15:00以降は、キオスクでいつでもセルフチェックインできます。',
    checkout: 'チェックアウトは午前11:00までです。',
    entrance: code => `キーカードなしで共用入口に入る場合は、入口左側の機器に ${code} → ENT と入力してください。共用入口用であり、客室のドアを開ける暗証番号ではありません。`,
    missingCode: '入館案内のメッセージが届いていない場合は、次の共用入口・セルフチェックインの手順をご利用ください。',
    contact: '宿へのご連絡は予約サイトのメッセージをご利用ください。スタッフ対応時間は09:00〜18:00です。時間外はすぐに返信できない場合があります。',
    noAction: 'このAIチャットでは予約の照会、案内メッセージの再送、スタッフへの問い合わせの転送はできません。',
    details: '予約の確認は運営スタッフが行います。予約者名・予約サイト・チェックイン日を予約サイトのメッセージでお送りください。',
    unavailableCode: '現在、このチャットでは共用入口の暗証番号を確認できません。予約サイトのメッセージで宿へ入館の状況をお知らせください。',
    toolHours: '先ほどの備品を何時まで使えるか、というご質問でしょうか。承認済みの案内には、その備品の利用時間の制限は記載されていません。確認が必要な場合は予約サイトのメッセージで宿へお問い合わせください。',
    dining: '客室が狭く専用テーブルがない場合は、共用キッチンのラウンジテーブルでお食事ください。使用した食器は洗って元の場所へ戻してください。客室内での食事や料理の配達の可否は承認済みの案内に明記されていないため、予約サイトのメッセージで宿へご確認ください。',
    wifiIssue: 'Wi-Fi名はanotherです。一覧に表示されないのか、表示されるものの接続できないのかを教えてください。問題が続く場合は予約サイトのメッセージで宿へ状況をお知らせください。'
  },
  zh: {
    method: '在入口自助机输入预订姓名或预订编号，即可领取房卡。请使用凭证上预订编号的后4位数字，姓名请按预订时的原样输入。房卡无法补发，请妥善保管，避免遗失。',
    time: '入住时间为15:00起。在预订入住日的15:00之后，可随时通过自助机办理入住。',
    checkout: '请在上午11:00前退房。',
    entrance: code => `没有房卡时，请在公共入口左侧的设备输入 ${code} → ENT。这是公共入口密码，不能用于打开客房门。`,
    missingCode: '如果尚未收到入馆指引消息，请按以下公共入口及自助入住步骤操作。',
    contact: '请通过预订平台的消息功能联系住宿方。工作人员回复时间为09:00–18:00，其他时间可能无法立即回复。',
    noAction: '此AI聊天无法直接查询您的预订、重新发送入住消息或将咨询转交工作人员。',
    details: '预订核查由运营人员处理。请通过预订平台消息发送预订姓名、预订平台和入住日期。',
    unavailableCode: '目前此聊天无法确认公共入口密码。请通过预订平台消息告知住宿方您遇到的入馆问题。',
    toolHours: '您是想问刚才提到的用品可以使用到几点吗？已批准的指南没有注明该用品的使用时段限制。如需确认，请通过预订平台消息咨询住宿方。',
    dining: '如果客房较小且没有独立餐桌，请在公共厨房休息区的餐桌用餐。使用后请清洗餐具并放回原位。已批准的指南未注明是否允许在客房用餐或接收外卖，请通过预订平台消息向住宿方确认。',
    wifiIssue: 'Wi-Fi名称是another。请问是列表中找不到该网络，还是可以看到但无法连接？如果问题持续，请通过预订平台消息向住宿方说明情况。'
  },
  'zh-TW': {
    method: '在入口自助機輸入訂房姓名或訂房編號，即可領取房卡。請使用憑證上訂房編號的後4位數字，姓名請按訂房時的原樣輸入。房卡無法補發，請妥善保管，避免遺失。',
    time: '入住時間為15:00起。在預訂入住日的15:00之後，可隨時透過自助機辦理入住。',
    checkout: '請在上午11:00前退房。',
    entrance: code => `沒有房卡時，請在公共入口左側的設備輸入 ${code} → ENT。這是公共入口密碼，不能用來開啟客房門。`,
    missingCode: '如果尚未收到入館指引訊息，請按以下公共入口及自助入住步驟操作。',
    contact: '請透過訂房平台的訊息功能聯絡住宿方。工作人員回覆時間為09:00–18:00，其他時間可能無法立即回覆。',
    noAction: '此AI聊天無法直接查詢您的訂房、重新寄送入住訊息或將詢問轉交工作人員。',
    details: '訂房核查由營運人員處理。請透過訂房平台訊息傳送訂房姓名、訂房平台及入住日期。',
    unavailableCode: '目前此聊天無法確認公共入口密碼。請透過訂房平台訊息告知住宿方您遇到的入館問題。',
    toolHours: '您是想問剛才提到的用品可以使用到幾點嗎？已核准的指南沒有註明該用品的使用時段限制。如需確認，請透過訂房平台訊息詢問住宿方。',
    dining: '如果客房較小且沒有獨立餐桌，請在公共廚房休息區的餐桌用餐。使用後請清洗餐具並放回原位。已核准的指南未註明是否允許在客房用餐或接收外送，請透過訂房平台訊息向住宿方確認。',
    wifiIssue: 'Wi-Fi名稱是another。請問是清單中找不到該網路，還是看得到但無法連線？如果問題持續，請透過訂房平台訊息向住宿方說明情況。'
  }
};

const ENTRY = /출입|입장|현관|입구|입실.*코드|(?:entry|entrance|access).{0,15}(?:code|password)|入館|入室.*(?:コード|暗証)|入口.*(?:暗証|コード)|门禁|門禁|入馆|入館|入口.*(?:密码|密碼)/iu;
const MISSING = /안\s*(?:왔|와|받)|못\s*받|받지\s*못|없|미수신|not.{0,15}(?:receiv|sent)|haven.t.{0,10}receiv|missing|didn.t.{0,10}(?:get|receiv)|届(?:いていない|いていません|かない|きません|かなかった|いてない)|知らせ[られ]*てい(?:ない|ません)|知ら.{0,8}(?:ない|ません)|教えて.{0,8}(?:ない|ません)|未收到|没收到|沒收到|没有收到|沒有收到|未告知|没告知|沒告知|没有告知|沒有告知/iu;
const NO_REPLY = /답(?:장|변)?.{0,6}(?:없|안)|연락.{0,6}(?:안|없)|응답.{0,6}없|no\s*(?:reply|response|answer)|not\s*(?:reply|answer)|(?:返事|返信|応答).{0,6}(?:な|ありません)|没人回复|沒人回覆|没有回复|沒有回覆|没回应|沒回應/iu;
const CONTACT = /전화\s*번호|연락처|이메일\s*(?:주소)?|메일\s*주소|(?:host|owner|property).{0,20}(?:phone|email|contact)|(?:phone\s*number|email\s*address)|電話番号|連絡先|メールアドレス|房东.*(?:电话|邮箱)|房東.*(?:電話|信箱)|电话号码|電話號碼|电子邮箱|電子郵件地址/iu;
const EXTERNAL = /약국|식당|카페|주변|근처|공항|pharmacy|restaurant|cafe|nearby|airport|薬局|レストラン|カフェ|空港|药店|藥局|餐厅|餐廳|附近|机场|機場/iu;
const BOOKING = /예약|예약자|booking|reservation|agoda|booking.com|trip.com|airbnb|予約|预订|預訂|訂房/iu;
const CHECKIN_MESSAGE = /(?:체크인|입실).{0,12}(?:메시지|안내)|check.?in.{0,15}(?:message|instructions)|チェックイン.{0,12}(?:案内|メッセージ)|入住.{0,12}(?:消息|訊息|指引)/iu;
const BOOKING_CONFIRMATION = /예약.{0,12}(?:확인|메일)|확인\s*메일|(?:booking|reservation).{0,12}(?:confirmation|email)|予約確認|确认(?:邮件|预订)|確認(?:郵件|訂房)/iu;
const TIME = /몇\s*시|언제|이용\s*시간|사용\s*시간|what\s*time|how\s*late|until\s*when|usage\s*hours|何時|いつまで|几点|幾點|使用时间|使用時間/iu;
const SHORT_TIME = /^(?:그럼|그러면|그거|이거|so|then|it|that|それ|では|那|这个|這個)?\s*(?:몇\s*시.*|언제까지.*|what\s*time.*|how\s*late.*|until\s*(?:when|what\s*time).*|何時.*|いつまで.*|几点.*|幾點.*|能用到几点.*|可以用到幾點.*)[?？.!。\s]*$/iu;
const HAIR_TOOL = /드라이[기어]|고데기|hair\s*dryer|blow\s*dryer|straightener|ドライヤー|ヘアアイロン|吹风机|吹風機|直发器|直髮器/iu;
const WIFI_ISSUE = /안\s*(?:보|떠|잡|되|돼)|없(?:어|네|는데)|목록|연결.*(?:안|못)|고장|can.t|cannot|not\s*(?:see|connect|work|show)|missing|doesn.t|表示されない|見つから|繋がら|つながら|接続できない|找不到|看不到|无法连接|無法連線|不能连接|不能連線/iu;
const WIFI = /와이파이|wi[ -]?fi|無線LAN|无线网|無線網/iu;
const ROOM_DINING = /(?:방|객실).{0,10}(?:식사|먹)|(?:eat|food|dine).{0,18}(?:room)|(?:room).{0,18}(?:eat|food|dine)|部屋.{0,12}(?:食事|食べ)|房(?:间|間|内|內)?.{0,12}(?:吃|用餐)/iu;
const BARE_ENTRY_CODE = /^(?:(?:공용|공동)?(?:현관|출입구|입구|출입)(?:의)?(?:비번|비밀번호|코드)(?:알려주세요|알려줘|뭐야|뭐예요)?|(?:shared)?(?:entry|entrance|access)(?:code|password)(?:please)?|(?:共用|共同)?(?:入口|玄関|入館)(?:の)?(?:暗証番号|コード|パスワード)(?:を教えてください|は何ですか)?|(?:公共)?(?:入口|门禁|門禁|入馆|入館)(?:密码|密碼|码|碼)(?:是多少)?)$/iu;
const CLARIFY = {
  ko: {key:'카드키를 분실하셨나요, 객실 안에 두고 나오셨나요, 아니면 작동하지 않나요?',mail:'숙소의 이메일 주소가 필요하신가요, 예약 확인 메일을 받지 못하신 건가요?'},
  en: {key:'Is your key card lost, left inside the room, or not working?',mail:'Do you need the property email address, or have you not received a booking confirmation email?'},
  ja: {key:'キーカードの紛失、客室内への置き忘れ、作動不良のどれでしょうか。',mail:'宿のメールアドレスが必要ですか。それとも予約確認メールが届いていませんか。'},
  zh: {key:'请问是房卡遗失、留在客房内，还是无法使用？',mail:'您是需要住宿方的电子邮箱，还是尚未收到预订确认邮件？'},
  'zh-TW': {key:'請問是房卡遺失、留在客房內，還是無法使用？',mail:'您是需要住宿方的電子信箱，還是尚未收到訂房確認郵件？'}
};

function supportReply(message, history = [], language = 'ko', code = null) {
  const text = normalizeGuestLanguage(message), copy = COPY[language] || COPY.ko;
  const users = history.filter(x => x.role === 'user');
  const previous = normalizeGuestLanguage(users.at(-1)?.content || '');
  const hints = propertyQuestionHint(message);
  const clarify = CLARIFY[language] || CLARIFY.ko;
  if (/^(?:카드키|key\s*card|キーカード|房卡)\s*(?:문제|problem|問題|问题|有问题|有問題)[?？.!。\s]*$/iu.test(text)) return { answer:clarify.key+'\n\n'+copy.contact, route:'checkin', intent:'key-card-clarification' };
  if (/^(?:메일|e-?mail|メール|邮件|郵件|電子郵件)[?？.!。\s]*$/iu.test(text)) return {answer:clarify.mail, route:'home', intent:'contact-clarification'};
  let priorEntry = false;
  for (const user of users.slice(-4).reverse()) {
    const prior = normalizeGuestLanguage(user.content);
    const topic = propertyQuestionHint(prior);
    if (topic?.topics.some(x => !['checkin','key','booking','contact','address','rooms'].includes(x)) || EXTERNAL.test(prior)) break;
    if (ENTRY.test(prior) || CHECKIN_MESSAGE.test(prior)) { priorEntry = true; break; }
    if (!BOOKING.test(prior) && !NO_REPLY.test(prior)) break;
  }
  const unrelated = hints?.topics.some(x => !['checkin','key','booking','contact','address','rooms'].includes(x));
  if (CONTACT.test(text) && !EXTERNAL.test(text) && !hasMultipleGuestQuestions(message)) {
    return { answer: copy.contact, route: 'home', intent: 'contact' };
  }
  const missingEntry = (ENTRY.test(text) || CHECKIN_MESSAGE.test(text)) && MISSING.test(text);
  if (BARE_ENTRY_CODE.test(text.replace(/[\s\p{P}\p{S}]/gu,''))) return {answer:code?copy.entrance(code):copy.unavailableCode,route:'checkin',intent:'shared-entrance-code',sourceRows:[8]};
  if (!unrelated && !EXTERNAL.test(text) && !hasMultipleGuestQuestions(message) && (missingEntry || (priorEntry && (NO_REPLY.test(text) || BOOKING.test(text))))) {
    return { answer: [missingEntry ? copy.missingCode : copy.noAction, code ? copy.entrance(code) : copy.unavailableCode, copy.time, copy.method, copy.contact].join('\n\n'), route: 'checkin', intent: 'entry-instructions', sourceRows: [3,4,8,31] };
  }
  if (BOOKING_CONFIRMATION.test(text) && !hasMultipleGuestQuestions(message)) {
    return { answer: [copy.details, copy.noAction, copy.contact].join('\n\n'), route: 'checkin', intent: 'booking-confirmation', sourceRows: [31,34] };
  }
  if (EXTERNAL.test(text) || hasMultipleGuestQuestions(message)) return null;
  if (WIFI.test(text) && WIFI_ISSUE.test(text)) return { answer: copy.wifiIssue, route: 'wifi', intent: 'wifi-troubleshooting' };
  // Only inherit the immediately previous guest's facility, never an old topic
  // across a new subject or an assistant's guess. Do not fabricate usage hours.
  if (TIME.test(text) && ((HAIR_TOOL.test(text)) || (SHORT_TIME.test(text) && HAIR_TOOL.test(previous)))) {
    return { answer: copy.toolHours, route: 'appliances', intent: 'amenity-hours' };
  }
  if (ROOM_DINING.test(text) && !hints?.topics.some(x=>!['dining','rooms','rules','kitchen'].includes(x))) return { answer: copy.dining, route: 'rules', intent: 'room-dining', sourceRows: [22] };
  const intent = reportingIntent(message, '');
  if (intent === 'checkout-time') return { answer: copy.checkout, route: 'checkin', intent };
  if (intent === 'checkin-method') return { answer: copy.method, route: 'checkin', intent, sourceRows: [4] };
  if (analyzeStayQuestion(message)?.simpleCheckin) {
    const warning={ko:'★ 카드키는 재발급되지 않습니다, 분실에 유의하십시오.',en:'Key cards cannot be reissued, so please take care not to lose yours.',ja:'キーカードは再発行できませんので、紛失にご注意ください。',zh:'房卡无法补发，请妥善保管，避免遗失。','zh-TW':'房卡無法補發，請妥善保管，避免遺失。'};
    return { answer: copy.time+' '+warning[language], route: 'checkin', intent: 'checkin-checkout-time', sourceRows: [3] };
  }
  return null;
}

module.exports = { supportReply, COPY };
