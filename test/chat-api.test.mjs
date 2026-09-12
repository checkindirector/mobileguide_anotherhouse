import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/chat.js");
let accessCallSequence = 100;

function responseRecorder() {
  return { statusCode: 200, headers: {}, payload: null, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; } };
}

async function callApi(body, output, ip) {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  let request;
  const requests = [];
  const outputs = Array.isArray(output) ? output : [output];
  let outputIndex = 0;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    requests.push(request);
    const currentOutput = outputs[Math.min(outputIndex++, outputs.length - 1)];
    return { ok: true, status: 200, json: async () => currentOutput };
  };
  try {
    const req = { method: "POST", headers: { "x-forwarded-for": ip }, socket: {}, body };
    const res = responseRecorder();
    await handler(req, res);
    return { res, request, requests };
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
}

async function callAccess(body, entranceCode = "TESTACCESSCODE") {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalEntranceCode = process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE;
  delete process.env.OPENAI_API_KEY;
  process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE = entranceCode;
  global.fetch = async () => { throw new Error("Access recovery must not call OpenAI"); };
  try {
    const req = { method: "POST", headers: { "x-forwarded-for": `203.0.113.${accessCallSequence++}` }, socket: {}, body };
    const res = responseRecorder();
    await handler(req, res);
    return res;
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
    if (originalEntranceCode === undefined) delete process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE;
    else process.env.ANOTHER_HOUSE_COMMON_ENTRANCE_CODE = originalEntranceCode;
  }
}

test("every ordinary question reaches the model with the complete current guide", async () => {
  const { res, request } = await callApi(
    { message: "조식이 제공되나요?", language: "ko", context: { malicious: "ignored" }, history: [] },
    { model: "gpt-5.4-mini", output_text: "현재 홈페이지 안내에서는 조식 제공 여부가 확인되지 않습니다. 예약 플랫폼 메시지로 호스트에게 확인해 주세요.\nGUIDE_PAGE: home", usage: { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 80 } } },
    "203.0.113.20"
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.model, "gpt-5.4-mini");
  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.options.headers.Authorization, "Bearer test-key");
  assert.equal(request.body.model, "gpt-5.4-mini");
  assert.equal(request.body.store, false);
  assert.equal(request.body.tools[0].type, "web_search");
  assert.equal(request.body.tool_choice, "auto");
  assert.match(request.body.instructions, /FULL_CURRENT_GUIDE version 2026-09-12\.6/);
  assert.match(request.body.instructions, /The very first sentence must give the conclusion/);
  assert.match(request.body.instructions, /Never paste or paraphrase an entire guide section/);
  assert.match(request.body.instructions, /capacity must answer the capacity/);
  assert.match(request.body.instructions, /MAP_SPOT: <canonical place name> \| <complete street address>/);
  assert.match(request.body.instructions, /GUIDE_PAGE: <route>/);
  assert.match(request.body.instructions, /LG FY9WTB · wash 9 kg \/ dry 4\.5 kg/);
  assert.match(request.body.instructions, /"dryCapacityKg":4\.5/);
  assert.match(request.body.instructions, /싱글룸 11실 · 더블룸 1실/);
  assert.match(request.body.instructions, /503호 앞 러기지룸/);
  assert.doesNotMatch(request.body.instructions, /another1234|malicious/);
  assert.equal(request.body.prompt_cache_key, "another-house-2026-09-12.6-ko");
  assert.doesNotMatch(request.body.input.at(-1).content, /GUIDE_KNOWLEDGE|FULL_CURRENT_GUIDE/);
  assert.ok(request.body.instructions.length > 40000);
  assert.equal(res.payload.meta.cachedTokens, 80);
  assert.equal(res.payload.meta.searched, false);
  assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "home"]]);
  assert.equal(res.payload.links[0].url, "https://anotherhouse-guide.vercel.app/?page=home");
});

test("site knowledge is answered naturally through the model in all five languages", async () => {
  const cases = [
    ["짐보관 가능한지", "ko", "네, 503호 앞 러기지룸에 체크아웃 당일 23:00까지 무료로 보관할 수 있습니다.\nGUIDE_PAGE: checkin", /503호 앞.*23:00/s],
    ["Can I store luggage?", "en", "Yes. Use the luggage room in front of Room 503 free of charge until 23:00 on checkout day.\nGUIDE_PAGE: checkin", /Room 503.*23:00/s],
    ["荷物を預けられますか", "ja", "はい。503号室前のラゲッジルームに、チェックアウト当日の23時まで無料で預けられます。\nGUIDE_PAGE: checkin", /503号室.*23時/s],
    ["可以寄存行李吗", "zh", "可以。您可免费寄存在503号房前的行李房，使用至退房当天23:00。\nGUIDE_PAGE: checkin", /503号房.*23:00/s],
    ["可以寄放行李嗎", "zh-TW", "可以。您可免費寄放在503號房前的行李房，使用至退房當天23:00。\nGUIDE_PAGE: checkin", /503號房.*23:00/s]
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const [message, language, outputText, expected] = cases[index];
    const { res, request, requests } = await callApi({ message, language, history: [] }, { model: "gpt-5.4-mini", output_text: outputText, output: [], usage: {} }, `203.0.113.${110 + index}`);
    assert.equal(requests.length, 1);
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.model, "gpt-5.4-mini");
    assert.equal(res.payload.meta.searched, false);
    assert.equal(request.body.tool_choice, "auto");
    assert.equal(res.payload.meta.knowledgeVersion, "2026-09-12.6");
    assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "checkin"]]);
    assert.match(res.payload.answer, expected);
    assert.doesNotMatch(res.payload.answer, /최신 공개정보|public information|公开信息|公開資訊/);
  }
  assert.equal(handler._internals.searchLevelFor("짐보관 가능한지"), null);
  assert.equal(handler._internals.searchLevelFor("서울역 짐보관 장소 어디야?"), "medium");
});

