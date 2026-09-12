import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const VERSION = "2026-09-12.3";
const SITE_URL = "https://anotherhouse-guide.vercel.app/";
const languages = ["ko", "en", "ja", "zh", "zh-TW"];
const sourceScripts = [
  "assets/site-data.js",
  "assets/gallery-data.js",
  "assets/content-updates.js",
  "assets/gallery-overrides.js",
  "assets/restaurant-data.js",
  "assets/restaurant-expanded.js",
  "assets/tour-data.js"
];

const context = vm.createContext({ window: {} });
for (const file of sourceScripts) {
  vm.runInContext(await readFile(resolve(root, file), "utf8"), context, { filename: file });
}

const data = context.window.ANOTHER_HOUSE_DATA;
const tours = context.window.ANOTHER_HOUSE_TOURS;
const gimpoLine5Timetable = JSON.parse(await readFile(resolve(root, "assets/gimpo-line5-timetable.json"), "utf8"));
if (!data?.pages || !tours?.places) throw new Error("Current site data did not load");

const pageUrl = route => `${SITE_URL}?page=${route}`;
const isLocalized = value => value && typeof value === "object" && !Array.isArray(value) && languages.every(language => Object.hasOwn(value, language));
const localize = (value, language) => {
  if (isLocalized(value)) return localize(value[language], language);
  if (Array.isArray(value)) return value.map(item => localize(item, language));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localize(item, language)]));
  return value;
};
const localized = builder => Object.fromEntries(languages.map(language => [language, builder(language)]));
const pageText = (route, language) => {
  const page = localize(data.pages[route], language);
  return {
    title: page.title,
    summary: page.summary,
    sections: (page.sections || []).map(section => ({
      title: section.title,
      ...(section.body ? { body: section.body } : {}),
      ...(section.value ? { value: section.value } : {}),
      ...(section.steps ? { steps: section.steps } : {})
    })),
    source: pageUrl(route)
  };
};

const QUICK_TOPIC_KEYWORDS = {
  luggage: {
    ko: ["짐보관", "짐 맡", "짐을 맡", "러기지룸", "캐리어 보관", "수하물 보관"],
    en: ["luggage storage", "store luggage", "leave luggage", "baggage storage", "store my suitcase"],
    ja: ["荷物保管", "荷物を預", "荷物預かり", "ラゲッジルーム", "スーツケース保管"],
    zh: ["行李寄存", "寄存行李", "行李房", "存放行李"],
    "zh-TW": ["行李寄放", "寄放行李", "行李房", "寄存行李"]
  },
  checkin: { ko: ["체크인", "입실 시간", "입실 방법", "셀프 체크인", "키오스크", "객실 도어락"], en: ["check in", "check-in", "arrival procedure", "self check-in", "kiosk", "room door lock"], ja: ["チェックイン", "入室時間", "入室方法", "セルフチェックイン", "キオスク", "客室ドアロック"], zh: ["入住", "入住时间", "办理入住", "自助入住", "自助机", "房门锁"], "zh-TW": ["入住", "入住時間", "辦理入住", "自助入住", "自助機", "房門鎖"] },
  checkout: { ko: ["체크아웃", "퇴실 시간", "퇴실 방법"], en: ["check out", "check-out", "departure procedure"], ja: ["チェックアウト", "退室時間", "退室方法"], zh: ["退房", "退房时间", "办理退房"], "zh-TW": ["退房", "退房時間", "辦理退房"] },
  wifi: { ko: ["와이파이", "wifi", "wi-fi", "인터넷"], en: ["wifi", "wi-fi", "internet"], ja: ["wifi", "wi-fi", "インターネット"], zh: ["wifi", "wi-fi", "无线网络"], "zh-TW": ["wifi", "wi-fi", "無線網路"] },
  parking: { ko: ["숙소 주차", "건물 주차", "주차 가능", "주차 안내"], en: ["property parking", "on-site parking", "can i park", "parking at the hostel"], ja: ["宿の駐車", "館内駐車", "駐車できます", "駐車案内"], zh: ["住宿停车", "楼内停车", "可以停车", "停车指南"], "zh-TW": ["住宿停車", "樓內停車", "可以停車", "停車指南"] },
  rules: { ko: ["숙소 이용 규칙", "숙소 규칙", "이용 규칙", "하우스 룰", "흡연", "소음", "파티", "반려동물", "외부인"], en: ["house rules", "property rules", "stay rules", "smoking", "noise", "party", "pet", "outside guest"], ja: ["宿泊ルール", "利用規則", "ハウスルール", "喫煙", "騒音", "パーティー", "ペット", "部外者"], zh: ["住宿规则", "入住规则", "房屋守则", "吸烟", "噪音", "派对", "宠物", "外来人员"], "zh-TW": ["住宿規則", "入住規則", "房屋守則", "吸菸", "噪音", "派對", "寵物", "外來人員"] },
  appliances: { ko: ["냉난방", "에어컨", "난방", "인덕션", "전자레인지", "냉장고", "기기 사용"], en: ["heating", "air conditioning", "air conditioner", "induction", "microwave", "refrigerator", "appliance"], ja: ["冷暖房", "エアコン", "暖房", "IH", "電子レンジ", "冷蔵庫", "家電"], zh: ["空调", "暖气", "电磁炉", "微波炉", "冰箱", "设备使用"], "zh-TW": ["空調", "暖氣", "電磁爐", "微波爐", "冰箱", "設備使用"] },
  laundry: { ko: ["세탁", "건조기", "빨래", "세제", "섬유유연제"], en: ["laundry", "washing machine", "dryer", "detergent", "fabric softener"], ja: ["洗濯", "洗濯機", "乾燥機", "洗剤", "柔軟剤"], zh: ["洗衣", "洗衣机", "烘干机", "洗涤剂", "柔顺剂"], "zh-TW": ["洗衣", "洗衣機", "烘乾機", "洗滌劑", "柔軟精"] },
  waste: { ko: ["쓰레기", "분리배출", "분리수거"], en: ["trash", "waste", "recycling", "garbage"], ja: ["ごみ", "ゴミ", "分別", "リサイクル"], zh: ["垃圾", "垃圾分类", "回收"], "zh-TW": ["垃圾", "垃圾分類", "回收"] },
  rooms: { ko: ["객실 종류", "방 종류", "싱글룸", "2인실", "더블룸", "샤워실", "화장실 몇"], en: ["room type", "single room", "double room", "shared shower", "how many rooms"], ja: ["客室タイプ", "シングルルーム", "2人部屋", "共用シャワー", "部屋数"], zh: ["房型", "单人房", "双人房", "公共淋浴", "房间数量"], "zh-TW": ["房型", "單人房", "雙人房", "公共淋浴", "房間數量"] },
  tv: { ko: ["tv", "티비", "텔레비전", "ott", "넷플릭스"], en: ["tv", "television", "ott", "netflix", "streaming"], ja: ["テレビ", "tv", "netflix", "動画視聴"], zh: ["电视", "tv", "netflix", "流媒体"], "zh-TW": ["電視", "tv", "netflix", "串流"] },
  contact: { ko: ["호스트 연락", "호스트한테 연락", "도움 필요", "문의 방법", "연락 방법"], en: ["contact host", "contact the host", "need help", "how to contact"], ja: ["ホストに連絡", "問い合わせ方法", "助けが必要"], zh: ["联系房东", "需要帮助", "咨询方式"], "zh-TW": ["聯絡房東", "需要協助", "詢問方式"] }
};

