import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const VERSION = "2026-09-11.1";
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

const knowledge = {
  version: VERSION,
  generatedAt: "2026-09-09",
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