test("nuanced property questions use the complete guide without a forced search", async () => {
  const cases = [
    ["Can I check in late?", "en", "checkin", "Self check-in is available from 15:00. Please follow the kiosk instructions."],
    ["住宿可以停车吗", "zh", "checkin", "不可以，大楼内不提供停车位。请使用附近的付费停车场。"],
    ["싱글룸이 몇 개야?", "ko", "gallery", "싱글룸은 11실입니다."],
    ["Wi-Fi는 사용할 수 있나요?", "ko", "wifi", "네, Wi-Fi를 이용할 수 있습니다."],
    ["수건이 더 있나요?", "ko", "appliances", "네, 공용 공간의 GUEST BOX에 여분 수건이 있습니다."]
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const [message, language, route, outputText] = cases[index];
    const { res, request, requests } = await callApi(
      { message, language, history: [] },
      { model: "gpt-5.4-mini", output_text: outputText, usage: { input_tokens: 110, output_tokens: 24, input_tokens_details: { cached_tokens: 80 } } },
      `198.51.100.${190 + index}`
    );
    assert.equal(requests.length, 1);
    assert.equal(request.body.tool_choice, "auto");
    assert.equal(res.payload.model, "gpt-5.4-mini");
    assert.equal(res.payload.meta.guideRoute, route);
    assert.equal(res.payload.meta.searched, false);
    assert.ok(res.payload.meta.guideKnowledgeChars > 40000);
    assert.match(request.body.instructions, /LG FY9WTB/);
    assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", route]]);
  }
});

test("short follow-up questions inherit the previous guide topic", async () => {
  const { res, request, requests } = await callApi(
    {
      message: "그건 어디에 있어요?",
      language: "ko",
      history: [
        { role: "user", text: "수건이 더 있나요?" },
        { role: "assistant", text: "네, 여분 수건이 있습니다." }
      ]
    },
    { model: "gpt-5.4-mini", output_text: "여분 수건은 공용 공간의 GUEST BOX에 있습니다.", usage: {} },
    "198.51.100.199"
  );
  assert.equal(requests.length, 1);
  assert.equal(request.body.tool_choice, "auto");
  assert.equal(res.payload.meta.guideRoute, "appliances");
  assert.match(request.body.instructions, /GUEST BOX/);
  assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "appliances"]]);
});

test("device capacity questions answer the requested attribute rather than existence", async () => {
  const cases = [
    ["건조기 용량", "건조기 용량은 4.5kg입니다. 세탁·건조 겸용 모델은 LG FY9WTB입니다.\nGUIDE_PAGE: laundry", /4\.5kg/],
    ["세탁기 용량", "세탁기 용량은 9kg입니다. 세탁·건조 겸용 모델은 LG FY9WTB입니다.\nGUIDE_PAGE: laundry", /9kg/]
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const [message, outputText, expected] = cases[index];
    const { res, request, requests } = await callApi({ message, language: "ko", history: [] }, { model: "gpt-5.4-mini", output_text: outputText, output: [], usage: {} }, `198.51.100.${150 + index}`);
    assert.equal(requests.length, 1);
    assert.equal(request.body.tool_choice, "auto");
    assert.match(res.payload.answer, expected);
    assert.doesNotMatch(res.payload.answer, /건조기가 있습니다|세탁기가 있습니다/);
    assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "laundry"]]);
  }
});

test("a detergent question returns only the requested fact instead of dumping the laundry guide", async () => {
  const cases = [
    ["세탁세제가 있나요?", "ko", "네, 세탁세제와 섬유유연제가 있습니다. 세탁기 위 선반에 있어요.\nGUIDE_PAGE: laundry", /네, 세탁세제와 섬유유연제가 있습니다.*세탁기 위 선반/s],
    ["Is detergent provided?", "en", "Yes, detergent and fabric softener are provided on the shelf above the machine.\nGUIDE_PAGE: laundry", /Yes, detergent and fabric softener.*shelf above/s]
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const [message, language, outputText, expected] = cases[index];
    const { res, requests } = await callApi({ message, language, history: [] }, { model: "gpt-5.4-mini", output_text: outputText, output: [], usage: {} }, `198.51.100.${170 + index}`);
    assert.equal(requests.length, 1);
    assert.match(res.payload.answer, expected);
    assert.doesNotMatch(res.payload.answer, /밤 10시|화상|먼지 필터|Press Power|22時まで|绒毛过滤器|絨毛過濾器/);
    assert.ok(res.payload.answer.length < 180);
  }
});

test("a laundry problem is handled by the AI instead of a generic keyword dump", async () => {
  const { res, request } = await callApi(
    { message: "세탁세제가 선반에 없어요. 어떻게 해야 하나요?", language: "ko", history: [] },
    { model: "gpt-5.4-mini", output_text: "현재 선반에서 세탁세제를 찾을 수 없다면 예약 플랫폼 메시지로 호스트에게 알려 주세요.", usage: { input_tokens: 90, output_tokens: 24, input_tokens_details: { cached_tokens: 70 } } },
    "198.51.100.180"
  );
  assert.equal(res.payload.model, "gpt-5.4-mini");
  assert.equal(request.body.tool_choice, "auto");
  assert.match(request.body.instructions, /complete procedure only when the guest explicitly asks/i);
  assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "laundry"]]);
});

test("late checkout answers link to the combined check-in page instead of a nonexistent route", async () => {
  const { res, requests } = await callApi({ message: "레이트 체크아웃", language: "ko", history: [] }, { model: "gpt-5.4-mini", output_text: "아니요, 레이트 체크아웃은 불가합니다. 체크아웃은 11:00까지입니다.\nGUIDE_PAGE: checkin", output: [], usage: {} }, "203.0.113.140");
  assert.equal(requests.length, 1);
  assert.equal(res.payload.links[0].route, "checkin");
  assert.equal(res.payload.links[0].label, "체크인 · 체크아웃 안내 바로가기");
  assert.match(res.payload.links[0].url, /\?page=checkin$/);
});

test("every site section can resolve to its own guide page", () => {
  const cases = [
    ["숙소 소개와 여성 전용 여부", "ko", "gallery"], ["주소와 찾아오는 길", "ko", "transport"],
    ["체크인 시간", "ko", "checkin"], ["Wi-Fi 안내", "en", "wifi"], ["전자레인지 사용법", "ko", "appliances"],
    ["세탁기 사용법", "ko", "laundry"], ["분리수거", "ko", "trash"], ["흡연 규칙", "ko", "rules"],
    ["주변 맛집 추천", "ko", "restaurants"], ["추천 근교 투어", "ko", "tours"], ["조식 제공 여부", "ko", "home"]
  ];
  for (const [message, language, route] of cases) assert.equal(handler._internals.guideRouteFromQuestion(message, language), route, message);
});

test("ordinary kiosk check-in questions stay in the guide instead of key-card recovery", async () => {
  const { res, requests } = await callApi(
    { message: "키오스크로 체크인 어떻게 해?", language: "ko", history: [] },
    { model: "gpt-5.4-mini", output_text: "5층 키오스크에서 예약자 이름을 입력하고 안내에 따라 셀프 체크인을 진행해 주세요.\nGUIDE_PAGE: checkin", output: [], usage: {} },
    "203.0.113.139"
  );
  assert.equal(requests.length, 1);
  assert.equal(res.payload.model, "gpt-5.4-mini");
  assert.equal(res.payload.links[0].route, "checkin");
  assert.match(res.payload.answer, /셀프 체크인|키오스크/);
  assert.doesNotMatch(res.payload.answer, /새 키카드/);
});