const QUICK_TOPIC_LEADS = {
  luggage: { ko: "네, 짐 보관이 가능합니다.", en: "Yes, luggage storage is available.", ja: "はい、荷物を保管できます。", zh: "可以，住宿提供行李寄存。", "zh-TW": "可以，住宿提供行李寄放。" },
  checkin: { ko: "체크인은 15:00부터이며 셀프 체크인으로 진행합니다.", en: "Check-in starts at 15:00 and is self-service.", ja: "チェックインは15:00からで、セルフチェックインです。", zh: "入住时间为15:00起，采用自助入住。", "zh-TW": "入住時間為15:00起，採自助入住。" },
  checkout: { ko: "체크아웃은 11:00까지이며 레이트 체크아웃은 불가합니다.", en: "Check-out is by 11:00, and late check-out is not available.", ja: "チェックアウトは11:00までで、レイトチェックアウトはできません。", zh: "退房时间为11:00前，不提供延迟退房。", "zh-TW": "退房時間為11:00前，不提供延遲退房。" },
  wifi: { ko: "네, 숙소에서 Wi-Fi를 이용할 수 있습니다.", en: "Yes, Wi-Fi is available at the property.", ja: "はい、館内でWi-Fiを利用できます。", zh: "可以，住宿内提供 Wi-Fi。", "zh-TW": "可以，住宿內提供 Wi-Fi。" },
  parking: { ko: "아니요, 건물 내 주차는 불가합니다.", en: "No, on-site parking is not available.", ja: "いいえ、建物内には駐車できません。", zh: "不可以，大楼内不提供停车位。", "zh-TW": "不可以，大樓內不提供停車位。" },
  rules: { ko: "숙소 이용 규칙은 다음과 같습니다.", en: "These are the property rules.", ja: "宿泊ルールは次のとおりです。", zh: "住宿规则如下。", "zh-TW": "住宿規則如下。" },
  appliances: { ko: "네, 숙소에 냉난방·주방 기기가 마련되어 있습니다.", en: "Yes, climate-control and kitchen appliances are available.", ja: "はい、冷暖房・キッチン家電を利用できます。", zh: "可以，住宿内配有冷暖设备及厨房电器。", "zh-TW": "可以，住宿內配有冷暖設備及廚房電器。" },
  laundry: { ko: "네, 숙소에 세탁기와 건조기가 있습니다.", en: "Yes, a washing machine and dryer are available at the property.", ja: "はい、館内に洗濯機と乾燥機があります。", zh: "有，住宿内配有洗衣机和烘干机。", "zh-TW": "有，住宿內配有洗衣機和烘乾機。" },
  waste: { ko: "쓰레기는 숙소 내 공용 분리수거함에 분리배출할 수 있습니다.", en: "You can sort and dispose of waste in the shared recycling bins.", ja: "ごみは館内の共用分別ボックスに捨てられます。", zh: "垃圾可分类投放至住宿内的公共分类垃圾桶。", "zh-TW": "垃圾可分類投放至住宿內的公共分類垃圾桶。" },
  rooms: { ko: "싱글룸 11실과 더블룸 1실을 운영합니다.", en: "The property has 11 single rooms and 1 double room.", ja: "シングルルーム11室とダブルルーム1室があります。", zh: "住宿设有11间单人房和1间双人房。", "zh-TW": "住宿設有11間單人房和1間雙人房。" },
  tv: { ko: "아니요, 객실과 공용공간에 TV는 없습니다.", en: "No, there is no TV in the rooms or shared areas.", ja: "いいえ、客室と共用スペースにテレビはありません。", zh: "没有，客房及公共区域均不设电视。", "zh-TW": "沒有，客房及公共區域均不設電視。" },
  contact: { ko: "호스트에게는 예약 플랫폼 메시지로 연락할 수 있습니다.", en: "You can contact the host through your booking-platform messages.", ja: "予約プラットフォームのメッセージからホストに連絡できます。", zh: "您可以通过预订平台消息联系房东。", "zh-TW": "您可以透過預訂平台訊息聯絡房東。" }
};

const quickDirectAnswers = (topic, language) => ({
  luggage: {
    ko: [{ keywords: ["짐보관", "짐맡", "캐리어보관", "수하물보관"], answer: "네, 짐 보관이 가능합니다. 503호 앞 러기지룸에 체크아웃 당일 밤 11시까지 무료로 보관할 수 있어요." }],
    en: [{ keywords: ["luggage storage", "store luggage", "leave luggage", "baggage storage", "store my suitcase"], answer: "Yes, luggage storage is available. You can use the luggage room in front of Room 503 free of charge until 23:00 on the day of checkout." }],
    ja: [{ keywords: ["荷物保管", "荷物を預", "荷物預かり", "ラゲッジルーム", "スーツケース保管"], answer: "はい、荷物を保管できます。503号室前のラゲッジルームをチェックアウト当日の23時まで無料で利用できます。" }],
    zh: [{ keywords: ["行李寄存", "寄存行李", "行李房", "存放行李"], answer: "可以寄存行李。可免费存放在503号房前的行李房，使用至退房当天23:00。" }],
    "zh-TW": [{ keywords: ["行李寄放", "寄放行李", "行李房", "寄存行李"], answer: "可以寄放行李。可免費寄放在503號房前的行李房，使用至退房當天23:00。" }]
  },
  checkout: {
    ko: [{ keywords: ["레이트 체크아웃", "늦게 체크아웃", "체크아웃 연장"], answer: "아니요, 레이트 체크아웃과 체크아웃 시간 연장은 불가합니다." }],
    en: [{ keywords: ["late checkout", "late check-out", "extend checkout"], answer: "No, late check-out and check-out extensions are not available." }],
    ja: [{ keywords: ["レイトチェックアウト", "チェックアウト延長"], answer: "いいえ、レイトチェックアウトや時間延長はできません。" }],
    zh: [{ keywords: ["延迟退房", "延长退房"], answer: "不可以，不提供延迟退房或退房时间延长。" }],
    "zh-TW": [{ keywords: ["延遲退房", "延長退房"], answer: "不可以，不提供延遲退房或退房時間延長。" }]
  },
  rules: {
    ko: [{ keywords: ["흡연", "담배"], answer: "아니요, 객실과 공용공간은 모두 금연입니다." }, { keywords: ["반려동물", "애완동물"], answer: "아니요, 반려동물 동반은 허용되지 않습니다." }, { keywords: ["파티"], answer: "아니요, 숙소에서 파티는 허용되지 않습니다." }, { keywords: ["외부인", "방문객"], answer: "아니요, 예약하지 않은 외부인의 출입은 허용되지 않습니다." }],
    en: [{ keywords: ["smoking", "smoke", "cigarette"], answer: "No, smoking is not allowed in the rooms or shared areas." }, { keywords: ["pet", "dog", "cat"], answer: "No, pets are not allowed." }, { keywords: ["party"], answer: "No, parties are not allowed at the property." }, { keywords: ["outside guest", "visitor"], answer: "No, unregistered visitors are not allowed inside." }],
    ja: [{ keywords: ["喫煙", "タバコ"], answer: "いいえ、客室・共用スペースはすべて禁煙です。" }, { keywords: ["ペット"], answer: "いいえ、ペットの同伴はできません。" }, { keywords: ["パーティー"], answer: "いいえ、館内でのパーティーは禁止です。" }, { keywords: ["部外者", "訪問者"], answer: "いいえ、予約者以外の入館はできません。" }],
    zh: [{ keywords: ["吸烟", "抽烟"], answer: "不可以，客房及公共区域均全面禁烟。" }, { keywords: ["宠物"], answer: "不可以，不允许携带宠物。" }, { keywords: ["派对"], answer: "不可以，住宿内禁止举办派对。" }, { keywords: ["外来人员", "访客"], answer: "不可以，未登记访客不得进入住宿。" }],
    "zh-TW": [{ keywords: ["吸菸", "抽菸"], answer: "不可以，客房及公共區域均全面禁菸。" }, { keywords: ["寵物"], answer: "不可以，不允許攜帶寵物。" }, { keywords: ["派對"], answer: "不可以，住宿內禁止舉辦派對。" }, { keywords: ["外來人員", "訪客"], answer: "不可以，未登記訪客不得進入住宿。" }]
  },
  laundry: {
    ko: [{ keywords: ["세탁세제", "세제", "섬유유연제"], answer: "네, 세탁세제와 섬유유연제가 준비되어 있습니다. 세탁기 위 선반에 있어요." }, { keywords: ["건조기"], answer: "네, 숙소에 건조기가 있습니다. 밤 10시 이전에 사용을 마쳐 주세요." }, { keywords: ["세탁기"], answer: "네, 숙소에 세탁기가 있습니다. 세제와 섬유유연제는 위 선반에 있어요." }, { keywords: ["몇시까지", "이용시간", "사용시간"], answer: "세탁기와 건조기는 밤 10시 이전에 사용을 마쳐 주세요." }],
    en: [{ keywords: ["detergent", "fabric softener"], answer: "Yes, laundry detergent and fabric softener are provided. You’ll find them on the shelf above the machine." }, { keywords: ["dryer", "tumble dryer"], answer: "Yes, a dryer is available. Please finish using it before 22:00." }, { keywords: ["washing machine", "washer"], answer: "Yes, a washing machine is available. Detergent and fabric softener are on the shelf above it." }, { keywords: ["laundry hours", "what time", "until when"], answer: "Please finish using the washing machine and dryer before 22:00." }],
    ja: [{ keywords: ["洗剤", "柔軟剤"], answer: "はい、洗濯洗剤と柔軟剤をご用意しています。洗濯機の上の棚にあります。" }, { keywords: ["乾燥機"], answer: "はい、館内に乾燥機があります。22時までに使用を終えてください。" }, { keywords: ["洗濯機"], answer: "はい、館内に洗濯機があります。洗剤と柔軟剤は上の棚にあります。" }, { keywords: ["何時まで", "利用時間", "使用時間"], answer: "洗濯機と乾燥機は22時までに使用を終えてください。" }],
    zh: [{ keywords: ["洗涤剂", "洗衣液", "柔顺剂"], answer: "有，住宿备有洗涤剂和柔顺剂，放在洗衣机上方的搁板上。" }, { keywords: ["烘干机"], answer: "有，住宿内配有烘干机。请在22:00前结束使用。" }, { keywords: ["洗衣机"], answer: "有，住宿内配有洗衣机。洗涤剂和柔顺剂放在上方搁板上。" }, { keywords: ["几点结束", "使用时间", "到几点"], answer: "请在22:00前结束使用洗衣机和烘干机。" }],
    "zh-TW": [{ keywords: ["洗滌劑", "洗衣精", "柔軟精"], answer: "有，住宿備有洗滌劑和柔軟精，放在洗衣機上方的層架上。" }, { keywords: ["烘乾機"], answer: "有，住宿內配有烘乾機。請在22:00前結束使用。" }, { keywords: ["洗衣機"], answer: "有，住宿內配有洗衣機。洗滌劑和柔軟精放在上方層架上。" }, { keywords: ["幾點結束", "使用時間", "到幾點"], answer: "請在22:00前結束使用洗衣機和烘乾機。" }]
  }
}[topic]?.[language] || []);

