import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';
import { accessGuides } from '../lib/access-content.mjs';
import { roomGuides } from '../lib/room-content.mjs';

const root = resolve(import.meta.dirname, '..');
const read = name => readFile(resolve(root, name), 'utf8');
const data = vm.createContext({window:{}});
vm.runInContext(await read('assets/search-content.js'), data);
const locales = data.window.ANOTHER_HOUSE_SEARCH;
const origin = 'https://anotherhouse-guide.vercel.app';

test('all existing tour information is present in every initial language document with crawlable same-screen links', async () => {
  const tourData = vm.createContext({window:{}});
  vm.runInContext(await read('assets/tour-data.js'), tourData);
  const tours = tourData.window.ANOTHER_HOUSE_TOURS;
  for (const [language, locale] of Object.entries(locales)) {
    const tourPath = locale.path.replace(/\/$/, '') + '/tours';
    for (const filename of [locale.path === '/' ? 'index.html' : locale.path.slice(1)+'.html', tourPath.slice(1)+'.html']) {
      const {document} = parseHTML(await read(filename));
      const cards = [...document.querySelectorAll('#tourCards .tour-card')];
      assert.equal(cards.length, 21);
      assert.equal(cards.filter(card => !card.hasAttribute('hidden')).length, 7);
      assert.equal(new Set(cards.map(card=>card.dataset.tourId)).size, 21);
      for (const place of tours.places) {
        const card = document.querySelector(`[data-tour-id="${place.id}"]`);
        assert.equal(card.querySelector('h3').textContent, place.name[language]);
        assert.equal(card.querySelector('.restaurant-copy').textContent, place.text[language]);
        assert.equal(card.querySelector('.tour-travel strong').textContent, place.travel[language]);
        assert.equal(card.querySelector('img').getAttribute('src'), place.image);
        assert.equal(card.querySelector('img').alt, place.name[language]);
        assert.deepEqual([...card.querySelectorAll('.restaurant-tags span')].map(node=>node.textContent), Array.from(place.tags[language]));
        assert.equal(card.querySelectorAll('a').length, place.official ? 3 : 2);
      }
      assert.equal(document.querySelector('.tours-hero h2').textContent, tours.title[language]);
      assert.equal(document.querySelector('.tour-hero-summary').textContent, tours.summary[language]);
      assert.equal(document.querySelector('#homeTours').children.length, 2);
      for (const link of document.querySelectorAll('[data-go="tours"]')) {
        assert.equal(link.tagName, 'A'); assert.equal(link.getAttribute('href'), tourPath);
      }
      assert.ok(document.querySelector('noscript[data-tour-fallback]').textContent.includes('#tourCards>.tour-card[hidden]'));
    }
    const {document} = parseHTML(await read(tourPath.slice(1)+'.html'));
    assert.equal(document.querySelector('base').getAttribute('href'), '/');
    assert.equal(document.documentElement.dataset.initialScreen, 'tours');
    assert.equal(document.querySelector('.screen.active').dataset.screen, 'tours');
    assert.equal(document.querySelector('link[rel="canonical"]').href, origin+tourPath);
    assert.equal(document.title, tours.title[language]+' | Another House');
    assert.equal(document.querySelector('meta[name="description"]').content, tours.summary[language]);
    for (const alternate of Object.values(locales)) {
      assert.equal(document.querySelector(`link[hreflang="${alternate.hreflang}"]`).href, origin+alternate.path.replace(/\/$/,'')+'/tours');
    }
    assert.ok((await read('sitemap.xml')).includes(`<loc>${origin}${tourPath}</loc>`));
  }
});

test('existing tour filters and search preserve all 21 cards while showing exactly the requested subset', async () => {
  for (const [language, locale] of Object.entries(locales)) {
    const {document} = parseHTML(await read(locale.path.replace(/\/$/,'').slice(1) + (locale.path==='/'?'tours.html':'/tours.html')));
    const browser = vm.createContext({document,window:{},setTimeout:()=>{}});
    vm.runInContext(await read('assets/tour-data.js'), browser);
    vm.runInContext(await read('assets/search-content.js'), browser);
    vm.runInContext(await read('assets/tour-app.js'), browser);
    const count = () => document.querySelectorAll('#tourCards .tour-card').length;
    const visible = () => [...document.querySelectorAll('#tourCards .tour-card')].filter(card=>!card.hidden);
    assert.equal(count(),21); assert.equal(visible().length,7);
    document.querySelector('[data-tour-category="all"]').onclick();
    assert.equal(count(),21); assert.equal(visible().length,21);
    const search = document.querySelector('#tourSearch');
    search.oninput({target:{value:browser.window.ANOTHER_HOUSE_TOURS.places.find(p=>p.id==='gwangjang').name[language]}});
    assert.equal(count(),21); assert.equal(visible().length,1); assert.equal(visible()[0].dataset.tourId,'gwangjang');
    search.oninput({target:{value:'no-such-place-xyz'}});
    assert.equal(count(),21); assert.equal(visible().length,0); assert.equal(document.querySelector('#toursEmpty').hidden,false);
    search.oninput({target:{value:''}});
    document.querySelector('[data-tour-category="host"]').onclick();
    assert.equal(count(),21); assert.equal(visible().length,7);
  }
});