test("public information uses medium web search and returns trusted source links", async () => {
  const output = {
    model: "gpt-5.4-mini",
    output_text: "숙소 안내가 아닌 공개 자료를 확인한 정보입니다. 오늘 동대문 날씨는 맑습니다.",
    output: [{ type: "web_search_call", action: { sources: [
      { title: "기상청", url: "https://www.weather.go.kr/" },
      { title: "Unsafe", url: "http://127.0.0.1/private" }
    ] } }],
    usage: { input_tokens: 120, output_tokens: 30, input_tokens_details: { cached_tokens: 64 } }
  };
  const { res, request } = await callApi({ message: "오늘 동대문 날씨 알려줘", language: "ko", history: [] }, output, "203.0.113.21");
  assert.equal(request.body.tools[0].type, "web_search");
  assert.equal(request.body.tools[0].search_context_size, "medium");
  assert.deepEqual(request.body.include, ["web_search_call.action.sources"]);
  assert.equal(res.payload.meta.searched, true);
  assert.equal(res.payload.meta.searchLevel, "medium");
  assert.match(res.payload.answer, /^※ 숙소 안내가 아닌 공개 자료/);
  assert.equal(res.payload.links.length, 1);
  assert.equal(res.payload.links[0].label, "확인한 출처 · weather.go.kr");
});

test("first-time traveler topics search current public information without a Naver place pass", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "Use the current official guidance.", output: [{ type: "web_search_call", action: { sources: [] } }], usage: {} };
  const cases = [
    "Can I use a Visa card to buy a subway ticket?",
    "Where should I buy an eSIM for Korea?",
    "What power plug and voltage does Korea use?",
    "Which map app should I use in Seoul?"
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const { request, requests } = await callApi({ message: cases[index], language: "en" }, output, `203.0.113.${60 + index}`);
    assert.equal(requests.length, 1);
    assert.equal(request.body.tools[0].type, "web_search");
    assert.equal(request.body.tools[0].search_context_size, "medium");
  }
});

test("questions outside the property guide force a current public search", async () => {
  const output = {
    model: "gpt-5.4-mini",
    output_text: "아니요, 한국 식당에서는 일반적으로 팁을 주지 않습니다.",
    output: [{ type: "web_search_call", action: { sources: [{ title: "Korea travel etiquette", url: "https://english.visitkorea.or.kr/" }] } }],
    usage: {}
  };
  const { res, request, requests } = await callApi({ message: "한국 식당에서는 팁을 줘야 하나요?", language: "ko", history: [] }, output, "203.0.113.63");
  assert.equal(requests.length, 1);
  assert.equal(request.body.tool_choice, "required");
  assert.equal(res.payload.meta.searched, true);
  assert.equal(res.payload.links.some(link => link.kind === "source"), true);
  assert.equal(res.payload.links.some(link => link.kind === "guide"), false);
  assert.match(res.payload.answer, /아니요.*팁/s);
});

test("exact last-mile property directions use guide knowledge without public web search", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "From Exit 6, look for Kyochon Chicken and the dental sign at Sunil Building, take the elevator to 5F, then go down half a floor to the glass-door reception.\nGUIDE_PAGE: transport", output: [], usage: {} };
  const { request, requests } = await callApi({ message: "I am at Dongdaemun Station Exit 6 but cannot find the building entrance. What landmarks should I look for?", language: "en" }, output, "203.0.113.64");
  assert.equal(requests.length, 1);
  assert.equal(request.body.tool_choice, "auto");
  assert.match(request.body.instructions, /CURRENT_GUIDE\.arrivalAndTransport\.localArrival/);
});

test("source links prioritize Naver and official domains over aggregators", () => {
  const data = { output: [{ type: "web_search_call", action: { sources: [
    { url: "https://en.wikipedia.org/wiki/Test" },
    { url: "https://www.diningcode.com/profile.php?rid=1" },
    { url: "https://www.airport.kr/example" },
    { url: "https://m.place.naver.com/place/123/home" }
  ] } }] };
  const links = handler._internals.extractSources(data, "en");
  assert.deepEqual(links.map(link => link.label), [
    "Verified source · m.place.naver.com",
    "Verified source · airport.kr"
  ]);
});

test("late-night Incheon transport uses the pre-verified timetable without web search", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "공개 운행 자료를 확인한 정보입니다.", output: [{ type: "web_search_call", action: { sources: [] } }], usage: {} };
  const { res, requests } = await callApi({ message: "새벽 4시에 인천공항 가는 정확한 교통편", language: "ko" }, output, "203.0.113.22");
  assert.equal(requests.length, 0);
  assert.equal(res.payload.model, "another-house-verified-airport-transport");
  assert.equal(res.payload.meta.mode, "night-overview");
  assert.match(res.payload.answer, /N6701/);
});

test("airport bus and airport limousine wording share one searched transport intent", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "공항리무진 운행 정보를 확인했습니다.", output: [{ type: "web_search_call", action: { sources: [] } }], usage: {} };
  const cases = [
    ["공항버스는 어디서 타나요?", "203.0.113.40"],
    ["공항리무진은 어디서 타나요?", "203.0.113.41"],
    ["리무진버스는 어디서 타나요?", "203.0.113.42"]
  ];
  for (const [message, ip] of cases) {
    const { request } = await callApi({ message, language: "ko" }, output, ip);
    assert.equal(request.body.tools[0].search_context_size, "medium");
    assert.match(request.body.instructions, /airport bus, airport limousine, limousine bus/);
    assert.match(request.body.instructions, /same airport-bus category/);
  }
});

test("limousine-only wording receives an official airport source fallback", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "리무진버스 운행 정보를 확인했습니다.", output: [{ type: "web_search_call", action: { sources: [] } }], usage: {} };
  const { res } = await callApi({ message: "리무진버스 어디서 타요?", language: "ko" }, output, "203.0.113.43");
  assert.equal(res.payload.links[0].url, "https://www.airport.kr/");
  assert.match(res.payload.links[0].label, /인천국제공항/);
});