const compactPageLines = page => [
  page.summary,
  ...(page.sections || []).flatMap(section => [section.body, section.value, ...(section.steps || [])])
].filter(value => typeof value === "string" && value.trim());

const quickGuideTopics = language => {
  const stay = {
    luggage: localize(data.luggage, language),
    checkin: localize(data.pages.checkin, language),
    checkout: localize(data.pages.checkout, language),
    parking: localize(data.parking, language),
    rules: localize(data.pages.rules, language)
  };
  const wifi = localize(data.pages.wifi, language);
  const appliances = localize(data.pages.appliances, language);
  const laundry = localize(data.pages.laundry, language);
  const waste = localize(data.pages.trash, language);
  const about = localize(data.about, language);
  const tv = localize(data.applianceNotice, language);
  const luggageLead = { ko: "네, 짐 보관이 가능합니다.", en: "Yes, luggage storage is available.", ja: "はい、荷物を保管できます。", zh: "可以寄存行李。", "zh-TW": "可以寄放行李。" }[language];
  const wifiPolicy = { ko: "Wi-Fi 비밀번호는 현재 숙소 Wi-Fi 안내 화면 또는 예약 플랫폼 메시지에서 확인해 주세요.", en: "Check the current Wi-Fi guide screen or your booking-platform message for the password.", ja: "Wi-Fiパスワードは宿のWi-Fi案内画面または予約プラットフォームのメッセージで確認してください。", zh: "Wi-Fi 密码请查看住宿的 Wi-Fi 指南页面或预订平台消息。", "zh-TW": "Wi-Fi 密碼請查看住宿的 Wi-Fi 指南頁面或預訂平台訊息。" }[language];
  const checkoutLuggage = (stay.checkout.sections || []).at(-1)?.steps || [];
  const answer = lines => lines.filter(value => typeof value === "string" && value.trim()).join("\n");
  return [
    { id: "luggage", keywords: QUICK_TOPIC_KEYWORDS.luggage[language], answer: answer([luggageLead, stay.luggage.value, stay.luggage.note, ...checkoutLuggage]), source: pageUrl("checkin") },
    { id: "checkin", keywords: QUICK_TOPIC_KEYWORDS.checkin[language], answer: answer(compactPageLines(stay.checkin)), source: pageUrl("checkin") },
    { id: "checkout", keywords: QUICK_TOPIC_KEYWORDS.checkout[language], answer: answer(compactPageLines(stay.checkout)), source: pageUrl("checkin") },
    { id: "wifi", keywords: QUICK_TOPIC_KEYWORDS.wifi[language], answer: answer([wifi.sections?.[0]?.value, wifi.sections?.[2]?.body, wifiPolicy]), source: pageUrl("wifi") },
    { id: "parking", keywords: QUICK_TOPIC_KEYWORDS.parking[language], answer: answer([stay.parking.onSite, stay.parking.intro, stay.parking.places?.[0]?.name, stay.parking.places?.[0]?.address, stay.parking.places?.[0]?.note]), source: pageUrl("checkin") },
    { id: "rules", keywords: QUICK_TOPIC_KEYWORDS.rules[language], answer: answer(compactPageLines(stay.rules)), source: pageUrl("rules") },
    { id: "appliances", keywords: QUICK_TOPIC_KEYWORDS.appliances[language], answer: answer([appliances.summary, ...(appliances.devices || []).flatMap(device => [device.name, ...(device.steps || [])])]), source: pageUrl("appliances") },
    { id: "laundry", keywords: QUICK_TOPIC_KEYWORDS.laundry[language], answer: answer([laundry.caution, ...compactPageLines(laundry)]), source: pageUrl("laundry") },
    { id: "waste", keywords: QUICK_TOPIC_KEYWORDS.waste[language], answer: answer(compactPageLines(waste)), source: pageUrl("trash") },
    { id: "rooms", keywords: QUICK_TOPIC_KEYWORDS.rooms[language], answer: answer([about.body, ...(about.facts || [])]), source: pageUrl("gallery") },
    { id: "tv", keywords: QUICK_TOPIC_KEYWORDS.tv[language], answer: answer([tv.title, tv.body]), source: pageUrl("appliances") },
    { id: "contact", keywords: QUICK_TOPIC_KEYWORDS.contact[language], answer: String(localize(data.contact, language) || ""), source: SITE_URL }
  ].map(topic => ({
    ...topic,
    lead: QUICK_TOPIC_LEADS[topic.id][language],
    directAnswers: quickDirectAnswers(topic.id, language)
  }));
};

