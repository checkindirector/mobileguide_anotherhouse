// Synonyms identify evidence to read; they are never permission to invent a
// facility or to return a whole topic's answer to a more specific question.
function normalizeGuestLanguage(value) {
  return String(value || "").normalize("NFKC").toLowerCase()
    .replace(/(?:객실|룸|방|출입)\s*(?:카드\s*키|키|열쇠)|카드\s*키|키\s*카드/g, "카드키")
    .replace(/\b(?:room|hotel|door|access)\s*[- ]?\s*(?:key\s*card|keys?)\b|\bkeycard\b/g, "key card")
    .replace(/ルームキー|ルームカード|カードキー|(?:部屋|客室)の(?:鍵|キー)/g, "キーカード")
    .replace(/(?:房间|房間|客房)(?:钥匙|鑰匙)|门卡|門卡|房门卡|房門卡/g, "房卡")
    .replace(/첵\s*크?\s*인|체크\s*잉|체킨|체크\s*인/g, "체크인")
    .replace(/첵\s*크?\s*아웃|체크\s*아웃/g, "체크아웃")
    .replace(/입\s*실|입\s*주\s*수속/g, "체크인")
    .replace(/퇴\s*실/g, "체크아웃")
    .replace(/맏기|맞기|맡키/g, "맡기")
    .replace(/케리어|캐리여/g, "캐리어")
    .replace(/\b(?:che+ck|chek|chck)[ -]?in\b/g, "check-in")
    .replace(/\b(?:che+ck|chek|chck)[ -]?out\b/g, "check-out")
    .replace(/lug+age|lugg?ege/g, "luggage")
    .replace(/와\s*이\s*파\s*이|와이파이이/g, "와이파이")
    .replace(/\s+/g, " ").trim();
}

const KEY = /카드키|열쇠|(?<![a-z])keys?(?![a-z])|キーカード|鍵|房卡|钥匙|鑰匙/iu;
const NON_ROOM_KEY = /차\s*키|자동차\s*(?:키|열쇠)|집\s*열쇠|자전거\s*열쇠|car\s*keys?|house\s*keys?|bike\s*keys?|車の鍵|家の鍵|车钥匙|車鑰匙/iu;
const KEY_PROBLEM = /분실|잃|잊|놓고|두고|없어|없음|없는데|없어요|없습니다|잃어버|안\s*열|잠겼|먹통|작동.*안|재발급|오반납|잘못.*반납|lost|missing|misplaced|forgot|left|locked|not\s*work|doesn.t\s*work|紛失|忘れ|なくし|無くし|失くし|置き忘れ|置い|部屋.{0,12}(?:置|残)|閉め出|開かない|遺失|遗失|丢|丟|不见|不見|忘带|忘帶|没带|沒帶|忘在|留在|放在|锁在|鎖在/iu;
function isRoomKeyProblem(value) {
  const text = normalizeGuestLanguage(value);
  if (NON_ROOM_KEY.test(text) && !/카드키|key card|キーカード|房卡/iu.test(text)) return false;
  if (/분실\s*(?:아니|안\s*했)|안\s*잃|not\s*lost|didn.t\s*lose|紛失していない|没有丢|沒有丟/iu.test(text)) return false;
  return KEY.test(text) && KEY_PROBLEM.test(text);
}

