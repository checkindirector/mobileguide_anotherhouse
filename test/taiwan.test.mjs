import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..');
const read=file=>readFile(resolve(root,file),'utf8');
const files=['site-data','gallery-data','content-updates','gallery-overrides','restaurant-data','restaurant-expanded','tour-data'];
async function dataContext(){const context={window:{}};vm.createContext(context);for(const file of files)vm.runInContext(await read('assets/'+file+'.js'),context);return context.window;}

test('every localized data entry includes Taiwan Traditional Chinese with the same structure',async()=>{
  const data=await dataContext();let total=0;
  function check(value,path){if(!value||typeof value!=='object')return;if(Object.hasOwn(value,'ko')&&Object.hasOwn(value,'zh')){total++;assert.ok(Object.hasOwn(value,'zh-TW'),path);assert.notEqual(value['zh-TW'],undefined,path);assert.equal(typeof value['zh-TW'],typeof value.zh,path);if(Array.isArray(value.zh))assert.equal(value['zh-TW'].length,value.zh.length,path);if(typeof value.zh==='string'&&/^(?:https?:|\/?assets\/)/.test(value.zh))assert.equal(value['zh-TW'],value.zh,path+' must preserve media and URLs');}for(const [key,item] of Object.entries(value))check(item,path+'.'+key);}
  check(data,'data');assert.ok(total>400,`Only ${total} locale entries checked`);
  const d=data.ANOTHER_HOUSE_DATA;
  assert.equal(d.pages.rules.title['zh-TW'],'住宿規則');
  assert.match(d.station['zh-TW'],/東大門/);
  assert.equal(d.pages.appliances.devices[0].guideImage['zh-TW'],d.pages.appliances.devices[0].guideImage.en);
});

test('Taiwan locale is selectable, stored, and recognized by concierge routing',async()=>{
  const html=await read('index.html');const source=await read('assets/master-app.js');
  assert.equal((html.match(/class="home-language-option"/g)||[]).length,5);
  assert.match(html,/data-language="zh-TW" lang="zh-TW"><span>繁體中文（台灣）/);
  assert.match(html,/data-language="zh" lang="zh-CN"><span>简体中文/);
  assert.match(source,/"zh-TW":"TW"/);
  assert.match(source,/localStorage\.setItem\('another-house-lang',lang\)/);
  const d=(await dataContext()).ANOTHER_HOUSE_DATA;
  const body=source.slice(source.indexOf('function answer(q){'),source.indexOf('\ndocument.addEventListener',source.indexOf('function answer(q){')));
  const answer=new Function('D','t',body+';return answer;')(d,v=>v&&typeof v==='object'?v['zh-TW']:v);
  assert.equal(answer('網路密碼是什麼？'),d.pages.wifi.summary['zh-TW']);
  assert.equal(answer('幾點可以入住？'),d.pages.checkin.summary['zh-TW']);
  assert.match(answer('從機場怎麼到住宿？'),/東大門/);
  assert.equal(answer('怎麼使用冷氣？'),d.pages.appliances.summary['zh-TW']);
});