const transportKnowledge = language => {
  const page = localize(data.pages.transport, language);
  return {
    title: page.title,
    summary: page.summary,
    destination: page.destination,
    localArrival: {
      station: page.destination?.station,
      landmark: page.destination?.landmark,
      lastMile: page.destination?.lastMile,
      building: localize(data.address, language),
      instruction: language === "ko"
        ? "동대문역 6번 출구 바로 앞, 1층 교촌치킨 동대문 1호점과 치과 간판이 보이는 선일빌딩으로 들어가 엘리베이터를 타고 5층으로 올라오세요. 엘리베이터에서 내려 반층 아래 유리문 안쪽이 ANOTHER HOUSE 리셉션입니다."
        : language === "ja"
          ? "東大門駅6番出口のすぐ前、1階のキョチョンチキン東大門1号店と歯科の看板があるソニルビルに入り、エレベーターで5階へ上がってください。エレベーターを降りて半階下り、ガラス扉の内側がANOTHER HOUSEの受付です。"
          : language === "zh"
            ? "从东大门站6号出口出来，进入正前方一层有桥村炸鸡东大门1号店和牙科招牌的Sunil大厦，乘电梯到5层。出电梯后下半层，玻璃门内即为ANOTHER HOUSE前台。"
            : language === "zh-TW"
              ? "從東大門站6號出口出來，進入正前方一樓有橋村炸雞東大門1號店和牙科招牌的Sunil大廈，搭電梯到5樓。出電梯後往下半層，玻璃門內就是ANOTHER HOUSE櫃檯。"
              : "From Dongdaemun Station Exit 6, enter Sunil Building directly ahead—the 1st floor has Kyochon Chicken Dongdaemun No. 1 and a dental-clinic sign. Take the elevator to 5F, go down half a floor, and enter the ANOTHER HOUSE reception through the glass door."
    },
    sections: (page.sections || []).map(section => ({
      title: section.title,
      summary: section.summary,
      officialSource: section.sourceUrl ? { label: section.sourceLabel, url: section.sourceUrl } : null,
      routes: (section.routes || []).map(route => ({
        title: route.title,
        badge: route.badge,
        tags: route.tags,
        path: route.path,
        note: route.note,
        steps: (route.steps || []).map(({ label, title, body }) => ({ label, title, body }))
      }))
    })),
    source: pageUrl("transport")
  };
};

const addressQuery = encodeURIComponent(localize(data.address, "ko"));
const maps = {
  naver: `https://map.naver.com/p/search/${addressQuery}`,
  google: `https://www.google.com/maps/search/?api=1&query=${addressQuery}`
};

const placeMaps = query => ({
  naver: `https://map.naver.com/p/search/${encodeURIComponent(query)}`,
  google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
});

const airportTransport = {
  verifiedAt: "2026-09-11",
  calendarPolicy: {
    ko: "6702와 N6701은 운영사가 평일·주말·공휴일 구분 없이 하나의 매일 시간표를 게시합니다. 임시 변경·우회 공지가 있으면 운영사 공지가 우선입니다.",
    en: "The operator publishes one daily timetable for 6702 and N6701 without separate weekday, weekend, or holiday tables. Temporary operator notices take priority.",
    ja: "6702とN6701は、平日・週末・祝日の区別がない毎日の時刻表として公開されています。臨時変更は運行会社のお知らせが優先されます。",
    zh: "运营方为6702和N6701发布同一份每日时刻表，不另分工作日、周末或节假日；临时调整以运营方公告为准。",
    "zh-TW": "營運方為6702和N6701發布同一份每日時刻表，不另分平日、週末或國定假日；臨時調整以營運方公告為準。"
  },
  incheon: {
    daytimeBus: {
      route: "6702",
      stopId: "01901",
      stop: { ko: "동대문역(JW메리어트호텔동대문) 정류장", en: "Dongdaemun Station (JW Marriott Dongdaemun) stop", ja: "東大門駅（JWマリオット東大門）停留所", zh: "东大门站（JW万豪东大门）站", "zh-TW": "東大門站（JW萬豪東大門）站" },
      departures: ["04:07", "04:37", "05:17", "06:02", "06:42", "07:27", "08:02", "08:47", "09:32", "10:17", "11:02", "11:47", "12:17", "12:57", "13:47", "14:17", "14:42", "15:22", "15:57", "16:42", "17:27", "18:02", "18:47", "19:22", "19:52"],
      fare: { adult: 18000, child: 12000, childAge: "6–12" },
      maps: placeMaps("동대문역 JW메리어트호텔동대문 공항버스 정류장 01901"),
      officialSource: { label: "K Airport Limousine 6702", url: "https://www.klimousine.com/bus/limousine.php?bus_no=6702" },
      timetableNotice: { label: "6702 timetable effective 2026-05-01", url: "https://www.klimousine.com/center/notice_view.php?code=&idx=6418&page=1&ptype=view" }
    },
    nightBus: {
      route: "N6701",
      stopId: "02711",
      stop: { ko: "동대문디자인플라자(DDP) 정류장", en: "Dongdaemun Design Plaza (DDP) stop", ja: "東大門デザインプラザ（DDP）停留所", zh: "东大门设计广场（DDP）站", "zh-TW": "東大門設計廣場（DDP）站" },
      trips: [
        { departure: "23:00", terminal1Arrival: "00:20", terminal2Arrival: "00:40" },
        { departure: "01:05", terminal1Arrival: "02:25", terminal2Arrival: "02:45" },
        { departure: "01:55", terminal1Arrival: "03:15", terminal2Arrival: "03:35" },
        { departure: "02:55", terminal1Arrival: "04:15", terminal2Arrival: "04:35" }
      ],
      fare: { adult: 18000, child: 12000, childAge: "6–12" },
      maps: placeMaps("동대문디자인플라자 DDP 공항버스 정류장 02711"),
      officialSource: { label: "K Airport Limousine N6701", url: "https://www.klimousine.com/bus/limousine.php?bus_no=N6701" },
      airportSource: { label: "Incheon Airport night bus timetable", url: "https://business.airport.kr/ap_ko/979/subview.do" }
    }
  },
  gimpo: {
    route: "Seoul Subway Line 5",
    boardingStation: { ko: "동대문역사문화공원역 5호선 방화 방면", en: "Dongdaemun History & Culture Park Station, Line 5 toward Banghwa", ja: "東大門歴史文化公園駅・5号線・傍花方面", zh: "东大门历史文化公园站，5号线往傍花方向", "zh-TW": "東大門歷史文化公園站，5號線往傍花方向" },
    fromProperty: {
      ko: "숙소 앞 동대문역에서 4호선을 한 정거장 타고 동대문역사문화공원역에서 5호선 방화 방면으로 환승하세요.",
      en: "From Dongdaemun Station by the property, take Line 4 one stop, then transfer at Dongdaemun History & Culture Park to Line 5 toward Banghwa.",
      ja: "宿の前の東大門駅から4号線で1駅進み、東大門歴史文化公園駅で5号線の傍花方面に乗り換えてください。",
      zh: "从住宿旁的东大门站乘4号线一站，在东大门历史文化公园站换乘5号线傍花方向。",
      "zh-TW": "從住宿旁的東大門站搭4號線一站，在東大門歷史文化公園站轉乘5號線傍花方向。"
    },
    directRideMinutes: "46–48",
    maps: placeMaps("동대문역사문화공원역 5호선"),
    officialSource: { label: gimpoLine5Timetable.dataset, url: gimpoLine5Timetable.sourceUrl },
    basisDate: gimpoLine5Timetable.basisDate
  }
};

