import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),inventory=require('../assets/amenity-inventory.js'),knowledge=require('../assets/guide-knowledge.json');
const app=readFileSync(new URL('../assets/master-app.js',import.meta.url),'utf8');
test('browser fallback shares five-language complete-item logic and refuses unsupported details',()=>{
  const fn=app.slice(app.indexOf('function fallbackInventory('),app.indexOf('async function browserFallback('));
  for(const [lang,question,expected,unknown] of [
    ['ko','냄비랑 포크 있나요?',/냄비.*포크/s,'냄비랑 가위 있나요?'],
    ['en','Do you have pots and forks?',/cooking pots.*forks/s,'Do you have pots and scissors?'],
    ['ja','鍋とフォークはありますか？',/鍋.*フォーク/s,'鍋とはさみはありますか？'],
    ['zh','有沐浴露、洗发水和吹风机吗？',/沐浴露.*洗发水.*吹风机/s,'有洗发水和护发素吗？'],
    ['zh-TW','有沐浴乳、洗髮精和吹風機嗎？',/沐浴乳.*洗髮精.*吹風機/s,'有洗髮精和護髮素嗎？']
  ]){
    const ctx=vm.createContext({window:{ANOTHER_HOUSE_AMENITIES:inventory},lang,fallbackGuideNormalize:value=>String(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,''),fallbackGuideLink:route=>({route})});vm.runInContext(fn,ctx);
    const answer=ctx.fallbackInventory(knowledge,question);assert.match(answer.answer,expected);assert.equal(answer.links[0].route,'appliances');
    const unsupported=ctx.fallbackInventory(knowledge,unknown);assert.match(unsupported.answer,/확인하지 못|cannot verify|確認できません|不能确认|無法確認/);
  }
  assert.match(app,/\.\.\.await browserFallback\(q\)/);
});