test("time-specific dining requests force high-context web search", async () => {
  const naverOutput = {
    model: "gpt-5.4-mini",
    output_text: "네이버지도에서 에그드랍 동대문점의 영업시간과 주소를 확인했습니다.",
    output: [{ type: "web_search_call", action: { sources: [{ title: "에그드랍 동대문점 네이버지도", url: "https://m.place.naver.com/restaurant/123/home" }] } }],
    usage: {}
  };
  const output = {
    model: "gpt-5.4-mini",
    output_text: "에그드랍 동대문점은 공개 영업정보상 22:00까지 운영합니다.",
    output: [{ type: "web_search_call", action: { sources: [{ title: "에그드랍 동대문점", url: "https://www.tabling.co.kr/place/677ccdae66de5f069881845c" }] } }],
    usage: {}
  };
  const cases = [
    ["밤 9시 이후 식사 가능한 곳", "203.0.113.45"],
    ["지금 문 연 식당 알려줘", "203.0.113.46"],
    ["Find a restaurant open after 9 pm", "203.0.113.47"]
  ];
  for (const [message, ip] of cases) {
    const { res, request, requests } = await callApi({ message, language: message.startsWith("Find") ? "en" : "ko" }, [naverOutput, output], ip);
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0].body.tools[0].filters.allowed_domains, ["map.naver.com", "m.place.naver.com", "pcmap.place.naver.com", "naver.me"]);
    assert.equal(requests[0].body.tool_choice, "required");
    assert.equal(requests[0].body.tools[0].user_location.country, "KR");
    assert.match(requests[0].body.input[0].content, /DEFAULT_SEARCH_ORIGIN: ANOTHER HOUSE,/);
    assert.match(requests[0].body.input[0].content, message.startsWith("Find") ? /294 Jong-ro/ : /서울시 종로구 종로 294/);
    assert.match(request.body.input.at(-1).content, /NAVER_MAP_PRIMARY_EVIDENCE/);
    assert.match(request.body.input.at(-1).content, /네이버지도에서 에그드랍/);
    assert.equal(request.body.tool_choice, "required");
    assert.equal(request.body.tools[0].search_context_size, "high");
    assert.match(request.body.instructions, /For dining recommendations tied to a stated time or current opening status, search before answering/);
    assert.match(request.body.instructions, /Generic tourism pages such as VisitKorea must never replace Naver Map as the primary local source/);
    assert.equal(res.payload.meta.searched, true);
    assert.equal(res.payload.meta.naverPrimarySearched, true);
    assert.equal(res.payload.meta.crossCheckSearched, true);
    assert.equal(res.payload.meta.searchCalls, 2);
    assert.equal(res.payload.links[0].url, "https://m.place.naver.com/restaurant/123/home");
  }
});

test("pre-verified Incheon airport timetable answers exact early departures without web search", async () => {
  const { res, requests } = await callApi(
    { message: "인천공항에 새벽 6시까지 가야함", language: "ko", history: [] },
    { model: "unused" },
    "203.0.113.90"
  );
  assert.equal(requests.length, 0);
  assert.equal(res.payload.model, "another-house-verified-airport-transport");
  assert.equal(res.payload.meta.searched, false);
  assert.equal(res.payload.meta.mode, "night");
  assert.equal(res.payload.meta.knowledgeVersion, "2026-09-12.6");
  assert.match(res.payload.answer, /DDP 정류장 02:55 출발/);
  assert.match(res.payload.answer, /T1 04:15, T2 04:35/);
  assert.match(res.payload.answer, /평일·주말·공휴일/);
  assert.equal(res.payload.links.filter(link => link.kind === "map").length, 2);
  assert.equal(res.payload.links.filter(link => link.kind === "source").length, 2);
});

test("airport overview contains every published 6702 and N6701 departure", () => {
  const result = handler._internals.verifiedAirportTransport("숙소에서 인천공항 가는 법", "ko");
  assert.equal(result.mode, "overview");
  assert.match(result.answer, /04:07 · 04:37 · 05:17/);
  assert.match(result.answer, /19:22 · 19:52/);
  assert.match(result.answer, /23:00 → T1 00:20 \/ T2 00:40/);
  assert.match(result.answer, /02:55 → T1 04:15 \/ T2 04:35/);
});

test("Korean outbound limousine wording stays in departure mode and exposes the exact stop maps", async () => {
  const { res, requests } = await callApi(
    { message: "인천공항으로 가는 리무진버스", language: "ko", history: [] },
    { model: "unused" },
    "203.0.113.91"
  );
  assert.equal(requests.length, 0);
  assert.equal(res.payload.model, "another-house-verified-airport-transport");
  assert.equal(res.payload.meta.mode, "overview");
  assert.match(res.payload.answer, /숙소에서 정류장까지/);
  assert.match(res.payload.answer, /5층 리셉션에서 엘리베이터로 1층/);
  assert.match(res.payload.answer, /정류장 01901/);
  assert.doesNotMatch(res.payload.answer, /6번 출구.*5층|리셉션으로 들어/);
  assert.equal(res.payload.links.filter(link => link.kind === "map").length, 2);
  assert.match(res.payload.links[0].label, /동대문역\(JW메리어트호텔동대문\).*네이버 지도/);
  assert.match(res.payload.links[1].label, /동대문역\(JW메리어트호텔동대문\).*Google Maps/);
});

test("Gimpo airport selects exact trains by service day and rejects impossible early rail arrivals", () => {
  const weekday = handler._internals.verifiedAirportTransport("김포공항에 평일 오전 8시까지 도착해야 해", "ko", new Date("2026-09-11T03:00:00Z"));
  assert.equal(weekday.mode, "selected-train");
  assert.equal(weekday.serviceDay, "DAY");
  assert.match(weekday.answer, /07:12.*07:58/);
  assert.match(weekday.answer, /평일 05:37→06:23 \/ 24:09→24:55/);

  const holiday = handler._internals.verifiedAirportTransport("공휴일 김포공항에 새벽 6시까지", "ko", new Date("2026-09-11T03:00:00Z"));
  assert.equal(holiday.mode, "taxi-required");
  assert.equal(holiday.serviceDay, "END");
  assert.match(holiday.answer, /지하철로 도착할 수 없습니다/);
  assert.match(holiday.answer, /택시/);
  assert.match(holiday.answer, /일요일·공휴일 05:37→06:23 \/ 23:20→24:06/);
});

test("verified airport selections work in every supported guest language", () => {
  const cases = [
    ["I need to arrive at Incheon Airport by 6 am", "en", /02:55.*T1.*04:15.*T2.*04:35/s],
    ["平日の午前8時までに金浦空港へ到着したい", "ja", /07:12.*07:58/s],
    ["工作日早上8点前抵达金浦机场", "zh", /07:12.*07:58/s],
    ["國定假日凌晨6點前抵達金浦機場", "zh-TW", /無法.*地鐵.*06:23/s]
  ];
  for (const [message, language, expected] of cases) {
    const result = handler._internals.verifiedAirportTransport(message, language, new Date("2026-09-11T03:00:00Z"));
    assert.ok(result);
    assert.match(result.answer, expected);
  }
});