const familyDiningPlaces = [
  {
    id: "bonuribansang-doota",
    name: { ko: "본우리반상 동대문두타점", en: "Bonuribansang Dongdaemun Doota", ja: "本ウリ膳 東大門DOOTA店", zh: "本味韩食 东大门DOOTA店", "zh-TW": "本味韓食 東大門DOOTA店" },
    address: { ko: "서울 중구 장충단로 275 두타몰 B2층", en: "B2, Doota Mall, 275 Jangchungdan-ro, Jung-gu, Seoul", ja: "ソウル特別市 中区 奨忠壇路275 DOOTA MALL B2階", zh: "首尔特别市中区奖忠坛路275号 DOOTA MALL B2层", "zh-TW": "首爾特別市中區獎忠壇路275號 DOOTA MALL B2樓" },
    walk: { ko: "도보 약 5–7분", en: "About a 5–7 minute walk", ja: "徒歩約5〜7分", zh: "步行约5–7分钟", "zh-TW": "步行約5–7分鐘" },
    food: { ko: "불고기·곰탕·솥밥", en: "Bulgogi, gomtang and rice-pot meals", ja: "プルコギ・コムタン・釜飯", zh: "烤牛肉、牛骨汤和锅饭", "zh-TW": "烤牛肉、牛骨湯和鍋飯" },
    childNote: { ko: "유아의자가 있고 아이와 먹기 편한 한식 메뉴가 많습니다.", en: "Highchairs are available, with many mild Korean dishes suitable for children.", ja: "ベビーチェアがあり、お子様も食べやすい韓国料理が多くあります。", zh: "提供儿童座椅，也有多种适合孩子的清淡韩餐。", "zh-TW": "提供兒童座椅，也有多種適合孩子的清淡韓餐。" },
    priority: 1,
    hours: { lastOrder: "21:00", verifiedAt: "2026-09-11", sourceName: "Naver Place", sourceUrl: "https://map.naver.com/p/entry/place/2046166635" },
    maps: { naver: "https://map.naver.com/p/entry/place/2046166635", google: "https://www.google.com/maps/search/?api=1&query=%EB%B3%B8%EC%9A%B0%EB%A6%AC%EB%B0%98%EC%83%81+%EB%8F%99%EB%8C%80%EB%AC%B8%EB%91%90%ED%83%80%EC%A0%90" }
  },
  {
    id: "phomein-red-doota",
    name: { ko: "포메인RED 두타몰직영점", en: "Phomein RED Doota Mall", ja: "フォーメインRED DOOTA MALL店", zh: "PhoMein RED DOOTA MALL店", "zh-TW": "PhoMein RED DOOTA MALL店" },
    address: { ko: "서울 중구 장충단로 275 두타몰 B2층 105호", en: "Unit 105, B2, Doota Mall, 275 Jangchungdan-ro, Jung-gu, Seoul", ja: "ソウル特別市 中区 奨忠壇路275 DOOTA MALL B2階105号", zh: "首尔特别市中区奖忠坛路275号 DOOTA MALL B2层105号", "zh-TW": "首爾特別市中區獎忠壇路275號 DOOTA MALL B2樓105號" },
    walk: { ko: "도보 약 5–7분", en: "About a 5–7 minute walk", ja: "徒歩約5〜7分", zh: "步行约5–7分钟", "zh-TW": "步行約5–7分鐘" },
    food: { ko: "쌀국수·볶음밥·팟타이", en: "Pho, fried rice and pad thai", ja: "フォー・炒飯・パッタイ", zh: "越南河粉、炒饭和泰式炒粉", "zh-TW": "越南河粉、炒飯和泰式炒粉" },
    childNote: { ko: "푸드코트 좌석을 이용하며 맵지 않은 메뉴로 주문하기 쉽습니다.", en: "Food-court seating and several non-spicy dishes make it practical with children.", ja: "フードコート席を利用でき、辛くないメニューも選びやすいです。", zh: "可使用美食广场座位，也容易选择不辣的菜品。", "zh-TW": "可使用美食廣場座位，也容易選擇不辣的餐點。" },
    priority: 2,
    hours: { lastOrder: "21:30", verifiedAt: "2026-09-11", sourceName: "Naver Place", sourceUrl: "https://map.naver.com/p/entry/place/1384336990" },
    maps: { naver: "https://map.naver.com/p/entry/place/1384336990", google: "https://www.google.com/maps/search/?api=1&query=%ED%8F%AC%EB%A9%94%EC%9D%B8RED+%EB%91%90%ED%83%80%EB%AA%B0%EC%A7%81%EC%98%81%EC%A0%90" }
  },
  {
    id: "kyochon-dongdaemun-1",
    name: { ko: "교촌치킨 동대문1호점", en: "Kyochon Chicken Dongdaemun No. 1", ja: "キョチョンチキン 東大門1号店", zh: "桥村炸鸡 东大门1号店", "zh-TW": "橋村炸雞 東大門1號店" },
    address: { ko: "서울 종로구 종로 294 선일빌딩", en: "Sunil Building, 294 Jong-ro, Jongno-gu, Seoul", ja: "ソウル特別市 鍾路区 鍾路294 ソニルビル", zh: "首尔特别市钟路区钟路294号 Sunil大厦", "zh-TW": "首爾特別市鐘路區鐘路294號 Sunil大廈" },
    walk: { ko: "숙소와 같은 건물", en: "In the same building as Another House", ja: "宿と同じ建物", zh: "与住宿位于同一栋楼", "zh-TW": "與住宿位於同一棟樓" },
    food: { ko: "치킨·감자·떡볶이", en: "Chicken, fries and tteokbokki", ja: "チキン・ポテト・トッポッキ", zh: "炸鸡、薯条和辣炒年糕", "zh-TW": "炸雞、薯條和辣炒年糕" },
    childNote: { ko: "이동이 가장 짧고 늦은 시간에 이용하기 편합니다.", en: "It requires the shortest walk and is the easiest late-night option.", ja: "移動が最も短く、遅い時間にも利用しやすいです。", zh: "距离最近，也是深夜最方便的选择。", "zh-TW": "距離最近，也是深夜最方便的選擇。" },
    priority: 3,
    hours: { schedule: "24 hours", open: "00:00", close: "24:00", verifiedAt: "2026-09-11", sourceName: "Naver Place", sourceUrl: "https://map.naver.com/p/entry/place/11801976" },
    maps: { naver: "https://map.naver.com/p/entry/place/11801976", google: "https://www.google.com/maps/search/?api=1&query=%EA%B5%90%EC%B4%8C%EC%B9%98%ED%82%A8+%EB%8F%99%EB%8C%80%EB%AC%B81%ED%98%B8%EC%A0%90" }
  },
  {
    id: "eggdrop-dongdaemun",
    name: { ko: "에그드랍 동대문점", en: "Egg Drop Dongdaemun", ja: "エッグドロップ 東大門店", zh: "Egg Drop 东大门店", "zh-TW": "Egg Drop 東大門店" },
    address: { ko: "서울 중구 을지로 255 기승빌딩 B동", en: "Building B, Giseung Building, 255 Eulji-ro, Jung-gu, Seoul", ja: "ソウル特別市 中区 乙支路255 キスンビルB棟", zh: "首尔特别市中区乙支路255号 Kiseung大厦B栋", "zh-TW": "首爾特別市中區乙支路255號 Kiseung大廈B棟" },
    walk: { ko: "도보 약 8–10분", en: "About an 8–10 minute walk", ja: "徒歩約8〜10分", zh: "步行约8–10分钟", "zh-TW": "步行約8–10分鐘" },
    food: { ko: "에그 샌드위치", en: "Egg sandwiches", ja: "エッグサンド", zh: "鸡蛋三明治", "zh-TW": "雞蛋三明治" },
    childNote: { ko: "정식 식사보다 가볍게 먹기 좋은 선택입니다.", en: "Best for a light meal rather than a full dinner.", ja: "しっかりした夕食より軽食向きです。", zh: "更适合简便轻食，而不是正式晚餐。", "zh-TW": "更適合簡便輕食，而不是正式晚餐。" },
    priority: 4,
    hours: { schedule: "07:00–22:00", open: "07:00", close: "22:00", verifiedAt: "2026-09-11", sourceName: "Naver Place", sourceUrl: "https://map.naver.com/p/entry/place/1736990079" },
    maps: { naver: "https://map.naver.com/p/entry/place/1736990079", google: "https://www.google.com/maps/search/?api=1&query=%EC%97%90%EA%B7%B8%EB%93%9C%EB%9E%8D+%EB%8F%99%EB%8C%80%EB%AC%B8%EC%A0%90" }
  }
];

