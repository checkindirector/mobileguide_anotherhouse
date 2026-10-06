import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const require=createRequire(import.meta.url),handler=require('../api/chat.js');
const routeIntent=require('../assets/airport-route-intent.js');
const journeyApi=require('../assets/airport-journey.js');
const knowledge=handler._internals.GUIDE_KNOWLEDGE;
function assertMapPairs(links){
  const maps=links.filter(link=>link.kind==='map');assert.ok(maps.length>=6);
  const groups=new Map();for(const link of maps){assert.ok(link.placeId);const providers=groups.get(link.placeId)||new Set();providers.add(link.provider);groups.set(link.placeId,providers)}
  for(const providers of groups.values())assert.deepEqual([...providers].sort(),['google','naver']);
}
const ordinaryRoutes={
  ko:['숙소에서 인천공항 가는 길 알려줘','공항가는길','인천공항에서 가장 편한 길은?','공항에서 숙소 어떻게가요'],
  en:['How do I get to Incheon Airport from Another House?','How do I get to the airport?','Directions from Incheon Airport to Another House','How do I get here from the airport?'],
  ja:['宿から仁川空港への行き方','空港への行き方','仁川空港から宿への行き方','空港から宿へのアクセス'],
  zh:['从住宿前往仁川机场怎么走','去机场怎么走','从仁川机场到住宿怎么走','从机场到住宿怎么走'],
  'zh-TW':['從住宿前往仁川機場怎麼走','去機場怎麼走','從仁川機場到住宿怎麼走','從機場到住宿怎麼走']
};
test('ordinary airport directions retain all three choices even when model service is unavailable',async()=>{
  const originalFetch=global.fetch;
  global.fetch=async()=>{throw new Error('Plain airport routes must not search or call the model')};
  try{
    let ip=150;
    for(const [language,questions] of Object.entries(ordinaryRoutes))for(const [index,message] of questions.entries()){
      const res={statusCode:0,setHeader(){},status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};
      await handler({method:'POST',headers:{'x-forwarded-for':`198.51.100.${ip++}`},body:{message,language,telemetry:{optOut:true}},socket:{}},res);
      assert.equal(res.statusCode,200,message);
      assert.equal(res.body.model,'another-house-airport-options-fallback',message);
      assert.equal(res.body.meta.verifiedAirportJourney,true,message);
      assert.equal(res.body.meta.searched,false,message);
      assert.equal(res.body.meta.guideRoute,index<2?'airport-departure':'transport',message);
      assertMapPairs(res.body.links);
      assert.ok(res.body.links.some(link=>link.url.includes(index<2?'/01037/bus-station/80606':'/01901/bus-station/55012217')),message);
      assert.doesNotMatch(res.body.answer,/포항|Pohang/i);
      assert.match(res.body.answer,/AREX/);
      assert.match(res.body.answer,/택시|Taxi|タクシー|出租车|計程車/i);
      assert.ok(res.body.links.every(link=>!link.url.includes('qp.map.naver.com')),message);
    }
  }finally{global.fetch=originalFetch}
});
test('route classification keeps other origins, modes and non-route airport questions out of bus shortcuts',()=>{
  for(const message of ['포항에서 인천공항 가는 길','명동에서 인천공항 버스','From Pohang to Incheon Airport by airport bus','From Myeongdong to Incheon Airport','明洞から仁川空港への行き方','从明洞到仁川机场怎么走','從明洞到仁川機場怎麼走','인천공항 AREX 공항철도로 가는 길','Train to Incheon Airport','仁川空港へ電車で行く方法','去仁川机场地铁怎么走','去仁川機場搭計程車','김포공항 가는 길','인천공항 식당 추천','Incheon Airport duty free shops'])assert.equal(routeIntent.classify(message),null,message);
  for(const message of ['포항에서 인천공항 가는 길','명동에서 인천공항 공항버스','숙소에서 인천공항 AREX 가는 법'])assert.equal(handler._internals.verifiedAirportTransport(message,'ko'),null,message);
  assert.equal(routeIntent.classify('공항가는길',[{role:'user',content:'인천공항에서 숙소 가는 길'}]).arrival,false);
  assert.equal(routeIntent.classify('심야에는요',[{role:'user',content:'인천공항에서 숙소 가는 길'}]).arrival,true);
  assert.equal(routeIntent.classify('심야에는요',[{role:'user',content:'명동에서 인천공항 가는 길'}]),null);
  for(const message of ['인천공항에서 명동 가는 길','Directions from Incheon Airport to Myeongdong','仁川空港から明洞への行き方','从仁川机场到明洞怎么走','從仁川機場到明洞怎麼走'])assert.equal(routeIntent.classify(message),null,message);
});
test('search-derived generated route URLs cannot become verified source links',()=>{
  const data={output:[{type:'web_search_call',action:{sources:[
    {url:'https://qp.map.naver.com/end-quick-path/129.3497,36.0134,포항터미널/126.4346,37.4673,인천공항/car'},
    {url:'https://map.naver.com/p/directions/129.3497,36.0134/126.4346,37.4673/-/car'},
    {url:'https://www.airportlimousine.co.kr/sub/sub01.php?cat_no=5'}
  ]}}]};
  const links=handler._internals.extractSources(data,'ko');
  assert.equal(links.length,1);
  assert.ok(links[0].url.startsWith('https://www.airportlimousine.co.kr/'));
});
test('browser fallback shares ordinary airport direction matching and exact stop links',()=>{
  const source=readFileSync(new URL('../assets/master-app.js',import.meta.url),'utf8');
  const fn=source.slice(source.indexOf('function fallbackCurrentAirportBus('),source.indexOf('function airportBusMapsMarkup('));
  for(const [lang,questions] of Object.entries(ordinaryRoutes))for(const [index,q] of questions.entries()){
    const response=runInNewContext(fn+';fallbackCurrentAirportBus(knowledge,q)',{window:{ANOTHER_HOUSE_AIRPORT_ROUTE:routeIntent,ANOTHER_HOUSE_AIRPORT_JOURNEY:journeyApi},knowledge,q,lang,fallbackGuideLink:route=>({kind:'guide',route})});
    assert.equal(response.meta.guideRoute,index<2?'airport-departure':'transport',q);
    assertMapPairs(response.links);
    assert.match(response.answer,/AREX/);
    assert.match(response.answer,/택시|Taxi|タクシー|出租车|計程車/i);
  }
});
test('shared route classifier loads before the app in both site entry points',()=>{
  for(const file of ['index.html','guide-anotherhouse.html']){
    const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
    assert.ok(html.indexOf('airport-route-intent.js?v=20261006-3')<html.indexOf('master-app.js?v=20261006-5'));
    assert.ok(html.includes('airport-route-intent.js?v=20261006-3'));
    assert.ok(html.includes('transit-maps.js?v=20261006-6'));
    assert.ok(html.indexOf('transit-maps.js?v=20261006-6')<html.indexOf('airport-journey.js?v=20261006-5'));
    assert.ok(html.indexOf('airport-journey.js?v=20261006-5')<html.indexOf('master-app.js?v=20261006-5'));
  }
  const sandbox={window:{}};
  runInNewContext(readFileSync(new URL('../assets/airport-route-intent.js',import.meta.url),'utf8'),sandbox);
  assert.equal(sandbox.window.ANOTHER_HOUSE_AIRPORT_ROUTE.classify('공항가는길').arrival,false);
});
test('fallback recommendation changes with budget, mobility and night needs in all five languages',()=>{
  const questions={
    ko:['공항 가는 길 비용을 아끼고 싶어요','숙소에서 인천공항 가는 길 휠체어 이용해요','인천공항 가는 길 심야예요'],
    en:['How do I get to Incheon Airport on a budget?','How do I get to Incheon Airport with a wheelchair?','How do I get to Incheon Airport at night?'],
    ja:['仁川空港への行き方 費用を抑えたい','仁川空港への行き方 車いすです','仁川空港への行き方 深夜です'],
    zh:['去仁川机场怎么走 想省钱','去仁川机场怎么走 有轮椅','去仁川机场怎么走 是凌晨'],
    'zh-TW':['去仁川機場怎麼走 想省錢','去仁川機場怎麼走 有輪椅','去仁川機場怎麼走 是凌晨']
  };
  for(const [language,items] of Object.entries(questions))for(const [index,message] of items.entries()){
    const prepared=journeyApi.prepare(knowledge,message,language);
    assert.ok(prepared,message);assert.equal(prepared.suggested,['rail','taxi','conditional'][index],message);
    assert.deepEqual(Object.keys(prepared.options),['bus','rail','taxi']);
    if(index===2)assert.deepEqual(prepared.options.bus.routes.filter(bus=>bus.service==='night').map(bus=>bus.id),['N6701','N6002']);
  }
});
const cases={
  ko:['인천공항에서 숙소 공항버스','숙소에서 인천공항 공항버스','인천공항에서 심야버스','인천공항 가는 심야버스'],
  en:['Airport bus from Incheon Airport to Another House','Airport bus from Another House to Incheon Airport','Night bus from Incheon Airport to Another House','Night airport bus to Incheon Airport'],
  ja:['仁川空港から宿へ空港バス','宿から仁川空港へ空港バス','仁川空港から宿へ深夜バス','仁川空港へ深夜バス'],
  zh:['从仁川机场到住宿机场巴士','从住宿前往仁川机场机场巴士','从仁川机场到住宿夜间巴士','去仁川机场夜间巴士'],
  'zh-TW':['從仁川機場到住宿機場客運','從住宿前往仁川機場機場客運','從仁川機場到住宿夜間巴士','去仁川機場夜間巴士']
};
test('airport buses distinguish directions, walking distance and exact map stops in all languages',()=>{
  assert.equal(knowledge.airportBusGuide.verifiedAt,'2026-10-05');
  assert.equal(knowledge.airportBusGuide.distance.departure.differenceMeters,103);
  assert.equal(knowledge.airportBusGuide.distance.arrival.differenceMeters,46);
  assert.equal(knowledge.airportBusGuide.distance.departure.closer,'6002');
  assert.equal(knowledge.airportBusGuide.distance.arrival.closer,'6702');
  assert.match(knowledge.airportBusGuide.distance.measurement,/Naver recommended walking/);
  for(const language of Object.keys(cases)){
    const buses=knowledge.airportBusGuide.locales[language].routes;
    assert.deepEqual(buses.map(bus=>bus.id),['6702','6002','N6701','N6002']);
    assert.equal(buses[1].arrival.id,'01023');assert.equal(buses[1].departure.id,'01037');
    assert.equal(buses[3].arrival.id,'01023');assert.equal(buses[3].arrival.numberConfirmed,true);
    assert.deepEqual(buses[3].airportTimes.T1,['00:00','00:30','01:00','01:40','04:00','04:40']);
    assert.equal(buses[3].departureTimes.at(-1),'03:35');
    for(const bus of buses)for(const direction of ['arrival','departure']){
      const maps=bus[direction].maps;
      assert.equal(new URL(maps.google).searchParams.get('query'),bus[direction].coordinates.join(','));
      assert.equal(new URL(maps.naver).pathname,'/p/search/'+bus[direction].id+'/bus-station/'+bus[direction].naverStationId);
    }
  }
});
test('short stop-distance comparisons preserve direction-specific proximity in five languages',async()=>{
  const questions={ko:'6002 6702 정류장 거리차',en:'6002 6702 stop distance difference',ja:'6002 6702 停留所の距離',zh:'6002 6702 车站距离差','zh-TW':'6002 6702 車站距離差'};
  let ip=100;
  for(const [language,message] of Object.entries(questions)){
    const res={statusCode:0,setHeader(){},status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};
    await handler({method:'POST',headers:{'x-forwarded-for':`198.51.100.${ip++}`},body:{message,language,telemetry:{optOut:true}},socket:{}},res);
    assert.equal(res.statusCode,200,message);
    assert.equal(res.body.model,'another-house-verified-airport-bus',message);
    for(const distance of ['182','285','331','103','46'])assert.ok(res.body.answer.includes(distance),message);
    assert.doesNotMatch(res.body.answer,/411/);
    assert.ok(res.body.answer.indexOf('6002 —')<res.body.answer.indexOf('6702 —'));
  }
});
test('day/night airport questions return corrected direction and stop maps without a model in all five languages',async()=>{
  let ip=1;
  for(const [language,questions] of Object.entries(cases))for(const [index,message] of questions.entries()){
    const res={statusCode:0,setHeader(){},status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};
    await handler({method:'POST',headers:{'x-forwarded-for':`198.51.100.${ip++}`},body:{message,language},socket:{}},res);
    assert.equal(res.statusCode,200,message);assert.equal(res.body.model,'another-house-verified-airport-bus',message);
    assert.equal(res.body.meta.searched,false);assert.equal(res.body.meta.guideRoute,index%2===0?'transport':'airport-departure');
    const ids=index<2?['6702','6002']:['N6701','N6002'];for(const id of ids)assert.ok(res.body.answer.includes(id),message);
    assertMapPairs(res.body.links);
    if(index===0)assert.ok(res.body.links.some(link=>link.url.includes('/01023/bus-station/105523')));
    if(index===1)assert.ok(res.body.links.some(link=>link.url.includes('/01037/bus-station/80606')));
    if(index>=2)assert.ok(res.body.links.some(link=>link.url.includes('/02711/bus-station/55012226')));
    assert.doesNotMatch(res.body.answer,/01771|01773/);
  }
});