test("airport-to-property questions remain with the arrival guide", () => {
  assert.equal(handler._internals.verifiedAirportTransport("인천공항에서 숙소까지 어떻게 와?", "ko"), null);
  assert.equal(handler._internals.verifiedAirportTransport("How do I get from Gimpo Airport to Another House?", "en"), null);
});

test("time-specific family dining combines current search with the complete local guide", async () => {
  const naverOutput = { model: "gpt-5.4-mini", output_text: "네이버지도에서 본우리반상과 포메인RED의 현재 영업 정보를 확인했습니다.", output: [{ type: "web_search_call", action: { sources: [{ title: "네이버지도", url: "https://map.naver.com/p/entry/place/2046166635" }] } }], usage: {} };
  const finalOutput = { model: "gpt-5.4-mini", output_text: "네, 밤 8시 이후 아이와 식사하기에는 본우리반상 동대문두타점과 포메인RED 두타몰직영점이 실용적입니다. 본우리반상은 라스트오더가 21:00이고 유아의자가 있습니다.\nGUIDE_PAGE: restaurants", output: [{ type: "web_search_call", action: { sources: [{ title: "두타몰", url: "https://www.doota-mall.com/" }] } }], usage: {} };
  const { res, request, requests } = await callApi(
    { message: "밤 8시 이후에 아이와 식사 가능한 곳 주변에 있어? 어나더하우스 주소 기준", language: "ko", history: [] },
    [naverOutput, finalOutput],
    "203.0.113.57"
  );
  assert.equal(requests.length, 2);
  assert.equal(request.body.tool_choice, "required");
  assert.equal(res.payload.model, "gpt-5.4-mini");
  assert.equal(res.payload.meta.searched, true);
  assert.equal(res.payload.meta.knowledgeVersion, "2026-09-12.6");
  assert.match(res.payload.answer, /본우리반상 동대문두타점/);
  assert.match(res.payload.answer, /라스트오더(?:가)? 21:00/);
  assert.match(res.payload.answer, /포메인RED 두타몰직영점/);
  assert.equal(res.payload.links.at(-1).route, "restaurants");
  assert.match(request.body.instructions, /유아의자/);
});

test("pre-verified nearby essentials remain available while local place search runs Naver first", async () => {
  const naverOutput = { model: "gpt-5.4-mini", output_text: "네이버지도에서 CU 동대문역점을 확인했습니다.", output: [{ type: "web_search_call", action: { sources: [{ title: "CU 동대문역점", url: "https://map.naver.com/p/entry/place/20166740" }] } }], usage: {} };
  const finalOutput = { model: "gpt-5.4-mini", output_text: "가장 가까운 편의점은 CU 동대문역점이며 숙소에서 도보 약 2~3분입니다.", output: [{ type: "web_search_call", action: { sources: [] } }], usage: {} };
  const { res, request, requests } = await callApi({ message: "가장 가까운 편의점 어디야?", language: "ko", history: [] }, [naverOutput, finalOutput], "203.0.113.70");
  assert.equal(requests.length, 2);
  assert.equal(request.body.tool_choice, "required");
  assert.equal(res.payload.meta.searched, true);
  assert.match(request.body.instructions, /CU 동대문역점/);
  assert.match(res.payload.answer, /도보 약 2~3분/);
  assert.equal(res.payload.links.filter(link => link.kind === "map").length, 2);
});

test("restaurant and attraction recommendations combine curated guide knowledge with live place search", async () => {
  const cases = [
    ["숙소 근처 카페 추천해줘", "ko", "커피한약방과 어니언 안국점을 추천합니다. 두 곳 모두 숙소의 주변 맛집 가이드에 있는 카페입니다.\nGUIDE_PAGE: restaurants", "restaurants"],
    ["What nearby attractions are good for a walk?", "en", "Try Heunginjimun and the Seoul City Wall trail for an easy walk from Another House.\nGUIDE_PAGE: tours", "tours"]
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const [message, language, outputText, route] = cases[index];
    const naverOutput = { model: "gpt-5.4-mini", output_text: "Naver place evidence found.", output: [{ type: "web_search_call", action: { sources: [{ title: "Naver Maps", url: `https://map.naver.com/p/entry/place/${800 + index}` }] } }], usage: {} };
    const finalOutput = { model: "gpt-5.4-mini", output_text: outputText, output: [{ type: "web_search_call", action: { sources: [] } }], usage: {} };
    const { res, request, requests } = await callApi({ message, language, history: [] }, [naverOutput, finalOutput], `203.0.113.${80 + index}`);
    assert.equal(requests.length, 2);
    assert.equal(request.body.tool_choice, "required");
    assert.equal(res.payload.meta.searched, true);
    assert.equal(res.payload.links.at(-1).route, route);
  }
});

test("an unknown named venue hours question is not replaced by a different directory venue", () => {
  assert.equal(handler._internals.verifiedNearbyPlaces("종로온누리약국 영업시간 알려줘", "ko"), null);
  assert.equal(handler._internals.isPlaceSearchIntent("숙소 근처 ATM 어디야?"), true);
  assert.equal(handler._internals.isPlaceSearchIntent("숙소 근처 코인세탁소 추천해줘"), true);
  assert.equal(handler._internals.isPlaceSearchIntent("Where is a laundromat near the hostel?"), true);
});

test("property address used only as a nearby-search origin never creates property map buttons", () => {
  assert.equal(handler._internals.asksForPropertyAddress("아이와 식사할 곳을 어나더하우스 주소 기준으로 찾아줘", "", "ko"), false);
});