// Another House-specific, pre-verified neighborhood directory. These are intentionally
// kept with the property knowledge rather than a shared concierge prompt.
const verifiedNearbyPlaces = [
  {
    id: "cu-dongdaemun-station",
    name: { ko: "CU 동대문역점", en: "CU Dongdaemun Station", ja: "CU 東大門駅店", zh: "CU 东大门站店", "zh-TW": "CU 東大門站店" },
    aliases: { ko: ["씨유 동대문역점", "동대문역 편의점"], en: ["CU Dongdaemun", "nearby convenience store"], ja: ["東大門駅 コンビニ"], zh: ["东大门站便利店"], "zh-TW": ["東大門站便利商店"] },
    categories: ["convenience", "groceries", "snacks", "daily-needs"],
    address: { ko: "서울 종로구 종로46길 5 1층", en: "1F, 5 Jong-ro 46-gil, Jongno-gu, Seoul", ja: "ソウル特別市 鍾路区 鍾路46キル5 1階", zh: "首尔特别市钟路区钟路46街5号 1层", "zh-TW": "首爾特別市鐘路區鐘路46街5號 1樓" },
    walk: { ko: "도보 약 2–3분", en: "About a 2–3 minute walk", ja: "徒歩約2〜3分", zh: "步行约2–3分钟", "zh-TW": "步行約2–3分鐘" },
    summary: { ko: "물, 간식과 기본 생필품을 가장 가깝게 구입하기 좋은 편의점입니다.", en: "The most practical nearby stop for water, snacks and basic daily supplies.", ja: "水、軽食、基本的な日用品を近くで購入できます。", zh: "可就近购买饮用水、零食和基本日用品。", "zh-TW": "可就近購買飲用水、零食和基本日用品。" },
    verification: { verifiedAt: "2026-09-11", sourceName: "Naver Maps + public business registry", sourceUrl: "https://map.naver.com/p/search/CU%20%EB%8F%99%EB%8C%80%EB%AC%B8%EC%97%AD%EC%A0%90" },
    maps: placeMaps("CU 동대문역점 서울 종로구 종로46길 5")
  },
  {
    id: "doota-ready-young-pharmacy",
    name: { ko: "두타몰레디영약국", en: "Doota Mall Ready Young Pharmacy", ja: "DOOTAモール レディヤング薬局", zh: "DOOTA Mall Ready Young 药店", "zh-TW": "DOOTA Mall Ready Young 藥局" },
    aliases: { ko: ["두타몰 약국", "레디영약국", "동대문 약국"], en: ["Doota pharmacy", "nearby pharmacy"], ja: ["DOOTA 薬局", "東大門 薬局"], zh: ["DOOTA 药店", "东大门药店"], "zh-TW": ["DOOTA 藥局", "東大門藥局"] },
    categories: ["pharmacy", "medicine", "beauty", "daily-needs"],
    address: { ko: "서울 중구 장충단로 275 두산타워빌딩 B2층 2·3호", en: "Units 2–3, B2, Doosan Tower, 275 Jangchungdan-ro, Jung-gu, Seoul", ja: "ソウル特別市 中区 奨忠壇路275 斗山タワーB2階2・3号", zh: "首尔特别市中区奖忠坛路275号 斗山大厦B2层2、3号", "zh-TW": "首爾特別市中區獎忠壇路275號 斗山大廈B2樓2、3號" },
    walk: { ko: "도보 약 5–7분", en: "About a 5–7 minute walk", ja: "徒歩約5〜7分", zh: "步行约5–7分钟", "zh-TW": "步行約5–7分鐘" },
    summary: { ko: "두타몰 지하 2층에 있으며 영어·일본어·중국어 상담이 가능한 늦은 시간 약국입니다.", en: "A late-opening pharmacy on Doota Mall B2 with English, Japanese and Chinese assistance.", ja: "DOOTAモールB2階。英語・日本語・中国語で相談できる夜遅くまで営業する薬局です。", zh: "位于DOOTA Mall地下2层，可使用英语、日语和中文咨询，营业至深夜。", "zh-TW": "位於DOOTA Mall地下2樓，可使用英語、日語和中文諮詢，營業至深夜。" },
    hours: { schedule: "10:30–24:00", open: "10:30", close: "24:00", daily: true },
    verification: { verifiedAt: "2026-09-11", sourceName: "Naver Maps + venue listing", sourceUrl: "https://map.naver.com/p/search/%EB%91%90%ED%83%80%EB%AA%B0%EB%A0%88%EB%94%94%EC%98%81%EC%95%BD%EA%B5%AD" },
    maps: placeMaps("두타몰레디영약국 서울 중구 장충단로 275")
  },
  {
    id: "national-medical-center-er",
    name: { ko: "국립중앙의료원 응급실", en: "National Medical Center Emergency Room", ja: "国立中央医療院 救急外来", zh: "国立中央医疗院急诊室", "zh-TW": "國立中央醫療院急診室" },
    aliases: { ko: ["국립중앙의료원", "가까운 응급실", "응급 병원"], en: ["National Medical Center", "nearest emergency room", "ER"], ja: ["国立中央医療院", "近くの救急外来"], zh: ["国立中央医疗院", "附近急诊室"], "zh-TW": ["國立中央醫療院", "附近急診室"] },
    categories: ["hospital", "emergency", "medical"],
    address: { ko: "서울 중구 을지로 245 국립중앙의료원", en: "National Medical Center, 245 Eulji-ro, Jung-gu, Seoul", ja: "ソウル特別市 中区 乙支路245 国立中央医療院", zh: "首尔特别市中区乙支路245号 国立中央医疗院", "zh-TW": "首爾特別市中區乙支路245號 國立中央醫療院" },
    walk: { ko: "도보 약 12–15분", en: "About a 12–15 minute walk", ja: "徒歩約12〜15分", zh: "步行约12–15分钟", "zh-TW": "步行約12–15分鐘" },
    summary: { ko: "공식 지역응급의료센터입니다. 위급하면 이동 전에 119로 먼저 연락하세요.", en: "This is the official regional emergency medical center. Call 119 first if the situation is urgent.", ja: "公式の地域救急医療センターです。緊急時は移動前に119へ電話してください。", zh: "这是官方地区急救医疗中心。情况紧急时请先拨打119。", "zh-TW": "這是官方地區急救醫療中心。情況緊急時請先撥打119。" },
    verification: { verifiedAt: "2026-09-11", sourceName: "National Medical Center", sourceUrl: "https://www.nmc.or.kr/nmc/emergencyRoom" },
    maps: placeMaps("국립중앙의료원 응급실 서울 중구 을지로 245")
  },
  {
    id: "doota-mall",
    name: { ko: "두타몰", en: "Doota Mall", ja: "DOOTAモール", zh: "DOOTA Mall", "zh-TW": "DOOTA Mall" },
    aliases: { ko: ["두산타워", "가까운 쇼핑몰", "동대문 쇼핑"], en: ["Doosan Tower", "nearby mall", "Dongdaemun shopping"], ja: ["斗山タワー", "東大門 ショッピング"], zh: ["斗山大厦", "东大门购物"], "zh-TW": ["斗山大廈", "東大門購物"] },
    categories: ["shopping", "mall", "beauty", "dining", "tax-refund", "daily-needs"],
    address: { ko: "서울 중구 장충단로 275 두산타워", en: "Doosan Tower, 275 Jangchungdan-ro, Jung-gu, Seoul", ja: "ソウル特別市 中区 奨忠壇路275 斗山タワー", zh: "首尔特别市中区奖忠坛路275号 斗山大厦", "zh-TW": "首爾特別市中區獎忠壇路275號 斗山大廈" },
    walk: { ko: "도보 약 5–7분", en: "About a 5–7 minute walk", ja: "徒歩約5〜7分", zh: "步行约5–7分钟", "zh-TW": "步行約5–7分鐘" },
    summary: { ko: "패션·뷰티·식당·약국·택스리펀을 한 건물에서 해결하기 편한 쇼핑몰입니다.", en: "A convenient one-stop mall for fashion, beauty, dining, a pharmacy and tax refunds.", ja: "ファッション、ビューティー、食事、薬局、免税手続きを一か所で利用できます。", zh: "可在同一栋楼内解决时尚、美妆、餐饮、药店和退税需求。", "zh-TW": "可在同一棟樓內解決時尚、美妝、餐飲、藥局和退稅需求。" },
    hours: { schedule: "10:30–24:00", open: "10:30", close: "24:00", daily: true },
    verification: { verifiedAt: "2026-09-11", sourceName: "Doota Mall official website", sourceUrl: "https://www.doota-mall.com/store/location.do" },
    maps: placeMaps("두타몰 서울 중구 장충단로 275")
  },
  {
    id: "olive-young-doota",
    name: { ko: "올리브영 두타몰점", en: "Olive Young Doota Mall", ja: "オリーブヤング DOOTAモール店", zh: "Olive Young DOOTA Mall店", "zh-TW": "Olive Young DOOTA Mall店" },
    aliases: { ko: ["두타몰 올리브영", "화장품", "세면도구"], en: ["Olive Young", "toiletries", "K-beauty"], ja: ["オリーブヤング", "洗面用品", "韓国コスメ"], zh: ["Olive Young", "洗漱用品", "韩国美妆"], "zh-TW": ["Olive Young", "盥洗用品", "韓國美妝"] },
    categories: ["beauty", "toiletries", "daily-needs", "shopping"],
    address: { ko: "서울 중구 장충단로 275 두타몰 B2층", en: "B2, Doota Mall, 275 Jangchungdan-ro, Jung-gu, Seoul", ja: "ソウル特別市 中区 奨忠壇路275 DOOTAモールB2階", zh: "首尔特别市中区奖忠坛路275号 DOOTA Mall B2层", "zh-TW": "首爾特別市中區獎忠壇路275號 DOOTA Mall B2樓" },
    walk: { ko: "도보 약 5–7분", en: "About a 5–7 minute walk", ja: "徒歩約5〜7分", zh: "步行约5–7分钟", "zh-TW": "步行約5–7分鐘" },
    summary: { ko: "세면도구, 위생용품과 K-뷰티 제품을 구입하기 편합니다.", en: "Useful for toiletries, personal-care items and K-beauty products.", ja: "洗面用品、衛生用品、韓国コスメの購入に便利です。", zh: "方便购买洗漱用品、卫生用品和韩国美妆产品。", "zh-TW": "方便購買盥洗用品、衛生用品和韓國美妝產品。" },
    verification: { verifiedAt: "2026-09-11", sourceName: "Doota Mall official floor guide", sourceUrl: "https://www.doota-mall.com/" },
    maps: placeMaps("올리브영 두타몰점 서울 중구 장충단로 275")
  },
  {
    id: "nh-bank-line1-dongdaemun-atm",
    name: { ko: "농협은행 1호선 동대문역 ATM", en: "NH Bank ATM at Dongdaemun Station (Line 1)", ja: "NH農協銀行 1号線東大門駅ATM", zh: "NH农协银行 1号线东大门站ATM", "zh-TW": "NH農協銀行 1號線東大門站ATM" },
    aliases: { ko: ["동대문역 ATM", "가까운 ATM", "현금인출기"], en: ["Dongdaemun Station ATM", "nearby ATM", "cash machine"], ja: ["東大門駅ATM", "近くのATM", "現金自動預け払い機"], zh: ["东大门站ATM", "附近ATM", "取款机"], "zh-TW": ["東大門站ATM", "附近ATM", "提款機"] },
    categories: ["atm", "cash", "bank"],
    address: { ko: "서울 종로구 종로 299-1, 동대문역 1호선 1번 출구 인근", en: "299-1 Jong-ro, Jongno-gu, Seoul, near Exit 1 of Dongdaemun Station Line 1", ja: "ソウル特別市 鍾路区 鍾路299-1、東大門駅1号線1番出口付近", zh: "首尔特别市钟路区钟路299-1，东大门站1号线1号出口附近", "zh-TW": "首爾特別市鐘路區鐘路299-1，東大門站1號線1號出口附近" },
    walk: { ko: "도보 약 2–4분", en: "About a 2–4 minute walk", ja: "徒歩約2〜4分", zh: "步行约2–4分钟", "zh-TW": "步行約2–4分鐘" },
    summary: { ko: "네이버 플레이스에 개별 장소로 등록된 역 인근 현금인출기입니다. 해외 발급 카드 지원과 수수료는 카드사·기기별로 다를 수 있습니다.", en: "A separately listed cash machine near the station. Foreign-card support and fees vary by card issuer and machine.", ja: "駅近くに個別登録されたATMです。海外発行カードの対応と手数料はカード会社・端末により異なります。", zh: "这是车站附近单独登记的ATM。境外银行卡支持和手续费会因发卡行及设备而异。", "zh-TW": "這是車站附近單獨登記的ATM。境外金融卡支援和手續費會因發卡行及設備而異。" },
    verification: { verifiedAt: "2026-09-11", sourceName: "Naver Place", sourceUrl: "https://pcmap.place.naver.com/place/1744939767/home" },
    maps: { naver: "https://map.naver.com/p/entry/place/1744939767", google: "https://www.google.com/maps/search/?api=1&query=%EB%86%8D%ED%98%91%EC%9D%80%ED%96%89%201%ED%98%B8%EC%84%A0%20%EB%8F%99%EB%8C%80%EB%AC%B8%EC%97%AD%20ATM" }
  },
  {
    id: "dongdaemun-tourist-information",
    name: { ko: "동대문 관광안내소", en: "Dongdaemun Tourist Information Center", ja: "東大門観光案内所", zh: "东大门旅游咨询中心", "zh-TW": "東大門旅遊諮詢中心" },
    aliases: { ko: ["관광 안내소", "외국어 안내"], en: ["tourist information", "English help"], ja: ["観光案内所", "外国語案内"], zh: ["旅游咨询中心", "外语服务"], "zh-TW": ["旅遊諮詢中心", "外語服務"] },
    categories: ["tourist-info", "translation", "maps", "tickets"],
    address: { ko: "서울 중구 장충단로 247", en: "247 Jangchungdan-ro, Jung-gu, Seoul", ja: "ソウル特別市 中区 奨忠壇路247", zh: "首尔特别市中区奖忠坛路247号", "zh-TW": "首爾特別市中區獎忠壇路247號" },
    walk: { ko: "도보 약 8–10분", en: "About an 8–10 minute walk", ja: "徒歩約8〜10分", zh: "步行约8–10分钟", "zh-TW": "步行約8–10分鐘" },
    summary: { ko: "영어·일본어·중국어 통역, 서울 지도·가이드북과 여행 정보를 무료로 안내합니다.", en: "Free travel information, maps and guidebooks with English, Japanese and Chinese assistance.", ja: "英語・日本語・中国語で、旅行情報、地図、ガイドブックを無料で案内します。", zh: "免费提供英语、日语和中文咨询，以及首尔地图和旅游手册。", "zh-TW": "免費提供英語、日語和中文諮詢，以及首爾地圖和旅遊手冊。" },
    hours: { schedule: "10:00–01:00", open: "10:00", close: "01:00", daily: true, holidayNote: "Lunar New Year and Chuseok closed" },
    verification: { verifiedAt: "2026-09-11", sourceName: "Official Seoul Tourism Guide", sourceUrl: "https://english.visitseoul.net/area/Dongdaemun-Tourist-Information-Center/ENP027215" },
    maps: placeMaps("동대문 관광안내소 서울 중구 장충단로 247")
  }
];

