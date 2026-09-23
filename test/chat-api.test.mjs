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

test("a property question reaches the model with only its relevant guide and no search tool", async () => {
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
  assert.equal(request.body.tools, undefined);
  assert.equal(request.body.tool_choice, undefined);
  assert.equal(request.body.include, undefined);
  assert.equal(request.body.reasoning.effort, "low");
  assert.match(request.body.instructions, /RELEVANT_CURRENT_GUIDE version 2026-09-23\.1/);
  assert.match(request.body.instructions, /The very first sentence must give the conclusion/);
  assert.match(request.body.instructions, /Never paste or paraphrase an entire guide section/);
  assert.match(request.body.instructions, /most likely immediate next need/);
  assert.match(request.body.instructions, /not merely another fact from the same section/);
  assert.match(request.body.instructions, /Add at most one proactive topic/);
  assert.match(request.body.instructions, /capacity must answer the capacity/);
  assert.match(request.body.instructions, /MAP_SPOT: <canonical place name> \| <complete street address>/);
  assert.match(request.body.instructions, /GUIDE_PAGE: <route>/);
  assert.match(request.body.instructions, /싱글룸 11실 · 더블룸 1실/);
  assert.match(request.body.instructions, /503호 앞 러기지룸/);
  assert.doesNotMatch(request.body.instructions, /LG FY9WTB|"dryCapacityKg":4\.5/);
  assert.doesNotMatch(request.body.instructions, /another1234|malicious/);
  assert.equal(request.body.prompt_cache_key, "another-house-2026-09-23.1-ko-home");
  assert.doesNotMatch(request.body.input.at(-1).content, /GUIDE_KNOWLEDGE|CURRENT_GUIDE/);
  assert.ok(request.body.instructions.length < 30000);
  assert.equal(res.payload.meta.cachedTokens, 80);
  assert.equal(res.payload.meta.searched, false);
  assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "home"]]);
  assert.equal(res.payload.links[0].url, "https://anotherhouse-guide.vercel.app/?page=home");
});

test("luggage storage is answered deterministically in all five languages", async () => {
  const cases = [
    ["짐보관 가능한지", "ko", /시간 제한 없이.*503호 앞/s],
    ["Can I store luggage?", "en", /Room 503.*no time limit|no time limit.*Room 503/s],
    ["荷物を預けられますか", "ja", /時間制限なく.*503号室/s],
    ["可以寄存行李吗", "zh", /503号房.*无时间限制|无时间限制.*503号房/s],
    ["可以寄放行李嗎", "zh-TW", /503號房.*無時間限制|無時間限制.*503號房/s]
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const [message, language, expected] = cases[index];
    const { res, requests } = await callApi({ message, language, history: [] }, { model: "gpt-5.4-mini", output_text: "unused", output: [], usage: {} }, `203.0.113.${110 + index}`);
    assert.equal(requests.length, 0);
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.model, "another-house-verified-training");
    assert.equal(res.payload.meta.searched, false);
    assert.equal(res.payload.meta.verifiedTraining, true);
    assert.equal(res.payload.meta.trainingIntent, "luggage");
    assert.equal(res.payload.meta.knowledgeVersion, "2026-09-23.1");
    assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "checkin"]]);
    assert.match(res.payload.answer, expected);
    assert.doesNotMatch(res.payload.answer, /최신 공개정보|public information|公开信息|公開資訊/);
  }
  assert.equal(handler._internals.searchLevelFor("짐보관 가능한지"), null);
  assert.equal(handler._internals.searchLevelFor("서울역 짐보관 장소 어디야?"), "medium");
});

test("short luggage words and the full staff question set resolve to trained intents", async () => {
  const aliases = [["짐", "ko"], ["luggage", "en"], ["荷物", "ja"], ["行李", "zh"], ["行李", "zh-TW"]];
  for (let index = 0; index < aliases.length; index += 1) {
    const [message, language] = aliases[index];
    const { res, requests } = await callApi({ message, language, history: [] }, { output_text: "unused" }, `203.0.113.${120 + index}`);
    assert.equal(requests.length, 0);
    assert.equal(res.payload.meta.trainingIntent, "luggage");
    assert.match(res.payload.answer, /503|Room 503/);
  }
  for (const intent of handler._internals.CONCIERGE_TRAINING.intents) {
    for (const example of intent.examples) {
      assert.equal(handler._internals.trainingIntentFromQuestion(example, "ko")?.id, intent.id, `${intent.id}: ${example}`);
    }
  }
  assert.equal(handler._internals.trainingIntentFromQuestion("서울역 짐 보관소 어디야?", "ko"), null);
  assert.equal(handler._internals.trainingIntentFromQuestion("분실물 문의", "ko")?.id, "lost-property");
  assert.equal(handler._internals.trainingIntentFromQuestion("예약 확인 메일이 안 왔어요", "ko")?.id, "booking-confirmation");
  assert.equal(handler._internals.trainingIntentFromQuestion("연박하고 싶어요", "ko")?.id, "stay-extension");
  assert.equal(handler._internals.trainingIntentFromQuestion("방 청소 가능한가요?", "ko")?.id, "housekeeping");
  assert.notEqual(handler._internals.trainingIntentFromQuestion("체크아웃 연장 가능한가요?", "ko")?.id, "stay-extension");
});

