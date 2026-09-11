import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("generated knowledge mirrors current public guide content without secrets", async () => {
  const raw = await readFile(resolve(root, "assets/guide-knowledge.json"), "utf8");
  const knowledge = JSON.parse(raw);
  assert.equal(knowledge.version, "2026-09-11.2");
  assert.deepEqual(knowledge.languages, ["ko", "en", "ja", "zh", "zh-TW"]);
  assert.equal(knowledge.property.ko.address, "서울시 종로구 종로 294 선일빌딩 5층");
  assert.equal(knowledge.stay.ko.checkin.summary.includes("15:00"), true);
  assert.equal(knowledge.stay.ko.checkout.summary.includes("11:00"), true);
  assert.equal(knowledge.stay.ko.parking.onSite, "건물 내 주차 불가");
  assert.match(knowledge.arrivalAndTransport.en.localArrival.instruction, /Kyochon Chicken Dongdaemun No\. 1/);
  assert.equal(knowledge.arrivalAndTransport.en.sections[0].routes.length, 3);
  assert.match(knowledge.arrivalAndTransport.en.sections[0].routes[1].path, /Bus 6002/);
  assert.match(knowledge.arrivalAndTransport["zh-TW"].localArrival.instruction, /6號出口/);
  assert.equal(knowledge.hostRecommendations.ko.restaurants.length, 26);
  const eggdrop = knowledge.hostRecommendations.ko.restaurants.find(place => place.name === "에그드랍 동대문점");
  assert.equal(eggdrop.address, "서울 중구 을지로 255 기승빌딩 B동 에그드랍");
  assert.equal(eggdrop.verifiedHours.schedule, "매일 07:00–22:00");
  assert.equal(eggdrop.verifiedHours.sourceUrl, "https://map.naver.com/p/entry/place/1736990079");
  assert.equal(knowledge.hostRecommendations.ko.tours.length, 21);
  assert.equal(knowledge.publicLocalDirectory.ko.familyDining.length, 4);
  assert.equal(knowledge.publicLocalDirectory.ko.familyDining[0].hours.lastOrder, "21:00");
  assert.equal(knowledge.publicLocalDirectory.en.familyDining[2].hours.sourceUrl, "https://map.naver.com/p/entry/place/11801976");
  assert.match(knowledge.connectivity.ko.passwordPolicy, /공개 챗봇에서 제공하지 않습니다/);
  assert.doesNotMatch(raw, /another1234/);
  assert.doesNotMatch(raw, /doorlockImage|roomDoorlockImage/);
});

test("server and browser both reference the same generated knowledge bundle", async () => {
  const api = await readFile(resolve(root, "api/chat.js"), "utf8");
  const client = await readFile(resolve(root, "assets/master-app.js"), "utf8");
  assert.match(api, /require\("\.\.\/assets\/guide-knowledge\.json"\)/);
  assert.match(client, /fetch\('\/assets\/guide-knowledge\.json'/);
  assert.doesNotMatch(client, /buildChatContext/);
  assert.match(client, /anchor\.target='_blank'/);
  assert.match(client, /anchor\.rel='noopener noreferrer'/);
});
