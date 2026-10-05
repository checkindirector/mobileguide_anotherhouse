/* Operator-approved airport correction, 2026-10-05. Shared by the site and API knowledge build. */
(function (root) {
  const languages = ['ko','en','ja','zh','zh-TW'];
  const L = values => Object.fromEntries(languages.map((language,index)=>[language,values[index]]));
  const copy = {
    comparison:L(['숙소에서 가까운 정류장은 6702번입니다. 6002번 흥인지문 정류장과 약 411m 떨어져 있습니다(정류장 간 직선거리, 실제 보행거리 차이 아님). 가까운 정류장이 공항까지 가장 빠른 노선이라는 뜻은 아닙니다.','6702 has the closer stop to the property. The 6002 Heunginjimun stop is about 411 m from it (straight-line distance between stops, not the difference in walking distances). The nearest stop does not necessarily mean the fastest airport journey.','宿に近い停留所は6702です。6002の興仁之門停留所とは約411m離れています（停留所間の直線距離で、徒歩距離の差ではありません）。近い停留所が空港まで最速とは限りません。','6702的车站离住宿更近。与6002兴仁之门站相距约411米（两站间直线距离，并非步行距离差）。车站较近不代表到机场最快。','6702的車站離住宿更近。與6002興仁之門站相距約411公尺（兩站間直線距離，並非步行距離差）。車站較近不代表到機場最快。']),
    notice:L(['시간표는 도로·기상 상황에 따라 변경될 수 있습니다. 탑승 전 터미널과 방향별 공식 시간표를 확인해 주세요. 심야 시간은 날짜가 바뀌는 점에 유의해 주세요.','Schedules may change with traffic or weather. Check your terminal and the official timetable for your direction before boarding. Night services cross midnight.','道路・天候により時刻は変更されます。乗車前にターミナルと方向別の公式時刻表をご確認ください。深夜便は日付の変わり目にご注意ください。','班次可能因交通或天气改变。乘车前请确认航站楼及对应方向的官方时刻表，夜间班次需注意跨日。','班次可能因交通或天氣改變。乘車前請確認航廈及對應方向的官方時刻表，夜間班次需注意跨日。']),
    naver:L(['정류장 네이버지도','Stop · Naver Map','停留所・Naver地図','车站·Naver地图','車站·Naver地圖']),
    google:L(['정류장 구글맵','Stop · Google Maps','停留所・Googleマップ','车站·Google地图','車站·Google地圖']),
    official:L(['방향별 공식 시간표','Official directional timetable','方向別公式時刻表','对应方向官方时刻表','對應方向官方時刻表']),
    lastMile:L(['동대문역 6번 출구 방향으로 이동한 뒤 교촌치킨 간판 아래 선일빌딩 입구로 들어와 엘리베이터로 5층에 올라오세요.','Walk towards Dongdaemun Station Exit 6, enter Sunil Building beneath the Kyochon sign and take the elevator to 5F.','東大門駅6番出口へ進み、キョチョンの看板下のソニルビル入口からエレベーターで5階へ。','往东大门站6号出口方向，进入桥村炸鸡招牌下的Sunil大厦，乘电梯到5楼。','往東大門站6號出口方向，進入橋村炸雞招牌下的Sunil大樓，搭電梯到5樓。']),
    departure:L(['숙소 → 인천공항','Property → Incheon Airport','宿 → 仁川空港','住宿 → 仁川机场','住宿 → 仁川機場']),
    arrival:L(['인천공항 → 숙소','Incheon Airport → property','仁川空港 → 宿','仁川机场 → 住宿','仁川機場 → 住宿']),
    times:L(['정류장 출발','Stop departures','停留所発','车站发车','車站發車'])
  };
  const stop=(name,id,coordinates,numberConfirmed=true)=>({name,id,coordinates,numberConfirmed,
    maps:{naver:'https://map.naver.com/p/search/'+encodeURIComponent(id||'동대문 흥인지문 공항버스 정류장'),google:'https://www.google.com/maps/search/?api=1&query='+coordinates.join('%2C')}});
  const nearest=stop(L(['동대문역(JW메리어트호텔동대문)','Dongdaemun Station (JW Marriott Dongdaemun)','東大門駅（JWマリオット東大門）','东大门站（JW万豪东大门）','東大門站（JW萬豪東大門）']),'01901',[37.57072708611123,127.00918872386161]);
  const gate=L(['동대문(흥인지문)','Dongdaemun (Heunginjimun)','東大門（興仁之門）','东大门（兴仁之门）','東大門（興仁之門）']);
  const ddp=stop(L(['동대문디자인플라자(DDP) 알림터 A3 앞','Dongdaemun Design Plaza (DDP), outside Art Hall A3','東大門デザインプラザ（DDP）A3前','东大门设计广场（DDP）A3前','東大門設計廣場（DDP）A3前']),'02711',[37.56778308434606,127.00917421320439]);
  const routes=[
    {id:'6702',night:false,badge:L(['가까운 정류장','Nearest stop','近い停留所','较近车站','較近車站']),fare:L(['성인 18,000원 · 소아(만 6–12세) 12,000원','Adult ₩18,000 · child aged 6–12 ₩12,000','大人18,000ウォン・6～12歳12,000ウォン','成人18,000韩元·6–12岁12,000韩元','成人18,000韓元·6–12歲12,000韓元']),arrival:nearest,departure:nearest,
      boarding:'T1: 1F 3B / 4A · T2: B1 18 / 19',
      arrivalBody:L(['6702번을 타고 동대문역(JW메리어트호텔동대문) 01901에서 내리세요. 숙소와 가까운 정류장입니다.','Take 6702 to Dongdaemun Station (JW Marriott Dongdaemun), stop 01901, close to the property.','6702で東大門駅（JWマリオット東大門）01901下車。宿に近い停留所です。','乘6702，在东大门站（JW万豪东大门）01901下车，靠近住宿。','搭6702，在東大門站（JW萬豪東大門）01901下車，靠近住宿。']),
      departureBody:L(['동대문역 6번 출구 인근 JW메리어트호텔 입구 도로변 01901에서 인천공항행 6702번을 타세요. 흥인지문 중앙차로 정류장과 다릅니다.','Board airport-bound 6702 at roadside stop 01901 by the JW Marriott entrance near Dongdaemun Station Exit 6, not the Heunginjimun median stop.','東大門駅6番出口付近のJWマリオット入口道路沿い01901で空港行き6702に乗車。興仁之門の中央車線停留所とは異なります。','在东大门站6号出口附近JW万豪入口路边01901搭乘机场方向6702，并非兴仁之门中央车道车站。','在東大門站6號出口附近JW萬豪入口路邊01901搭乘機場方向6702，並非興仁之門中央車道車站。']),
      departureTimes:['04:07','04:37','05:17','06:02','06:42','07:27','08:02','08:47','09:32','10:17','11:02','11:47','12:17','12:57','13:47','14:17','14:42','15:22','15:57','16:42','17:27','18:02','18:47','19:22','19:52'],
      sourceArrival:'https://www.klimousine.com/bus/limousine.php?bus_no=6702',sourceDeparture:'https://www.klimousine.com/bus/limousine.php?bus_no=6702'},
    {id:'6002',night:false,badge:L(['다른 선택','Alternative','別の選択肢','其他选择','其他選擇']),fare:L(['성인 17,000원 · 어린이 12,000원','Adult ₩17,000 · child ₩12,000','大人17,000ウォン・子供12,000ウォン','成人17,000韩元·儿童12,000韩元','成人17,000韓元·兒童12,000韓元']),arrival:stop(gate,'01023',[37.5723191896375,127.0134225577350]),departure:stop(gate,'01037',[37.5723169394005,127.0134027475270]),
      boarding:'T1: 1F 6A-1 · T2: B1 30',
      arrivalBody:L(['6002번은 동대문(흥인지문) 01023 중앙차로 정류장에서 내리세요. 6702 정류장보다 숙소에서 멀고, 공항행 승차 정류장 01037과 번호가 다릅니다.','Alight from 6002 at Dongdaemun (Heunginjimun) median stop 01023. It is farther from the property than 6702 and differs from airport-bound stop 01037.','6002は東大門（興仁之門）の中央車線01023で下車。6702より宿から遠く、空港行き乗車停留所01037とは番号が異なります。','6002在东大门（兴仁之门）中央车道01023下车。比6702离住宿远，与机场方向01037编号不同。','6002在東大門（興仁之門）中央車道01023下車。比6702離住宿遠，與機場方向01037編號不同。']),
      departureBody:L(['동대문역 3번 출구 인근 흥인지문 중앙차로 01037에서 인천공항행 6002번을 타세요. 이 정류장의 현재 첫차 04:15, 막차 20:39이며 전체 시간표는 공식 버튼에서 확인해 주세요.','Board airport-bound 6002 at median stop 01037 near Dongdaemun Station Exit 3. Current stop departures run from 04:15 to 20:39; use the official button for the full timetable.','東大門駅3番出口付近、興仁之門の中央車線01037から空港行き6002に乗車。現在の始発04:15・最終20:39。全時刻は公式リンクで確認してください。','在东大门站3号出口附近兴仁之门中央车道01037乘机场方向6002。目前该站首班04:15、末班20:39，完整时刻表请点官方按钮。','在東大門站3號出口附近興仁之門中央車道01037搭機場方向6002。目前該站首班04:15、末班20:39，完整時刻表請點官方按鈕。']),
      sourceArrival:'https://www.airportlimousine.co.kr/sub/sub01.php?cat_no=6',sourceDeparture:'https://www.airportlimousine.co.kr/sub/sub01.php?cat_no=5'},
    {id:'N6701',night:true,badge:L(['심야 · DDP','Night · DDP','深夜・DDP','夜间·DDP','夜間·DDP']),fare:L(['성인 18,000원 · 소아(만 6–12세) 12,000원','Adult ₩18,000 · child aged 6–12 ₩12,000','大人18,000ウォン・6～12歳12,000ウォン','成人18,000韩元·6–12岁12,000韩元','成人18,000韓元·6–12歲12,000韓元']),arrival:ddp,departure:ddp,boarding:'T1: 1F 3B · T2: B1 18 / 19',
      arrivalBody:L(['N6701번을 타고 종점 DDP 02711에서 내린 뒤 숙소로 이동하세요. 동대문역 01901 정류장이 아닙니다.','Take N6701 to its final stop DDP 02711, then continue to the property. This is not Dongdaemun Station stop 01901.','N6701の終点DDP 02711で下車して宿へ。東大門駅01901ではありません。','乘N6701到终点DDP 02711后前往住宿，并非东大门站01901。','搭N6701到終點DDP 02711後前往住宿，並非東大門站01901。']),
      departureBody:L(['숙소에서 DDP 알림터 A3 앞 02711로 이동해 인천공항행 N6701을 타세요. 아래 시간은 DDP 출발입니다.','Go from the property to DDP Art Hall A3, stop 02711, for airport-bound N6701. Times below are DDP departures.','宿からDDP A3前02711へ移動し空港行きN6701に乗車。下記はDDP出発時刻です。','从住宿前往DDP A3前02711乘机场方向N6701，下方为DDP发车时间。','從住宿前往DDP A3前02711搭機場方向N6701，下方為DDP發車時間。']),
      departureTimes:['23:00','01:05','01:55','02:55'],airportTimes:{T1:['23:50','00:40','01:40','03:45','04:40'],T2:['23:30','00:20','01:20','03:25','04:20']},
      sourceArrival:'https://www.klimousine.com/bus/limousine.php?bus_no=N6701',sourceDeparture:'https://www.klimousine.com/bus/limousine.php?bus_no=N6701'},
    {id:'N6002',night:true,badge:L(['심야 · 흥인지문','Night · Heunginjimun','深夜・興仁之門','夜间·兴仁之门','夜間·興仁之門']),fare:L(['성인 17,000원 · 어린이(초등학생) 10,000원','Adult ₩17,000 · primary-school child ₩10,000','大人17,000ウォン・小学生10,000ウォン','成人17,000韩元·小学生10,000韩元','成人17,000韓元·小學生10,000韓元']),
      arrival:stop(gate,null,[37.5723191896375,127.0134225577350],false),departure:stop(gate,'01037',[37.5723169394005,127.0134027475270]),boarding:'T1: 1F 6A · T2: B1 30',
      arrivalBody:L(['N6002도 동대문(흥인지문)에 정차합니다. 하차 승객이 없으면 통과하므로 기사님께 흥인지문 하차를 알려 주세요. 운영사 하차 정류장 번호 표기가 일치하지 않아 번호 대신 위치 핀과 공식 노선으로 안내합니다.','N6002 also serves Dongdaemun (Heunginjimun). Tell the driver you wish to alight there; it may be skipped without alighting passengers. The operator has inconsistent alighting-stop numbers, so use the location pin and official route rather than an unconfirmed number.','N6002も東大門（興仁之門）に停車します。降車客がいないと通過するため運転手に降車を伝えてください。運営会社の降車番号表記が一致しないため、位置ピンと公式路線で案内します。','N6002也停靠东大门（兴仁之门）。无人下车时会不停站，请提前告知司机。运营方下车站编号不一致，因此提供位置标记与官方路线，不使用未确认编号。','N6002也停靠東大門（興仁之門）。無人下車時會不停站，請提前告知司機。營運方下車站編號不一致，因此提供位置標記與官方路線，不使用未確認編號。']),
      departureBody:L(['흥인지문 중앙차로 01037(동대문역 3·4번 출구 인근)에서 인천공항행 N6002를 타세요. 공항행은 현금 또는 교통카드로 결제합니다. 아래 시간은 흥인지문 출발입니다.','Board airport-bound N6002 at Heunginjimun median stop 01037 near Dongdaemun Station Exits 3–4. Pay by cash or transit card for the airport-bound trip. Times below are Heunginjimun departures.','東大門駅3・4番出口付近、興仁之門の中央車線01037から空港行きN6002に乗車。空港行きは現金または交通カード。下記は興仁之門発です。','在东大门站3·4号出口附近兴仁之门中央车道01037乘机场方向N6002，以现金或交通卡付款。下方为兴仁之门发车时间。','在東大門站3·4號出口附近興仁之門中央車道01037搭機場方向N6002，以現金或交通卡付款。下方為興仁之門發車時間。']),
      departureTimes:['22:35','23:25','01:55','02:25','02:55','03:35'],airportTimes:{T1:['00:00','00:30','01:00','01:40','04:00','04:40'],T2:['23:40','00:10','00:40','01:20','03:40','04:20']},
      sourceArrival:'https://www.airportlimousine.co.kr/sub/sub01.php?cat_no=82',sourceDeparture:'https://www.airportlimousine.co.kr/sub/sub01.php?cat_no=80'}
  ];
  const pick=(value,language)=>Array.isArray(value)?value.map(v=>pick(v,language)):value&&typeof value==='object'?(Object.hasOwn(value,language)?pick(value[language],language):Object.fromEntries(Object.entries(value).map(([k,v])=>[k,pick(v,language)]))):value;
  const guide={verifiedAt:'2026-10-05',authority:'Operator-approved transport correction after the workbook; official operator stop details',distance:{meters:411,measurement:'straight-line between 01901 and 01037; NOT walking-distance difference'},locales:Object.fromEntries(languages.map(language=>[language,{copy:pick(copy,language),routes:pick(routes,language)}]))};
  root.ANOTHER_HOUSE_AIRPORT_BUS=guide;
  const section=root.ANOTHER_HOUSE_DATA?.pages?.transport?.sections?.[0];
  if(section){
    const oldNight=section.routes.find(r=>/N6701/.test(r.title?.ko||''));
    const busRoutes=routes.map(bus=>({busId:bus.id,title:L(languages.map(language=>`${bus.id} · ${bus.arrival.name[language]}`)),badge:bus.badge,tags:L(languages.map(language=>[bus.fare[language]])),path:L(languages.map(language=>`${copy.arrival[language]} · ${bus.id}`)),note:copy.notice,sourceUrl:bus.sourceArrival,sourceLabel:copy.official,
      steps:[{icon:'flight_land',label:L(languages.map(()=>bus.id)),title:L(['공항 승차장','Airport boarding','空港乗り場','机场乘车处','機場乘車處']),body:L(languages.map(language=>`${bus.boarding}. ${bus.arrivalBody[language]}`))},{icon:'directions_walk',label:L(languages.map(()=>bus.arrival.id||bus.id)),title:bus.arrival.name,body:copy.lastMile}],
      ...(bus.id==='N6701'&&oldNight?.schedule?{schedule:oldNight.schedule}:{}),
      ...(bus.airportTimes?{airportTimes:bus.airportTimes}:{}),stopMaps:bus.arrival.maps
    }));
    section.routes=[...section.routes.filter(r=>!/6002|6702|N6701|N6002/.test(r.title?.ko||'')),...busRoutes];
    // Rail first, buses next, taxi last: preserve the rail recommendation without hiding bus choices.
    section.routes.sort((a,b)=>/(택시)/.test(a.title?.ko||'')?1:/(택시)/.test(b.title?.ko||'')?-1:0);
  }
})(typeof window!=='undefined'?window:globalThis);