test("unseen short, unspaced and misspelled luggage requests answer from staff policy", async () => {
  const cases = [
    ["ko", ["짐?", "짐은요", "짐 좀요", "가방만", "캐리어", "케리어 보관돼요?", "짐좀맡길수있나여", "짐을 두고 갈 수 있나요", "짐둬도돼", "가방 놔둬도 되나요", "수하물맞기고싶어요", "퇴실후짐보관", "짐 맡기는 거 돈드나요", "체크인전에짐두고놀다가와도돼요"]],
    ["en", ["bags?", "can u keep my bags", "leave my suitcase pls", "lugage storage", "drop bags before check in?"]],
    ["ja", ["荷物だけ預けたい", "スーツケース預けてもいい？", "チェックイン前に荷物置いていい？"]],
    ["zh", ["行李", "能存行李不", "入住前可以寄存行李吗"]],
    ["zh-TW", ["行李", "先寄放行李可以嗎", "退房後行李可以放嗎"]]
  ];
  for (const [language, messages] of cases) for (const message of messages) {
    const { res, requests } = await callApi({ message, language }, { output_text: "unused" }, `luggage-variants-${language}-${message}`);
    assert.equal(requests.length, 0, message);
    assert.equal(res.payload.meta.trainingIntent, "luggage", message);
    assert.match(res.payload.answer, /503/, message);
    assert.equal(res.payload.links[0].route, "checkin", message);
  }
});

test("short check-in and misspelled arrival questions carry the correct property facts", async () => {
  for (const [language, message] of [["ko", "체크인"], ["ko", "첵인"], ["ko", "체크 인 몇시임?"], ["ko", "입실언제"], ["ko", "체킨시간"], ["en", "check in?"], ["en", "checkin time pls"], ["ja", "チェックイン何時？"], ["zh", "入住几点"], ["zh-TW", "幾點入住"]]) {
    const { res, requests } = await callApi({ message, language }, { output_text: "unused" }, `checkin-short-${message}`);
    assert.equal(requests.length, 0, message);
    assert.match(res.payload.answer, /15:00/, message);
    assert.match(res.payload.answer, /5/);
    assert.equal(res.payload.meta.searched, false);
  }
  for (const message of ["체크인 어케함", "첵인하는법좀", "밤늦게도착하는데괜찮나요", "오후2시도착인데바로들어가도돼", "두 시에 체크인 가능한가요?"]) {
    const { request, requests } = await callApi({ message, language: "ko" }, { output_text: "체크인은 15:00부터입니다. GUIDE_PAGE: checkin" }, `arrival-${message}`);
    assert.equal(requests.length, 1, message);
    assert.equal(request.body.tools, undefined, message);
    assert.match(request.body.instructions, /예약 번호 뒤 4자리/);
    assert.match(request.body.instructions, /503호/);
    assert.match(request.body.input.at(-1).content, new RegExp(message.replace(/[?]/g, "\\?")));
  }
});

test("conditions and compound luggage questions reach the model without an unrelated canned answer", async () => {
  for (const message of ["짐보관하고 모레 찾을게요", "체크아웃 다음 날 짐 찾아도 돼요?", "캐리어 보관 사물함 크기?", "짐 맡기고 택배도 받아주나요", "짐보관과 체크인 방법 알려줘", "짐을 두고 왔어요", "짐이 없어졌어요", "체크인 안내 메일이 안 왔어요", "캐리어 잠금장치 있나요", "짐 보관 안 하고 방으로 바로 들어가고 싶어요", "체크인 후 수건 어디서 받아요"]) {
    const { request, requests, res } = await callApi({ message, language: "ko" }, { output_text: "운영 안내를 확인해 드릴게요. GUIDE_PAGE: checkin" }, `stay-conditions-${message}`);
    assert.equal(requests.length, 1, message);
    assert.equal(request.body.tools, undefined, message);
    assert.match(request.body.instructions, /503호/);
    assert.match(request.body.instructions, /택배 대리수령/);
    assert.match(request.body.instructions, /분실물 확인/);
    assert.equal(res.payload.meta.searched, false, message);
  }
});