test("verified Naver Place hours answer directly without an unreliable web-search pass", async () => {
  const fixed = handler._internals.verifiedPlaceHours("에그드랍 동대문점은 지금 영업 중이야?", "ko", new Date("2026-09-09T09:45:00Z"));
  assert.match(fixed.answer, /현재 영업 중/);
  assert.match(fixed.answer, /매일 07:00–22:00/);
  assert.match(fixed.answer, /오늘은 22:00에 영업 종료/);
  assert.match(fixed.answer, /네이버지도와 Google Maps 링크/);
  assert.equal(fixed.links.length, 1);
  assert.equal(fixed.links[0].url, "https://map.naver.com/p/entry/place/1736990079");
  assert.deepEqual(fixed.mapContext, { name: "에그드랍 동대문점", address: "서울 중구 을지로 255 기승빌딩 B동 에그드랍" });

  const naverOutput = { model: "gpt-5.4-mini", output_text: "네이버지도에서 에그드랍 동대문점의 영업시간을 확인했습니다.", output: [{ type: "web_search_call", action: { sources: [{ title: "에그드랍 네이버지도", url: "https://map.naver.com/p/entry/place/1736990079" }] } }], usage: {} };
  const finalOutput = { model: "gpt-5.4-mini", output_text: "에그드랍 동대문점은 매일 07:00–22:00 영업합니다.\nGUIDE_PAGE: restaurants", output: [{ type: "web_search_call", action: { sources: [] } }], usage: {} };
  const { res, requests } = await callApi({ message: "에그드랍은 몇 시까지 영업해?", language: "ko", history: [] }, [naverOutput, finalOutput], "203.0.113.49");
  assert.equal(requests.length, 2);
  assert.equal(res.payload.model, "gpt-5.4-mini");
  assert.equal(res.payload.meta.searched, true);
  assert.match(res.payload.answer, /매일 07:00–22:00/);
  assert.doesNotMatch(res.payload.answer, /전화|문의/);
});

test("place results offer maps only after an exact spot is resolved", async () => {
  const naverOutput = {
    model: "gpt-5.4-mini",
    output_text: "네이버지도에서 동대문라운지바의 주소를 확인했습니다.",
    output: [{ type: "web_search_call", action: { sources: [{ title: "동대문라운지바 네이버지도", url: "https://m.place.naver.com/place/321/home" }] } }],
    usage: {}
  };
  const crossCheckOutput = {
    model: "gpt-5.4-mini",
    output_text: "동대문라운지바를 확인했습니다.\nMAP_SPOT: 동대문라운지바 | 서울특별시 종로구 종로 293",
    output: [{ type: "web_search_call", action: { sources: [{ title: "공공 약국 정보", url: "https://www.e-gen.or.kr/" }] } }],
    usage: {}
  };
  const { res } = await callApi({ message: "숙소 근처 술집 추천해줘", language: "ko", history: [] }, [naverOutput, crossCheckOutput], "203.0.113.50");
  assert.match(res.payload.answer, /원하시면 이 장소의 네이버지도와 Google Maps 링크를 바로 연결해 드릴게요/);
  assert.equal(res.payload.links.filter(link => link.kind === "map").length, 0);
  assert.deepEqual(res.payload.mapContext, { name: "동대문라운지바", address: "서울특별시 종로구 종로 293" });
  assert.equal(res.payload.links[0].url, "https://m.place.naver.com/place/321/home");
  assert.equal(res.payload.links[1].url, "https://www.e-gen.or.kr/");
});

test("unresolved place results still offer a named follow-up and hide unusable search links", async () => {
  const naverOutput = {
    model: "gpt-5.4-mini",
    output_text: "NAVER_MAP_NOT_CONFIRMED",
    output: [{ type: "web_search_call", action: { sources: [{ title: "Naver tracking", url: "https://pts.map.naver.com/place/trace" }] } }],
    usage: {}
  };
  const crossCheckOutput = {
    model: "gpt-5.4-mini",
    output_text: "교촌치킨과 타볼로 24를 후보로 확인했지만 정확한 주소는 확정하지 못했습니다.",
    output: [{ type: "web_search_call", action: { sources: [{ title: "Google search", url: "https://www.google.com/search?q=dongdaemun+dinner" }] } }],
    usage: {}
  };
  const { res } = await callApi({ message: "밤 9시 이후 혼자 식사 가능한 곳", language: "ko", history: [] }, [naverOutput, crossCheckOutput], "203.0.113.52");
  assert.match(res.payload.answer, /위 장소 중 하나를 말씀해 주세요/);
  assert.match(res.payload.answer, /네이버지도와 Google Maps 링크를 바로 연결해 드릴게요/);
  assert.deepEqual(res.payload.links, []);
  assert.equal(res.payload.mapContext, null);
});

test("unconfirmed hours for a known guide venue show immediate Naver and Google map buttons", async () => {
  assert.equal(handler._internals.unconfirmedHoursFallback("태극당 영업시간 알려줘", "태극당은 22:00까지 영업하는 것으로 확인했습니다.", "ko", null), null);
  assert.equal(handler._internals.unconfirmedHoursFallback("태극당 영업시간 알려줘", "태극당의 정확한 영업시간은 현재 결과만으로 확정할 수 없습니다.", "ko", null).links.length, 2);
  const naverOutput = {
    model: "gpt-5.4-mini",
    output_text: "NAVER_MAP_NOT_CONFIRMED: 영업시간 상세를 읽지 못했습니다.",
    output: [{ type: "web_search_call", action: { sources: [{ title: "Naver tracking", url: "https://rtt.map.naver.com/trace" }] } }],
    usage: {}
  };
  const crossCheckOutput = {
    model: "gpt-5.4-mini",
    output_text: "태극당은 지점에 따라 영업시간이 달라서 현재 공개 정보만으로 안전하게 확정하기 어렵습니다. 매장에 전화로 문의해 주세요.",
    output: [{ type: "web_search_call", action: { sources: [] } }],
    usage: {}
  };
  const { res } = await callApi({ message: "태극당 영업시간 알려줘", language: "ko", history: [] }, [naverOutput, crossCheckOutput], "203.0.113.53");
  assert.match(res.payload.answer, /네이버지도 또는 Google Maps에서 지금 바로/);
  assert.doesNotMatch(res.payload.answer, /전화|문의/);
  assert.deepEqual(res.payload.links.map(link => link.kind), ["map", "map", "guide"]);
  assert.equal(res.payload.links[2].route, "restaurants");
  assert.match(res.payload.links[0].label, /^태극당 · 네이버 지도$/);
  assert.match(res.payload.links[1].label, /^태극당 · Google Maps$/);
  assert.equal(res.payload.mapContext, null);
});

