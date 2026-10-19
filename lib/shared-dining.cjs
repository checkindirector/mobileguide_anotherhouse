// Operator-approved source: 어나더 요약, item 18 (D19), read 2026-10-19.
// Keep specific inventory answers and semantic-model evidence on the same facts.
const source = {
  url: 'https://docs.google.com/spreadsheets/d/11-CezKy5zGxL0lQuOKa86b7DwihfSH-ieCzJ7wIjPQ0/edit?gid=472542366',
  sheet: '어나더 요약', range: 'D19', item: 18, verifiedAt: '2026-10-19'
};
const inventory = {
  ko: '공용주방에 수저(숟가락·젓가락)와 포크가 있습니다. 공용 다이닝에는 개인물품에 이름을 적을 수 있도록 포스트잇과 펜이 준비되어 있습니다.',
  en: 'Spoons, chopsticks and forks are available in the shared kitchen. Sticky notes and pens are provided in the shared dining area for labeling personal belongings with your name.',
  ja: '共用キッチンにスプーン・箸・フォークがあります。共用ダイニングには、私物に名前を書くための付箋とペンが用意されています。',
  zh: '公共厨房备有勺子、筷子和叉子。公共用餐区备有便签和笔，请用来给个人物品标注姓名。',
  'zh-TW': '公共廚房備有湯匙、筷子和叉子。公共用餐區備有便利貼和筆，請用來在個人物品上標註姓名。'
};
const groups = [
  {
    id: 'dining-stationery',
    pattern: /펜|볼펜|포스트\s*잇|포스트잍|포스트잇|메모지|붙임쪽지|스티키\s*노트|(?<![a-z])pens?(?![a-z])|ball\s*point|sticky\s*notes?|post[ -]?its?|ペン|付箋|ふせん|ポストイット|便签|便簽|便條紙|便利贴|便利貼|签字笔|簽字筆|圆珠笔|原子筆|(?<![铅鉛])笔(?!记本)|(?<!鉛)筆(?!記本)/iu,
    answers: {
      ko: '공용 다이닝에 펜과 포스트잇이 준비되어 있습니다. 개인물품에 이름을 적을 때 사용해 주세요.',
      en: 'Pens and sticky notes are provided in the shared dining area. Please use them to label your personal belongings with your name.',
      ja: 'ペンと付箋は共用ダイニングに用意されています。私物に名前を書く際にお使いください。',
      zh: '公共用餐区备有笔和便签，请用来给个人物品标注姓名。',
      'zh-TW': '公共用餐區備有筆和便利貼，請用來在個人物品上標註姓名。'
    }
  },
  {
    id: 'kitchen-cutlery',
    pattern: /수저|숟가락|숫가락|젓가락|포크|식기류|식기|(?<![a-z])(?:spoons?|forks?|chop\s*sticks?|cutlery|utensils?|silverware)(?![a-z])|スプーン|フォーク|お箸|箸|カトラリー|食器|勺子|勺|汤匙|湯匙|调羹|調羹|筷子|筷|叉子|餐具/iu,
    answers: {
      ko: '공용주방에 수저(숟가락·젓가락)와 포크가 준비되어 있습니다. 사용한 식기는 설거지 후 제자리에 놓아 주세요.',
      en: 'Spoons, chopsticks and forks are available in the shared kitchen. Please wash used dishes and cutlery and return them to their places.',
      ja: '共用キッチンにスプーン・箸・フォークがあります。使用した食器やカトラリーは洗って元の場所へ戻してください。',
      zh: '公共厨房备有勺子、筷子和叉子。使用过的餐具请清洗后放回原位。',
      'zh-TW': '公共廚房備有湯匙、筷子和叉子。使用過的餐具請清洗後放回原位。'
    }
  }
];
const external = /근처|주변|구매|구입|파는|사려|어디서.*사|추천|맛집|nearby|where.*buy|buy|purchase|restaurant|software|github|fork.*repo|周辺|近く|買|購入|レストラン|附近|哪里买|哪裡買|购买|購買|餐厅|餐廳/iu;
const issueOrOtherItem = /없는데|없어요|안\s*보|못\s*찾|잃|분실|고장|안\s*써|연필|가위|칼|나이프|수량|몇\s*개|브랜드|색깔|색상|not\s*(?:there|available|find|working)|can.t\s*find|lost|missing|broken|pencil|scissors?|kniv?es?|how\s*many|brand|colou?r|ないん|見当たら|見つから|紛失|壊|鉛筆|はさみ|ハサミ|包丁|ナイフ|何本|何個|找不到|没看到|沒看到|不见|不見|没有了|沒有了|丢|丟|坏|壞|铅笔|剪刀|刀|几支|幾支|几把|幾把/iu;

function matchingGroups(message) {
  const text = String(message || '').normalize('NFKC');
  return groups.filter(group => group.pattern.test(text));
}

function evidence(message, language = 'ko') {
  return matchingGroups(message).length ? {
    source, inventory: inventory[language] || inventory.ko,
    instruction: 'This latest operator correction overrides older omissions. Answer the requested item, not an unrelated appliance list. Do not infer pencils, knives, scissors, drawer positions, remaining stock, or permission to take reusable items away. If an item cannot be found, distinguish documented provision from current availability.'
  } : null;
}

function directAnswer(message, language = 'ko', otherTopics = []) {
  const matches = matchingGroups(message);
  if (!matches.length || external.test(message) || issueOrOtherItem.test(message)) return null;
  // Do not swallow check-in, towels, medicine, etc. in a compound request.
  if (otherTopics.some(topic => !['shared-dining', 'amenities', 'kitchen', 'refrigerator'].includes(topic))) return null;
  return { answer: matches.map(group => group.answers[language] || group.answers.ko).join('\n\n'), item: matches.map(group => group.id).join('+'), source };
}

module.exports = { source, inventory, matchingGroups, evidence, directAnswer };
