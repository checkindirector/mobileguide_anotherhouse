import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';
import { accessGuides } from '../lib/access-content.mjs';
import { renderAccessGuide } from '../lib/access-pages.mjs';
import { roomGuides } from '../lib/room-content.mjs';
import { renderRoomGuide } from '../lib/room-pages.mjs';

const root = resolve(import.meta.dirname, '..');
const origin = 'https://anotherhouse-guide.vercel.app';
const source = await readFile(resolve(root, 'index.html'), 'utf8');
const master = await readFile(resolve(root, 'assets/master-app.js'), 'utf8');
const tourApp = await readFile(resolve(root, 'assets/tour-app.js'), 'utf8');
const sourceScripts = ['site-data', 'gallery-data', 'content-updates', 'gallery-overrides', 'restaurant-data', 'restaurant-expanded', 'tour-data', 'search-content'];
const dataContext = vm.createContext({ window: {} });
for (const name of sourceScripts) vm.runInContext(await readFile(resolve(root, `assets/${name}.js`), 'utf8'), dataContext);
const locales = dataContext.window.ANOTHER_HOUSE_SEARCH;
const tourLocales = Object.values(locales).map(locale => ({...locale, path: locale.path.replace(/\/$/, '') + '/tours'}));
const copyStart = master.indexOf('const copy=');
const copySource = master.slice(copyStart, master.indexOf('\n};', copyStart) + 3);
const renderNames = ['renderHome', 'renderHomeEditorial', 'renderStayStory', 'otaLinksMarkup', 'renderSearchFaq'];
const functionLines = renderNames.map(name => master.split('\n').find(line => line.startsWith(`function ${name}(`)));
if (functionLines.some(line => !line)) throw new Error('Static homepage renderer is incomplete');
const functions = functionLines.join('\n');