test("unconfirmed hours for an exact resolved venue also show immediate map buttons", async () => {
  const naverOutput = {
    model: "gpt-5.4-mini",
    output_text: "NAVER_MAP_NOT_CONFIRMED: 영업시간을 읽지 못했습니다.",
    output: [{ type: "web_search_call", action: { sources: [] } }],
    usage: {}
  };
  const crossCheckOutput = {
    model: "gpt-5.4-mini",
    output_text: "종로온누리약국의 정확한 영업시간은 확인할 수 없어 전화 문의가 필요합니다.\nMAP_SPOT: 종로온누리약국 | 서울특별시 종로구 종로 293",
    output: [{ type: "web_search_call", action: { sources: [] } }],
    usage: {}
  };
  const { res } = await callApi({ message: "종로온누리약국 영업시간 알려줘", language: "ko", history: [] }, [naverOutput, crossCheckOutput], "203.0.113.54");
  assert.match(res.payload.answer, /지금 바로 영업시간과 현재 영업 여부/);
  assert.doesNotMatch(res.payload.answer, /전화|문의/);
  assert.deepEqual(res.payload.links.map(link => link.kind), ["map", "map"]);
  assert.deepEqual(res.payload.mapContext, { name: "종로온누리약국", address: "서울특별시 종로구 종로 293" });
});

test("map offer follow-up returns Naver and Google buttons without another AI call", async () => {
  const history = [
    { role: "user", text: "숙소 근처 약국 추천해줘" },
    { role: "assistant", text: "종로온누리약국을 확인했습니다. 원하시면 지도 링크를 연결해 드릴게요.", mapContext: { name: "종로온누리약국", address: "서울특별시 종로구 종로 293" } }
  ];
  const { res, request, requests } = await callApi({ message: "네, 연결해줘", language: "ko", history }, { model: "unused" }, "203.0.113.51");
  assert.equal(request, undefined);
  assert.equal(requests.length, 0);
  assert.equal(res.payload.meta.mapFollowup, true);
  assert.deepEqual(res.payload.links.map(link => link.kind), ["map", "map"]);
  assert.match(res.payload.links[0].label, /종로온누리약국 · 네이버 지도/);
  assert.match(res.payload.links[1].label, /종로온누리약국 · Google Maps/);
});

test("a property check-in time question does not become a dining web search", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "체크인은 15:00 이후 5층 키오스크에서 셀프로 진행합니다. 다만 현재 안내에는 밤 9시 이후의 별도 마감 시간이 명시되어 있지 않습니다.", output: [], usage: {} };
  const { res, request, requests } = await callApi({ message: "밤 9시 이후 체크인 가능한가요?", language: "ko" }, output, "203.0.113.48");
  assert.equal(requests.length, 1);
  assert.equal(request.body.tool_choice, "auto");
  assert.equal(res.payload.meta.searched, false);
  assert.equal(res.payload.meta.guideRoute, "checkin");
  assert.match(request.body.instructions, /셀프 체크인/);
  assert.match(res.payload.answer, /^체크인은 15:00 이후/);
});

test("airport boarding questions show no source or property map when the model did not search", async () => {
  const output = {
    model: "gpt-5.4-mini",
    output_text: "현재 안내문에서는 정확한 탑승 정류장을 확인하지 못했습니다. 숙소 주소는 서울시 종로구 종로 294 선일빌딩 5층입니다.",
    output: [],
    usage: {}
  };
  const { res } = await callApi({ message: "공항리무진은 어디서 타나요?", language: "ko" }, output, "203.0.113.44");
  assert.equal(res.payload.meta.searched, false);
  assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "transport"]]);
});

test("address answer includes two clickable map links", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "주소는 서울시 종로구 종로 294 선일빌딩 5층입니다.", output: [], usage: {} };
  const { res } = await callApi({ message: "숙소 주소가 어디야?", language: "ko" }, output, "203.0.113.23");
  assert.deepEqual(res.payload.links.slice(0, 2).map(link => link.label), ["네이버 지도", "Google Maps"]);
  assert.ok(res.payload.links.slice(0, 2).every(link => link.kind === "map" && /^https:/.test(link.url)));
  assert.deepEqual([res.payload.links[2].kind, res.payload.links[2].route], ["guide", "transport"]);
});

test("specific public parking map links come before source links", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "동대문 공영주차장은 서울특별시 중구 을지로 227에 있습니다.\nMAP_SPOT: 동대문 공영주차장 | 서울특별시 중구 을지로 227", output: [{ type: "web_search_call", action: { sources: [{ title: "서울 주차정보", url: "https://parking.seoul.go.kr/" }] } }], usage: {} };
  const { res } = await callApi({ message: "동대문 근처 공영주차장 찾아줘", language: "ko" }, output, "203.0.113.24");
  assert.equal(res.payload.links[0].kind, "map");
  assert.equal(res.payload.links[1].kind, "map");
  assert.equal(res.payload.links[2].kind, "source");
  assert.match(res.payload.links[0].label, /^동대문 공영주차장 · 네이버 지도$/);
  assert.doesNotMatch(res.payload.answer, /MAP_SPOT/);
});

test("unresolved routes show no map buttons and collapse repeated source domains", async () => {
  const output = {
    model: "gpt-5.4-mini",
    output_text: "심야버스 운행 여부는 확인되지 않았습니다. 정확한 출발 지점을 확정하기 어렵습니다.",
    output: [{ type: "web_search_call", action: { sources: [
      { title: "airport.kr", url: "https://www.airport.kr/ap_en/1514/subview.do" },
      { title: "airport.kr", url: "https://airport.kr/ap_en/1509/subview.do?ref=search" },
      { title: "airport.kr", url: "https://m.airport.kr/ap_en/1514/subview.do" }
    ] } }],
    usage: {}
  };
  const { res } = await callApi({ message: "심야에는 공항버스가 더 현실적인가요?", language: "ko" }, output, "203.0.113.30");
  assert.equal(res.payload.links.filter(link => link.kind === "map").length, 0);
  assert.equal(res.payload.links.filter(link => link.kind === "source").length, 1);
  assert.equal(res.payload.links[0].url, "https://www.airport.kr/ap_en/1514/subview.do");
});

test("a place name without a complete street address never creates map buttons", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "인천공항 제1터미널을 이용하세요.\nMAP_SPOT: 인천공항 제1터미널 | Incheon Airport Terminal 1", output: [{ type: "web_search_call", action: { sources: [{ title: "인천국제공항", url: "https://www.airport.kr/" }] } }], usage: {} };
  const { res } = await callApi({ message: "인천공항 위치가 어디야?", language: "ko" }, output, "203.0.113.31");
  assert.equal(res.payload.links.filter(link => link.kind === "map").length, 0);
  assert.doesNotMatch(res.payload.answer, /MAP_SPOT/);
});