// All workbook subjects plus the site's remaining facilities. Route hints are
// multilingual and deliberately do not choose an answer from a noun alone.
const TOPICS = [
  ["checkin", "checkin", /체크인|얼리|일찍.*(?:도착|들어)|늦게.*도착|입장\s*수속|키오스크|입실|check.?in|early arrival|late arrival|arrival time|チェックイン|アーリー|到着.*(?:遅|早)|入住|办理入住|辦理入住|入住(?:手续|手續|登记|登記)|提前入住|提早入住/iu],
  ["checkout", "checkin", /체크아웃|퇴실|퇴숙|check.?out|late\s*check.?out|departure time|チェックアウト|退房|延迟退房|延遲退房/iu],
  ["luggage", "checkin", /짐|수하물|캐리어|가방|트렁크|러기지|luggage|baggage|suitcase|\bbags?\b|荷物|スーツケース|キャリーケース|バッグ|行李|行李箱|存包/iu],
  ["key", "checkin", KEY],
  ["booking", "checkin", /예약|바우처|확인\s*메일|컨펌|booking|reservation|voucher|confirmation|予約|確認メール|预订|預訂|訂房|确认邮件|確認郵件/iu],
  ["extension", "checkin", /연박|연장|하루\s*더|더\s*(?:묵|머물)|extend.*stay|stay.*longer|another night|extra night|連泊|延泊|もう一泊|续住|續住|多住一晚/iu],
  ["parking", "checkin", /주차|차\s*(?:대|댈|세워)|parking|駐車|停车|停車/iu],
  ["contact", "home", /연락처|전화번호|이메일|호스트|직원|프런트|프론트|리셉션|contact|phone\s*number|e-?mail|reception|front desk|host|スタッフ|連絡先|電話番号|フロント|联系|聯絡|电话号码|電話號碼|前台|櫃台/iu],
  ["address", "transport", /주소|우편\s*번호|출구|건물|몇\s*층|address|postcode|postal\s*code|zip.?code|entrance|which\s*floor|住所|郵便番号|入口|何階|地址|邮编|郵遞區號|入口|几楼|幾樓/iu],
  ["airport", "transport", /공항|리무진|셔틀|airport|limousine|shuttle|空港|机场|機場/iu],
  ["rooms", "gallery", /객실|방\s*(?:종류|크기)|몇\s*명|싱글|더블|room|single|double|客室|シングル|ダブル|房型|单人房|單人房|双人房|雙人房/iu],
  ["women", "gallery", /여성|여자|남성|남자|남친|남편|여친|여성전용|women|female|ladies|male|men\s*allowed|husband|boyfriend|女性|女性専用|男性|男の人|男生|女生|女士专用|女士專用/iu],
  ["bathroom", "gallery", /욕실|화장실|샤워|씻|bathroom|restroom|toilet|shower|風呂|浴室|トイレ|シャワー|浴室|卫生间|洗手間|淋浴/iu],
  ["kitchen", "appliances", /주방|취사|조리|요리|키친|kitchen|cook|prepare\s*food|キッチン|自炊|料理|厨房|廚房|做饭|做飯|煮东西|煮東西/iu],
  ["amenities", "appliances", /비품|물품|구비|어메니티|어메너티|게스트\s*박스|공용\s*용품|amenities|supplies|guest\s*box|備品|アメニティ|ゲストボックス|用品|备品|備品|客用品/iu],
  ["refrigerator", "appliances", /냉장|냉동|fridge|refrigerator|冷蔵|冷凍|冰箱/iu],
  ["toiletries", "appliances", /세면|칫솔|치약|샴푸|린스|바디\s*워시|비누|덴탈|toiletr|toothbrush|toothpaste|shampoo|conditioner|body\s*wash|soap|歯ブラシ|歯磨き|シャンプー|コンディショナー|洗面用品|牙刷|牙膏|洗发|洗髮|护发素|護髮素|洗漱用品/iu],
  ["towels", "appliances", /수건|타올|타월|towels?|bath\s*towel|face\s*towel|タオル|バスタオル|フェイスタオル|毛巾|浴巾/iu],
  ["hair-tools", "appliances", /드라이[기어]|머리\s*말|고데기|헤어|hair\s*(?:dryer|drier|straightener|iron)|blow\s*dryer|ドライヤー|ヘアアイロン|コテ|吹风|吹風|直发|直髮|离子夹|離子夾/iu],
  ["electric-items", "appliances", /충전|어댑터|아답터|돼지코|콘센트|슬리퍼|옷걸이|다리미|보드게임|charger|adapter|adaptor|socket|slippers?|hanger|充電|変換|充电|轉接|转接/iu],
  ["climate", "appliances", /냉방|난방|에어컨|춥|추워|추운데|더워|더운데|보일러|air.?con|heating|too cold|too hot|エアコン|寒い|暑い|空调|空調|暖气|暖氣/iu],
  ["tv", "appliances", /티비|티브이|텔레비|\btv\b|넷플|ott|television|netflix|streaming|テレビ|ネットフリックス|电视|電視|奈飞|Netflix/iu],
  ["laundry", "laundry", /세탁|빨래|건조|세제|섬유\s*유연제|laundry|wash.*clothes|washing machine|washer|detergent|fabric\s*softener|tumble\s*dryer|洗濯|洗濯機|乾燥機|洗剤|柔軟剤|洗衣|洗衣机|洗衣機|烘干|烘乾|洗衣液|柔顺剂|柔順劑/iu],
  ["wifi", "wifi", /와이파이|인터넷|wi.?fi|internet|network\s*password|ネット|無線LAN|无线|無線|网络|網路/iu],
  ["parcel", "rules", /택배|배송|배달|소포|우편물|대리\s*수령|parcel|package|deliver|宅配|荷受|快递|快遞|包裹|代收/iu],
  ["cleaning", "rules", /청소|룸\s*클리닝|하우스\s*키핑|정돈|청결|housekeeping|clean.*room|room.*clean|掃除|清掃|打扫|打掃|清洁|清潔/iu],
  ["lost-property", "rules", /분실물|유실물|깜빡|두고\s*(?:왔|나왔|갔)|놓고\s*(?:왔|갔)|잃어|lost\s*(?:item|property)|left\s*(?:something|my)|forgot|忘れ物|置き忘れ|失く|丢|丟|遺失物|遗失物|忘了东西|忘了東西/iu],
  ["dining", "rules", /방.*(?:먹|식사)|객실.*(?:먹|식사)|eat.*room|dining.*room|部屋.*食|房.*吃/iu],
  ["rules", "rules", /규칙|흡연|담배|금연|소음|시끄|파티|반려|강아지|고양이|미성년|외부인|방문객|rules|smok|noise|party|pets?|visitor|喫煙|騒音|ペット|吸烟|吸菸|宠物|寵物/iu],
  ["waste", "trash", /쓰레기|분리\s*(?:수거|배출)|재활용|trash|garbage|recycl|ごみ|ゴミ|垃圾|回收/iu],
];