test("follow-ups keep the current luggage or check-in topic and stop at a topic change", async () => {
  for (const message of ["몇시까지?", "어디에요", "무료?", "그럼 얼마야"]) {
    const { res, requests } = await callApi({ message, language: "ko", history: [{ role: "user", content: "짐" }, { role: "assistant", content: "503호 앞 러기지룸을 이용하세요." }] }, { output_text: "unused" }, `followup-${message}`);
    assert.equal(requests.length, 0, message);
    assert.match(res.payload.answer, /503호/);
  }
  for (const [topic, message] of [["짐", "그럼 모레는?"], ["첵인", "2시는?"], ["짐", "어떻게 문을 열어요?"]]) {
    const { request } = await callApi({ message, language: "ko", history: [{ role: "user", content: topic }] }, { output_text: "안내 GUIDE_PAGE: checkin" }, `followup-model-${message}`);
    assert.equal(request.body.tools, undefined, message);
    assert.match(request.body.instructions, /503호/);
  }
  const { analyzeStayQuestion } = require("../lib/stay-intent.cjs");
  assert.equal(analyzeStayQuestion("몇시까지?", [{ role: "user", content: "짐" }, { role: "user", content: "에그드랍 영업시간" }]), null);
});

test("public storage, airport check-in and bag shopping are not property storage answers", () => {
  for (const message of ["서울역에 짐 맡길 곳", "인천공항 짐보관", "숙소 말고 동대문역에 짐보관", "airport baggage storage", "空港の荷物預かり", "机场行李寄存", "비행기 체크인 언제", "airline check in", "캐리어 어디서 사요", "가방 수선 어디서 해요", "짐 들고 인천공항 가는법"]) {
    assert.equal(handler._internals.verifiedLuggageStorage(message, "ko"), null, message);
    const { analyzeStayQuestion } = require("../lib/stay-intent.cjs");
    assert.equal(analyzeStayQuestion(message)?.simpleCheckin || false, false, message);
  }
});

test("luggage storage plus onward travel retains both guide facts and public search", async () => {
  const { request } = await callApi({ message: "짐 맡기고 인천공항 가는법도 알려줘", language: "ko" }, { output_text: "안내 GUIDE_PAGE: checkin" }, "mixed-stay-travel");
  assert.equal(request.body.tools[0].type, "web_search");
  assert.match(request.body.instructions, /503호/);
  assert.match(request.body.instructions, /6702/);
});

test("ambiguous overnight check-in reaches the model with booking-date clarification", async () => {
  for (const message of ["arrive 1am can check in?", "새벽1시에 첵인 가능?"]) {
    const { request, requests } = await callApi({ message, language: "en" }, { output_text: "It depends on your booked check-in date. GUIDE_PAGE: checkin" }, `midnight-${message}`);
    assert.equal(requests.length, 1);
    assert.equal(request.body.tools, undefined);
    assert.match(request.body.instructions, /MIDNIGHT ARRIVAL TAKES PRIORITY/);
    assert.match(request.body.instructions, /Explain BOTH possibilities/);
  }
});

test("nuanced property questions use the complete guide without a forced search", async () => {
  const cases = [
    ["Can I check in late?", "en", "checkin", "Self check-in is available from 15:00. Please follow the kiosk instructions."],
    ["住宿可以停车吗", "zh", "checkin", "不可以，大楼内不提供停车位。请使用附近的付费停车场。"],
    ["싱글룸이 몇 개야?", "ko", "gallery", "싱글룸은 11실입니다."],
    ["Wi-Fi는 사용할 수 있나요?", "ko", "wifi", "네, Wi-Fi를 이용할 수 있습니다."],
    ["키카드", "ko", "checkin", "키카드는 체크인 후 수령하며 숙소 출입구와 객실 문에 모두 필요합니다."],
    ["Key card", "en", "checkin", "You receive the key card after check-in and need it for both entrances."],
    ["キーカード", "ja", "checkin", "キーカードはチェックイン後に受け取り、入口と客室の両方で必要です。"],
    ["房卡", "zh", "checkin", "房卡在入住后领取，住宿入口和房门都需要使用。"],
    ["房卡", "zh-TW", "checkin", "房卡在入住後領取，住宿入口和房門都需要使用。"]
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const [message, language, route, outputText] = cases[index];
    const { res, request, requests } = await callApi(
      { message, language, history: [] },
      { model: "gpt-5.4-mini", output_text: outputText, usage: { input_tokens: 110, output_tokens: 24, input_tokens_details: { cached_tokens: 80 } } },
      `198.51.100.${190 + index}`
    );
    assert.equal(requests.length, 1);
    assert.equal(request.body.tool_choice, undefined);
    assert.equal(request.body.tools, undefined);
    assert.equal(res.payload.model, "gpt-5.4-mini");
    assert.equal(res.payload.meta.guideRoute, route);
    assert.equal(res.payload.meta.searched, false);
    assert.ok(res.payload.meta.guideKnowledgeChars < 20000);
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
  assert.equal(request.body.tool_choice, undefined);
  assert.equal(request.body.tools, undefined);
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
    assert.equal(request.body.tool_choice, undefined);
    assert.equal(request.body.tools, undefined);
    assert.match(res.payload.answer, expected);
    assert.doesNotMatch(res.payload.answer, /건조기가 있습니다|세탁기가 있습니다/);
    assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "laundry"]]);
  }
});

