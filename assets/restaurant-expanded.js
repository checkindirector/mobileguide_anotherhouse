(() => {
  'use strict';

  const D = window.ANOTHER_HOUSE_DATA;
  const page = D?.pages?.nearby;
  if (!page) return;

  const I = (ko, en, ja, zh, zhTW) => ({ ko, en, ja, zh, "zh-TW": zhTW });
  const G = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const N = (query) => `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
  const add = (id, image, data) => page.places.push({
    id,
    image: `/assets/images/restaurants/${image}.webp`,
    naver: N(data.query),
    google: G(data.query),
    host: false,
    ...data,
  });

  page.hero = '/assets/images/restaurants-hero.jpg';
  page.summary = I(
    '동대문 노포부터 양식, 브런치, 카페, 광장시장과 을지로까지. 가까운 곳과 일부러 찾아갈 곳을 함께 고른 로컬 다이닝 가이드입니다.',
    'A wider local dining guide—from Dongdaemun institutions to Western dining, brunch, cafes, Gwangjang Market, and Euljiro.',
    '東大門の老舗から洋食、ブランチ、カフェ、広蔵市場、乙支路まで幅広く選びました。',
    '从东大门老店到西餐、早午餐、咖啡馆、广藏市场和乙支路，精选值得前往的餐饮地点。', "從東大門老店到西餐、早午餐、咖啡館、廣藏市場和乙支路，精選值得前往的餐飲地點。"
  );

  const cafeCategory = page.categories.find((category) => category.id === 'cafe');
  if (cafeCategory) cafeCategory.label = I('카페', 'Cafe', 'カフェ', '咖啡馆', "咖啡館");
  const insertAt = Math.max(0, page.categories.findIndex((category) => category.id === 'korean'));
  page.categories.splice(
    insertAt,
    0,
    { id: 'western', label: I('양식', 'Western', '洋食', '西餐', "西餐") },
    { id: 'brunch', label: I('브런치', 'Brunch', 'ブランチ', '早午餐', "早午餐") }
  );

  const seoulzip = page.places.find((place) => place.id === 'seoulzip');
  if (seoulzip && !seoulzip.categories.includes('western')) seoulzip.categories.push('western');
  const coffee = page.places.find((place) => place.id === 'coffee');
  if (coffee && !coffee.categories.includes('cafe')) coffee.categories.push('cafe');

  add('blt-steak', 'blt-steak', {
    query: 'BLT 스테이크 JW 메리어트 동대문',
    name: I('BLT 스테이크', 'BLT Steak', 'BLTステーキ', 'BLT牛排馆', "BLT牛排館"),
    category: I('양식·스테이크', 'Western · Steak', '洋食・ステーキ', '西餐·牛排', "西餐·牛排"),
    categories: ['western', 'special'],
    rating: '4.3',
    reviews: '696',
    walk: I('도보 약 3분', 'About 3 min walk', '徒歩約3分', '步行约3分钟', "步行約3分鐘"),
    text: I('JW 메리어트 동대문 안의 클래식 스테이크하우스. 기념일이나 격식 있는 저녁에 잘 맞습니다.', 'A classic steakhouse inside JW Marriott Dongdaemun, best for celebrations and polished dinners.', 'JWマリオット東大門内のクラシックなステーキハウス。記念日のディナーに。', '位于东大门JW万豪酒店内，适合纪念日及正式晚餐。', "位於東大門JW萬豪酒店內，適合紀念日及正式晚餐。"),
    tags: I(['스테이크', '호텔 다이닝', '기념일'], ['Steak', 'Hotel dining', 'Celebration'], ['ステーキ', 'ホテル', '記念日'], ['牛排', '酒店餐饮', '纪念日'], ["牛排", "酒店餐飲", "紀念日"]),
  });
  add('tavolo24', 'tavolo24', {
    query: '타볼로24 JW 메리어트 동대문',
    name: I('타볼로 24', 'Tavolo 24', 'タボロ24', 'Tavolo 24', "Tavolo 24"),
    category: I('양식·뷔페', 'Western · Buffet', '洋食・ビュッフェ', '西餐·自助餐', "西餐·自助餐"),
    categories: ['western', 'brunch', 'breakfast', 'special'],
    rating: '4.1',
    reviews: '317',
    walk: I('도보 약 3분', 'About 3 min walk', '徒歩約3分', '步行约3分钟', "步行約3分鐘"),
    text: I('동대문 전망과 함께 즐기는 호텔 올데이다이닝. 아침 식사부터 여유로운 주말 브런치까지 편합니다.', 'Hotel all-day dining with Dongdaemun views, from breakfast to an easy weekend brunch.', '東大門を望むホテルのオールデイダイニング。朝食や週末ブランチに便利です。', '可欣赏东大门景观的酒店全日餐厅，适合早餐和周末早午餐。', "可欣賞東大門景觀的酒店全日餐廳，適合早餐和週末早午餐。"),
    tags: I(['호텔 뷔페', '아침', '동대문 전망'], ['Hotel buffet', 'Breakfast', 'View'], ['ホテルビュッフェ', '朝食', '眺望'], ['酒店自助餐', '早餐', '景观'], ["酒店自助餐", "早餐", "景觀"]),
  });
  add('pizzeria-o', 'pizzeria-o', {
    query: '핏제리아오 대학로본점',
    name: I('핏제리아오 대학로본점', 'Pizzeria O Daehakro', 'ピッツェリア・オ 大学路', 'Pizzeria O 大学路', "Pizzeria O 大學路"),
    category: I('양식·이탈리안', 'Western · Italian', '洋食・イタリアン', '西餐·意大利菜', "西餐·義大利菜"),
    categories: ['western'],
    rating: '4.8',
    reviews: '7,232',
    walk: I('택시 약 10분', 'About 10 min by taxi', 'タクシー約10分', '出租车约10分钟', "計程車約10分鐘"),
    text: I('대학로에서 리뷰가 특히 많은 화덕 피자 전문점. 여러 명이 피자와 파스타를 나누기 좋습니다.', 'A heavily reviewed Daehakro destination for wood-fired pizza and pasta to share.', '大学路で口コミの多い薪窯ピザ店。ピザとパスタのシェアに。', '大学路高评论量柴火披萨店，适合多人分享披萨与意面。', "大學路高評論量柴火披薩店，適合多人分享披薩與意麵。"),
    tags: I(['화덕 피자', '파스타', '그룹'], ['Wood-fired pizza', 'Pasta', 'Groups'], ['薪窯ピザ', 'パスタ', 'グループ'], ['柴火披萨', '意面', '多人'], ["柴火披薩", "意麵", "多人"]),
  });
  add('the-place', 'the-place', {
    query: '더플레이스 광화문SFC점',
    name: I('더플레이스 광화문SFC점', 'The Place Gwanghwamun', 'ザ・プレイス 光化門', 'The Place 光化门', "The Place 光化門"),
    category: I('양식·이탈리안', 'Western · Italian', '洋食・イタリアン', '西餐·意大利菜', "西餐·義大利菜"),
    categories: ['western'],
    rating: '4.2',
    reviews: '282',
    walk: I('대중교통 약 20분', 'About 20 min by transit', '公共交通約20分', '公共交通约20分钟', "公共交通約20分鐘"),
    text: I('광화문에서 접근하기 쉬운 캐주얼 이탈리안. 궁궐 투어 전후 파스타와 피자를 먹기 좋습니다.', 'An approachable Italian stop in Gwanghwamun, convenient before or after a palace tour.', '光化門のカジュアルイタリアン。宮殿観光の前後に便利です。', '光化门交通便利的意大利餐厅，适合宫殿游览前后用餐。', "光化門交通便利的義大利餐廳，適合宮殿遊覽前後用餐。"),
    tags: I(['파스타', '피자', '광화문'], ['Pasta', 'Pizza', 'Gwanghwamun'], ['パスタ', 'ピザ', '光化門'], ['意面', '披萨', '光化门'], ["意麵", "披薩", "光化門"]),
  });

  add('onion-anguk', 'onion-anguk', {
    query: '카페 어니언 안국',
    name: I('어니언 안국점', 'Cafe Onion Anguk', 'オニオン 安国店', 'Cafe Onion 安国店', "Cafe Onion 安國店"),
    category: I('브런치·베이커리', 'Brunch · Bakery', 'ブランチ・ベーカリー', '早午餐·烘焙', "早午餐·烘焙"),
    categories: ['brunch', 'cafe', 'breakfast'],
    rating: '4.2',
    reviews: '4,582',
    walk: I('대중교통 약 20분', 'About 20 min by transit', '公共交通約20分', '公共交通约20分钟', "公共交通約20分鐘"),
    text: I('한옥 공간에서 빵과 커피를 즐기는 서울 대표 카페. 이른 시간 방문하면 비교적 여유롭습니다.', 'A signature Seoul hanok cafe for bread and coffee; earlier visits are usually calmer.', '韓屋でパンとコーヒーを楽しむソウルの人気店。早めの訪問がおすすめです。', '在韩屋空间享用面包和咖啡的首尔人气店，建议较早到访。', "在韓屋空間享用麵包和咖啡的首爾人氣店，建議較早到訪。"),
    tags: I(['한옥', '베이커리', '아침 추천'], ['Hanok', 'Bakery', 'Go early'], ['韓屋', 'ベーカリー', '朝がおすすめ'], ['韩屋', '烘焙', '建议早到'], ["韓屋", "烘焙", "建議早到"]),
  });
  add('london-bagel', 'london-bagel', {
    query: '런던베이글뮤지엄 안국점',
    name: I('런던베이글뮤지엄 안국점', 'London Bagel Museum Anguk', 'ロンドンベーグルミュージアム 安国', '伦敦贝果博物馆 安国店', "倫敦貝果博物館 安國店"),
    category: I('브런치·베이글', 'Brunch · Bagel', 'ブランチ・ベーグル', '早午餐·贝果', "早午餐·貝果"),
    categories: ['brunch', 'cafe', 'breakfast'],
    rating: '4.1',
    reviews: '2,305',
    walk: I('대중교통 약 20분', 'About 20 min by transit', '公共交通約20分', '公共交通约20分钟', "公共交通約20分鐘"),
    text: I('두툼한 베이글과 크림치즈로 유명한 안국의 대표 브런치 스폿. 대기가 긴 편입니다.', 'Anguk’s famous brunch stop for substantial bagels and cream cheese; expect a queue.', '厚いベーグルとクリームチーズで有名。待ち時間を見込んでください。', '以厚实贝果和奶油奶酪闻名，通常需要排队。', "以厚實貝果和奶油乳酪聞名，通常需要排隊。"),
    tags: I(['베이글', '테이크아웃', '대기 가능'], ['Bagel', 'Takeaway', 'Expect a wait'], ['ベーグル', 'テイクアウト', '待ち時間あり'], ['贝果', '外带', '可能排队'], ["貝果", "外帶", "可能排隊"]),
  });
  add('mil-toast', 'mil-toast', {
    query: '밀토스트 익선점',
    name: I('밀토스트 익선점', 'Mil Toast House', 'ミルトースト 益善店', 'Mil Toast 益善店', "Mil Toast 益善店"),
    category: I('브런치·토스트', 'Brunch · Toast', 'ブランチ・トースト', '早午餐·吐司', "早午餐·吐司"),
    categories: ['brunch', 'cafe', 'breakfast'],
    rating: '3.9',
    reviews: '1,214',
    walk: I('대중교통 약 15분', 'About 15 min by transit', '公共交通約15分', '公共交通约15分钟', "公共交通約15分鐘"),
    text: I('익선동 한옥에서 수플레 토스트와 스팀 식빵을 맛보는 곳. 가벼운 아침 산책 코스와 잘 어울립니다.', 'A hanok brunch stop in Ikseon-dong for souffle toast and steamed bread.', '益善洞の韓屋でスフレトーストと蒸しパンを楽しめます。', '在益善洞韩屋品尝舒芙蕾吐司和蒸面包。', "在益善洞韓屋品嚐舒芙蕾吐司和蒸麵包。"),
    tags: I(['수플레 토스트', '한옥', '익선동'], ['Souffle toast', 'Hanok', 'Ikseon-dong'], ['スフレトースト', '韓屋', '益善洞'], ['舒芙蕾吐司', '韩屋', '益善洞'], ["舒芙蕾吐司", "韓屋", "益善洞"]),
  });
  add('layered-bukchon', 'layered-bukchon', {
    query: '카페 레이어드 북촌',
    name: I('카페 레이어드 북촌', 'Cafe Layered Bukchon', 'カフェ・レイヤード 北村', 'Cafe Layered 北村', "Cafe Layered 北村"),
    category: I('브런치·베이커리', 'Brunch · Bakery', 'ブランチ・ベーカリー', '早午餐·烘焙', "早午餐·烘焙"),
    categories: ['brunch', 'cafe'],
    rating: '4.2',
    reviews: '1,350',
    walk: I('대중교통 약 20분', 'About 20 min by transit', '公共交通約20分', '公共交通约20分钟', "公共交通約20分鐘"),
    text: I('스콘과 케이크가 가득한 북촌 베이커리 카페. 안국과 북촌 산책 중 쉬어가기 좋습니다.', 'A Bukchon bakery cafe filled with scones and cakes, ideal during an Anguk walk.', 'スコーンとケーキが並ぶ北村のベーカリーカフェです。', '北村人气烘焙咖啡馆，司康与蛋糕选择丰富。', "北村人氣烘焙咖啡館，司康與蛋糕選擇豐富。"),
    tags: I(['스콘', '케이크', '북촌'], ['Scones', 'Cake', 'Bukchon'], ['スコーン', 'ケーキ', '北村'], ['司康', '蛋糕', '北村'], ["司康", "蛋糕", "北村"]),
  });
  add('eggdrop', 'eggdrop', {
    query: '에그드랍 동대문점',
    name: I('에그드랍 동대문점', 'Egg Drop Dongdaemun', 'エッグドロップ 東大門', 'Egg Drop 东大门店', "Egg Drop 東大門店"),
    category: I('브런치·샌드위치', 'Brunch · Sandwich', 'ブランチ・サンド', '早午餐·三明治', "早午餐·三明治"),
    categories: ['brunch', 'breakfast'],
    rating: '4.3',
    reviews: '594',
    walk: I('도보 약 9분', 'About 9 min walk', '徒歩約9分', '步行约9分钟', "步行約9分鐘"),
    text: I('짧은 시간에 계란 샌드위치와 커피를 챙기기 좋은 가까운 브런치 선택입니다.', 'A nearby, efficient stop for an egg sandwich and coffee when time is short.', '短時間で卵サンドとコーヒーを楽しめる近場の選択です。', '时间紧张时可快速享用鸡蛋三明治和咖啡。', "時間緊張時可快速享用雞蛋三明治和咖啡。"),
    tags: I(['빠른 식사', '계란 샌드위치', '가까움'], ['Quick meal', 'Egg sandwich', 'Nearby'], ['軽食', '卵サンド', '近い'], ['快捷餐', '鸡蛋三明治', '附近'], ["快捷餐", "雞蛋三明治", "附近"]),
  });

  add('cheongsudang', 'cheongsudang', {
    query: '청수당 베이커리 익선동',
    name: I('청수당 베이커리', 'Cheongsudang Bakery', '清水堂ベーカリー', '清水堂烘焙店', "清水堂烘焙店"),
    category: I('카페·디저트', 'Cafe · Dessert', 'カフェ・デザート', '咖啡·甜点', "咖啡·甜點"),
    categories: ['cafe'],
    rating: '4.3',
    reviews: '1,607',
    walk: I('대중교통 약 15분', 'About 15 min by transit', '公共交通約15分', '公共交通约15分钟', "公共交通約15分鐘"),
    text: I('대나무와 물길이 만든 익선동의 몰입형 카페. 수플레 카스텔라와 야간 분위기가 인기입니다.', 'An immersive Ikseon-dong cafe of bamboo and water, known for souffle castella and evening ambience.', '竹と水の演出が印象的な益善洞のカフェ。夜の雰囲気も人気です。', '以竹林与水景著称的益善洞沉浸式咖啡馆。', "以竹林與水景著稱的益善洞沉浸式咖啡館。"),
    tags: I(['익선동', '수플레', '야간 분위기'], ['Ikseon-dong', 'Souffle', 'Evening mood'], ['益善洞', 'スフレ', '夜景'], ['益善洞', '舒芙蕾', '夜间氛围'], ["益善洞", "舒芙蕾", "夜間氛圍"]),
  });
  add('fritz-wonseo', 'fritz-wonseo', {
    query: '프릳츠 원서',
    name: I('프릳츠 원서', 'Fritz Coffee Wonseo', 'フリッツ 原西', 'Fritz Coffee 苑西店', "Fritz Coffee 苑西店"),
    category: I('카페·로스터리', 'Cafe · Roastery', 'カフェ・ロースタリー', '咖啡·烘焙工坊', "咖啡·烘焙工坊"),
    categories: ['cafe'],
    rating: '4.4',
    reviews: '876',
    walk: I('대중교통 약 20분', 'About 20 min by transit', '公共交通約20分', '公共交通约20分钟', "公共交通約20分鐘"),
    text: I('창덕궁 옆 오래된 공간을 살린 로스터리 카페. 커피 품질과 베이커리 모두 안정적입니다.', 'A roastery in a restored old space beside Changdeokgung, reliable for both coffee and bread.', '昌徳宮近くの古い建物を活かしたロースタリーです。', '位于昌德宫旁的复古烘焙咖啡馆，咖啡和面包品质稳定。', "位於昌德宮旁的復古烘焙咖啡館，咖啡和麵包品質穩定。"),
    tags: I(['로스터리', '창덕궁', '베이커리'], ['Roastery', 'Changdeokgung', 'Bakery'], ['ロースタリー', '昌徳宮', 'ベーカリー'], ['烘焙咖啡', '昌德宫', '面包'], ["烘焙咖啡", "昌德宮", "麵包"]),
  });
  add('nuldam', 'nuldam', {
    query: '널담은공간 경복궁점',
    name: I('널담은공간 경복궁점', 'Nuldam Space Gyeongbokgung', 'ノルダムン空間 景福宮', 'Nuldam Space 景福宫店', "Nuldam Space 景福宮店"),
    category: I('카페·체험', 'Cafe · Experience', 'カフェ・体験', '咖啡·体验', "咖啡·體驗"),
    categories: ['cafe', 'special'],
    rating: '4.4',
    reviews: '303',
    walk: I('대중교통 약 25분', 'About 25 min by transit', '公共交通約25分', '公共交通约25分钟', "公共交通約25分鐘"),
    text: I('미래의 나에게 편지를 쓰는 체험형 카페. 경복궁·서촌 일정에 감성적인 휴식을 더합니다.', 'An experience cafe where you write a letter to your future self, ideal with a Seochon itinerary.', '未来の自分へ手紙を書く体験型カフェです。', '可给未来的自己写信的体验型咖啡馆。', "可給未來的自己寫信的體驗型咖啡館。"),
    tags: I(['편지 체험', '경복궁', '감성'], ['Letter experience', 'Gyeongbokgung', 'Reflective'], ['手紙体験', '景福宮', '感性'], ['写信体验', '景福宫', '氛围'], ["寫信體驗", "景福宮", "氛圍"]),
  });
  add('donut-jungsu', 'donut-jungsu', {
    query: '도넛정수 창신',
    name: I('도넛정수 창신', 'Donut Jungsu Changsin', 'ドーナツジョンス 昌信', 'Donut Jungsu 昌信', "Donut Jungsu 昌信"),
    category: I('카페·도넛', 'Cafe · Donut', 'カフェ・ドーナツ', '咖啡·甜甜圈', "咖啡·甜甜圈"),
    categories: ['cafe', 'special'],
    rating: '4.7',
    reviews: '288',
    walk: I('마을버스 약 15분', 'About 15 min by local bus', 'マウルバス約15分', '社区巴士约15分钟', "社群巴士約15分鐘"),
    text: I('창신동 절벽마을 전망과 한국식 도넛을 함께 즐기는 목적지형 카페입니다.', 'A destination cafe pairing Korean-style donuts with Changsin-dong hill views.', '昌信洞の丘の景色と韓国式ドーナツを楽しめます。', '可同时享受昌信洞山坡景观与韩式甜甜圈。', "可同時享受昌信洞山坡景觀與韓式甜甜圈。"),
    tags: I(['전망', '한국식 도넛', '창신동'], ['View', 'Korean donut', 'Changsin-dong'], ['眺望', '韓国式ドーナツ', '昌信洞'], ['景观', '韩式甜甜圈', '昌信洞'], ["景觀", "韓式甜甜圈", "昌信洞"]),
  });
  add('taegeukdang', 'taegeukdang', {
    query: '태극당 장충동',
    name: I('태극당', 'Taegeukdang', '太極堂', '太极堂', "太極堂"),
    category: I('카페·노포 빵집', 'Cafe · Heritage bakery', 'カフェ・老舗パン屋', '咖啡·老字号面包店', "咖啡·老字號麵包店"),
    categories: ['cafe', 'breakfast'],
    rating: '4.2',
    reviews: '3,911',
    walk: I('대중교통 약 15분', 'About 15 min by transit', '公共交通約15分', '公共交通约15分钟', "公共交通約15分鐘"),
    text: I('1946년부터 이어진 서울의 대표 노포 빵집. 모나카 아이스크림과 클래식한 빵을 맛보기 좋습니다.', 'A landmark Seoul bakery dating to 1946, known for monaka ice cream and classic breads.', '1946年創業のソウルを代表する老舗パン屋です。', '创立于1946年的首尔老字号面包店，以最中冰淇淋闻名。', "創立於1946年的首爾老字號麵包店，以最中冰淇淋聞名。"),
    tags: I(['1946년', '모나카', '노포 빵집'], ['Since 1946', 'Monaka', 'Heritage bakery'], ['1946年創業', 'モナカ', '老舗'], ['始于1946', '最中冰淇淋', '老字号'], ["始於1946", "最中冰淇淋", "老字號"]),
  });

  add('kyochon', 'kyochon', {
    query: '교촌치킨 동대문1호점 종로 294',
    name: I('교촌치킨 동대문1호점', 'Kyochon Chicken Dongdaemun 1', 'キョチョンチキン 東大門1号店', '校村炸鸡 东大门1号店', "校村炸雞 東大門1號店"),
    category: I('같은 건물·24시간', 'Same building · 24 hours', '同じ建物・24時間', '同一栋楼·24小时', "同一棟樓·24小時"),
    categories: ['korean', 'late'],
    rating: '4.3',
    reviews: '3,373',
    walk: I('같은 건물 · 1층', 'Same building · 1F', '同じ建物・1階', '同一栋楼·1层', "同一棟樓·1層"),
    text: I('숙소와 같은 선일빌딩 1층의 24시간 치킨 매장. 늦은 체크인이나 심야 포장에 가장 편합니다.', 'A 24-hour chicken shop on the first floor of the same Sunil Building—ideal for late arrival or takeaway.', '宿と同じソニルビル1階の24時間営業店。深夜のテイクアウトに便利です。', '位于住宿同一栋Sunil大厦1层，24小时营业，适合深夜外带。', "位於住宿同一棟Sunil大廈1層，24小時營業，適合深夜外帶。"),
    tags: I(['24시간', '같은 건물', '포장'], ['Open 24 hours', 'Same building', 'Takeaway'], ['24時間', '同じ建物', 'テイクアウト'], ['24小时', '同一栋楼', '外带'], ["24小時", "同一棟樓", "外帶"]),
  });
})();
