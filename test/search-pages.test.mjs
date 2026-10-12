import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

const root = resolve(import.meta.dirname, '..');
const read = name => readFile(resolve(root, name), 'utf8');
const data = vm.createContext({window:{}});
vm.runInContext(await read('assets/search-content.js'), data);
const locales = data.window.ANOTHER_HOUSE_SEARCH;
const origin = 'https://anotherhouse-guide.vercel.app';

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

test('sitemap covers all canonical homepages and the original HTML alias remains identical', async () => {
  const sitemap = await read('sitemap.xml');
  assert.equal((sitemap.match(/<loc>/g)||[]).length, 5);
  for (const locale of Object.values(locales)) assert.ok(sitemap.includes(`<loc>${origin}${locale.path}</loc>`));
  assert.equal(await read('index.html'), await read('guide-anotherhouse.html'));
  assert.equal((await read('google3e7332e3b88b3607.html')).trim(), 'google-site-verification: google3e7332e3b88b3607.html');
});