test("hair dryers are confirmed in the shared bathroom and kept distinct from the hair straightener", async () => {
  const cases = [
    ["드라이기 있나요?", "ko", /네, 헤어드라이어는 공용 욕실/, /헤어 고데기.*GUEST BOX/],
    ["드라이어 있나요?", "ko", /네, 헤어드라이어는 공용 욕실/, /헤어 고데기.*GUEST BOX/],
    ["Is there a hair dryer?", "en", /Yes, hair dryers are provided in the shared bathroom/, /hair straightener.*GUEST BOX/],
    ["Do you have a blow dryer?", "en", /Yes, hair dryers are provided in the shared bathroom/, /hair straightener.*GUEST BOX/],
    ["ドライヤーはありますか", "ja", /ヘアドライヤーは共用バスルーム/, /ヘアアイロン.*GUEST BOX/],
    ["有吹风机吗？", "zh", /有，吹风机放在公共浴室/, /直发器/],
    ["有吹風機嗎？", "zh-TW", /有，吹風機放在公共浴室/, /直髮器/]
  ];
  for (const [message, language, expected, distinction] of cases) {
    const res = await callAccess({ message, language, history: [] });
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.model, "another-house-verified-amenity");
    assert.equal(res.payload.meta.item, "hair-dryer");
    assert.equal(res.payload.meta.returnPolicy, "shared-use");
    assert.match(res.payload.answer, expected);
    assert.match(res.payload.answer, distinction);
    assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "appliances"]]);
  }
  assert.equal(handler._internals.verifiedHairTool("건조기 있나요?", "ko"), null);
});

test("the listed hair straightener remains explicitly available", async () => {
  const res = await callAccess({ message: "고데기 있나요?", language: "ko", history: [] });
  assert.equal(res.payload.model, "another-house-verified-amenity");
  assert.equal(res.payload.meta.item, "hair-straightener");
  assert.match(res.payload.answer, /네, 헤어 고데기는.*게스트박스/);
  assert.doesNotMatch(res.payload.answer, /드라이기.*있/);
});

test("extra towels show both locations and the used-towel basket in all five languages", async () => {
  const cases = [
    ["여분 수건 있나요?", "ko", /GUEST BOX와 샤워실 선반/, /타월 바구니/],
    ["Are extra towels available?", "en", /GUEST BOX.*shower-room shelf/s, /basket outside the showers/],
    ["予備のタオルはありますか", "ja", /GUEST BOXとシャワー室の棚/, /シャワー室前のかご/],
    ["有备用毛巾吗？", "zh", /GUEST BOX和淋浴间搁板/, /毛巾篮/],
    ["有備用毛巾嗎？", "zh-TW", /GUEST BOX和淋浴間擱板/, /毛巾籃/]
  ];
  for (const [message, language, expected, forbidden] of cases) {
    const res = await callAccess({ message, language, history: [] });
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.model, "another-house-verified-amenity");
    assert.equal(res.payload.meta.item, "extra-towel");
    assert.equal(res.payload.meta.returnPolicy, "guest-use");
    assert.match(res.payload.answer, expected);
    assert.match(res.payload.answer, forbidden);
    assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "appliances"]]);
  }
});

