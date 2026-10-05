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
    const bus = /N?\s*(?:6002|6702|6701)|공항\s*(?:버스|리무진|셔틀)|심야\s*버스|리무진|airport\s*(?:bus|limousine|coach|shuttle)|night\s*bus|空港.{0,8}(?:バス|リムジン)|(?:机场|機場).{0,8}(?:巴士|大巴|客運)/i.test(text);
    const route = /가는|갈|가려|가야|어떻게|편한|편하게|방법|교통편|경로|길|how|directions?|route|get\s+to|go\s+to|transport|easiest|best\s+way|行き方|どう.*行|アクセス|便利|怎么|怎麼|如何|前往|路线|路線|交通|方便/i.test(text);
    if (!(airport.test(text) || /6002|6702|N6701/i.test(text) || (night && airport.test(previous)))) return null;
    if (!airport.test(text) && hasOtherOrigin(previous)) return null;
    // A specific mode stays specific; comparisons and generic routes need all transport options.
    const nightBusComparison = bus && night && /보다|더\s*현실|versus|\bvs\b|better|rather|比較|より|比|更/i.test(text);
    const optionsWanted = /옵션|선택지|여러|비교|뭐가|추천|options?|compare|which|recommend|比較|どれ|おすすめ|比较|比較|哪种|哪種|推荐|推薦/i.test(text);
    const modeComparison = bus && alternativeMode.test(text) && (optionsWanted || nightBusComparison || /(?:랑|하고|or|versus|\bvs\b|より|还是|還是)/i.test(text));
    if (alternativeMode.test(text) && !modeComparison || (!bus && !night && !route)) return null;
    const isArrival = arrival.test(text) || (!outbound.test(text) && arrival.test(previous));
    return { arrival: isArrival, night, busOnly: bus && !modeComparison && !/옵션|선택지|여러|options?|compare|比較|比较/i.test(text), comparison: /6002/.test(text) && /6702/.test(text), explicit: text.match(/\b(N6701|N6002|6702|6002)\b/i)?.[1]?.toUpperCase() || null };
  }
  const api = { classify, hasOtherOrigin, alternativeMode };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ANOTHER_HOUSE_AIRPORT_ROUTE = api;
})(typeof window !== 'undefined' ? window : globalThis);
