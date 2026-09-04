(() => {
  'use strict';

  const D = window.ANOTHER_HOUSE_DATA;
  if (!D?.pages) return;

  const I = (ko, en, ja, zh, zhTW) => ({ ko, en, ja, zh, "zh-TW": zhTW });
  const G = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const N = (query) => `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
  const place = (id, data) => ({
    id,
    image: `/assets/images/restaurants/${id}.webp`,
    naver: N(data.query),
    google: G(data.query),
    ...data,
  });

  D.pages.nearby = {
    title: I('주변 맛집', 'Nearby restaurants', '周辺グルメ', '附近美食', "附近美食"),
    kicker: 'NEARBY RESTAURANTS',
    hero: '/assets/images/restaurants-hero.jpg',
    summary: I(
      '동대문 노포부터 광장시장, 창신동과 을지로까지. 리뷰와 평점, 현지성을 함께 살펴 고른 로컬 다이닝 가이드입니다.',
      'A local dining guide selected for reviews, ratings, and neighborhood character—from Dongdaemun institutions to Gwangjang Market, Changsin-dong, and Euljiro.',
      '東大門の老舗から広蔵市場、昌信洞、乙支路まで。口コミ・評価・ローカル感で選んだダイニングガイドです。',
      '从东大门老店到广藏市场、昌信洞和乙支路，综合评价、评论量与本地特色精选。', "從東大門老店到廣藏市場、昌信洞和乙支路，綜合評價、評論量與本地特色精選。"
    ),
    categories: [
      { id: 'host', label: I('추천', 'Host picks', 'おすすめ', '推荐', "推薦") },
      { id: 'all', label: I('전체', 'All', 'すべて', '全部', "全部") },
      { id: 'breakfast', label: I('아침·해장', 'Breakfast', '朝食', '早餐', "早餐") },
      { id: 'korean', label: I('한식·노포', 'Korean', '韓国料理', '韩餐', "韓餐") },
      { id: 'market', label: I('시장·길거리', 'Market', '市場グルメ', '市场美食', "市場美食") },
      { id: 'global', label: I('글로벌', 'Global', '多国籍', '国际风味', "國際風味") },
      { id: 'special', label: I('특별한 식사', 'Special dining', '特別な食事', '特别用餐', "特別用餐") },
      { id: 'cafe', label: I('카페·디저트', 'Cafe & dessert', 'カフェ', '咖啡甜点', "咖啡甜點") },
      { id: 'late', label: I('늦은 밤', 'Late night', '深夜', '深夜', "深夜") },
    ],
    searchPlaceholder: I(
      '식당명, 메뉴, 분위기를 검색해 보세요',
      'Search restaurants, dishes, or mood',
      '店名・メニュー・雰囲気を検索',
      '搜索餐厅、菜品或氛围', "搜尋餐廳、菜品或氛圍"
    ),
    hostTitle: I('호스트 추천 7곳', '7 Host’s Picks', 'ホストおすすめ7選', '房东推荐7家', "房東推薦7家"),
    hostCopy: I(
      '처음이라면 여기부터. 리뷰 수, 평점, 서울다운 분위기를 기준으로 골랐습니다.',
      'Start here: seven standouts chosen for review depth, ratings, and unmistakable Seoul character.',
      '初めてならここから。口コミ数・評価・ソウルらしさで選びました。',
      '第一次来就从这里开始：兼顾评论量、评分与首尔本地氛围。', "第一次來就從這裡開始：兼顧評論量、評分與首爾本地氛圍。"
    ),
    sourceNote: I(
      '평점과 리뷰 수는 2026년 7월 28일 Google Maps 확인 기준이며 변동될 수 있습니다. 영업시간·휴무·대기는 방문 전 지도에서 다시 확인해 주세요.',
      'Ratings and review counts were checked on Google Maps on July 28, 2026 and may change. Recheck hours, closures, and waits before visiting.',
      '評価・口コミ数は2026年7月28日のGoogle Maps確認時点で変動する場合があります。営業時間・休業・待ち時間は訪問前に再確認してください。',
      '评分及评论数截至2026年7月28日Google Maps查询，可能变动。到访前请再次确认营业时间、休息日及排队情况。', "評分及評論數截至2026年7月28日Google Maps查詢，可能變動。到訪前請再次確認營業時間、休息日及排隊情況。"
    ),
    places: [
      place('duck', {
        query: '별난오리 동대문',
        name: I('별난오리', 'Byeolnan Ori', 'ピョルナンオリ', '别样鸭', "別樣鴨"),
        category: I('한식·오리', 'Korean · Duck', '韓国料理・鴨', '韩餐·鸭肉', "韓餐·鴨肉"),
        categories: ['korean', 'special', 'late'],
        host: true,
        rating: '4.9',
        reviews: '2,739',
        walk: I('도보 약 5분', 'About 5 min walk', '徒歩約5分', '步行约5分钟', "步行約5分鐘"),
        text: I(
          '동네 단골이 두툼하게 쌓인 오리요리 전문점. 여럿이 푸짐하게 먹는 첫 저녁으로 추천합니다.',
          'A deeply local duck specialist with an exceptional review record—ideal for a generous first dinner with friends.',
          '地元客に愛される鴨料理専門店。仲間との初日の夕食におすすめです。',
          '本地常客众多的鸭肉专门店，适合多人丰盛聚餐。', "本地常客眾多的鴨肉專門店，適合多人豐盛聚餐。"
        ),
        tags: I(['로컬 단골', '리뷰 최다급', '여럿이'], ['Local favorite', 'High review volume', 'Groups'], ['地元人気', '口コミ多数', 'グループ'], ['本地人气', '高评论量', '多人聚餐'], ["本地人氣", "高評論量", "多人聚餐"]),
      }),
      place('jinokhwa', {
        query: '진옥화할매원조닭한마리',
        name: I('진옥화할매원조닭한마리', 'Jin Ok-hwa Original Chicken', '陳玉華ハルメ元祖タッカンマリ', '陈玉华奶奶元祖一只鸡', "陳玉華奶奶元祖一隻雞"),
        category: I('한식·노포', 'Korean · Institution', '韓国料理・老舗', '韩餐·老店', "韓餐·老店"),
        categories: ['korean', 'late'],
        host: true,
        rating: '4.1',
        reviews: '8,350',
        walk: I('도보 약 8분', 'About 8 min walk', '徒歩約8分', '步行约8分钟', "步行約8分鐘"),
        text: I(
          '닭한마리 골목을 대표하는 오래된 이름. 맑은 닭 육수에 떡과 칼국수까지 이어지는 동대문식 한 끼입니다.',
          'The defining name of Dakhanmari Alley: whole chicken broth followed by rice cakes and knife-cut noodles.',
          'タッカンマリ横丁を代表する老舗。鶏スープから餅、カルグクスまで楽しめます。',
          '一只鸡胡同的代表老店，清鸡汤配年糕，最后以刀切面收尾。', "一隻雞衚衕的代表老店，清雞湯配年糕，最後以刀切面收尾。"
        ),
        tags: I(['닭한마리', '서울 노포', '대기 가능'], ['Dakhanmari', 'Seoul institution', 'Expect a wait'], ['タッカンマリ', 'ソウル老舗', '待ち時間あり'], ['一只鸡', '首尔老店', '可能排队'], ["一隻雞", "首爾老店", "可能排隊"]),
      }),
      place('buchon', {
        query: '부촌육회 본점',
        name: I('부촌육회 본점', 'Buchon Yukhoe', 'プチョンユッケ 本店', '富村生拌牛肉 总店', "富村生拌牛肉 總店"),
        category: I('광장시장·한식', 'Gwangjang · Korean', '広蔵市場・韓国料理', '广藏市场·韩餐', "廣藏市場·韓餐"),
        categories: ['market', 'korean', 'special'],
        host: true,
        rating: '4.4',
        reviews: '2,193',
        walk: I('도보 약 20분', 'About 20 min walk', '徒歩約20分', '步行约20分钟', "步行約20分鐘"),
        text: I(
          '광장시장 육회의 기준점. 미쉐린 빕 구르망에 이름을 올린 곳으로 산낙지와 함께 주문하기 좋습니다.',
          'A benchmark for Gwangjang Market yukhoe and a MICHELIN Bib Gourmand selection; pair it with live octopus.',
          '広蔵市場ユッケの定番。ミシュラン・ビブグルマン掲載店で、サンナクチとの組み合わせも人気です。',
          '广藏市场生拌牛肉代表店，入选米其林必比登，适合搭配活章鱼。', "廣藏市場生拌牛肉代表店，入選米其林必比登，適合搭配活章魚。"
        ),
        tags: I(['미쉐린 빕 구르망', '육회', '광장시장'], ['MICHELIN Bib Gourmand', 'Yukhoe', 'Gwangjang Market'], ['ミシュラン', 'ユッケ', '広蔵市場'], ['米其林必比登', '生拌牛肉', '广藏市场'], ["米其林必比登", "生拌牛肉", "廣藏市場"]),
        detailUrl: 'https://guide.michelin.com/kr/en/seoul-capital-area/kr-seoul/restaurant/buchon-yukhoe',
      }),
      place('everest', {
        query: '에베레스트 레스토랑 동대문',
        name: I('에베레스트 레스토랑', 'Everest Restaurant', 'エベレスト・レストラン', '珠穆朗玛餐厅', "珠穆朗瑪餐廳"),
        category: I('네팔·인도', 'Nepali · Indian', 'ネパール・インド', '尼泊尔·印度', "尼泊爾·印度"),
        categories: ['global', 'special'],
        host: true,
        rating: '4.3',
        reviews: '1,474',
        walk: I('도보 약 5분', 'About 5 min walk', '徒歩約5分', '步行约5分钟', "步行約5分鐘"),
        text: I(
          '동대문에서 오래 사랑받은 네팔 음식점. 커리, 탄두리, 모모를 채식 옵션과 함께 즐길 수 있습니다.',
          'A long-loved Dongdaemun Nepali restaurant for curry, tandoori, momo, and vegetarian-friendly choices.',
          '東大門で長く愛されるネパール料理店。カレー、タンドリー、モモ、ベジ対応もあります。',
          '东大门老牌尼泊尔餐厅，可品尝咖喱、坦都里和蒸饺，并有素食选择。', "東大門老牌尼泊爾餐廳，可品嚐咖哩、坦都裡和蒸餃，並有素食選擇。"
        ),
        tags: I(['동대문 아이콘', '채식 옵션', '모모'], ['Dongdaemun icon', 'Vegetarian options', 'Momo'], ['東大門名店', 'ベジ対応', 'モモ'], ['东大门名店', '素食选择', '尼泊尔饺子'], ["東大門名店", "素食選擇", "尼泊爾餃子"]),
        detailUrl: 'http://www.everestfood.com/',
      }),
      place('coffee', {
        query: '커피한약방',
        name: I('커피한약방', 'Coffee Hanyakbang', 'コーヒー韓薬房', '咖啡韩药房', "咖啡韓藥房"),
        category: I('카페·디저트', 'Cafe · Dessert', 'カフェ・デザート', '咖啡·甜点', "咖啡·甜點"),
        categories: ['cafe', 'special'],
        host: true,
        rating: '4.5',
        reviews: '2,378',
        walk: I('도보 약 25분', 'About 25 min walk', '徒歩約25分', '步行约25分钟', "步行約25分鐘"),
        text: I(
          '을지로 골목 안, 오래된 가구와 손글씨 메뉴가 만드는 독보적인 분위기. 핸드드립과 디저트로 마무리하기 좋습니다.',
          'A singular Euljiro alley cafe of antique furniture and handwritten menus—perfect for hand-drip coffee and dessert.',
          '乙支路の路地にあるアンティークな名物カフェ。ハンドドリップとデザートに。',
          '藏在乙支路小巷的复古名店，适合以手冲咖啡和甜点收尾。', "藏在乙支路小巷的復古名店，適合以手衝咖啡和甜點收尾。"
        ),
        tags: I(['을지로 감성', '핸드드립', '사진 명소'], ['Euljiro mood', 'Hand drip', 'Photogenic'], ['乙支路レトロ', 'ハンドドリップ', 'フォトスポット'], ['乙支路复古', '手冲咖啡', '拍照打卡'], ["乙支路復古", "手衝咖啡", "拍照打卡"]),
        detailUrl: 'https://coffeehanyakbang.com/',
      }),
      place('jokbal', {
        query: '창신동매운족발',
        name: I('창신동매운족발', 'Changsin-dong Spicy Jokbal', '昌信洞メウンチョッパル', '昌信洞辣猪蹄', "昌信洞辣豬蹄"),
        category: I('한식·야식', 'Korean · Late night', '韓国料理・夜食', '韩餐·夜宵', "韓餐·夜宵"),
        categories: ['korean', 'late'],
        host: true,
        rating: '4.1',
        reviews: '917',
        walk: I('도보 약 8분', 'About 8 min walk', '徒歩約8分', '步行约8分钟', "步行約8分鐘"),
        text: I(
          '숯향과 매운맛이 강렬한 창신동 대표 야식. 맵기를 즐기는 여행자에게 기억에 남을 한 접시입니다.',
          'Changsin-dong’s smoky, fiercely spicy late-night signature for travelers who enjoy serious heat.',
          '炭火の香りと辛さが強烈な昌信洞の夜食名物。辛党におすすめです。',
          '炭香与辣味鲜明的昌信洞夜宵代表，适合嗜辣旅客。', "炭香與辣味鮮明的昌信洞夜宵代表，適合嗜辣旅客。"
        ),
        tags: I(['매운맛', '숯불 향', '포장 가능'], ['Spicy', 'Charcoal aroma', 'Takeaway'], ['激辛', '炭火香', 'テイクアウト'], ['香辣', '炭火香', '可打包'], ["香辣", "炭火香", "可打包"]),
      }),
      place('jeonju', {
        query: '전주집 동대문 생선구이',
        name: I('전주집', 'Jeonjujip', 'チョンジュチプ', '全州家', "全州家"),
        category: I('생선구이·노포', 'Grilled fish · Institution', '焼き魚・老舗', '烤鱼·老店', "烤魚·老店"),
        categories: ['korean', 'breakfast'],
        host: true,
        rating: '4.3',
        reviews: '587',
        walk: I('도보 약 9분', 'About 9 min walk', '徒歩約9分', '步行约9分钟', "步行約9分鐘"),
        text: I(
          '동대문 생선구이 골목의 정석. 숯불에 구운 생선과 따뜻한 밥상으로 혼자서도 편안합니다.',
          'A classic of Dongdaemun’s grilled-fish alley, serving charcoal-grilled fish and a comforting set meal suitable for solo diners.',
          '東大門焼き魚横丁の定番。炭火焼きの魚定食は一人でも気軽です。',
          '东大门烤鱼胡同经典店，炭火烤鱼套餐也适合独自用餐。', "東大門烤魚衚衕經典店，炭火烤魚套餐也適合獨自用餐。"
        ),
        tags: I(['생선구이 골목', '혼밥', '아침 식사'], ['Grilled-fish alley', 'Solo friendly', 'Breakfast'], ['焼き魚横丁', '一人OK', '朝食'], ['烤鱼胡同', '适合单人', '早餐'], ["烤魚衚衕", "適合單人", "早餐"]),
      }),
      place('seoulzip', {
        query: '서울집 을지로',
        name: I('서울집', 'Seoulzip', 'ソウルチプ', '首尔之家', "首爾之家"),
        category: I('컨템퍼러리·와인', 'Contemporary · Wine', '現代料理・ワイン', '现代料理·葡萄酒', "現代料理·葡萄酒"),
        categories: ['special', 'late'],
        host: false,
        rating: '4.7',
        reviews: '479',
        walk: I('도보 약 15분', 'About 15 min walk', '徒歩約15分', '步行约15分钟', "步行約15分鐘"),
        text: I(
          'DDP와 을지로 사이에서 즐기는 세련된 저녁. 가벼운 와인과 함께 분위기 있는 식사를 원할 때 좋습니다.',
          'A polished dinner between DDP and Euljiro, well suited to a relaxed meal with wine.',
          'DDPと乙支路の間で楽しむ洗練されたディナー。ワインと雰囲気を楽しみたい夜に。',
          '位于DDP与乙支路之间，适合搭配葡萄酒享受精致晚餐。', "位於DDP與乙支路之間，適合搭配葡萄酒享受精緻晚餐。"
        ),
        tags: I(['데이트', '와인', '분위기'], ['Date night', 'Wine', 'Atmosphere'], ['デート', 'ワイン', '雰囲気'], ['约会', '葡萄酒', '氛围'], ["約會", "葡萄酒", "氛圍"]),
      }),
      place('pho', {
        query: '퍼항 동대문',
        name: I('퍼항', 'Pho Hang', 'フォーハン', 'Pho Hang 越南粉', "Pho Hang 越南粉"),
        category: I('베트남', 'Vietnamese', 'ベトナム料理', '越南料理', "越南料理"),
        categories: ['global', 'late'],
        host: false,
        rating: '4.2',
        reviews: '254',
        walk: I('도보 약 5분', 'About 5 min walk', '徒歩約5分', '步行约5分钟', "步行約5分鐘"),
        text: I(
          '현지 향신료와 진한 육수가 살아 있는 베트남 식당. 늦은 시간 따뜻한 국물이 필요할 때 유용합니다.',
          'Vietnamese comfort food with fragrant herbs and a deep broth, especially welcome later at night.',
          '香草と濃いスープが魅力のベトナム料理店。遅い時間の温かい一杯に。',
          '香草与浓郁汤底突出的越南餐厅，晚间想喝热汤时很合适。', "香草與濃郁湯底突出的越南餐廳，晚間想喝熱湯時很合適。"
        ),
        tags: I(['쌀국수', '늦은 영업', '현지식'], ['Pho', 'Open late', 'Authentic'], ['フォー', '深夜営業', '本場風'], ['越南粉', '营业较晚', '地道风味'], ["越南粉", "營業較晚", "地道風味"]),
      }),
      place('soonhee', {
        query: '원조순희네빈대떡 광장시장',
        name: I('원조순희네빈대떡', 'Original Soonhee Bindaetteok', '元祖スニネピンデトッ', '元祖顺姬家绿豆煎饼', "元祖順姬家綠豆煎餅"),
        category: I('광장시장·길거리', 'Gwangjang · Street food', '広蔵市場・屋台', '广藏市场·街头美食', "廣藏市場·街頭美食"),
        categories: ['market', 'korean'],
        host: false,
        rating: '4.0',
        reviews: '1,718',
        walk: I('도보 약 20분', 'About 20 min walk', '徒歩約20分', '步行约20分钟', "步行約20分鐘"),
        text: I(
          '광장시장의 바삭한 빈대떡을 가장 활기찬 분위기에서 경험하는 곳. 막걸리 한 잔과 잘 어울립니다.',
          'One of the liveliest ways to experience Gwangjang Market’s crisp mung-bean pancakes, ideally with makgeolli.',
          '広蔵市場の活気の中で味わうカリッとしたピンデトッ。マッコリと好相性です。',
          '在广藏市场热闹氛围中品尝酥脆绿豆煎饼，适合搭配米酒。', "在廣藏市場熱鬧氛圍中品嚐酥脆綠豆煎餅，適合搭配米酒。"
        ),
        tags: I(['빈대떡', '시장 음식', '막걸리'], ['Bindaetteok', 'Market food', 'Makgeolli'], ['ピンデトッ', '市場グルメ', 'マッコリ'], ['绿豆煎饼', '市场美食', '米酒'], ["綠豆煎餅", "市場美食", "米酒"]),
      }),
      place('haejang', {
        query: '대화정 진짜해장국 동대문',
        name: I('대화정 진짜해장국', 'Daehwajeong Jinjja Haejangguk', 'テファジョン チンチャヘジャングク', '大和亭醒酒汤', "大和亭醒酒湯"),
        category: I('아침·해장국', 'Breakfast · Haejangguk', '朝食・ヘジャングク', '早餐·醒酒汤', "早餐·醒酒湯"),
        categories: ['breakfast', 'korean', 'late'],
        host: false,
        rating: '4.2',
        reviews: '760',
        walk: I('도보 약 4분', 'About 4 min walk', '徒歩約4分', '步行约4分钟', "步行約4分鐘"),
        text: I(
          '이른 시간 든든한 국밥이 필요할 때 가까운 선택. 진한 국물과 빠른 한 끼로 현지 직장인도 찾습니다.',
          'A nearby, satisfying bowl for an early start, known for deep broth and a quick local-style meal.',
          '早い時間にしっかり食べたい時の近場の一杯。濃いスープで地元客にも人気です。',
          '清早想吃饱时的近距离选择，浓郁汤底也深受本地上班族喜爱。', "清早想吃飽時的近距離選擇，濃郁湯底也深受本地上班族喜愛。"
        ),
        tags: I(['해장국', '아침 가능', '도보 4분'], ['Haejangguk', 'Early meal', '4 min walk'], ['ヘジャングク', '朝食', '徒歩4分'], ['醒酒汤', '早餐', '步行4分钟'], ["醒酒湯", "早餐", "步行4分鐘"]),
      }),
    ],
  };
})();