test("Guest Box return rules are attached to each item rather than generalized", async () => {
  const guestUse = [
    ["칫솔 있나요?", "dental-kit"],
    ["밴드 있나요?", "bandage"],
    ["물티슈 있나요?", "wet-wipes"],
    ["비닐봉투 있나요?", "plastic-bag"]
  ];
  for (const [message, item] of guestUse) {
    const res = await callAccess({ message, language: "ko", history: [] });
    assert.equal(res.payload.meta.item, item);
    assert.equal(res.payload.meta.returnPolicy, "guest-use");
    assert.doesNotMatch(res.payload.answer, /반납|돌려|제자리/);
  }
  const adapter = await callAccess({ message: "여행용 어댑터 있나요?", language: "ko", history: [] });
  assert.equal(adapter.payload.meta.item, "travel-adapter");
  assert.equal(adapter.payload.meta.returnPolicy, "return");
  assert.match(adapter.payload.answer, /사용 후에는 제자리에/);
});

test("property emergency-medicine questions are answered from the guide without public search in all five languages", async () => {
  const cases = [
    ["비상약이 있나요?", "ko", /비상약이나 상비약이 준비되어 있다는 내용이 없습니다/, /게스트박스에는 밴드만/],
    ["Do you have emergency medicine?", "en", /does not confirm that emergency medicines/, /Only bandages/],
    ["常備薬はありますか", "ja", /常備薬や救急箱の用意は確認できません/, /絆創膏のみ/],
    ["有常备药吗？", "zh", /未确认提供常备药/, /仅明确列有创可贴/],
    ["有常備藥嗎？", "zh-TW", /未確認提供常備藥/, /僅明確列有OK繃/]
  ];
  for (const [message, language, expected, distinction] of cases) {
    const res = await callAccess({ message, language, history: [] });
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.model, "another-house-verified-amenity");
    assert.equal(res.payload.meta.item, "emergency-medicine");
    assert.equal(res.payload.meta.returnPolicy, "unconfirmed");
    assert.equal(res.payload.meta.searched, false);
    assert.match(res.payload.answer, expected);
    assert.match(res.payload.answer, distinction);
    assert.doesNotMatch(res.payload.answer, /최신 공개정보|public information|公開情報|公开信息|公開資訊/);
    assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "appliances"]]);
  }
  for (const message of ["비상 약 있어요?", "약 있나요?"]) {
    const res = await callAccess({ message, language: "ko", history: [] });
    assert.equal(res.payload.meta.item, "emergency-medicine");
    assert.equal(res.payload.meta.searched, false);
  }
});

test("medicine availability stays property-specific while medicine purchase requests still search nearby pharmacies", () => {
  assert.equal(handler._internals.searchLevelFor("비상약이 있나요?"), null);
  assert.equal(handler._internals.searchLevelFor("Do you have a first aid kit?"), null);
  assert.equal(handler._internals.verifiedGuestBoxItem("비상약 어디서 살 수 있어?", "ko"), null);
  assert.equal(handler._internals.searchLevelFor("비상약 어디서 살 수 있어?"), "medium");
  assert.equal(handler._internals.searchLevelFor("가까운 약국 어디야?"), "medium");
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
  assert.equal(request.body.tool_choice, undefined);
  assert.equal(request.body.tools, undefined);
  assert.match(request.body.instructions, /complete procedure only when the guest explicitly asks/i);
  assert.deepEqual(res.payload.links.map(link => [link.kind, link.route]), [["guide", "laundry"]]);
});

test("late checkout proactively offers same-day luggage storage without OpenAI", async () => {
  const cases = [
    ["레이트 체크아웃 가능한가요?", "ko", /대신.*체크아웃 당일.*시간 제한 없이.*짐을 무료로 보관/s],
    ["Can I get a late check-out?", "en", /However.*Room 503.*no time limit/s],
    ["レイトチェックアウトできますか？", "ja", /ただし.*時間制限なく.*503号室前.*荷物を無料/s],
    ["可以延迟退房吗？", "zh", /不过.*免费.*503号房前.*无时间限制/s],
    ["可以延遲退房嗎？", "zh-TW", /不過.*免費.*503號房前.*無時間限制/s]
  ];
  let ip = 220;
  for (const [message, language, expected] of cases) {
    const { res, requests } = await callApi({ message, language, history: [] }, { model: "unused" }, `203.0.113.${ip++}`);
    assert.equal(requests.length, 0);
    assert.equal(res.payload.model, "another-house-verified-checkout");
    assert.equal(res.payload.meta.verifiedLateCheckout, true);
    assert.equal(res.payload.meta.knowledgeVersion, "2026-09-23.1");
    assert.match(res.payload.answer, expected);
    assert.equal(res.payload.links[0].route, "checkin");
    assert.match(res.payload.links[0].url, /\?page=checkin$/);
  }
});