const knowledge = {
  version: VERSION,
  generatedAt: "2026-09-11",
  sourceOfTruth: "Current rendered site data",
  canonicalUrl: SITE_URL,
  languages,
  property: localized(language => ({
    name: data.brand,
    type: language === "ko" ? "여성 전용 숙소" : language === "ja" ? "女性専用宿泊施設" : language === "zh" ? "女性专用住宿" : language === "zh-TW" ? "女性專用住宿" : "Women-only accommodation",
    address: localize(data.address, language),
    nearestStation: localize(data.station, language),
    contact: localize(data.contact, language),
    maps
  })),
  quickGuide: localized(language => quickGuideTopics(language)),
  stay: localized(language => ({
    profile: localize(data.about, language),
    homeEditorial: localize(data.homeEditorial, language),
    essentials: localize(data.essentials, language).map(({ label, value, route }) => ({ label, value, source: pageUrl(route) })),
    checkin: pageText("checkin", language),
    checkout: pageText("checkout", language),
    luggage: { ...localize(data.luggage, language), source: pageUrl("checkin") },
    parking: { ...localize(data.parking, language), source: pageUrl("checkin"), rateMayChange: true },
    rules: pageText("rules", language),
    tvAndOtt: { ...localize(data.applianceNotice, language), source: pageUrl("appliances") }
  })),
  connectivity: localized(language => {
    const wifi = localize(data.pages.wifi, language);
    return {
      title: wifi.title,
      network: wifi.sections?.[0]?.value || "another",
      routerLocation: wifi.sections?.[2]?.body || "",
      passwordPolicy: language === "ko"
        ? "Wi-Fi 비밀번호는 공개 챗봇에서 제공하지 않습니다. 현재 숙소 Wi-Fi 안내 화면 또는 예약 플랫폼 메시지에서 확인해 주세요."
        : language === "ja"
          ? "Wi-Fiパスワードは公開チャットでは案内しません。宿のWi-Fi案内画面または予約プラットフォームのメッセージで確認してください。"
          : language === "zh"
            ? "公开聊天中不提供 Wi-Fi 密码。请查看住宿的 Wi-Fi 指南页面或预订平台消息。"
            : language === "zh-TW"
              ? "公開聊天中不提供 Wi-Fi 密碼。請查看住宿的 Wi-Fi 指南頁面或預訂平台訊息。"
              : "The Wi-Fi password is not disclosed in public chat. Check the property's Wi-Fi guide screen or your booking-platform message.",
      source: pageUrl("wifi")
    };
  }),
  arrivalAndTransport: localized(transportKnowledge),
  verifiedAirportTransport: {
    locales: localized(language => localize(airportTransport, language)),
    gimpoLine5: gimpoLine5Timetable
  },
  publicLocalDirectory: localized(language => ({
    origin: localize(data.address, language),
    familyDining: familyDiningPlaces.map(place => localize(place, language)),
    verifiedNearby: verifiedNearbyPlaces.map(place => localize(place, language)),
    verificationPolicy: language === "ko"
      ? "영업시간은 네이버 플레이스에서 2026-09-11 확인했습니다. 임시휴무와 당일 변경은 각 지도 링크에서 다시 확인합니다."
      : language === "ja"
        ? "営業時間は2026-09-11にNaver Placeで確認しました。臨時休業や当日の変更は各地図リンクで再確認してください。"
        : language === "zh"
          ? "营业时间已于2026-09-11通过 Naver Place 核实。临时停业或当天变更请在各地图链接中再次确认。"
          : language === "zh-TW"
            ? "營業時間已於2026-09-11透過 Naver Place 核實。臨時停業或當日變更請在各地圖連結中再次確認。"
            : "Hours were verified on Naver Place on 2026-09-11. Recheck each map link for temporary closures or same-day changes."
  })),
  appliances: localized(language => {
    const page = localize(data.pages.appliances, language);
    return {
      title: page.title,
      summary: page.summary,
      devices: (page.devices || []).map(device => ({
        name: device.name,
        ...(device.model ? { model: device.model } : {}),
        steps: device.steps || [],
        ...(device.manualLabel && device.manualUrl ? { officialManual: { label: device.manualLabel, url: device.manualUrl } } : {})
      })),
      source: pageUrl("appliances")
    };
  }),
  laundry: localized(language => {
    const page = localize(data.pages.laundry, language);
    return {
      title: page.title,
      model: page.model,
      summary: page.summary,
      caution: page.caution,
      sections: page.sections,
      officialManual: { label: page.manualLabel, url: page.manualUrl },
      source: pageUrl("laundry")
    };
  }),
  waste: localized(language => pageText("trash", language)),
  hostRecommendations: localized(language => ({
    restaurants: localize(data.pages.nearby.places, language).map(place => ({
      name: place.name,
      category: place.category,
      categories: place.categories || [],
      description: place.text,
      walk: place.walk,
      hostPick: Boolean(place.host),
      tags: place.tags || [],
      maps: { naver: place.naver, google: place.google },
      ...(place.aliases ? { aliases: place.aliases } : {}),
      ...(place.address ? { address: place.address } : {}),
      ...(place.verifiedHours ? { verifiedHours: place.verifiedHours } : {})
    })),
    tours: localize(tours.places, language).map(place => ({
      name: place.name,
      description: place.text,
      travel: place.travel,
      hostPick: Boolean(place.host),
      categories: place.categories || [],
      tags: place.tags || [],
      maps: { naver: place.naver, google: place.google },
      ...(place.official ? { official: place.official } : {})
    })),
    restaurantSource: pageUrl("nearby"),
    tourSource: pageUrl("tours")
  })),
  emergency: localized(language => ({
    propertySpecific: localize(data.contact, language),
    police: language === "ko" ? "범죄·신변 안전 긴급 상황은 112" : language === "ja" ? "犯罪・身の安全に関する緊急時は112" : language === "zh" ? "犯罪或人身安全紧急情况请拨打112" : language === "zh-TW" ? "犯罪或人身安全緊急情況請撥打112" : "Call 112 for police or personal-safety emergencies",
    fireOrMedical: language === "ko" ? "화재·구조·응급환자는 119" : language === "ja" ? "火災・救助・救急は119" : language === "zh" ? "火灾、救援或医疗急救请拨打119" : language === "zh-TW" ? "火災、救援或醫療急救請撥打119" : "Call 119 for fire, rescue, or medical emergencies",
    officialSources: [
      { label: "Korean National Police Agency", url: "https://police.go.kr/eng/main.do" },
      { label: "Korea National Fire Agency", url: "https://www.nfa.go.kr/eng/ems/service/" }
    ]
  })),
  guidebook: localized(language => ({
    title: localize(data.pages.guidebook.title, language),
    description: localize(data.pages.guidebook.summary, language),
    url: pageUrl("guidebook")
  })),
  policy: {
    sensitiveFieldsExcluded: ["Wi-Fi password", "door/access codes", "room assignment", "reservation identity or status", "approval", "guest-specific fees"],
    publicInformationMustBeSearched: true,
    accommodationFactsMustComeFromThisKnowledge: true
  },
  provenance: [...sourceScripts, "assets/gimpo-line5-timetable.json"]
};