test('every language is readable without JavaScript and declares reciprocal canonical language URLs', async () => {
  for (const [language, locale] of Object.entries(locales)) {
    const html = await read(locale.path === '/' ? 'index.html' : locale.path.slice(1) + '.html');
    const {document} = parseHTML(html);
    assert.equal(document.documentElement.lang, locale.htmlLang);
    assert.equal(document.documentElement.dataset.siteLanguage, language);
    assert.equal(document.title, locale.title);
    assert.equal(document.querySelector('link[rel="canonical"]').getAttribute('href'), origin + locale.path);
    const alternates = [...document.querySelectorAll('link[rel="alternate"][hreflang]')];
    assert.equal(alternates.length, 6);
    for (const alternate of Object.values(locales)) {
      assert.ok(alternates.some(link => link.getAttribute('hreflang') === alternate.hreflang && link.getAttribute('href') === origin + alternate.path));
    }
    assert.equal(document.querySelector('#homeEditorialIntro').textContent.length > 40, true);
    assert.equal(document.querySelector('#homeAddress').textContent.length > 15, true);
    assert.equal(document.querySelectorAll('#essentialsGrid .essential-item').length, 4);
    assert.equal(document.querySelectorAll('#bookingFaq details').length, 7);
    for (const [question, answer] of locale.faqs) {
      assert.ok(document.querySelector('#bookingFaq').textContent.includes(question));
      assert.ok(document.querySelector('#bookingFaq').textContent.includes(answer));
    }
    const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    assert.equal(schema['@id'], origin + '/#lodging');
    assert.equal(schema.numberOfRooms, 12);
    assert.equal(schema.checkoutTime, '11:00');
    assert.equal(schema.address.postalCode, undefined);
    assert.equal(schema.aggregateRating, undefined);
    assert.equal(document.querySelectorAll('.home-support-card a[data-ota]').length, 3);
    for (const link of document.querySelectorAll('.home-language-option')) {
      assert.equal(link.tagName, 'A');
      assert.equal(link.getAttribute('href'), locales[link.dataset.language].path);
    }
  }
});

test('explicit language URL wins over an earlier language preference, including blocked storage', async () => {
  const app = await read('assets/master-app.js');
  const expression = app.match(/let lang=([\s\S]*?),restaurantCategory=/)[1];
  for (const language of Object.keys(locales)) {
    const value = vm.runInNewContext(expression, {
      document: { documentElement: {dataset:{siteLanguage:language}} },
      localStorage: {getItem(){throw new Error('Storage must not override the URL language');}}
    });
    assert.equal(value, language);
  }
});

test('room-guide return links restore the intended home section after app initialization', async () => {
  const app = await read('assets/master-app.js');
  const source = app.split('\n').find(line => line.startsWith('function restoreHomeAnchor('));
  const calls = [];
  const context = vm.createContext({document:{getElementById:id=>({scrollIntoView:options=>calls.push({id,...options})})},requestAnimationFrame:fn=>fn()});
  vm.runInContext(source, context);
  for (const anchor of ['#bookingFaq','#homeBookingHint','#untrusted','']) vm.runInContext(`restoreHomeAnchor(${JSON.stringify(anchor)})`, context);
  assert.deepEqual(calls.map(call=>call.id), ['bookingFaq','homeBookingHint']);
  assert.ok(calls.every(call=>call.block==='center'));
  assert.ok(app.includes("const initialScreen=homeAnchor?'home':"));
  assert.ok(app.includes("location.pathname+location.search+homeAnchor);restoreHomeAnchor(homeAnchor)"));
});

test('sitemap covers all canonical homepages and the original HTML alias remains identical', async () => {
  const sitemap = await read('sitemap.xml');
  assert.equal((sitemap.match(/<loc>/g)||[]).length, 16);
  for (const locale of Object.values(locales)) assert.ok(sitemap.includes(`<loc>${origin}${locale.path}</loc>`));
  assert.equal(await read('index.html'), await read('guide-anotherhouse.html'));
  assert.equal((await read('google3e7332e3b88b3607.html')).trim(), 'google-site-verification: google3e7332e3b88b3607.html');
});

