import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/chat.js");

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
  assert.equal(res.payload.links.length, 1);
  assert.equal(res.payload.links[0].label, "기상청");
});

test("late-night transport uses high search context", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "공개 운행 자료를 확인한 정보입니다.", output: [{ type: "web_search_call", action: { sources: [] } }], usage: {} };
  const { request } = await callApi({ message: "새벽 4시에 인천공항 가는 정확한 교통편", language: "ko" }, output, "203.0.113.22");
  assert.equal(request.body.tools[0].search_context_size, "high");
});

test("address answer includes two clickable map links", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "주소는 서울시 종로구 종로 294 선일빌딩 5층입니다.", output: [], usage: {} };
  const { res } = await callApi({ message: "숙소 주소가 어디야?", language: "ko" }, output, "203.0.113.23");
  assert.deepEqual(res.payload.links.map(link => link.label), ["네이버 지도", "Google Maps"]);
  assert.ok(res.payload.links.every(link => link.kind === "map" && /^https:/.test(link.url)));
});

test("specific public parking map links come before source links", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "숙소 안내가 아닌 공개 자료를 확인했습니다.", output: [{ type: "web_search_call", action: { sources: [{ title: "서울 주차정보", url: "https://parking.seoul.go.kr/" }] } }], usage: {} };
  const { res } = await callApi({ message: "동대문 근처 공영주차장 찾아줘", language: "ko" }, output, "203.0.113.24");
  assert.equal(res.payload.links[0].kind, "map");
  assert.equal(res.payload.links[1].kind, "map");
  assert.equal(res.payload.links[2].kind, "source");
});

test("duplicate current question is removed from recent history", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "15:00부터입니다.", output: [], usage: {} };
  const { request } = await callApi({ message: "체크인은 몇 시야?", language: "ko", history: [{ role: "user", text: "체크인은 몇 시야?" }] }, output, "203.0.113.25");
  assert.equal(request.body.input.length, 1);
  assert.match(request.body.input[0].content, /GUEST_QUESTION: 체크인은 몇 시야\?/);
});

test("raw URLs are removed from answer text", async () => {
  const output = { model: "gpt-5.4-mini", output_text: "공식 안내 https://example.com/page 를 확인하세요.", output: [], usage: {} };
  const { res } = await callApi({ message: "체크인", language: "ko" }, output, "203.0.113.26");
  assert.doesNotMatch(res.payload.answer, /https?:\/\//);
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
