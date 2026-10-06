import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const maps=require('../assets/transit-maps.js');
const journey=require('../assets/airport-journey.js');
const knowledge=require('../assets/guide-knowledge.json');
function pairs(links){
  const groups=new Map();
  for(const link of links.filter(x=>x.kind==='map')){
    assert.ok(link.place&&link.placeId&&link.provider);
    const group=groups.get(link.placeId)||[];group.push(link.provider);groups.set(link.placeId,group);
    assert.ok(new URL(link.url));
  }
  for(const group of groups.values())assert.deepEqual(group.sort(),['google','naver']);
  return groups;
}
test('rail recommendation retains every actual route point without linking direction termini',()=>{
  const links=maps.forAnswer(knowledge,'인천공항 T2 가는길','숙소에서 동대문역 4호선 오이도 방면으로 서울역에 간 뒤 AREX로 인천공항 T2에 가세요.');
  const groups=pairs(links);
  for(const id of ['another-house','dongdaemun','seoul-arex','incheon-t2','incheon-rail-t2'])assert.ok(groups.has(id));
  assert.ok(!groups.has('incheon-t1')&&!groups.has('seoul-station'));
  assert.ok(links.every(x=>!decodeURIComponent(x.url).includes('오이도')));
  const seoul=links.find(x=>x.placeId==='seoul-arex'&&x.provider==='google');
  assert.match(decodeURIComponent(seoul.url),/청파로 378/);
});
test('bus maps distinguish outbound and inbound stops and deduplicate shared night stops',()=>{
  const out=pairs(maps.forAnswer(knowledge,'공항가는길','숙소에서 6002 또는 N6002를 타세요.','ko','departure'));
  const incoming=pairs(maps.forAnswer(knowledge,'공항에서 숙소','6002에서 내려 숙소로 오세요.','ko','arrival'));
  assert.ok(out.has('bus-01037')&&!out.has('bus-01023'));
  assert.ok(incoming.has('bus-01023')&&!incoming.has('bus-01037'));
});
test('station lookup never confuses Dongdaemun History station with Dongdaemun',()=>{
  for(const text of ['동대문역사문화공원역','Dongdaemun History & Culture Park','東大門歴史文化公園駅','东大门历史文化公园站','東大門歷史文化公園站']){
    const groups=pairs(maps.forAnswer(knowledge,'김포공항 가는길',text));
    assert.ok(groups.has('ddp-station'));assert.ok(!groups.has('dongdaemun'));
  }
  const groups=pairs(maps.forAnswer(knowledge,'청량리 가는길','동대문역 1호선으로 이동하세요. 서울역에서 KTX를 탈 수도 있습니다.'));
  assert.ok(groups.has('seoul-station')&&!groups.has('seoul-arex'));
});
test('five languages receive comparison, recommendation detail, invitation and paired maps',()=>{
  const questions={ko:'숙소에서 공항 가는길 비용 절약',en:'How do I get to the airport? Cheap please.',ja:'宿から仁川空港への行き方。費用を抑えたい',zh:'从住宿去机场，想省钱','zh-TW':'從住宿去機場，想省錢'};
  for(const [language,message] of Object.entries(questions)){
    const result=journey.prepare(knowledge,message,language);
    assert.equal(result.suggested,'rail');assert.equal((result.fallbackAnswer.match(/• /g)||[]).length,3);
    assert.match(result.fallbackAnswer,/AREX/);assert.match(result.fallbackAnswer,/→/);
    assert.ok(result.fallbackAnswer.split('\n\n').at(-1).length>20);
    const groups=pairs(result.linksFor('rail',null,result.fallbackAnswer));
    for(const id of ['another-house','dongdaemun','seoul-arex','incheon-t1','incheon-t2'])assert.ok(groups.has(id),language+':'+id);
  }
});