test("early check-in adds pre-check-in luggage storage in every language without OpenAI", async () => {
  const cases = [
    ["얼리 체크인 가능한가요?", "ko", /얼리 체크인은.*불가능.*체크인 전 짐 보관은 가능.*예약 플랫폼 메시지/s],
    ["Is early check-in available?", "en", /No, early check-in.*luggage before check-in.*booking-platform message/s],
    ["アーリーチェックインできますか？", "ja", /アーリーチェックイン.*できません.*チェックイン前の荷物預かり.*予約プラットフォーム/s],
    ["可以提前入住吗？", "zh", /无法提前入住.*入住前可以寄存行李.*预订平台消息/s],
    ["可以提早入住嗎？", "zh-TW", /無法提前入住.*入住前可以寄放行李.*預訂平台訊息/s]
  ];
  let ip = 210;
  for (const [message, language, expected] of cases) {
    const { res, requests } = await callApi({ message, language, history: [] }, { model: "unused" }, `203.0.113.${ip++}`);
    assert.equal(requests.length, 0);
    assert.equal(res.payload.model, "another-house-verified-checkin");
    assert.equal(res.payload.meta.verifiedEarlyCheckin, true);
    assert.equal(res.payload.meta.searched, false);
    assert.equal(res.payload.meta.knowledgeVersion, "2026-09-23.1");
    assert.equal(res.payload.links[0].route, "checkin");
    assert.match(res.payload.answer, expected);
  }
});

test("every site section can resolve to its own guide page", () => {
  const cases = [
    ["숙소 소개와 여성 전용 여부", "ko", "gallery"], ["주소와 찾아오는 길", "ko", "transport"],
    ["숙소에서 인천공항 가는 법", "ko", "airport-departure"],
    ["체크인 시간", "ko", "checkin"], ["Wi-Fi 안내", "en", "wifi"], ["전자레인지 사용법", "ko", "appliances"],
    ["세탁기 사용법", "ko", "laundry"], ["분리수거", "ko", "trash"], ["흡연 규칙", "ko", "rules"],
    ["주변 맛집 추천", "ko", "restaurants"], ["추천 근교 투어", "ko", "tours"], ["조식 제공 여부", "ko", "home"]
  ];
  for (const [message, language, route] of cases) assert.equal(handler._internals.guideRouteFromQuestion(message, language), route, message);
});

test("common property phrasings resolve to the page that actually contains the answer", () => {
  const cases = [
    ["엘리베이터 있어?", "ko", "transport"],
    ["Which floor is the hostel on?", "en", "transport"],
    ["浄水器はありますか？", "ja", "appliances"],
    ["有公共厨房吗？", "zh", "appliances"],
    ["男生可以入住嗎？", "zh-TW", "gallery"],
    ["화장실 몇 개야?", "ko", "gallery"],
    ["503호 사진 있어?", "ko", "gallery"]
  ];
  for (const [message, language, expected] of cases) assert.equal(handler._internals.guideRouteFromQuestion(message, language), expected, message);
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

test("an outbound transit answer retries instead of exposing a max-token fragment", async () => {
  const incomplete = {
    model: "gpt-5.4-mini",
    status: "incomplete",
    incomplete_details: { reason: "max_output_tokens" },
    output_text: "숙소에서 가장 쉬운 방법은 동대문역 1호",
    output: [{ type: "web_search_call", action: { sources: [{ title: "KORAIL", url: "https://www.korail.com/" }] } }],
    usage: { input_tokens: 38000, output_tokens: 8000, input_tokens_details: { cached_tokens: 28800 } }
  };
  const complete = {
    model: "gpt-5.4-mini",
    status: "completed",
    output_text: "숙소에서 청량리역까지는 동대문역에서 1호선 소요산·의정부 방면 열차를 타고 환승 없이 청량리역에서 내리면 됩니다. 이동은 약 10분입니다.",
    output: [{ type: "web_search_call", action: { sources: [{ title: "서울교통공사", url: "https://www.seoulmetro.co.kr/" }] } }],
    usage: { input_tokens: 38000, output_tokens: 160, input_tokens_details: { cached_tokens: 28800 } }
  };
  const { res, requests } = await callApi({ message: "숙소에서 청량리역 가는방법", language: "ko", history: [] }, [incomplete, complete], "203.0.113.62");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].body.max_output_tokens, 8000);
  assert.equal(requests[1].body.max_output_tokens, 16000);
  assert.equal(requests[1].body.reasoning.effort, "low");
  assert.equal(res.payload.meta.retriedForCompletion, true);
  assert.match(res.payload.answer, /1호선.*환승 없이.*청량리역/s);
  assert.doesNotMatch(res.payload.answer, /동대문역 1호$/);
  assert.equal(res.payload.links.filter(link => link.kind === "source").length, 2);
  assert.equal(handler._internals.guideRouteFromQuestion("숙소에서 청량리역 가는방법", "ko"), "transport");
});

