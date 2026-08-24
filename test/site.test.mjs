import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname,"..");
const read = file => readFile(resolve(root,file),"utf8");

test("single lodging data source contains all guide routes and four languages",async()=>{
  const data = await read("assets/site-data.js");
  for(const route of ["checkin","checkout","transport","wifi","appliances","laundry","trash","rules","nearby","guidebook"]) assert.match(data,new RegExp("\\b"+route+"\\b"));
  assert.ok(data.includes("const I = (ko, en, ja, zh)"));
  assert.doesNotMatch(data,/FAQ|faq|EXTAY|guide-extay/);
});

test("navigation stays on the root URL and uses no hash routes",async()=>{
  const html = await read("index.html"); const app = await read("assets/app.js");
  assert.doesNotMatch(html,/http-equiv="refresh"|href="#/i);
  assert.doesNotMatch(app,/location\.hash\s*=/);
  assert.match(app,/history\.replaceState/);
});

test("public bundle contains approved guest details and excludes duplicate FAQ data",async()=>{
  const bundle = (await Promise.all(["index.html","assets/app.js","assets/site-data.js","assets/content-updates.js"].map(read))).join("\n");
  for(const approved of ["another1234"]) assert.equal(bundle.includes(approved),true);
  for(const forbidden of ["faqData","faq-data"]) assert.equal(bundle.includes(forbidden),false);
});

test("hero motion matches the master timing contract",async()=>{
  const css = await read("assets/styles.css"); const app = await read("assets/app.js");
  assert.match(css,/scale\(1\.20\)/); assert.match(css,/heroZoomOut 3\.2s cubic-bezier\(\.22,1,\.36,1\)/); assert.match(css,/prefers-reduced-motion/);
  assert.match(app,/visibilitychange/); assert.match(app,/pageshow/); assert.match(app,/image\.decode/);
});

test("SEO and OG assets are complete",async()=>{
  const html = await read("index.html");
  for(const token of ["canonical","og:image","twitter:card","application/ld+json"]) assert.ok(html.includes(token));
  await access(resolve(root,"assets/images/another-house-og-20260727.jpg"));
  await access(resolve(root,"assets/fonts/oxanium-latin.woff2"));
});


test("multi-page appliance diagrams use the peek carousel contract",async()=>{
  const html = await read("index.html");
  const alias = await read("guide-anotherhouse.html");
  const app = await read("assets/master-app.js");
  const data = await read("assets/site-data.js");
  assert.match(app,/device-guide-carousel/);
  assert.match(app,/device-guide-page/);
  assert.match(html,/flex:0 0 calc\(100% - 52px\)/);
  assert.equal(html,alias);
  assert.doesNotMatch(data,/official-haatz-hec1050-use-p13-ko/);
});

test("home typography and approved hero subtitle follow the contract",async()=>{
  const html = await read("index.html");
  const app = await read("assets/master-app.js");
  const data = await read("assets/site-data.js");
  assert.match(html,/body \.top h1,body \.brand-home\{[^}]*font-size:16px!important[^}]*font-weight:400!important[^}]*letter-spacing:-\.015em!important/);
  assert.match(html,/\.hero-title,\.landing-hero \.hero-title\{[^}]*font-weight:300!important[^}]*letter-spacing:-\.02em!important/);
  assert.match(html,/\.landing-hero \.eyebrow\{[^}]*font-family:'Oxanium'/);
  assert.ok(data.includes("heroSubtitle: 'STAY ANOTHER LIFE'"));
  assert.match(app,/heroEyebrow\.textContent=t\(D\.heroSubtitle\)/);
});


test("home gallery copy, compact rhythm, and restaurant imagery are upgraded",async()=>{
  const html=await read("index.html");
  const app=await read("assets/master-app.js");
  const expanded=await read("assets/restaurant-expanded.js");
  assert.doesNotMatch(html,/previous-gallery-label|>03<|>THE HOUSE</);
  assert.match(html,/previous-gallery-kicker">ROOM PHOTOS/);
  assert.match(html,/previous-gallery-subtitle/);
  assert.ok(html.includes("객실 둘러보기"));
  assert.match(html,/previous-gallery-preview\{padding:36px[^}]*12px/);
  assert.match(html,/previous-gallery-subtitle\{[^}]*font-size:26px[^}]*font-weight:800/);
  assert.match(app,/homePickIds=\['duck','coffee'\]/);
  for(const id of ["blt-steak","tavolo24","pizzeria-o","the-place","onion-anguk","london-bagel","mil-toast","layered-bukchon","eggdrop","cheongsudang","fritz-wonseo","nuldam","donut-jungsu","taegeukdang"]) {
    assert.ok(expanded.includes(`add('${id}', '${id}', {`));
    await access(resolve(root,`assets/images/restaurants/${id}.webp`));
  }
});