test("pre-verified route advice links only to the exact airport-bus boarding stop", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "심야에는 공항버스 운행 시간부터 확인해야 합니다.\nMAP_SPOT: 인천국제공항 제1여객터미널 | 인천광역시 중구 공항로 272", output: [{ type: "web_search_call", action: { sources: [{ title: "인천국제공항", url: "https://www.airport.kr/" }] } }], usage: {} };
  const { res } = await callApi({ message: "심야에는 공항철도보다 심야버스가 더 현실적인가요? 어나더하우스에서 인천공항까지 가고 싶어요.", language: "ko" }, output, "203.0.113.32");
  assert.equal(res.payload.links.filter(link => link.kind === "map").length, 2);
  assert.equal(res.payload.links.filter(link => link.kind === "map").every(link => /DDP|동대문디자인플라자/.test(link.label)), true);
  assert.doesNotMatch(res.payload.answer, /MAP_SPOT/);
});

test("Another House key-card recovery starts with the kiosk phone and never calls OpenAI", async () => {
  const res = await callAccess({ message: "키카드를 놓고 나와서 못 들어가고 있어요", language: "ko", history: [] });
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.model, "another-house-access-support");
  assert.match(res.payload.answer, /키오스크 옆 전화기/);
  assert.match(res.payload.answer, /원격으로 키오스크에서 새 키카드/);
  assert.doesNotMatch(res.payload.answer, /TESTACCESSCODE/);
});

test("a direct entrance-code request still returns the key-card recovery step", async () => {
  const res = await callAccess({ message: "공동현관 비밀번호 알려줘", language: "ko", history: [] });
  assert.match(res.payload.answer, /키오스크 옆 전화기/);
  assert.doesNotMatch(res.payload.answer, /TESTACCESSCODE/);
});

test("the server-only code is released only after repeated key-card failure context", async () => {
  const history = [
    { role: "user", text: "키카드를 놓고 나와서 못 들어가요" },
    { role: "assistant", text: "키오스크 옆 전화기로 연락해 주세요." },
    { role: "user", text: "전화했는데 키오스크에서 새 카드가 안 나와요" },
    { role: "assistant", text: "현재 상황을 다시 말씀해 주세요." }
  ];
  const res = await callAccess({ message: "그래도 안 됩니다. 공동현관 비밀번호 알려주세요", language: "ko", history });
  assert.match(res.payload.answer, /TESTACCESSCODE → ENT/);
  assert.equal(res.payload.meta.accessSupport, true);
  assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "checkin"]]);
});

test("natural phone failure wording stays inside the Another House recovery flow", async () => {
  const history = [
    { role: "user", text: "키카드를 놓고 나와서 못 들어가요" },
    { role: "assistant", text: "키오스크 옆 전화기로 연락해 주세요." }
  ];
  const res = await callAccess({ message: "호스트가 전화를 안 받아요 어떡하죠", language: "ko", history });
  assert.equal(res.payload.model, "another-house-access-support");
  assert.match(res.payload.answer, /전화 연결이나 키카드 발급이 되지 않았/);
  assert.doesNotMatch(res.payload.answer, /TESTACCESSCODE/);
});

test("a generic password request in the recovery flow asks for explicit entrance context", async () => {
  const history = [
    { role: "user", text: "카드키를 놓고 나와서 공동현관에 못 들어가요" },
    { role: "assistant", text: "키오스크 옆 전화기로 연락해 주세요." },
    { role: "user", text: "전화가 안됩니다" },
    { role: "assistant", text: "공동현관 비밀번호가 필요하면 정확히 말씀해 주세요." }
  ];
  const res = await callAccess({ message: "비밀번호 알려줘요", language: "ko", history });
  assert.match(res.payload.answer, /어떤 비밀번호인지 확인/);
  assert.doesNotMatch(res.payload.answer, /TESTACCESSCODE/);
});

test("the photographed natural-language loop releases the server-only code after explicit request", async () => {
  const history = [
    { role: "user", text: "카드키를 놓고 나와서 공동현관에 못 들어가요" },
    { role: "assistant", text: "키오스크 옆 전화기로 연락해 주세요." },
    { role: "user", text: "전화가 안됩니다" },
    { role: "assistant", text: "공동현관 비밀번호가 필요하면 정확히 말씀해 주세요." },
    { role: "user", text: "호스트가 전화를 안받아요 어떡하죠" },
    { role: "assistant", text: "어떤 비밀번호인지 확인이 필요합니다." },
    { role: "user", text: "비밀번호 알려줘" },
    { role: "assistant", text: "공동현관 비밀번호가 필요하면 정확히 말씀해 주세요." }
  ];
  const res = await callAccess({ message: "공동현관 비밀번호", language: "ko", history });
  assert.match(res.payload.answer, /TESTACCESSCODE → ENT/);
  assert.equal(res.payload.meta.accessSupport, true);
  assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "checkin"]]);
});

test("duplicate current question is removed from recent history", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "현재 안내에서는 조식 제공이 확인되지 않습니다.", output: [], usage: {} };
  const { request } = await callApi({ message: "조식이 제공되나요?", language: "ko", history: [{ role: "user", text: "조식이 제공되나요?" }] }, output, "203.0.113.25");
  assert.equal(request.body.input.length, 1);
  assert.match(request.body.input[0].content, /GUEST_QUESTION: 조식이 제공되나요\?/);
});

test("raw URLs are removed from answer text", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "**공식 안내** https://example.com/page (example.com)를 확인하세요.", output: [], usage: {} };
  const { res } = await callApi({ message: "조식 제공 여부를 알려줘", language: "ko" }, output, "203.0.113.26");
  assert.doesNotMatch(res.payload.answer, /https?:\/\//);
  assert.doesNotMatch(res.payload.answer, /\*\*|\(example\.com\)/);
});

test("searched weather answers always expose an official source fallback", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "오늘은 맑습니다.", output: [{ type: "web_search_call", action: { sources: [] } }], usage: {} };
  const { res } = await callApi({ message: "오늘 날씨 알려줘", language: "ko" }, output, "203.0.113.28");
  assert.equal(res.payload.links[0].url, "https://www.weather.go.kr/w/index.do");
});

test("official fallback source labels follow the guest language", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "It is sunny today.", output: [{ type: "web_search_call", action: { sources: [] } }], usage: {} };
  const { res } = await callApi({ message: "What is the weather today?", language: "en" }, output, "203.0.113.29");
  assert.equal(res.payload.links[0].label, "Verified source · Korea Meteorological Administration");
});

test("chat API rejects requests when OPENAI_API_KEY is missing", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const req = { method: "POST", headers: { "x-forwarded-for": "203.0.113.27" }, socket: {}, body: { message: "Hello", language: "en" } };
    const res = responseRecorder();
    await handler(req, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.payload.error, "AI service is not configured");
  } finally {
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
  }
});
