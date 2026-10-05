import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),handler=require('../api/chat.js');
const knowledge=handler._internals.GUIDE_KNOWLEDGE;
const cases={
  ko:['인천공항에서 숙소 공항버스','숙소에서 인천공항 공항버스','인천공항에서 심야버스','인천공항 가는 심야버스'],
  en:['Airport bus from Incheon Airport to Another House','Airport bus from Another House to Incheon Airport','Night bus from Incheon Airport to Another House','Night airport bus to Incheon Airport'],
  ja:['仁川空港から宿へ空港バス','宿から仁川空港へ空港バス','仁川空港から宿へ深夜バス','仁川空港へ深夜バス'],
  zh:['从仁川机场到住宿机场巴士','从住宿前往仁川机场机场巴士','从仁川机场到住宿夜间巴士','去仁川机场夜间巴士'],
  'zh-TW':['從仁川機場到住宿機場客運','從住宿前往仁川機場機場客運','從仁川機場到住宿夜間巴士','去仁川機場夜間巴士']
};
test('official airport bus data distinguishes directions and unresolved night stop number in all languages',()=>{
  assert.equal(knowledge.airportBusGuide.verifiedAt,'2026-10-05');
  assert.equal(knowledge.airportBusGuide.distance.meters,411);
  assert.match(knowledge.airportBusGuide.distance.measurement,/NOT walking/);
  for(const language of Object.keys(cases)){
    const buses=knowledge.airportBusGuide.locales[language].routes;
    assert.deepEqual(buses.map(bus=>bus.id),['6702','6002','N6701','N6002']);
    assert.equal(buses[1].arrival.id,'01023');assert.equal(buses[1].departure.id,'01037');
    assert.equal(buses[3].arrival.id,null);assert.equal(buses[3].arrival.numberConfirmed,false);
    assert.deepEqual(buses[3].airportTimes.T1,['00:00','00:30','01:00','01:40','04:00','04:40']);
    assert.equal(buses[3].departureTimes.at(-1),'03:35');
    for(const bus of buses)for(const direction of ['arrival','departure']){
      const maps=bus[direction].maps;
      assert.equal(new URL(maps.google).searchParams.get('query'),bus[direction].coordinates.join(','));
      if(bus[direction].id)assert.equal(new URL(maps.naver).pathname.split('/').at(-1),bus[direction].id);
    }
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
    assert.equal(res.body.links.filter(link=>link.kind==='map').length,4);
    if(index===0)assert.ok(res.body.links.some(link=>link.url.endsWith('/01023')));
    if(index===1)assert.ok(res.body.links.some(link=>link.url.endsWith('/01037')));
    if(index>=2)assert.ok(res.body.links.some(link=>link.url.endsWith('/02711')));
    assert.doesNotMatch(res.body.answer,/01771|01773/);
  }
});