test("known Dongdaemun to Cheongnyangni stop count is corrected after generation", () => {
  const wrong = "숙소에서 동대문역 1호선을 타면 청량리역까지 1정거장입니다.";
  const corrected = handler._internals.correctKnownTransitMetrics("숙소에서 청량리역 가는방법", wrong);
  assert.match(corrected, /청량리역까지 4정거장입니다/);
  assert.doesNotMatch(corrected, /1정거장/);
});

test("a route with no origin defaults to Another House and uses compact route knowledge", async () => {
  const output = {
    model: "gpt-5.4-mini",
    output_text: "어나더하우스에서 청량리역까지는 동대문역 1호선을 이용하세요.\nGUIDE_PAGE: transport",
    output: [{ type: "web_search_call", action: { sources: [{ title: "서울교통공사", url: "https://smss.seoulmetro.co.kr/traininfo/traininfoUserView.do" }] } }],
    usage: { input_tokens: 5000, output_tokens: 200, input_tokens_details: { cached_tokens: 3000 } }
  };
  const { res, request } = await callApi({ message: "청량리역 가는 법", language: "ko", history: [] }, output, "203.0.113.63");
  assert.equal(handler._internals.usesPropertyAsRouteOrigin("청량리역 가는 법"), true);
  assert.match(request.body.input.at(-1).content, /DEFAULT_ROUTE_ORIGIN: ANOTHER HOUSE, 서울시 종로구 종로 294 선일빌딩 5층/);
  assert.match(request.body.input.at(-1).content, /ROUTE_DIRECTION: Another House →/);
  assert.match(request.body.instructions, /For every route or directions question that omits a departure point/);
  assert.match(request.body.instructions, /동대문역 6번 출구/);
  assert.doesNotMatch(request.body.instructions, /LG FY9WTB/);
  assert.ok(request.body.instructions.length < 25000);
  assert.equal(request.body.prompt_cache_key, "another-house-2026-09-23.1-ko-route");
  assert.equal(res.payload.meta.guideRoute, "transport");
  assert.deepEqual(res.payload.links.at(-1), handler._internals.guidePageLink("transport", "ko"));
});

test("an explicitly named non-property route origin is never overwritten", () => {
  assert.equal(handler._internals.usesPropertyAsRouteOrigin("서울역에서 청량리역 가는 법"), false);
  assert.equal(handler._internals.usesPropertyAsRouteOrigin("How do I get from Myeongdong to Hongdae?"), false);
  assert.equal(handler._internals.usesPropertyAsRouteOrigin("How do I get to Myeongdong?"), true);
});

test("exact last-mile property directions use guide knowledge without public web search", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "From Exit 6, look for Kyochon Chicken and the dental sign at Sunil Building, take the elevator to 5F, then go down half a floor to the glass-door reception.\nGUIDE_PAGE: transport", output: [], usage: {} };
  const { request, requests } = await callApi({ message: "I am at Dongdaemun Station Exit 6 but cannot find the building entrance. What landmarks should I look for?", language: "en" }, output, "203.0.113.64");
  assert.equal(requests.length, 1);
  assert.equal(request.body.tool_choice, undefined);
  assert.equal(request.body.tools, undefined);
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
  assert.equal(res.payload.meta.knowledgeVersion, "2026-09-23.1");
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
  assert.equal(res.payload.meta.guideRoute, "airport-departure");
  assert.deepEqual(res.payload.links.at(-1), handler._internals.guidePageLink("airport-departure", "ko"));
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