function propertyQuestionHint(message) {
  const text = normalizeGuestLanguage(message);
  // Shopping, third-party storage and airline check-in aren't house policies.
  if (/공항.*체크인|항공.*체크인|(?:airline|airport).*check.?in|(?:空港|机场|機場).*(?:チェックイン|入住|登机|登機|值机|值機)|(?:공항|[가-힣]+역).*짐.*보관|(?:airport|station).*luggage|(?:구매|파는\s*곳|수리점|repair shop|where.*buy)/iu.test(text)) return null;
  const matches = TOPICS.filter(([, , pattern]) => pattern.test(text));
  if (!matches.length) return null;
  return { route: matches[0][1], routes: [...new Set(matches.map(item => item[1]))], topics: matches.map(item => item[0]) };
}

function hasMultipleGuestQuestions(message) {
  if (/(?:드라이[기어]|hair dryer|ドライヤー|吹风|吹風)/iu.test(message) && /고데기|straightener|アイロン|直发|直髮/iu.test(message)) return true;
  return propertyQuestionHint(message)?.topics.length > 1 && /그리고|하고|맡기고|랑|또한|\s및\s|\band\b|それと|と.*(?:あります|できます)|還有|还有|以及|另外/iu.test(message);
}

module.exports = { normalizeGuestLanguage, isRoomKeyProblem, propertyQuestionHint, hasMultipleGuestQuestions };