test('room guides expose real room and shared facility information with working localized paths and assets', async () => {
  for (const guide of roomGuides) {
    const {document} = parseHTML(await read(guide.path.slice(1) + '.html'));
    assert.equal(document.documentElement.lang, guide.language);
    assert.equal(document.querySelector('link[rel="canonical"]').href, origin + guide.path);
    assert.equal(document.querySelectorAll('h1').length, 1);
    assert.equal(document.querySelectorAll('table tbody tr').length, 2);
    assert.ok(document.querySelector('#bathrooms').textContent.includes(guide.bath));
    assert.ok(document.querySelector('#amenities').textContent.includes('Wi-Fi'));
    assert.equal(document.querySelectorAll('main img').length, 6);
    for (const image of document.querySelectorAll('img')) {
      assert.ok(image.alt.length > 10);
      assert.ok((await readFile(resolve(root, image.src.slice(1)))).length > 0);
    }
    for (const link of document.querySelectorAll('main a[href^="#"]')) assert.ok(document.querySelector(link.href));
    for (const alternate of roomGuides) {
      assert.equal(document.querySelector(`link[hreflang="${alternate.hreflang}"]`).href, origin + alternate.path);
      assert.ok(document.querySelector(`nav a[href="${alternate.path}"]`));
    }
    const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    assert.equal(schema['@graph'][0].url, origin + guide.path);
    assert.equal(schema['@graph'][0].about['@id'], origin + '/#lodging');
    assert.equal(schema['@graph'][1].itemListElement[1].item, origin + guide.path);
    assert.equal(schema['@graph'][0].aggregateRating, undefined);
    const {document: home} = parseHTML(await read(guide.home.slice(1) + '.html'));
    assert.ok(home.querySelector(`#bookingFaq > p > a[href="${guide.path}"]`), 'Room photos are directly accessible without expanding a question');
    assert.equal(home.querySelectorAll(`#bookingFaq a[href="${guide.path}"]`).length, 1, 'Move the existing link rather than duplicate it');
    assert.ok(home.querySelector(`#bookingFaq details a[href="${guide.path}#bathrooms"]`));
    assert.equal(document.querySelector('.cta').href, guide.home + '#homeBookingHint');
    assert.ok(home.querySelector('#homeBookingHint + nav a[data-ota]'));
    const {document: access} = parseHTML(await read(guide.home.slice(1) + '/access.html'));
    assert.ok(access.querySelector(`a[href="${guide.path}"]`));
    assert.ok(document.querySelector(`a[href="${guide.home}/access"]`));
    assert.ok((await read('sitemap.xml')).includes(`<loc>${origin}${guide.path}</loc>`));
  }
});

test('arrival guides have crawlable return and reciprocal language links, real photos, and matching structured data', async () => {
  for (const guide of accessGuides) {
    const {document} = parseHTML(await read(guide.path.slice(1) + '.html'));
    assert.equal(document.documentElement.lang, guide.language);
    assert.equal(document.querySelector('link[rel="canonical"]').href, origin + guide.path);
    assert.equal(document.querySelectorAll('h1').length, 1);
    assert.ok(document.querySelector('main').textContent.includes('서울 종로구 종로 294 5층'));
    assert.equal(document.querySelectorAll('ol li').length, 4);
    assert.equal(document.querySelector('.cta').href, guide.home + '#bookingFaq');
    assert.equal(document.querySelector('.address a').href, 'https://naver.me/FbVSIXlL');
    for (const alternate of accessGuides) {
      assert.equal(document.querySelector(`link[hreflang="${alternate.hreflang}"]`).href, origin + alternate.path);
      assert.ok(document.querySelector(`nav a[href="${alternate.path}"]`));
    }
    for (const image of document.querySelectorAll('img')) {
      assert.ok(image.alt.length > 10);
      assert.ok((await readFile(resolve(root, image.src.slice(1)))).length > 0);
    }
    const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    assert.equal(schema['@graph'][0].url, origin + guide.path);
    assert.equal(schema['@graph'][0].about['@id'], origin + '/#lodging');
    assert.equal(schema['@graph'][1].itemListElement[1].item, origin + guide.path);
    const {document: home} = parseHTML(await read(guide.home.slice(1) + '.html'));
    assert.ok(home.querySelector(`#bookingFaq details a[href="${guide.path}"]`));
    assert.ok((await read('sitemap.xml')).includes(`<loc>${origin}${guide.path}</loc>`));
  }
});
