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
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return { ok: true, status: 200, json: async () => output };
  };
  try {
    const req = { method: "POST", headers: { "x-forwarded-for": ip }, socket: {}, body };
    const res = responseRecorder();
    await handler(req, res);
    return { res, request };
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

test("manual question uses server knowledge, gpt-5.4-mini, and no web search", async () => {
  const { res, request } = await callApi(
    { message: "체크인은 몇 시인가요?", language: "ko", context: { malicious: "ignored" }, history: [] },
    { model: "gpt-5.4-mini", output_text: "체크인은 15:00부터입니다.", usage: { input_tokens: 100, output_tokens: 20, input_tokens_details: { cached_tokens: 80 } } },
    "203.0.113.20"
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.model, "gpt-5.4-mini");
  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.options.headers.Authorization, "Bearer test-key");
  assert.equal(request.body.model, "gpt-5.4-mini");
  assert.equal(request.body.store, false);
  assert.equal(request.body.tools, undefined);
  assert.match(request.body.instructions, /CURRENT_GUIDE version 2026-09-08\.1/);
  assert.match(request.body.instructions, /MAP_SPOT: <canonical place name> \| <complete street address>/);
  assert.doesNotMatch(request.body.instructions, /another1234|malicious/);
  assert.equal(request.body.prompt_cache_key, "another-house-2026-09-08.1-ko");
  assert.equal(res.payload.meta.cachedTokens, 80);
  assert.equal(res.payload.meta.searched, false);
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
  assert.equal(res.payload.links[0].label, "기상청");
});

test("late-night transport uses high search context", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "공개 운행 자료를 확인한 정보입니다.", output: [{ type: "web_search_call", action: { sources: [] } }], usage: {} };
  const { request } = await callApi({ message: "새벽 4시에 인천공항 가는 정확한 교통편", language: "ko" }, output, "203.0.113.22");
  assert.equal(request.body.tools[0].search_context_size, "high");
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
  const output = {
    model: "gpt-5.4-mini",
    output_text: "에그드랍 동대문점은 공개 영업정보상 22:00까지 운영합니다.",
    output: [{ type: "web_search_call", action: { sources: [{ title: "에그드랍 동대문점", url: "https://www.tabling.co.kr/place/677ccdae66de5f069881845c" }] } }],
    usage: {}
  };
  const cases = [
    ["밤 9시 이후 식사 가능한 곳", "203.0.113.45"],
    ["지금 문 연 식당 알려줘", "203.0.113.46"],
    ["Find a restaurant open after 9 pm", "203.0.113.47"],
    ["에그드랍 동대문점은 몇 시까지 영업해?", "203.0.113.49"]
  ];
  for (const [message, ip] of cases) {
    const { res, request } = await callApi({ message, language: message.startsWith("Find") ? "en" : "ko" }, output, ip);
    assert.equal(request.body.tools[0].search_context_size, "high");
    assert.match(request.body.instructions, /For dining recommendations tied to a stated time or current opening status, search before answering/);
    assert.equal(res.payload.meta.searched, true);
  }
});

test("a property check-in time question does not become a dining web search", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "현재 안내를 확인해 주세요.", output: [], usage: {} };
  const { request } = await callApi({ message: "밤 9시 이후 체크인 가능한가요?", language: "ko" }, output, "203.0.113.48");
  assert.equal(request.body.tools, undefined);
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
  assert.deepEqual(res.payload.links, []);
});

test("address answer includes two clickable map links", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "주소는 서울시 종로구 종로 294 선일빌딩 5층입니다.", output: [], usage: {} };
  const { res } = await callApi({ message: "숙소 주소가 어디야?", language: "ko" }, output, "203.0.113.23");
  assert.deepEqual(res.payload.links.map(link => link.label), ["네이버 지도", "Google Maps"]);
  assert.ok(res.payload.links.every(link => link.kind === "map" && /^https:/.test(link.url)));
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

test("route advice never turns a broad airport destination into map buttons", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "심야에는 공항버스 운행 시간부터 확인해야 합니다.\nMAP_SPOT: 인천국제공항 제1여객터미널 | 인천광역시 중구 공항로 272", output: [{ type: "web_search_call", action: { sources: [{ title: "인천국제공항", url: "https://www.airport.kr/" }] } }], usage: {} };
  const { res } = await callApi({ message: "심야에는 공항철도보다 심야버스가 더 현실적인가요? 어나더하우스에서 인천공항까지 가고 싶어요.", language: "ko" }, output, "203.0.113.32");
  assert.equal(res.payload.links.filter(link => link.kind === "map").length, 0);
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
  assert.deepEqual(res.payload.links, []);
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
  assert.deepEqual(res.payload.links, []);
});

test("duplicate current question is removed from recent history", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "15:00부터입니다.", output: [], usage: {} };
  const { request } = await callApi({ message: "체크인은 몇 시야?", language: "ko", history: [{ role: "user", text: "체크인은 몇 시야?" }] }, output, "203.0.113.25");
  assert.equal(request.body.input.length, 1);
  assert.match(request.body.input[0].content, /GUEST_QUESTION: 체크인은 몇 시야\?/);
});

test("raw URLs are removed from answer text", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "**공식 안내** https://example.com/page (example.com)를 확인하세요.", output: [], usage: {} };
  const { res } = await callApi({ message: "체크인", language: "ko" }, output, "203.0.113.26");
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