test("guide page polish removes duplicates and matches the master media",async()=>{
  const html=await read("index.html");
  const app=await read("assets/master-app.js");
  const data=await read("assets/site-data.js");
  const restaurantData=await read("assets/restaurant-data.js");
  const restaurantExpanded=await read("assets/restaurant-expanded.js");
  const sources=JSON.parse(await read("assets/images/restaurants/photo-sources.json"));
  assert.doesNotMatch(html,/tour-hero-credit/);
  assert.match(html,/checkin-locker-card \.airport-card-body>\.figure\{[^}]*border-radius:8px[^}]*background:transparent/);
  assert.match(html,/trash-guide-card \.device-body>p\{[^}]*padding:22px 24px/);
  assert.match(html,/trash-guide-card \.device-body>\.steps\{padding:0 24px/);
  assert.match(app,/icons=\['climate','microwave','cooktop','purifier','fridge','guestbox'\]/);
  assert.match(app,/appliancesContent'\)\.innerHTML=applianceNoticeMarkup\(\)\+p\.devices\.map/);
  assert.doesNotMatch(app,/\[\.\.\.p\.devices,washer\]/);
  assert.match(data,/nearby: \{[^\n]*hero: '\/assets\/images\/restaurants-hero\.jpg'/);
  assert.match(restaurantData,/hero: '\/assets\/images\/restaurants-hero\.jpg'/);
  assert.match(restaurantExpanded,/page\.hero = '\/assets\/images\/restaurants-hero\.jpg'/);
  const coffee=sources.images.find((item)=>item.file==="coffee.webp");
  assert.equal(coffee.sourceType,"Naver Place business upload");
  await access(resolve(root,"assets/images/restaurants-hero.jpg"));
});
test("mobile shell follows the master width contract",async()=>{
  const html=await read("index.html");
  const alias=await read("guide-anotherhouse.html");
  const app=await read("assets/master-app.js");
  assert.match(html,/\.app\{max-width:480px;margin:0 auto;min-height:100dvh/);
  assert.match(html,/\.app\{max-width:480px;padding-bottom:0;background:#F7F1EA;overflow:hidden\}/);
  assert.doesNotMatch(html,/Keep the document locked|html,body\{width:100%|\.app\{width:100%;max-width:480px/);
  assert.doesNotMatch(app,/horizontalGestureSelector|touchmove[^\n]*preventDefault/);
  assert.match(html,/\.device-guide-carousel\{[^}]*overflow-x:auto[^}]*overscroll-behavior-inline:contain/);
  assert.match(html,/\.gallery-thumbs\{[^}]*overflow-x:auto[^}]*overscroll-behavior-x:contain/);
  assert.equal(html,alias);
});
test("check-in page matches the master overview and header rhythm",async()=>{
  const html=await read("index.html");
  const app=await read("assets/master-app.js");
  const data=await read("assets/site-data.js");
  assert.match(app,/hero:'체크인 • 체크아웃 안내'/);
  assert.match(app,/title:'입퇴실 안내'/);
  assert.match(app,/time:'체크인 15:00 · 체크아웃 11:00'/);
  assert.match(app,/row\('schedule'.*row\('location_on'.*row\('key'.*row\('hotel_class'.*row\('near_me'/);
  assert.match(app,/<section class="checkin-text-section checkin-overview"><h3>/);
  assert.doesNotMatch(data,/건물 찾기/);
  assert.match(data,/checkout: \{ title: I\('체크아웃 안내'/);
  assert.match(data,/rules: \{ title: I\('숙소 이용 규칙'/);
  assert.match(app,/card\(t\(help\.title\),'support_agent'.*card\(t\(self\.title\),'login'.*card\(t\(o\.title\),'logout'.*card\(t\(r\.title\),'checklist'/);
  assert.match(html,/\.checkin-card-header\{[^}]*grid-template-columns:42px[^}]*height:76px[^}]*min-height:76px[^}]*padding:17px 18px/);
  assert.match(html,/\.guide-detail-screen \.device-card-stack \.device-header\{[^}]*grid-template-columns:42px[^}]*height:76px[^}]*padding:17px 18px/);
  assert.match(html,/\.restaurant-host-pick\{[^}]*height:76px[^}]*min-height:76px[^}]*padding:17px 18px/);
  assert.match(html,/<h2>체크인 • 체크아웃 안내<\/h2>/);
  assert.match(html,/<strong>찾아오는 길<\/strong><small>공항과 역에서 숙소까지/);
});
test("home location and room-gallery signature styling use approved copy",async()=>{
  const html=await read("index.html");
  const data=await read("assets/site-data.js");
  assert.ok(data.includes("station: I('동대문역 6번 출구 · 도보 30초'"));
  assert.ok(data.includes("value: I('동대문역 6번 출구에서 도보 30초'"));
  assert.match(html,/\.previous-gallery-heading h2\{margin:0;color:var\(--signature\)/);
});
test("master motion system covers every page and adds visible media reveals",async()=>{
  const app=await read("assets/master-app.js");
  const html=await read("index.html");
  for(const token of ["checkin-hero","transport-hero","restaurants-hero","tours","wifi-hero","guidebook-hero","gallery-head","gallery-magazine-card","guide-detail-hero","device","trash"]){
    assert.ok(app.includes(token),"missing motion coverage: "+token);
  }
  assert.match(app,/new IntersectionObserver/);
  assert.match(app,/new MutationObserver/);
  assert.match(app,/function observeMotionTargets\(/);
  assert.match(app,/function queueMotionReady\(/);
  assert.match(app,/heroSlides\.map\(preloadHeroImage\)/);
  assert.match(app,/heroSlides=\['assets\/images\/main-01\.webp','assets\/images\/main-02\.webp'/);
  assert.match(app,/const carouselSelector='\.device-guide-carousel'/);
  assert.match(app,/gallery-magazine-card/);
  assert.match(html,/<body class="is-home">/);
  assert.doesNotMatch(html,/<body class="is-home motion-ready">/);
  assert.match(html,/\.motion-media\{[^}]*clip-path:inset\(12%/);
  assert.match(html,/@keyframes mediaSheen/);
  assert.match(html,/@media \(prefers-reduced-motion:reduce\).*?\.motion-carousel/s);
});test("room gallery uses selected magazine categories and fullscreen cards",async()=>{
  const app=await read("assets/master-app.js");
  const html=await read("index.html");
  const overrides=await read("assets/gallery-overrides.js");
  assert.match(app,/galleryCategory='exterior'/);
  assert.match(app,/galleryMagazine/);
  assert.match(app,/gallery-magazine-card/);
  assert.doesNotMatch(app,/gallerySwipeStartX|gallerySwipePointerId|selectGallery\(/);
  assert.match(html,/id="galleryMagazine"/);
  assert.doesNotMatch(html,/id="galleryThumbs"|id="galleryMainZoom"|zoom_in/);
  for(const category of ["exterior","lounge","bath","luggage","single","double"]) assert.ok(overrides.includes(`id:'${category}'`));
  assert.match(overrides,/removedCommon=new Set\(\[3,5,7,9,14,16,21,23,25,34\]\)/);
  assert.deepEqual([...overrides.matchAll(/\{id:'(exterior|lounge|bath|single|double|luggage)'/g)].map(match=>match[1]),["exterior","lounge","bath","single","double","luggage"]);
  assert.match(overrides,/doubleRooms=byNumber\(originalDouble,\[4,9,1,8\]\)/);
  assert.match(overrides,/D\.homeGallery=byNumber\(originalCommon,\[22,15\]\)\.concat\(byNumber\(originalDouble,\[9\]\)\)/);
  assert.match(app,/data-gallery-lightbox-index/);
  assert.match(app,/pointerdown[\s\S]*pointerup[\s\S]*moveLightbox/);
});test("hamburger menu places house rules after trash with a dedicated icon",async()=>{
  const html=await read("index.html");
  const app=await read("assets/master-app.js");
  const order=[...html.matchAll(/<button class="menu-link" data-go="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(order,["home","gallery","transport","checkin","wifi","appliances","laundry","trash","restaurants","tours"]);
  const menuSegment=html.slice(html.indexOf('<aside class="menu-panel"'),html.indexOf('<div class="image-lightbox-backdrop"'));
  assert.doesNotMatch(menuSegment,/data-go="guidebook"|게스트 가이드북/);
  assert.match(menuSegment,/menu-panel-logo/);
  assert.equal((menuSegment.match(/class="menu-icon"/g)||[]).length,10);
  assert.match(app,/ensureRulesMenuItem\(\)/);
  assert.match(app,/data-go="rules"/);
  assert.match(app,/\['숙소 이용 규칙','함께 지키는 숙소 이용 규칙'\]/);
  assert.match(app,/trash\.insertAdjacentHTML\('afterend'/);
  assert.match(app,/const rulesIconMarkup='<span class="rules-check-icon" aria-hidden="true"><i><\/i><i><\/i><i><\/i><\/span>'/);
  assert.match(app,/menu-icon">'\+rulesIconMarkup\+'<\/span>/);
  assert.doesNotMatch(app,/<span class="mi">rule<\/span>/);
  assert.match(html,/\.rules-check-icon\{[^}]*grid-template-rows:repeat\(3,1fr\)/);
  const houseRuleOrder=['쓰레기 배출','숙소 이용 규칙','주변 맛집'].map(name=>app.indexOf("['"+name+"'"));
  assert.ok(houseRuleOrder[0]<houseRuleOrder[1]&&houseRuleOrder[1]<houseRuleOrder[2]);
  assert.match(menuSegment,/STAY ANOTHER LIFE/);
  for(const names of [["Trash","Restaurants","Nearby Tours"],["ごみ出し","周辺グルメ","近郊おすすめツアー"],["垃圾处理","周边美食","近郊推荐行程"]]){
    const positions=names.map(name=>app.indexOf("['"+name+"'"));
    assert.ok(positions[0]<positions[1]&&positions[1]<positions[2]);
  }
});

test("guest access, Wi-Fi, taxi landmark, appliance menu, and TV icon use the approved details",async()=>{
  const html=await read("index.html");
  const data=await read("assets/site-data.js");
  const content=await read("assets/content-updates.js");
  const app=await read("assets/master-app.js");
  assert.match(content,/예약자 이름 또는 예약 번호 뒤 4자리/);
  assert.doesNotMatch(content,/OTA 예약번호/);
  assert.match(content,/짐은 503호 앞 러기지룸에 보관할 수 있습니다\. 체크인 전 짐 보관을 위한 출입정보는 예약 메시지에서 확인해 주세요\./);
  assert.doesNotMatch(content,/비밀번호 8282 → ENT 누르기/);
  assert.match(data,/Wi-Fi 비밀번호[\s\S]*another1234/);
  assert.match(data,/공유기 위치[\s\S]*복도 천장 및 라운지 테이블 위쪽/);
  assert.match(data,/landmark: I\('교촌치킨 동대문 1호점'/);
  assert.equal((data.match(/택시 하차 위치는 “교촌치킨 동대문 1호점”/g)||[]).length,2);
  assert.match(data,/appliances: \{ title: I\('냉난방 • 주방기기 사용법'/);
  assert.match(app,/\['냉난방 • 주방기기 사용법','냉난방·주방·가전 사용법'\]/);
  assert.match(html,/data-go="appliances"[\s\S]*?<strong>냉난방 • 주방기기 사용법<\/strong>/);
  assert.match(app,/applianceNoticeMarkup[\s\S]*<span class="mi">tv<\/span>/);
  assert.doesNotMatch(app,/tv_off/);
  assert.match(app,/data-copy="\x27\+esc\(t\(p\.sections\[1\]\.body\)\)\+\x27"/);
  assert.match(app,/p\.sections\[2\]\.title[\s\S]*p\.sections\[2\]\.body/);
  assert.doesNotMatch(app,/SECURE CONNECTION|wifi-help-section/);
  assert.match(html,/wifi-network-tips \.wifi-visual-card:only-child/);
});

test("booking platform contact copy and logos replace Airbnb",async()=>{
  const html=await read("index.html");
  const data=await read("assets/site-data.js");
  const sw=await read("sw.js");
  const homeCopy="예약하신 플랫폼(부킹닷컴, 아고다, 트립닷컴)을 통해 메시지로 호스트에게 연락해 주세요.";
  const checkinCopy="예약하신 플랫폼(부킹닷컴, 아고다, 트립닷컴)을 통해 메시지로 호스트에게 연락해 주세요.";
  assert.ok(data.includes(homeCopy));
  assert.ok(data.includes(checkinCopy));
  assert.match(html,/justify-items:center/);
  assert.match(html,/platform-contact-logos/);
  assert.doesNotMatch(html,/airbnb-mark|ff385c/i);
  for(const file of ["booking-com.svg","agoda-official.png","trip-com.svg"]){
    const asset=`assets/images/platforms/${file}`;
    await access(resolve(root,asset));
    assert.ok(html.includes(asset));
    assert.ok(sw.includes(`/${asset}`));
  }
});
test("source document additions include parking, editorial story, OTA links, and the designated washer photo",async()=>{
  const html=await read("index.html");
  const app=await read("assets/master-app.js");
  const content=await read("assets/content-updates.js");
  assert.match(html,/class="hotel-section stay-story"/);
  assert.match(html,/id="homeBookingHint"/);
  assert.match(html,/content-updates\.js\?v=20260824-69/);
  assert.match(html,/gallery-overrides\.js\?v=20260824-69/);
  assert.match(app,/parkingGuideMarkup/);
  assert.match(app,/renderBookingLinks/);
  assert.match(content,/동대문호텔 민영 주차장/);
  assert.match(content,/A QUIET HOUSE,/);
  assert.match(content,/laundry\.photo = '\/assets\/images\/laundry-machine-2\.jpg'/);
  assert.match(content,/www\.booking\.com\/hotel\/kr\/eonadeo-hauseu\.ko\.html/);
  assert.match(content,/www\.agoda\.com/);
  assert.match(content,/kr\.trip\.com/);
  await access(resolve(root,"assets/images/laundry-machine-2.jpg"));
});

test("check-in flow keeps self check-in and departure open above parking while house rules use a separate screen",async()=>{
  const html=await read("index.html");
  const app=await read("assets/master-app.js");
  const data=await read("assets/site-data.js");
  assert.match(html,/data-screen="rules"[^>]*>[\s\S]*?class="guide-detail-hero rules-hero"[\s\S]*?id="rulesContent"/);
  assert.match(html,/class="guide-detail-hero rules-hero">[\s\S]*?<h2 class="page-title">숙소 이용 규칙<\/h2>/);
  assert.match(data,/rules: \{ title: I\('숙소 이용 규칙', 'House rules', '宿泊ルール', '住宿规则'\), kicker: 'HOUSE RULES'/);
  assert.match(app,/function renderRulesPage\(\)/);
  assert.match(app,/function rulesEditorialMarkup\(r\)/);
  assert.match(app,/privacyTitle:'안전과 프라이버시'/);
  assert.match(app,/quietTitle:'조용한 휴식'/);
  assert.match(app,/kitchenTitle:'함께 쓰는 주방'/);
  assert.match(app,/supportTitle:'문제가 생겼다면'/);
  assert.match(app,/class="rule-time"><span>22:00<\/span><i><\/i><span>05:00<\/span>/);
  assert.match(app,/rule-kitchen-grid/);
  const editorialSegment=app.slice(app.indexOf('function rulesEditorialMarkup'),app.indexOf('function ensureRulesMenuItem'));
  assert.doesNotMatch(editorialSegment,/<ol class="steps"|steps\(/);
  assert.match(html,/\.rules-editorial\{[^}]*display:grid[^}]*gap:10px/);
  assert.match(html,/\.rule-kitchen-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(html,/\.rule-support\{[^}]*grid-template-columns:91px minmax\(0,1fr\)/);
  assert.match(html,/\.rule-quiet\{background:var\(--signature\)/);
  assert.doesNotMatch(html,/#52685e/);
  assert.match(html,/\.rule-editorial-block h4\{[^}]*font-size:21px[^}]*font-weight:800/);
  assert.match(html,/\.rule-kitchen-note p\{[^}]*font-size:15px[^}]*font-weight:600/);
  assert.match(app,/checkin-card-icon">'\+rulesIconMarkup\+'<\/span>/);
  assert.match(app,/HOUSE RULES<\/small><b>'\+esc\(t\(r\.title\)\)/);
  assert.match(app,/legacyRules\?\.remove\(\)/);
  assert.match(app,/departure\.after\(parking\)/);
  assert.match(app,/renderCheckin\(\);renderRulesPage\(\);renderBookingLinks\(\)/);
  assert.match(app,/const card=\(title,icon,kicker,body\)=>'<article class="checkin-guide-card">/);
  assert.doesNotMatch(app,/const card=\(title,icon,kicker,body\)=>'<details/);
});


test("refined intro, magazine gallery, luggage media, room lock, and home-native OTA panel",async()=>{
  const html=await read("index.html");
  const alias=await read("guide-anotherhouse.html");
  const app=await read("assets/master-app.js");
  const overrides=await read("assets/gallery-overrides.js");
  assert.equal(html,alias);
  assert.match(html,/\.brand-intro img\{[^}]*width:min\(88vw,374px\)/);
  assert.match(html,/brandMarkSequence 3\.24s/);
  assert.match(html,/introSignalGrain \.46s/);
  assert.match(html,/introLogoSignalDissolve \.46s/);
  assert.match(html,/introSignalScan \.46s/);
  assert.doesNotMatch(html,/introLogoGlitch/);
  assert.doesNotMatch(html,/\.brand-intro\.is-leaving \.brand-intro-mark img\{[^}]*transform/);
  assert.match(html,/class="brand-intro-mark"/);
  assert.match(html,/\.brand-intro-mark::before,\.brand-intro-mark::after\{[^}]*mask:url\('assets\/images\/another-house-intro-logo\.png'\)/);
  assert.doesNotMatch(html,/\.brand-intro::before,\.brand-intro::after/);
  assert.doesNotMatch(html,/introSignalDrop/);
  assert.match(html,/58\.26%,100%\{opacity:1/);
  assert.match(html,/heroPrimarySequence 5\.52s/);
  assert.match(app,/,2916\);\}\);\}/);
  assert.match(app,/resolve\(\);setTimeout\(\(\)=>intro\.remove\(\),640\)/);
  assert.match(html,/\.brand-intro\.is-leaving\{[^}]*transition:opacity \.54s cubic-bezier\(\.4,0,\.2,1\) \.08s/);
  assert.match(html,/\.intro-home-zoom \.landing-hero \.hero-photo-primary\.is-active\{opacity:1;transition:none;animation:heroHomeRevealZoom 2\.4s/);
  assert.match(html,/\.landing-hero:before\{transform:translate3d\(0,0,0\) scale\(1\.12\)\}/);
  assert.match(html,/@keyframes heroHomeRevealZoom\{0%\{transform:translate3d\(0,0,0\) scale\(1\.12\)\}100%\{transform:translate3d\(0,0,0\) scale\(1\)\}\}/);
  assert.match(app,/classList\.add\('motion-ready','intro-home-zoom'\)/);
  assert.match(app,/classList\.remove\('intro-home-zoom'\),2500/);
  assert.match(app,/requestAnimationFrame\(startHeroMotion\)\),24/);
  assert.match(html,/34\.783%[\s\S]*52\.899%[\s\S]*76\.449%/);
  assert.doesNotMatch(html,/heroPanelSettle/);
  const homeSegment=html.slice(html.indexOf('<section class="screen active" data-screen="home">'),html.indexOf('<section class="screen" data-screen="checkin">'));
  const gallerySegment=html.slice(html.indexOf('<section class="screen gallery-screen"'),html.indexOf('<section class="screen wifi-screen"'));
  assert.doesNotMatch(homeSegment,/id="stayStory"/);
  assert.match(gallerySegment,/id="stayStory"[\s\S]*id="galleryCategoryTabs"[\s\S]*id="galleryMagazine"/);
  assert.match(html,/class="home-support-card"/);
  assert.match(html,/ota-link-list platform-contact-logos/);
  assert.match(app,/luggage-overview-photo/);
  assert.match(app,/roomDoorlockImage/);
  assert.match(overrides,/503호 앞 러기지 룸/);
  assert.match(overrides,/checkin-room-doorlock\.jpg/);
  await access(resolve(root,"assets/images/checkin-room-doorlock.jpg"));
});

test("opening hero runs one automatic five-photo pass with controls visible from the start",async()=>{
  const html=await read("index.html");
  const app=await read("assets/master-app.js");
  assert.match(html,/id="heroSwipePrev"/);
  assert.match(html,/id="heroSwipeNext"/);
  assert.match(html,/class="hero-slide-bars" aria-label="총 5장의 메인 사진"/);
  assert.equal((html.match(/data-hero-slide="[0-4]"/g)||[]).length,5);
  for(const className of ["hero-photo-secondary","hero-photo-tertiary","hero-photo-quaternary","hero-photo-quinary"]) assert.match(html,new RegExp(className));
  for(const file of ["common-15-corridor-512-2.webp","common-07-entry-direction-2.webp","common-12-corridor-entry-2.webp"]) assert.ok(html.includes(file));
  assert.match(html,/\.hero-swipe-controls\{[^}]*opacity:1/);
  assert.doesNotMatch(html,/>\s*넘겨보기\s*</);
  assert.match(app,/const heroSequenceDuration=5520/);
  assert.match(app,/const heroAutoDelay=2400/);
  assert.match(app,/heroSlides=\[[^\]]*main-01\.webp[^\]]*main-02\.webp[^\]]*common-15-corridor-512-2\.webp[^\]]*common-07-entry-direction-2\.webp[^\]]*common-12-corridor-entry-2\.webp/);
  assert.match(app,/setTimeout\(\(\)=>\{heroAutoTimer=0;/);
  assert.match(app,/heroAutoComplete/);
  assert.match(app,/heroSlideIndex>=heroSlides\.length-1/);
  assert.match(app,/setHeroSlide\(heroSlideIndex\+1,false\);if\(heroSlideIndex>=heroSlides\.length-1\)heroAutoComplete=true;else scheduleHeroAuto\(\)/);
  assert.match(app,/startHeroMotion\(\)[^\n]*armHeroCarousel\(true\)/);
  assert.match(app,/visibilitychange[^\n]*scheduleHeroAuto\(\)/);
  assert.match(app,/\.landing-hero \.hero-photo[^\n]*is-active/);
  assert.match(app,/\.hero-slide-bar[^\n]*aria-current/);
  assert.match(app,/retireLegacySiteCache/);
  assert.match(app,/setTimeout\(ready,heroSequenceDuration\)/);
  assert.match(app,/pointerdown[\s\S]*pointerup[\s\S]*Math\.abs\(delta\)>=42/);
});

test("site-wide typography matches Stay NEMO and keeps card copy readable",async()=>{
  const html=await read("index.html");
  assert.match(html,/body\{font-size:17px;font-weight:600;line-height:1\.55\}/);
  assert.match(html,/\.landing-hero \.hero-title\{font-size:clamp\(54px,12vw,58px\)\}/);
  assert.match(html,/body \.top h1,body \.brand-home\{[^}]*font-size:16px!important/);
  assert.match(html,/\.concierge-heading\{font-size:25px\}/);
  assert.match(html,/\.concierge-greeting\{font-size:16px/);
  assert.match(html,/\.essential-copy strong\{font-size:16px\}/);
  assert.match(html,/\.essentials-title,\.getting-title,\.stay-guide-title\{font-size:26px\}/);
  assert.match(html,/\.previous-gallery-subtitle\{font-size:24px\}/);
  assert.match(html,/\.previous-gallery-heading h2\{font-size:34px\}/);
  assert.match(html,/\.stay-story-title\{font-size:clamp\(38px,10vw,42px\)\}/);
  assert.match(html,/\.tab\{font-size:11px\}/);
  assert.doesNotMatch(html,/\.landing-hero \.hero-title\{font-size:clamp\(60px,16vw,76px\)\}/);
  assert.match(html,/\.stay-info-link span:last-child\{font-size:15px\}/);
  assert.match(html,/\.menu-copy strong\{font-size:16px\}/);
  assert.match(html,/\.transport-card p,[^\n]*\.restaurant-copy\{font-size:15px;font-weight:600\}/);
  assert.match(html,/\.checkin-info-row strong\{font-size:16px;font-weight:800\}/);
  assert.match(html,/\.checkin-overview \.checkin-info-row p\{font-size:14px;font-weight:600\}/);
  assert.match(html,/--font-main:'Oxanium','Arial Narrow',Arial,sans-serif/);
  assert.match(html,/\.tour-home-card \.nearby-card-copy>span\{[^}]*font-size:12px/);
});

test("official Another House logo appears in the header, concierge, and menu",async()=>{
  const html=await read("index.html");
  const sw=await read("sw.js");
  for(const file of ["another-house-logo-mark.webp","another-house-logo-symbol.webp"]){
    await access(resolve(root,"assets/images/"+file));
    assert.ok(html.includes(file));
    assert.ok(sw.includes(file));
  }
  assert.match(html,/class="header-brand-logo"/);
  assert.match(html,/class="concierge-brand-logo"/);
  assert.match(html,/필요한 정보를 바로 찾아드릴께요\./);
  assert.match(html,/placeholder="무엇이든 물어보세요\."/);
  assert.doesNotMatch(html,/class="concierge-character another-concierge-character"/);
});

test("nearby tours add Doota shopping, remove Ihwa from host picks, and hide photo banners",async()=>{
  const html=await read("index.html");
  const data=await read("assets/tour-data.js");
  const app=await read("assets/tour-app.js");
  const sw=await read("sw.js");
  assert.match(data,/'doota-mall': \{ image: '\/assets\/images\/tours\/spots\/21-doota-mall\.webp'/);
  assert.match(data,/place\('doota-mall', '21', 'shopping_bag', 'charcoal', true, \['shopping', 'culture'\]/);
  assert.match(data,/place\('ihwa', '04', 'palette', 'terracotta', false/);
  assert.match(data,/\{ id: 'shopping', label:/);
  assert.doesNotMatch(app,/tour-photo-credit/);
  assert.doesNotMatch(html,/tour-photo-credit/);
  assert.ok(sw.includes('/assets/images/tours/spots/21-doota-mall.webp'));
  await access(resolve(root,"assets/images/tours/spots/21-doota-mall.webp"));
});

test("laundry guide begins with the shelf supplies and omits the source-summary sentence",async()=>{
  const updates=await read("assets/content-updates.js");
  assert.match(updates,/D\.pages\.laundry\.summary = ''/);
  assert.match(updates,/D\.pages\.laundry\.sections\[0\]\.steps = I\([\s\S]*'세제와 섬유유연제는 세탁기 위 선반에 있습니다\.'/);
  assert.doesNotMatch(updates,/LG FY9WTB 공식 자료를 기준으로 세탁·건조 방법을 정리했습니다/);
});

test("device diagrams swipe in fullscreen, gallery captions stay hidden, and airport copy is explicit",async()=>{
  const app=await read("assets/master-app.js");
  const data=await read("assets/site-data.js");
  assert.match(app,/data-device-guide-index/);
  assert.match(app,/guideButtons\.map\(button=>\[button\.dataset\.fullscreenImage/);
  assert.match(app,/const galleryItems=currentGalleryItems\(\)\.map\(item=>\[item\[0\],''\]\)/);
  assert.match(data,/공항철도 AREX \+ 지하철 4호선/);
  assert.match(data,/label:I\('공항철도 AREX'/);
  assert.match(data,/동대문종합시장·종로6가\(01771\) 하차/);
  assert.doesNotMatch(data,/동대문 권역 정류장/);
});


test("tour totals stay data-driven and the legacy floating AI button is gone",async()=>{
  const html=await read("index.html");
  const data=await read("assets/tour-data.js");
  const tourApp=await read("assets/tour-app.js");
  const masterApp=await read("assets/master-app.js");
  assert.equal((data.match(/^\s+place\('/gm)||[]).length,21);
  assert.match(data,/만나는 21개의 로컬 코스입니다/);
  assert.match(html,/추천 근교 투어 21곳 보기/);
  assert.match(tourApp,/const total = DATA\.places\.length/);
  assert.match(masterApp,/const tourPlaceCount=window\.ANOTHER_HOUSE_TOURS\?\.places\?\.length\|\|20/);
  assert.doesNotMatch(html,/id="openChatFab"|another-chat-fab/);
  assert.match(masterApp,/\$\('#openChatFab'\)\?\.addEventListener\('click',openChat\)/);
});