test("airport-origin questions return the inbound property route in every guest language", async () => {
  const cases = [
    ["인천공항에서 가장 편한 길은?", "ko", /인천공항에서 어나더하우스로/, /인천공항 → 서울역 → 동대문역/],
    ["How do I get from Incheon Airport to Another House?", "en", /from Incheon Airport to Another House/i, /Incheon Airport → Seoul Station → Dongdaemun/],
    ["仁川空港から宿までどう行けばいい？", "ja", /仁川空港.*Another House/, /仁川空港 → ソウル駅 → 東大門駅/],
    ["从仁川机场到住宿怎么走？", "zh", /从仁川机场前往 Another House/, /仁川机场 → 首尔站 → 东大门站/],
    ["從仁川機場到住宿怎麼走？", "zh-TW", /從仁川機場前往 Another House/, /仁川機場 → 首爾站 → 東大門站/]
  ];
  let ip = 120;
  for (const [message, language, lead, path] of cases) {
    const { res, requests } = await callApi({ message, language, history: [] }, { model: "unused" }, `203.0.113.${ip++}`);
    assert.equal(requests.length, 0);
    assert.equal(res.payload.model, "another-house-verified-airport-arrival");
    assert.equal(res.payload.meta.mode, "arrival");
    assert.match(res.payload.answer, lead);
    assert.match(res.payload.answer, path);
    assert.equal(res.payload.links.filter(link => link.kind === "map").length, 2);
    assert.equal(res.payload.links.at(-1).route, "transport");
  }
});

test("late-night airport arrivals use N6701 and its published inbound timetable", async () => {
  const { res, requests } = await callApi(
    { message: "인천공항 T2에서 새벽 1시에 숙소로 오는 법", language: "ko", history: [] },
    { model: "unused" },
    "203.0.113.131"
  );
  assert.equal(requests.length, 0);
  assert.equal(res.payload.model, "another-house-verified-airport-arrival");
  assert.equal(res.payload.meta.mode, "night-arrival-selected");
  assert.match(res.payload.answer, /N6701/);
  assert.match(res.payload.answer, /T2 01:20 · T1 01:40 → DDP 02:50/);
  assert.match(res.payload.answer, /T2는 지하 1층 18·19번/);
  assert.equal(res.payload.links.at(-1).route, "transport");
  assert.ok(res.payload.links.some(link => link.kind === "source" && /bus_no=N6701/.test(link.url)));
});

test("late-night arrival routing works in every supported guest language", () => {
  const cases = [
    ["인천공항에서 심야에 숙소로 오는 법", "ko", /심야에는 N6701/],
    ["How do I get from Incheon Airport to Another House late at night?", "en", /At night, take the N6701/],
    ["仁川空港から深夜に宿へ行く方法", "ja", /深夜はN6701/],
    ["从仁川机场凌晨去住宿怎么走？", "zh", /深夜请乘N6701/],
    ["從仁川機場凌晨到住宿怎麼走？", "zh-TW", /深夜請搭N6701/]
  ];
  for (const [message, language, expected] of cases) {
    const result = handler._internals.verifiedAirportArrival(message, language);
    assert.equal(result.mode, "night-arrival");
    assert.match(result.answer, expected);
    assert.match(result.answer, /T2 23:30 · T1 23:50 → DDP 01:00/);
  }
});

test("an explicit airport route to somewhere else is not rewritten as an Another House arrival", () => {
  assert.equal(handler._internals.verifiedAirportArrival("인천공항에서 서울역으로 가는 법", "ko"), null);
  assert.equal(handler._internals.verifiedAirportArrival("How do I get from Incheon Airport to Busan?", "en"), null);
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
  assert.equal(request.body.reasoning.effort, "medium");
  assert.equal(res.payload.model, "gpt-5.4-mini");
  assert.equal(res.payload.meta.searched, true);
  assert.equal(res.payload.meta.knowledgeVersion, "2026-09-23.1");
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
  assert.match(request.body.input.at(-1).content, /VERIFIED_LOCAL_GUIDE_RESULT/);
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
  assert.equal(request.body.tool_choice, undefined);
  assert.equal(request.body.tools, undefined);
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

test("a short tell-me reply releases the code only after the verified recovery failure flow", async () => {
  const cases = [
    ["ko", "키카드를 놓고 나와서 못 들어가요", "전화가 안됩니다", "알려주세요"],
    ["en", "I left my key card and cannot enter", "The phone is not working", "Tell me"],
    ["ja", "キーカードを忘れて入れない", "電話がつながらない", "教えてください"],
    ["zh", "忘带房卡，无法进入", "电话不通", "请告诉我"],
    ["zh-TW", "忘帶房卡，無法進入", "電話不通", "請告訴我"]
  ];
  for (const [language, issue, failure, request] of cases) {
    const history = [
      { role: "user", text: issue },
      { role: "assistant", text: "Use the kiosk phone." },
      { role: "user", text: failure },
      { role: "assistant", text: "Reply with the short confirmation." }
    ];
    const res = await callAccess({ message: request, language, history });
    assert.match(res.payload.answer, /TESTACCESSCODE/);
    assert.equal(res.payload.meta.accessSupport, true);
  }
  assert.equal(handler._internals.anotherHouseAccessSupport("알려주세요", [], "ko"), null);
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