for (const [language, locale] of Object.entries(locales)) {
  const { document } = parseHTML(source);
  document.querySelector('script[src^="assets/concierge-telemetry.js"]').setAttribute('src', 'assets/concierge-telemetry.js?v=20261012-4');
  for (const name of ['master-app', 'search-content']) document.querySelector(`script[src^="assets/${name}.js"]`).setAttribute('src', `assets/${name}.js?v=20261014-3`);
  document.querySelector('script[src^="assets/tour-app.js"]').setAttribute('src', 'assets/tour-app.js?v=20261014-3');
  document.querySelectorAll('script[src]').forEach(script => script.setAttribute('defer', ''));
  if (!document.querySelector('link[data-tour-search]')) {
    const style = document.createElement('link');
    style.setAttribute('rel', 'stylesheet'); style.setAttribute('href', '/assets/tour-search.css?v=20261014-2'); style.setAttribute('data-tour-search', '');
    document.head.appendChild(style);
  }
  const context = vm.createContext({ window: dataContext.window, document, lang: language });
  vm.runInContext(`const D=window.ANOTHER_HOUSE_DATA;const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];const t=v=>v&&typeof v==='object'&&!Array.isArray(v)&&('ko'in v)?(v[lang]||v.ko):v;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));${copySource}const c=()=>copy[lang]||copy.ko;${functions}renderHome();renderHomeEditorial();renderStayStory();renderSearchFaq();`, context);
  document.documentElement.lang = locale.htmlLang;
  document.documentElement.dataset.siteLanguage = language;
  vm.runInContext(tourApp, vm.createContext({window: dataContext.window, document, setTimeout: () => {}}));
  // Existing below-the-fold photos keep their original sources and dimensions.
  document.querySelectorAll('.previous-gallery-mosaic img, #homeNearby img, #homeTours img').forEach(img => img.setAttribute('loading', 'lazy'));
  for (const selector of ['#toursContent', '#homeTours']) {
    const container = document.querySelector(selector);
    container.innerHTML = container.innerHTML.replace(/[\t ]+$/gm, '');
  }
  if (!document.querySelector('noscript[data-tour-fallback]')) {
    const fallback = document.createElement('noscript');
    fallback.setAttribute('data-tour-fallback', '');
    fallback.innerHTML = '<style>#tourCards>.tour-card[hidden]{display:block!important}#toursContent .restaurants-controls,#tourHostPick,#toursContent .restaurant-summary,#toursEmpty{display:none!important}</style>';
    document.head.appendChild(fallback);
  }
  document.title = locale.title;
  const setMeta = (selector, value) => document.querySelector(selector).setAttribute('content', value);
  setMeta('meta[name="description"]', locale.description);
  for (const type of ['og', 'twitter']) {
    setMeta(`meta[${type === 'og' ? 'property' : 'name'}="${type}:title"]`, locale.title);
    setMeta(`meta[${type === 'og' ? 'property' : 'name'}="${type}:description"]`, locale.description);
  }
  setMeta('meta[property="og:locale"]', locale.ogLocale);
  setMeta('meta[property="og:url"]', origin + locale.path);
  document.querySelector('link[rel="canonical"]').href = origin + locale.path;
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(node => node.remove());
  for (const alternate of [...Object.values(locales), { path: '/', hreflang: 'x-default' }]) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', alternate.hreflang);
    link.setAttribute('href', origin + alternate.path);
    document.head.appendChild(link);
  }
  const schemaNode = document.querySelector('script[type="application/ld+json"]');
  const schema = JSON.parse(schemaNode.textContent);
  schema.url = origin + '/';
  schema.description = locale.description;
  schema.alternateName = ['어나더하우스', '어나더 하우스 - 여성 전용', 'Another House Dongdaemun', 'Another House - Women Only', 'Another House Dongdaemun (Women Only)'];
  schema.numberOfRooms = 12;
  schemaNode.textContent = '\n' + JSON.stringify(schema, null, 2) + '\n';
  document.querySelector('#homeLangText').textContent = locale.code;
  document.querySelector('#conciergeGreeting').textContent = vm.runInContext('c().greeting', context);
  document.querySelector('.home-support-card .platform-contact-logos').innerHTML = vm.runInContext('otaLinksMarkup()', context);
  document.querySelector('#homeBookingHint').textContent = dataContext.window.ANOTHER_HOUSE_DATA.ota.hint[language];
  const uiStart = master.indexOf('const ui={', master.indexOf('function renderChatLabels'));
  const uiEnd = master.indexOf('function renderAll', uiStart);
  if (uiStart < 0 || uiEnd < 0) throw new Error('Chat labels not found');
  // Reuse the runtime's own labels rather than maintain a second translation set.
  vm.runInContext(master.slice(uiStart, uiEnd).replace(/\r?\n}\s*$/, ''), context);
  const home = document.querySelector('[data-screen="home"]');
  const ui = vm.runInContext('c()', context);
  for (const [selector, attribute, value] of [
    ['#conciergeAskInput','placeholder',ui.placeholder],['#chatInput','placeholder',ui.question]
  ]) document.querySelector(selector).setAttribute(attribute, value);
  const suggestions = home.querySelectorAll('[data-home-question] b');
  if (suggestions.length !== 6) throw new Error('Home FAQ shortcuts are missing');
  document.querySelector('.chat-note').textContent = ui.note;
  document.querySelector('#chatLog .msg.bot').textContent = ui.hello;
  document.querySelectorAll('.home-language-option').forEach(node => {
    const alternate = locales[node.dataset.language];
    if (!alternate || node.tagName !== 'A') throw new Error('Language switch must expose crawlable links');
    node.setAttribute('href', alternate.path);
    node.setAttribute('hreflang', alternate.hreflang);
    if (node.dataset.language === language) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
  });
  const html = '<!doctype html>\n' + document.documentElement.outerHTML + '\n';
  const filename = locale.path === '/' ? 'index.html' : locale.path.slice(1) + '.html';
  await writeFile(resolve(root, filename), html);
  if (locale.path === '/') await writeFile(resolve(root, 'guide-anotherhouse.html'), html);

  // The existing tour screen gets its own URL; no new visible copy or layout.
  const {document: tourDocument} = parseHTML(html);
  const tourLocale = tourLocales.find(item => item.hreflang === locale.hreflang);
  const tours = dataContext.window.ANOTHER_HOUSE_TOURS;
  const title = tours.title[language] + ' | Another House';
  const description = tours.summary[language];
  const base = tourDocument.createElement('base'); base.setAttribute('href', '/'); tourDocument.head.prepend(base);
  // Prioritize this screen's existing hero instead of the hidden homepage hero.
  tourDocument.querySelector('link[rel="preload"][href="assets/images/main-01.webp"]').setAttribute('href', tours.hero);
  tourDocument.querySelectorAll('.screen[data-screen="home"] img').forEach(img => img.setAttribute('loading', 'lazy'));
  tourDocument.documentElement.dataset.initialScreen = 'tours';
  tourDocument.title = title;
  tourDocument.body.className = 'is-tours';
  tourDocument.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.dataset.screen === 'tours'));
  tourDocument.querySelector('link[rel="canonical"]').href = origin + tourLocale.path;
  tourDocument.querySelector('meta[name="description"]').content = description;
  tourDocument.querySelector('meta[property="og:url"]').content = origin + tourLocale.path;
  for (const type of ['og', 'twitter']) {
    const attribute = type === 'og' ? 'property' : 'name';
    tourDocument.querySelector(`meta[${attribute}="${type}:title"]`).content = title;
    tourDocument.querySelector(`meta[${attribute}="${type}:description"]`).content = description;
  }
  tourDocument.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => {
    const alternate = link.hreflang === 'x-default' ? tourLocales[0] : tourLocales.find(item => item.hreflang === link.hreflang);
    link.href = origin + alternate.path;
  });
  tourDocument.querySelectorAll('.home-language-option').forEach(link => {
    link.href = locales[link.dataset.language].path.replace(/\/$/, '') + '/tours';
  });
  await mkdir(resolve(root, locale.path.slice(1)), {recursive:true});
  await writeFile(resolve(root, tourLocale.path.slice(1) + '.html'), '<!doctype html>\n' + tourDocument.documentElement.outerHTML + '\n');
}
for (const guide of accessGuides) {
  await mkdir(resolve(root, guide.home.slice(1)), { recursive: true });
  await writeFile(resolve(root, guide.path.slice(1) + '.html'), renderAccessGuide(guide));
}
for (const guide of roomGuides) {
  await mkdir(resolve(root, guide.home.slice(1)), { recursive: true });
  await writeFile(resolve(root, guide.path.slice(1) + '.html'), renderRoomGuide(guide, dataContext.window.ANOTHER_HOUSE_DATA.pages.appliances.devices));
}
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + [...Object.values(locales), ...accessGuides, ...roomGuides, ...tourLocales].map(locale => `  <url><loc>${origin}${locale.path}</loc></url>`).join('\n') + '\n</urlset>\n';
await writeFile(resolve(root, 'sitemap.xml'), sitemap);
console.log(`Built ${Object.keys(locales).length} language versions of the existing homepage with visible booking FAQs.`);
console.log(`Built ${accessGuides.length} arrival guides with reciprocal language links.`);
console.log(`Built ${roomGuides.length} room guides with operator amenity descriptions and real photos.`);
console.log(`Prerendered all ${dataContext.window.ANOTHER_HOUSE_TOURS.places.length} existing tour cards in ${tourLocales.length} languages.`);
