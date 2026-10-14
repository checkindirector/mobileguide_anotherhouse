import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const legacyScreen=require('../lib/legacy-screen.cjs');
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const read = path => readFile(new URL('../'+path, import.meta.url), 'utf8');
const origin = 'https://anotherhouse-guide.vercel.app';
const homes = ['/', '/en', '/ja', '/zh-cn', '/zh-tw'];
const tourPath = home => (home === '/' ? '' : home) + '/tours';

test('legacy aliases redirect once, preserve locale and attribution, and cannot redirect externally', async () => {
  for (const home of homes) {
    const route=legacyScreen(home);
    for (const path of [home,tourPath(home)]) {
      for (const screen of ['home','tours']) {
        const response={headers:{},setHeader(k,v){this.headers[k]=v},end(){}};
        route({url:origin+path+'?utm_source=guide&page='+screen+'&lang=en'},response);
        assert.equal(response.statusCode,308);
        assert.equal(response.headers.Location,(screen==='home'?home:tourPath(home))+'?utm_source=guide&lang=en');
        assert.equal(new URL(response.headers.Location,origin).searchParams.has('page'),false);
      }
    }
    const rejected={setHeader(){throw new Error('unexpected redirect')},end(){}};
    route({url:origin+'/?page=https://evil.example'},rejected);assert.equal(rejected.statusCode,400);
  }
  const config=JSON.parse(await read('vercel.json'));
  assert.equal(config.rewrites.length,10);
  for (const rule of config.rewrites) {
    assert.equal(rule.has[0].key,'page');assert.equal(rule.has[0].value,'(home|tours)');
    assert.ok(!rule.source.includes('api'));assert.ok(!rule.source.includes('assets'));
  }
});

test('home and tour documents prioritize the correct hero and defer below-fold photos and ordered scripts', async () => {
  for (const home of homes) {
    const homeFile=home==='/'?'index.html':home.slice(1)+'.html';
    const {document: h}=parseHTML(await read(homeFile));
    const {document: t}=parseHTML(await read(tourPath(home).slice(1)+'.html'));
    assert.ok(h.querySelector('link[rel="preload"][href="assets/images/main-01.webp"]'));
    assert.ok(!t.querySelector('link[rel="preload"][href="assets/images/main-01.webp"]'));
    assert.ok(t.querySelector('link[rel="preload"][href="/assets/images/tours/seoul-my-soul-night-hero.webp"]'));
    for (const d of [h,t]) {
      for (const script of d.querySelectorAll('script[src]')) assert.ok(script.hasAttribute('defer'));
      for (const img of d.querySelectorAll('.previous-gallery-mosaic img,#homeNearby img,#homeTours img')) assert.equal(img.getAttribute('loading'),'lazy');
      assert.equal(d.querySelectorAll('#tourCards .tour-card').length,21);
    }
    for (const img of t.querySelectorAll('.screen[data-screen="home"] img')) assert.equal(img.getAttribute('loading'),'lazy');
  }
});

test('tour startup keeps the intro but never waits for or preloads the invisible home hero', async () => {
  const source=await read('assets/master-app.js');
  const queue=source.split('\n').find(line=>line.startsWith('function queueMotionReady('));
  for (const screen of ['home','tours']) {
    const loads=[], intros=[];
    const context=vm.createContext({reduceMotion:false,heroMotionQueued:false,initialScreen:screen,heroSlides:['main-01.webp'],document:{visibilityState:'visible'},playBrandIntro:()=>{intros.push(true);return Promise.resolve()},preloadHeroImage:src=>{loads.push(src);return Promise.resolve()},setTimeout:()=>{},requestAnimationFrame:()=>{},startHeroMotion:()=>{}});
    vm.runInContext(queue+'\nqueueMotionReady();',context);
    assert.equal(intros.length,1);assert.deepEqual(loads,screen==='home'?['main-01.webp']:[]);
  }
});
