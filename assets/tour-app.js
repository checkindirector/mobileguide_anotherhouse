(() => {
  'use strict';

  const DATA = window.ANOTHER_HOUSE_TOURS;
  if (!DATA) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  const lang = () => document.documentElement.lang || 'ko';
  const t = (value) => value && typeof value === 'object' && !Array.isArray(value)
    ? (value[lang()] || value.ko || value.en || '')
    : value;
  const labels = () => ({
    ko: { places: '곳', from: '숙소에서', map: '지도', official: '상세 정보', empty: '조건에 맞는 장소가 없습니다.' },
    en: { places: 'places', from: 'FROM THE HOUSE', map: 'MAPS', official: 'DETAILS', empty: 'No places match your search.' },
    ja: { places: 'スポット', from: '宿から', map: '地図', official: '詳細情報', empty: '条件に合うスポットがありません。' },
    zh: { places: '处', from: '距住宿', map: '地图', official: '详细信息', empty: '没有符合条件的地点。' }, "zh-TW":{ places: "處", from: "距住宿", map: "地圖", official: "詳細資訊", empty: "沒有符合條件的地點。" },
  }[lang()] || {});

  let category = 'host';
  let query = '';

  const normalized = (place) => [
    t(place.name), t(place.text), t(place.travel), ...(t(place.tags) || []),
  ].join(' ').toLowerCase();

  const filtered = () => DATA.places.filter((place) => {
    const inCategory = category === 'all'
      || (category === 'host' ? place.host : place.categories.includes(category));
    return inCategory && (!query || normalized(place).includes(query.toLowerCase()));
  });

  const cover = (place, compact = false) => `
    <figure class="${compact ? 'tour-mini' : 'restaurant-photo tour-card-cover'} tour-photo-cover">
      <img src="${esc(place.image)}" alt="${esc(t(place.name))}" loading="${compact ? 'eager' : 'lazy'}">
      <span class="tour-photo-shade" aria-hidden="true"></span>
      <span class="tour-cover-number">${esc(place.number)}</span>
      <span class="tour-cover-kicker">${place.host ? 'HOST’S PICK' : 'LOCAL ROUTE'}</span>
      <strong class="tour-cover-name">${esc(t(place.name))}</strong>
    </figure>`;

  function card(place) {
    const l = labels();
    return `<article class="restaurant-card tour-card">
      ${cover(place)}
      <div class="restaurant-card-body">
        <div class="restaurant-card-top"><div><p class="restaurant-category">${esc((t(place.tags) || []).slice(0, 2).join(' · '))}</p><h3>${esc(t(place.name))}</h3></div>${place.host ? '<span class="restaurant-pick-badge"><span class="mi">hotel_class</span> PICK</span>' : ''}</div>
        <div class="tour-travel"><span class="mi">directions_walk</span><div><small>${esc(l.from)}</small><strong>${esc(t(place.travel))}</strong></div></div>
        <p class="restaurant-copy">${esc(t(place.text))}</p>
        <div class="restaurant-tags">${(t(place.tags) || []).map((tag) => `<span>${esc(tag)}</span>`).join('')}</div>
        <div class="restaurant-actions">
          <a href="${esc(place.naver)}" target="_blank" rel="noopener"><span class="mi">location_on</span>NAVER</a>
          <a href="${esc(place.google)}" target="_blank" rel="noopener"><span class="mi">map</span>GOOGLE</a>
          ${place.official ? `<a href="${esc(place.official)}" target="_blank" rel="noopener"><span class="mi">open_in_new</span>${esc(l.official)}</a>` : ''}
        </div>
      </div>
    </article>`;
  }

  function renderCards() {
    const list = filtered();
    const count = $('#tourCount');
    const label = $('#tourCategoryLabel');
    const cards = $('#tourCards');
    const empty = $('#toursEmpty');
    if (!cards) return;
    const hostPick = $('#tourHostPick');
    if (hostPick) { const showHostPick = category === 'host'; hostPick.hidden = !showHostPick; hostPick.style.display = showHostPick ? '' : 'none'; }
    count.textContent = String(list.length);
    const selected = DATA.categories.find((item) => item.id === category);
    label.textContent = selected ? t(selected.label) : '';
    cards.innerHTML = list.map(card).join('');
    empty.hidden = list.length > 0;
  }

  function renderTours() {
    const root = $('#toursContent');
    const hero = $('.tours-hero');
    if (!root || !hero) return;
    const l = labels();
    $('.section-kicker', hero).textContent = DATA.kicker;
    $('h2', hero).textContent = t(DATA.title);
    $('.tour-hero-summary', hero).textContent = t(DATA.summary);
    hero.style.backgroundImage = `linear-gradient(180deg,rgba(25,19,16,.08),rgba(25,19,16,.84)),url('${DATA.hero}')`;
    root.innerHTML = `<div class="restaurants-controls">
      <div class="restaurants-filter" role="tablist" aria-label="Tour categories">${DATA.categories.map((item) => `<button class="restaurant-chip ${item.id === category ? 'active' : ''}" type="button" data-tour-category="${esc(item.id)}">${esc(t(item.label))}</button>`).join('')}</div>
      <label class="restaurant-search"><span class="mi">search</span><input id="tourSearch" type="search" value="${esc(query)}" placeholder="${esc(t(DATA.searchPlaceholder))}"></label>
    </div>
    <section class="restaurant-host-pick" id="tourHostPick"><div class="restaurant-host-pick-head"><span class="restaurant-host-pick-icon"><span class="mi">hotel_class</span></span><div><small>HOST’S PICK</small><strong>${esc(t(DATA.hostTitle))}</strong></div></div></section>
    <div class="restaurant-summary"><b><span id="tourCount">0</span> ${esc(l.places)}</b><span id="tourCategoryLabel"></span></div>
    <div class="restaurants-list" id="tourCards"></div>
    <div class="restaurants-empty" id="toursEmpty">${esc(l.empty)}</div>`;
    $$('[data-tour-category]', root).forEach((button) => {
      button.onclick = () => {
        category = button.dataset.tourCategory;
        $$('[data-tour-category]', root).forEach((item) => item.classList.toggle('active', item === button));
        renderCards();
      };
    });
    $('#tourSearch').oninput = (event) => {
      query = event.target.value;
      renderCards();
    };
    renderCards();
  }

  function renderHomeTours() {
    const root = $('#homeTours');
    if (!root) return;
    const total = DATA.places.length;
    const homeLabels = {
      ko: ['추천 근교 투어', `추천 근교 투어 ${total}곳 보기`],
      en: ['Nearby Tours', `View ${total} nearby tours`],
      ja: ['近郊おすすめツアー', `近郊スポット${total}選を見る`],
      zh: ['附近精选路线', `查看${total}个附近景点`], "zh-TW":["附近精選路線", `檢視${total}個附近景點`],
    }[lang()] || ['추천 근교 투어', `추천 근교 투어 ${total}곳 보기`];
    const homeTitle = $('#homeToursTitle');
    const browseLabel = $('#tourBrowseLabel');
    if (homeTitle) homeTitle.textContent = homeLabels[0];
    if (browseLabel) browseLabel.textContent = homeLabels[1];
    root.innerHTML = DATA.places.filter((place) => place.host).slice(0, 2).map((place) => `
      <button class="nearby-card tour-home-card" type="button" data-go="tours">
        ${cover(place, true)}
        <span class="nearby-card-copy"><small>${esc(t(place.travel))}</small><strong>${esc(t(place.name))}</strong><span>${esc((t(place.tags) || []).slice(0, 2).join(' · '))}</span></span>
        <span class="mi">arrow_forward</span>
      </button>`).join('');
    $$('[data-go="tours"]', root).forEach((button) => {
      button.onclick = () => document.querySelector('[data-screen="tours"]')?.classList.add('active');
    });
  }

  renderTours();
  renderHomeTours();
  $$('.home-language-option').forEach((button) => button.addEventListener('click', () => {
    setTimeout(() => {
      renderTours();
      renderHomeTours();
    }, 0);
  }));
})();
