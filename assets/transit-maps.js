/* Canonical journey points. Bus pins come from the direction-specific guide,
 * never a model-generated URL. Station queries use unique Korean names/lines;
 * airport terminal addresses are from airport.kr (checked 2026-10-06). */
(function(root){
  const languages=['ko','en','ja','zh','zh-TW'];
  const L=values=>Object.fromEntries(languages.map((language,index)=>[language,values[index]]));
  const providers=L([['네이버지도','구글맵'],['Naver Map','Google Maps'],['Naver地図','Googleマップ'],['Naver地图','Google地图'],['Naver地圖','Google地圖']]);
  const points=[
    {id:'dongdaemun',names:L(['동대문역 · 1·4호선','Dongdaemun · Lines 1/4','東大門駅・1・4号線','东大门站·1/4号线','東大門站·1/4號線']),query:'동대문역 1호선 4호선 서울',match:/동대문역(?!사)|dongdaemun\b(?!\s*history)(?:\s*station)?|東大門駅|东大门站|東大門站/i},
    {id:'seoul-station',names:L(['서울역','Seoul Station','ソウル駅','首尔站','首爾站']),query:'서울역 서울',match:/서울역|seoul\s*station|ソウル駅|首尔站|首爾站/i},
    {id:'seoul-arex',names:L(['서울역 · AREX 환승','Seoul Station · AREX transfer','ソウル駅・AREX乗換','首尔站·AREX换乘','首爾站·AREX轉乘']),query:'서울역 공항철도 서울특별시 용산구 청파로 378',match:/서울역|seoul\s*station|ソウル駅|首尔站|首爾站/i,source:'https://www.airportrailroad.com/train/normal/info/010/0'},
    {id:'ddp-station',names:L(['동대문역사문화공원역 · 4·5호선','Dongdaemun History & Culture Park · Lines 4/5','東大門歴史文化公園駅・4・5号線','东大门历史文化公园站·4/5号线','東大門歷史文化公園站·4/5號線']),query:'동대문역사문화공원역 5호선 서울',match:/동대문역사문화공원|dongdaemun\s*history|東大門[歴歷]史文化公園|东大门历史文化公园|東大門歷史文化公園/i},
    {id:'gimpo-station',names:L(['김포공항역','Gimpo Airport Station','金浦空港駅','金浦机场站','金浦機場站']),query:'김포공항역 5호선 공항철도 서울',match:/김포공항역|gimpo\s*airport\s*station|金浦空港駅|金浦机场站|金浦機場站/i},
    {id:'incheon-t1',names:L(['인천공항 T1 · 제1여객터미널','Incheon Airport T1 · Terminal 1','仁川空港T1・第1ターミナル','仁川机场T1·第1航站楼','仁川機場T1·第1航廈']),query:'인천국제공항 제1여객터미널 인천광역시 영종구 공항로 272',source:'https://www.airport.kr/sites/ap_ko/index.do'},
    {id:'incheon-t2',names:L(['인천공항 T2 · 제2여객터미널','Incheon Airport T2 · Terminal 2','仁川空港T2・第2ターミナル','仁川机场T2·第2航站楼','仁川機場T2·第2航廈']),query:'인천국제공항 제2여객터미널 인천광역시 영종구 제2터미널대로 446',source:'https://www.airport.kr/sites/ap_ko/index.do'},
    {id:'incheon-rail-t1',names:L(['인천공항1터미널역 · AREX','Incheon Airport Terminal 1 Station · AREX','仁川空港1ターミナル駅・AREX','仁川机场1号航站楼站·AREX','仁川機場1號航廈站·AREX']),query:'인천공항1터미널역 공항철도',match:/인천공항\s*1터미널역|incheon\s*airport\s*terminal\s*1\s*station|仁川空港1ターミナル駅|仁川机场1号航站楼站|仁川機場1號航廈站/i},
    {id:'incheon-rail-t2',names:L(['인천공항2터미널역 · AREX','Incheon Airport Terminal 2 Station · AREX','仁川空港2ターミナル駅・AREX','仁川机场2号航站楼站·AREX','仁川機場2號航廈站·AREX']),query:'인천공항2터미널역 공항철도',match:/인천공항\s*2터미널역|incheon\s*airport\s*terminal\s*2\s*station|仁川空港2ターミナル駅|仁川机场2号航站楼站|仁川機場2號航廈站/i}
  ];
  function pair(place,maps,language='ko',id=place){
    const p=providers[language]||providers.ko;
    return ['naver','google'].map((provider,index)=>({kind:'map',place,placeId:id,provider,label:place+' · '+p[index],url:maps[provider]}));
  }
  function point(id,language='ko'){
    const value=points.find(item=>item.id===id);
    if(!value)return[];
    const query=encodeURIComponent(value.query);
    const googlePlaceId=['seoul-arex','seoul-station'].includes(id)?'ChIJlU6-zWiifDURBCDQ_VkAI7s':null; // Observed Seoul Station listing, checked 2026-10-06.
    return pair(value.names[language]||value.names.ko,{naver:'https://map.naver.com/p/search/'+query,google:'https://www.google.com/maps/search/?api=1&query='+query+(googlePlaceId?'&query_place_id='+googlePlaceId:'')},language,id);
  }
  function property(knowledge,language='ko'){
    const value=knowledge.property?.[language]||knowledge.property?.ko;
    return value?.maps?pair('ANOTHER HOUSE',value.maps,language,'another-house'):[];
  }
  function terminalIds(text){
    const t1=/\bT1\b|terminal\s*1|제?\s*1\s*(?:여객)?터미널|第?1(?:ターミナル|航站楼|航站樓|航廈)|1号航站楼/i.test(text);
    const t2=/\bT2\b|terminal\s*2|제?\s*2\s*(?:여객)?터미널|第?2(?:ターミナル|航站楼|航站樓|航廈)|2号航站楼/i.test(text);
    return t1&&!t2?['incheon-t1']:t2&&!t1?['incheon-t2']:['incheon-t1','incheon-t2'];
  }
  function unique(links){
    const seen=new Set();
    return links.filter(link=>{
      const key=link.kind+':'+link.url;
      const placeKey=link.kind==='map'&&link.place&&link.provider?'place:'+String(link.place).normalize('NFKC').replace(/\s+/g,'').toLowerCase()+':'+link.provider:null;
      if(seen.has(key)||placeKey&&seen.has(placeKey))return false;
      seen.add(key);if(placeKey)seen.add(placeKey);return true;
    });
  }
  function forAnswer(knowledge,message,answer,language='ko',direction='departure'){
    const links=[],busLinks=[],text=String(answer||'');
    const propertyMention=/숙소|어나더\s*하우스|선일\s*빌딩|another\s*house|property|building\s*entrance|当館|宿|ソニル|住宿|旅舍|Sunil/i.test(text);
    if(propertyMention)links.push(...property(knowledge,language));
    const arexMention=/AREX|공항철도|airport\s*(?:railroad|railway|train)|空港鉄道|机场铁路|機場鐵路/i.test(text);
    for(const value of points){
      if(value.id==='seoul-station'&&arexMention||value.id==='seoul-arex'&&!arexMention)continue;
      if(value.match?.test(text))links.push(...point(value.id,language));
    }
    if(/김포공항|gimpo\s*airport|金浦空港|金浦机场|金浦機場/i.test(text)&&/지하철|5호선|철도|subway|line\s*5|rail|地下鉄|5号線|地铁|5号线|地鐵|5號線/i.test(text))links.push(...point('gimpo-station',language));
    const guide=knowledge.airportBusGuide?.locales?.[language]||knowledge.airportBusGuide?.locales?.ko;
    for(const bus of (guide?.routes||[]).slice().sort((a,b)=>direction==='arrival'?0:a.id==='6002'?-1:b.id==='6002'?1:0)){
      const idMatch=new RegExp('(?<![A-Za-z0-9])'+bus.id+'(?![0-9])','i').test(text);
      const stop=bus[direction];
      if(idMatch||new RegExp('(?<![0-9])'+stop.id+'(?![0-9])').test(text))busLinks.push(...pair(bus.id+' · '+stop.name+' · '+stop.id,stop.maps,language,'bus-'+stop.id));
      const other=bus[direction==='arrival'?'departure':'arrival'];
      if(other.id!==stop.id&&new RegExp('(?<![0-9])'+other.id+'(?![0-9])').test(text))busLinks.push(...pair(bus.id+' · '+other.name+' · '+other.id,other.maps,language,'bus-'+other.id));
    }
    if(/인천|incheon|仁川/i.test(text)&&/공항|airport|空港|机场|機場/i.test(text)){
      for(const id of terminalIds(message+' '+text)){
        links.push(...point(id,language));
        if(arexMention)links.push(...point(id==='incheon-t1'?'incheon-rail-t1':'incheon-rail-t2',language));
      }
    }
    return unique([...busLinks,...links]);
  }
  function airport(knowledge,message,answer,language,direction,choice,busId){
    let links=forAnswer(knowledge,message,answer,language,direction);
    if(!links.some(link=>link.placeId==='another-house'))links.unshift(...property(knowledge,language));
    for(const id of terminalIds(message))if(!links.some(link=>link.placeId===id))links.push(...point(id,language));
    // Keep the selected boarding stop prominent; all other mentioned points retain both maps.
    if(choice==='bus'||choice==='conditional'){
      const guide=knowledge.airportBusGuide.locales[language],bus=guide.routes.find(item=>item.id===busId);
      if(bus){const stop=bus[direction];links=unique([...pair(bus.id+' · '+stop.name+' · '+stop.id,stop.maps,language,'bus-'+stop.id),...links])}
    }
    return unique(links);
  }
  const api={pair,point,property,terminalIds,unique,forAnswer,airport};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ANOTHER_HOUSE_TRANSIT_MAPS=api;
})(typeof window!=='undefined'?window:globalThis);
