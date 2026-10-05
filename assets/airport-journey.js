/* Verified facts for multi-option airport answers; no live availability is implied. */
(function(root){
  const intentApi=typeof module!=='undefined'&&module.exports?require('./airport-route-intent.js'):root.ANOTHER_HOUSE_AIRPORT_ROUTE;
  const languages=['ko','en','ja','zh','zh-TW'];
  const L=values=>Object.fromEntries(languages.map((language,index)=>[language,values[index]]));
  const names=L([['공항버스','AREX 공항철도','택시'],['Airport bus','AREX Airport Railroad','Taxi'],['空港バス','AREX空港鉄道','タクシー'],['机场巴士','AREX机场铁路','出租车'],['機場客運','AREX機場鐵路','計程車']]);
  const railDeparture=L(['동대문역 → 4호선 오이도 방면 → 서울역 → AREX → 인천공항 T1·T2','Dongdaemun → Line 4 toward Oido → Seoul Station → AREX → Incheon Airport T1/T2','東大門駅 → 4号線・烏耳島方面 → ソウル駅 → AREX → 仁川空港T1・T2','东大门站 → 4号线往乌耳岛 → 首尔站 → AREX → 仁川机场T1/T2','東大門站 → 4號線往烏耳島 → 首爾站 → AREX → 仁川機場T1/T2']);
  const railTradeoff=L(['도로 정체의 영향을 받지 않고 일반열차는 비용을 아끼는 선택입니다. 서울역에서 환승하며, 일반열차는 교통카드, 직통열차는 별도 승차권이 필요합니다. 운행시간을 확인하세요.','Avoids road traffic; the all-stop train is the budget-oriented option. Transfer at Seoul Station. All-stop accepts transit cards; Express needs a separate ticket. Check operating hours.','道路渋滞を避けられ、一般列車は費用を抑えたい場合に向いています。ソウル駅で乗換。一般列車は交通カード、直通列車は別途乗車券が必要です。運行時間をご確認ください。','不受道路堵车影响，普通列车适合节省费用。需在首尔站换乘；普通列车可用交通卡，直达列车需另购票。请确认运行时间。','不受道路塞車影響，普通列車適合節省費用。需在首爾站轉乘；普通列車可用交通卡，直達列車需另購票。請確認營運時間。']);
  const busTradeoff=L(['환승 없이 이동할 수 있어 짐이 있거나 이동을 간단하게 하고 싶을 때 편합니다. 다만 도로 정체와 배차 간격의 영향을 받습니다.','No transfer, convenient with luggage or for a simpler journey. Road traffic and service intervals can affect the trip.','乗換がなく、荷物がある方や移動を簡単にしたい方に便利です。道路渋滞や運行間隔の影響はあります。','无需换乘，有行李或希望简单出行时较方便，但会受堵车和发车间隔影响。','不用轉乘，有行李或希望簡單移動時較方便，但會受塞車和班次間隔影響。']);
  const taxiTradeoff=L(['숙소와 이용 터미널 사이를 환승 없이 이동합니다. 여러 명이거나 걷기·환승이 어렵고, 심야 대중교통 시간이 맞지 않을 때 검토할 수 있습니다. 요금·소요시간·짐 적재 가능 여부는 차량과 교통상황에 따라 확인이 필요합니다.','Direct between the property and your terminal. Consider it for a group, difficulty walking/transferring, or when late-night public transport does not fit. Fare, travel time and luggage capacity require a vehicle/traffic check.','宿と利用ターミナルの間を直接移動します。複数人、徒歩・乗換が難しい場合、深夜の公共交通が合わない場合に検討できます。料金・所要時間・荷物の積載可否は車両と交通状況の確認が必要です。','住宿与所用航站楼之间直接移动。多人同行、步行或换乘困难、深夜公共交通不合适时可考虑。费用、时间和行李容量需按车辆与交通情况确认。','住宿與使用航廈之間直接移動。多人同行、步行或轉乘困難、深夜大眾運輸不合適時可考慮。費用、時間和行李容量需按車輛與交通狀況確認。']);
  const leads={
    bus:L(['특별한 조건이 없는 일반적인 이동이라면 환승 없는 공항버스를 먼저 추천드려요. 다만 짐이 가볍거나 비용·도로 정체가 더 중요하면 AREX가 더 잘 맞을 수 있습니다.','For an ordinary trip with no other preferences, I would first consider the no-transfer airport bus. AREX may fit better with light luggage or when cost/road traffic matters more.','特別な条件がない移動なら、まず乗換不要の空港バスをおすすめします。ただし荷物が少ない場合や費用・渋滞を重視する場合はAREXが合うこともあります。','没有特别条件时，可先考虑无需换乘的机场巴士。如果行李少，或更重视费用与堵车问题，AREX可能更合适。','沒有特殊條件時，可先考慮不用轉乘的機場客運。如果行李少，或更重視費用與塞車問題，AREX可能更合適。']),
    rail:L(['비용을 아끼거나 도로 정체를 피하는 것이 우선이면, 운행시간 내에는 AREX 공항철도를 먼저 검토하는 편이 좋습니다.','If saving money or avoiding road traffic comes first, consider AREX first within its operating hours.','費用を抑えることや渋滞回避を優先するなら、運行時間内はまずAREXを検討してください。','如果优先节省费用或避开道路堵车，在运行时间内可先考虑AREX。','如果優先節省費用或避開道路塞車，在營運時間內可先考慮AREX。']),
    taxi:L(['여러 명이 함께 이동하거나 걷기·환승이 어려운 상황이면 택시를 먼저 검토해 보세요. 차량의 짐 적재 공간과 총요금은 예약 전에 확인해야 합니다.','For a group or difficulty walking/transferring, consider a taxi first. Confirm luggage space and the total fare before booking.','複数人や徒歩・乗換が難しい場合は、まずタクシーを検討してください。荷物スペースと総料金は予約前に確認が必要です。','多人同行或步行、换乘困难时，可先考虑出租车。预订前需确认行李空间及总费用。','多人同行或步行、轉乘困難時，可先考慮計程車。預約前需確認行李空間及總費用。']),
    conditional:L(['심야 이동이라면 지금 탈 수 있는 편을 먼저 확인해야 합니다. N6002·N6701 시간이 맞으면 심야버스, 맞지 않으면 택시를 검토하세요. AREX도 운행시간 확인이 필요합니다.','For a late-night trip, check which service actually fits first. Consider N6002/N6701 if their schedules fit, otherwise a taxi. AREX operating hours also need checking.','深夜はまず利用できる便を確認してください。N6002・N6701の時刻が合えば深夜バス、合わなければタクシーを検討し、AREXの運行時間も確認してください。','深夜出行应先核对可乘班次。N6002、N6701时间合适时可考虑夜间巴士，否则考虑出租车；AREX也需确认运行时间。','深夜出行應先核對可搭班次。N6002、N6701時間合適時可考慮夜間客運，否則考慮計程車；AREX也需確認營運時間。'])
  };
  function prepare(knowledge,message,language='ko',history=[]){
    const intent=intentApi.classify(message,history);
    if(!intent||intent.busOnly)return null;
    const guide=knowledge.airportBusGuide?.locales?.[language],transport=knowledge.arrivalAndTransport?.[language],property=knowledge.property?.[language];
    if(!guide||!transport||!property)return null;
    const direction=intent.arrival?'arrival':'departure',routes=transport.sections?.[0]?.routes||[];
    const railRoute=routes.find(route=>/AREX/i.test(route.title)),taxiRoute=routes.find(route=>/택시|taxi|タクシー|出租车|計程車/i.test(route.title));
    const buses=guide.routes.filter(bus=>bus.night===intent.night).sort((a,b)=>intent.arrival?0:a.id==='6002'?-1:b.id==='6002'?1:0);
    const busFacts=guide.routes.map(bus=>({id:bus.id,service:bus.night?'night':'daytime',stop:bus[direction],description:bus[direction+'Body'],boarding:intent.arrival?bus.boarding:undefined,fare:bus.fare,departureTimes:bus.departureTimes,airportTimes:bus.airportTimes,source:bus[intent.arrival?'sourceArrival':'sourceDeparture']}));
    const railMaps=intent.arrival?property.maps:{naver:'https://map.naver.com/p/search/'+encodeURIComponent('동대문역'),google:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('동대문역')};
    const options={bus:{name:names[language][0],tradeoff:busTradeoff[language],routes:busFacts},rail:{name:names[language][1],path:intent.arrival?railRoute?.path:railDeparture[language],tradeoff:railTradeoff[language],source:'https://www.airportrailroad.com/main'},taxi:{name:names[language][2],tradeoff:taxiTradeoff[language],address:property.address,arrivalGuide:taxiRoute}};
    const hasCurrentPreference=/저렴|싸게|절약|비용|정체|막히|짐|휠체어|걷기|거동|명|혼자|cheap|budget|cost|traffic|luggage|wheelchair|mobility|people|alone|費用|渋滞|荷物|車いす|人|行李|便宜|省钱|省錢|堵车|塞車|轮椅|輪椅/i.test(message);
    const contextText=hasCurrentPreference?message:history.filter(item=>item.role==='user').slice(-2).map(item=>item.content).concat(message).join(' ');
    let suggested='bus';
    if(/저렴|싸게|절약|비용|정체|막히|짐.{0,4}(?:가볍|없)|cheap|budget|cost|traffic|light\s*luggage|安く|費用|渋滞|荷物が少|便宜|省钱|省錢|堵车|塞車|行李少/i.test(contextText))suggested='rail';
    if(/휠체어|걷기.{0,5}어려|거동|(?:3|4|세|네)\s*명|wheelchair|mobility|(?:three|four|3|4)\s*(?:people|guests|of\s+us)|車いす|歩くのが難|[34]人|轮椅|輪椅|[三四34]人/i.test(contextText))suggested='taxi';
    if(intent.night)suggested='conditional';
    const first=buses[0],stop=first?.[direction];
    const mapsByMode={bus:stop?.maps,rail:railMaps,taxi:property.maps,conditional:stop?.maps};
    const labels=guide.copy;
    const linksFor=(choice,busId)=>{
      const mode=['bus','rail','taxi','conditional'].includes(choice)?choice:suggested,maps=mapsByMode[mode];
      const selectedBus=guide.routes.find(bus=>bus.id===busId)||first,selectedStop=selectedBus[direction],selectedMaps=mode==='bus'||mode==='conditional'?selectedStop.maps:maps;
      const name=mode==='bus'||mode==='conditional'?`${selectedBus.id} · ${selectedStop.name}`:mode==='rail'?names[language][1]:'ANOTHER HOUSE';
      const mapsLinks=selectedMaps?[{kind:'map',label:name+' · '+labels.naver,url:selectedMaps.naver},{kind:'map',label:name+' · '+labels.google,url:selectedMaps.google}]:[];
      const sources=mode==='rail'?[{kind:'source',label:names[language][1]+' · '+labels.official,url:options.rail.source}]:mode==='taxi'?[]:[{kind:'source',label:selectedBus.id+' · '+labels.official,url:selectedBus[intent.arrival?'sourceArrival':'sourceDeparture']}];
      return mapsLinks.concat(sources);
    };
    const fallbackAnswer=[guide.copy[direction],leads[suggested][language],...Object.entries(options).map(([mode,option])=>option.name+'\n'+(option.path||(mode==='bus'?buses.map(bus=>bus.id+' · '+bus[direction].name+' ('+bus[direction].id+')').join('\n'):option.address))+'\n'+option.tradeoff),guide.copy.notice].join('\n\n');
    return {direction,route:intent.arrival?'transport':'airport-departure',night:intent.night,options,suggested,fallbackAnswer,linksFor,verifiedAt:knowledge.airportBusGuide.verifiedAt};
  }
  const api={prepare};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ANOTHER_HOUSE_AIRPORT_JOURNEY=api;
})(typeof window!=='undefined'?window:globalThis);
