import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';
const read = path => readFile(new URL('../'+path, import.meta.url), 'utf8');
const origin = 'https://anotherhouse-guide.vercel.app';
const homes = ['/', '/en', '/ja', '/zh-cn', '/zh-tw'];
const tourPath = home => (home === '/' ? '' : home) + '/tours';

test('legacy home/tour aliases redirect once, preserve locale and attribution, and cannot redirect externally', async () => {
  const code = stripTypeScriptTypes(await read('middleware.ts')).replace(/import .*?;\n/, '').replace('export default function', 'function').replace('export const config', 'const config');
  const context = vm.createContext({URL, Response, next: () => 'next'});
  vm.runInContext(code+'\nthis.route=middleware;this.routes=config;', context);
  for (const home of homes) {
    for (const path of [home,tourPath(home)]) {
      for (const screen of ['home','tours']) {
        const response = context.route({url:origin+path+'?utm_source=guide&page='+screen+'&lang=en'});
        const target = (screen==='home'?home:tourPath(home))+'?utm_source=guide&lang=en';
        assert.equal(response.status,308); assert.equal(response.headers.get('location'),target);
        assert.equal(context.route({url:origin+target}),'next');
      }
    }
  }
  for (const path of ['/ja?page=transport','/ja?page=checkin','/api/chat?page=tours','/assets/test?page=tours','/unknown?page=tours','/ja']) {
    assert.equal(context.route({url:origin+path}),'next');
  }
  assert.equal(context.route({url:origin+'/ja?page=tours&next=https%3A%2F%2Fevil.example'}).headers.get('location').split('?')[0],'/ja/tours');
  assert.equal(context.routes.matcher.length,10);
  for (const route of context.routes.matcher) assert.equal(route.has[0].key,'page');
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
