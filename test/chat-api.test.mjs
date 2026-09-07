import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("../api/chat.js");

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; }
  };
}

test("chat API uses OPENAI_API_KEY and gpt-5.4-mini", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  let request;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      status: 200,
      json: async () => ({ model: "gpt-5.4-mini", output_text: "체크인은 오후 3시부터입니다." })
    };
  };

  try {
    const req = {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.10" },
      socket: {},
      body: { message: "체크인은 몇 시야?", language: "ko", context: { checkin: "15:00" }, history: [] }
    };
    const res = responseRecorder();
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.model, "gpt-5.4-mini");
    assert.equal(request.url, "https://api.openai.com/v1/responses");
    assert.equal(request.options.headers.Authorization, "Bearer test-key");
    assert.equal(request.body.model, "gpt-5.4-mini");
    assert.equal(request.body.store, false);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("chat API rejects requests when OPENAI_API_KEY is missing", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const req = {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.11" },
      socket: {},
      body: { message: "Hello", language: "en", context: { brand: "Another House" } }
    };
    const res = responseRecorder();
    await handler(req, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.payload.error, "AI service is not configured");
  } finally {
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
  }
});
