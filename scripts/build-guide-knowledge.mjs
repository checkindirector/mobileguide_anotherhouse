import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const VERSION = "2026-09-11.2";
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
  stay: localized(language => ({
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
  publicLocalDirectory: localized(language => ({
    origin: localize(data.address, language),
    familyDining: familyDiningPlaces.map(place => localize(place, language)),
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
      description: place.text,
      walk: place.walk,
      hostPick: Boolean(place.host),
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
  provenance: sourceScripts
};

const json = `${JSON.stringify(knowledge, null, 2)}\n`;
if (/another1234/.test(json)) throw new Error("Sensitive Wi-Fi password leaked into guide knowledge");
await writeFile(resolve(root, "assets/guide-knowledge.json"), json);

const audit = `# Concierge knowledge audit\n\nVersion: ${VERSION}\n\n| Area | Current page source | Previous chatbot state | Unified result |\n|---|---|---|---|\n| Address, check-in/out, transport, parking, luggage, rules | Current rendered page data | Sent ad hoc from the browser | Generated into one server-owned knowledge bundle |\n| Appliances, laundry, waste | Current page instructions; official manuals are secondary | Sent ad hoc from the browser | Current page text is primary; manual links remain supporting sources |\n| Restaurants and tours | 26 restaurant cards and 21 tour cards | Loaded only for matching browser keywords | Included as clearly labeled host recommendations |\n| Wi-Fi | Network and password are visible on the Wi-Fi screen | Password could be sent to the model | Network retained; password deliberately excluded as sensitive |\n| Door/access and reservation data | Page tells guests where to retrieve guest-specific information | Could be mixed into browser context | Codes, room assignment, booking status and guest-specific details are prohibited |\n| General public information | Not part of the property manual | Previously rejected | Official-source web search is permitted only for non-property public questions |\n| Emergency | Booking-platform contact plus Korean public emergency services | No dedicated normalized section | 112/119 and official agency sources added; property-specific issues still use the booking platform |\n\nThe generator executes the same ordered data scripts as the website. Tests regenerate the bundle and fail if it is stale or contains the known Wi-Fi password.\n`;
await writeFile(resolve(root, "docs/concierge-knowledge-audit.md"), audit);

console.log(`Generated guide knowledge ${VERSION} (${Buffer.byteLength(json)} bytes)`);