const json = `${JSON.stringify(knowledge, null, 2)}\n`;
if (/another1234/.test(json)) throw new Error("Sensitive Wi-Fi password leaked into guide knowledge");
await writeFile(resolve(root, "assets/guide-knowledge.json"), json);

const audit = `# Concierge knowledge audit\n\nVersion: ${VERSION}\n\n| Area | Current page source | Previous chatbot state | Unified result |\n|---|---|---|---|\n| Address, check-in/out, transport, parking, luggage, rules | Current rendered page data | Sent ad hoc from the browser | Generated into one server-owned knowledge bundle |\n| Five-language quick guide | The same current page data in Korean, English, Japanese, Simplified Chinese and Traditional Chinese | Browser fallback omitted several property topics and the server could misclassify them as public search | Eleven common property topics are generated once and shared by the server and browser fallback |\n| Appliances, laundry, waste | Current page instructions; official manuals are secondary | Sent ad hoc from the browser | Current page text is primary; manual links remain supporting sources |\n| Nearby essentials | Naver Maps plus official venue/public sources | Depended on live search even for common needs | Seven property-specific places are pre-verified with exact addresses and map links |\n| Restaurants and tours | 26 restaurant cards and 21 tour cards | Loaded only for matching browser keywords | Included as clearly labeled host recommendations |\n| Wi-Fi | Network and password are visible on the Wi-Fi screen | Password could be sent to the model | Network retained; password deliberately excluded as sensitive |\n| Door/access and reservation data | Page tells guests where to retrieve guest-specific information | Could be mixed into browser context | Codes, room assignment, booking status and guest-specific details are prohibited |\n| General public information | Not part of the property manual | Previously rejected | Official-source web search is permitted only for non-property public questions |\n| Emergency | Booking-platform contact plus Korean public emergency services | No dedicated normalized section | 112/119 and official agency sources added; property-specific issues still use the booking platform |\n\nThe generator executes the same ordered data scripts as the website. Tests regenerate the bundle and fail if it is stale or contains the known Wi-Fi password.\n`;
const auditWithAirport = audit.replace(
  "| General public information |",
  "| Airport departures | Official K Airport Limousine, Incheon Airport and Seoul Metro timetables | Depended on live search and often missed embedded timetable rows | Every 6702/N6701 departure and every relevant Line 5 train to Gimpo Airport are pre-verified and selected deterministically |\n| General public information |"
);
await writeFile(resolve(root, "docs/concierge-knowledge-audit.md"), auditWithAirport);

console.log(`Generated guide knowledge ${VERSION} (${Buffer.byteLength(json)} bytes)`);
