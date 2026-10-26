/* Pure route classification shared by the server and browser fallback. */
(function (root) {
  const airport = /공항|airport|空港|机场|機場/i;
  const arrival = /공항(?:\s*(?:T[12]|제?\s*[12]\s*터미널))?\s*(?:에서|부터)|from\s+(?:(?:incheon|the)\s+)?(?:international\s+)?airport|(?:仁川)?(?:国際)?空港(?:T[12]|第?[12]ターミナル)?から|(?:从|從)(?:仁川)?(?:国际|國際)?(?:机场|機場)/i;
  const outbound = /공항\s*(?:으로|에|까지|가는|갈)|to\s+(?:incheon\s+)?(?:the\s+)?airport|空港(?:へ|まで|に)|(?:去|到|往).{0,8}(?:机场|機場)/i;
  const propertyOrigin = /숙소|어나더\s*하우스|선일\s*빌딩|동대문|another\s*house|property|hotel|hostel|accommodation|here|dongdaemun|当館|宿泊先|ホテル|(?:^|\s)宿$|東大門|住宿|旅舍|酒店|飯店|饭店|東大門|东大门/i;
  const airportOrigin = /공항|airport|空港|机场|機場/i;
  const alternativeMode = /AREX|공항\s*철도|철도|지하철|전철|열차|기차|택시|airport\s*(?:rail|train)|railway|\btrain\b|subway|metro|\btaxi\b|鉄道|地下鉄|電車|タクシー|铁路|鐵路|地铁|地鐵|列车|列車|出租车|計程車/i;

  function hasOtherOrigin(value) {
    const text = String(value || '');
    const origins = [
      ...text.matchAll(/([가-힣]+)\s*(?:에서|부터)/g),
      ...text.matchAll(/\bfrom\s+(.+?)(?=\s+(?:to|for|towards?|by|how)\b|[,.?!]|$)/gi),
      ...text.matchAll(/([^、。！？\s]+)から/g),
      ...text.matchAll(/(?:从|從)\s*(.+?)(?=到|前往|去|往|怎么|怎麼|如何|[，。？！]|$)/g)
    ].map(match => match[1]);
    return origins.some(origin => !propertyOrigin.test(origin) && !airportOrigin.test(origin));
  }

  function classify(value, history = []) {
    const text = String(value || '').normalize('NFKC').trim();
    if (hasOtherOrigin(text) || /김포|gimpo|金浦|(?:광주|제주|김해|대구|청주|gwangju|jeju|gimhae|daegu|cheongju).{0,8}(?:공항|airport)/i.test(text)) return null;
    const previous = history.filter(item => item?.role === 'user').slice(-2).map(item => item.content).join(' ');
    if (!propertyOrigin.test(text) && /공항\s*(?:에서|부터).{0,70}(?:서울역|명동|홍대|강남|부산|포항|청량리)(?:으로|로|까지|에|\s*가)|from\s+(?:incheon\s+|the\s+)?airport\s+to\s+(?!another\s*house|the\s*(?:property|hotel|hostel)|your\s*(?:hotel|hostel)|dongdaemun|here)\S+|空港から.{0,50}(?:ソウル駅|明洞|弘大|江南|釜山)(?:へ|まで)|(?:从|從)(?:仁川)?(?:机场|機場).{0,50}(?:首尔站|首爾站|明洞|弘大|江南|釜山)/i.test(text)) return null;
    const night = /심야|새벽|밤|\bnight\b|overnight|midnight|early\s*morning|深夜|早朝|夜中|凌晨|夜间|夜間|晚上|夜里|夜裡|N6002|N6701/i.test(text);
    const bus = /N?\s*(?:6002|6702|6701)|공항\s*(?:버스|리무진|셔틀)|심야\s*버스|리무진|airport\s*(?:bus|limousine|coach|shuttle)|limousine\s*(?:bus|stop)|night\s*bus|リムジン|空港.{0,8}(?:バス|リムジン)|(?:机场|機場).{0,8}(?:巴士|大巴|客運)/i.test(text);
    const stopQuery = bus && /정류장|승차장|어디서\s*타|가까|거리|도보|걸어서|\bstops?\b|where.*board|near|close|walk|distance|停留所|バス停|乗り場|近い|近く|徒歩|距離|站牌|车站|車站|站点|站點|乘车处|乘車處|上车|上車|近吗|近嗎|多远|多遠|步行|距离|距離/i.test(text)
      && !/시간표|timetable|schedule|時刻表|时刻表|時刻|요금|fare|料金|票价|票價/i.test(text);
    const route = /가는|갈|가려|가야|어떻게|편한|편하게|방법|교통편|경로|길|how|directions?|route|get\s+to|go\s+to|transport|easiest|best\s+way|行き方|どう.*行|アクセス|便利|怎么|怎麼|如何|前往|路线|路線|交通|方便/i.test(text);
    if (!(airport.test(text) || /6002|6702|N6701/i.test(text) || (bus && stopQuery) || (night && airport.test(previous)))) return null;
    if (!airport.test(text) && hasOtherOrigin(previous)) return null;
    // A specific mode stays specific; comparisons and generic routes need all transport options.
    const nightBusComparison = bus && night && /보다|더\s*현실|versus|\bvs\b|better|rather|比較|より|比|更/i.test(text);
    const optionsWanted = /옵션|선택지|여러|비교|뭐가|추천|options?|compare|which|recommend|比較|どれ|おすすめ|比较|比較|哪种|哪種|推荐|推薦/i.test(text);
    const modeComparison = bus && alternativeMode.test(text) && (optionsWanted || nightBusComparison || /(?:랑|하고|or|versus|\bvs\b|より|还是|還是)/i.test(text));
    if (alternativeMode.test(text) && !modeComparison || (!bus && !night && !route && !outbound.test(text) && !arrival.test(text))) return null;
    const isArrival = arrival.test(text) || (!outbound.test(text) && arrival.test(previous));
    return { arrival: isArrival, night, busOnly: bus && !modeComparison && !/옵션|선택지|여러|options?|compare|比較|比较/i.test(text), stopQuery,
      directionSpecified: arrival.test(text) || outbound.test(text) || arrival.test(previous) || outbound.test(previous),
      comparison: /6002/.test(text) && /6702/.test(text), explicit: text.match(/\b(N6701|N6002|6702|6002)\b/i)?.[1]?.toUpperCase() || null };
  }
  // Shared by the API and browser error fallback: never lose the second
  // direction's map buttons just because no direction was specified.
  function stopGuide(knowledge, intent, language = 'ko') {
    if (!intent?.stopQuery || !intent.busOnly) return null;
    const guide = knowledge.airportBusGuide?.locales?.[language];
    if (!guide) return null;
    const { arrival, night, explicit, comparison } = intent;
    const direction = arrival ? 'arrival' : 'departure';
    const directions = intent.directionSpecified ? [direction] : ['departure', 'arrival'];
    const buses = guide.routes.filter(bus => comparison ? !bus.night : explicit ? bus.id === explicit : bus.night === night).sort((a,b) => arrival ? 0 : a.id === '6002' ? -1 : b.id === '6002' ? 1 : 0);
    if (!buses.length) return null;
    const c = guide.copy, distance = knowledge.airportBusGuide.distance;
    const blocks = directions.map(mode => [c[mode], ...buses.map(bus => {
      const stop = bus[mode], walk = distance?.[mode]?.[bus.id === 'N6002' ? '6002' : bus.id];
      return `${bus.id} — ${stop.name} (${stop.id})${walk ? ` · ${walk.meters}m / ${walk.minutes} min` : ''}`;
    })].join('\n'));
    const walkingNote = { ko: '도보 거리는 2026-10-05 네이버지도 경로 기준이며 신호 대기와 짐에 따라 달라질 수 있습니다.', en: 'Walking estimates use Naver routes checked on 2026-10-05; traffic lights and luggage may add time.', ja: '徒歩の目安は2026-10-05確認のNaverルート基準です。信号や荷物により時間は変わります。', zh: '步行距离以2026-10-05核对的Naver路线为准，红绿灯及行李会影响时间。', 'zh-TW': '步行距離以2026-10-05核對的Naver路線為準，紅綠燈及行李會影響時間。' }[language];
    const answer = [...blocks, ...(directions.length === 2 && (!explicit || ['6002','6702','N6002'].includes(explicit)) ? [c.comparison] : [walkingNote]), c.notice].join('\n\n');
    const links = directions.flatMap(mode => buses.flatMap(bus => ['naver','google'].map(provider => ({kind:'map', provider, placeId:'bus-'+bus[mode].id, place:bus[mode].name+' · '+bus[mode].id, label:`${bus.id} · ${bus[mode].name} · ${bus[mode].id} · ${c[provider]}`, url:bus[mode].maps[provider]}))));
    const seen = new Set();
    return { answer, links:links.filter(link => !seen.has(link.url) && seen.add(link.url)), mode:direction, route:arrival ? 'transport' : 'airport-departure', verifiedAt:knowledge.airportBusGuide.verifiedAt };
  }
  const api = { classify, hasOtherOrigin, alternativeMode, stopGuide };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ANOTHER_HOUSE_AIRPORT_ROUTE = api;
})(typeof window !== 'undefined' ? window : globalThis);
