/* First-party journey categories only: no URLs, query strings, search terms or UI changes. */
(() => {
  const key = 'another-analytics', production = location.hostname === 'anotherhouse-guide.vercel.app';
  let memory = {}, lastView = '', lastPrivacy = '';
  const read = () => { try { const x = JSON.parse(localStorage.getItem(key) || '{}'); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; } catch { return memory; } };
  const write = value => { memory = value; try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  function context() {
    const data = read(), now = Date.now();
    if (!data.visitorId || now - (data.created || 0) > 30 * 86400000) { data.visitorId = crypto.randomUUID(); data.created = now; }
    if (!data.sessionId || now - (data.last || 0) > 30 * 60000) { data.sessionId = crypto.randomUUID(); data.turn = 0; delete data.journey; }
    const optOut = data.optOut === true || navigator.globalPrivacyControl === true || !!localStorageDisabled();
    const privacy = String(data.internal === true) + '|' + String(optOut);
    if (data.journeyPrivacy !== undefined && data.journeyPrivacy !== privacy) {
      data.sessionId = crypto.randomUUID(); data.turn = 0; delete data.journey;
    }
    data.journeyPrivacy = privacy; lastPrivacy = privacy;
    if (optOut) delete data.journey;
    data.last = now; write(data);
    return { visitorId: data.visitorId, sessionId: data.sessionId, turn: data.turn || 0, internal: data.internal === true, optOut };
  }
  function localStorageDisabled() { try { return localStorage.getItem('va-disable'); } catch { return false; } }
  function language() {
    const value = document.documentElement.dataset.siteLanguage || document.documentElement.lang;
    return ({ ko:'ko', en:'en', ja:'ja', zh:'zh', 'zh-CN':'zh', 'zh-cn':'zh', 'zh-TW':'zh-TW', 'zh-tw':'zh-TW' })[value] || 'ko';
  }
  function page() {
    if (/\/(ja|zh-cn|zh-tw)\/rooms(?:\.html)?\/?$/.test(location.pathname)) return 'rooms';
    if (/\/(ja|zh-cn|zh-tw)\/access(?:\.html)?\/?$/.test(location.pathname)) return 'access';
    const screen = document.querySelector('.screen.active')?.dataset.screen;
    if (screen) return ({home:'home',gallery:'gallery',checkin:'checkin',transport:'access',tours:'tours'})[screen] || 'other';
    return /\/tours(?:\.html)?\/?$/.test(location.pathname) ? 'tours' : 'other';
  }
  function source() {
    try {
      const url = new URL(document.referrer);
      if (url.origin === location.origin) return 'direct_unknown';
      const host = url.hostname.toLowerCase(), matches = domain => host === domain || host.endsWith('.' + domain);
      const groups = {
        chatgpt:['chatgpt.com','chat.openai.com'], perplexity:['perplexity.ai'], claude:['claude.ai'],
        gemini:['gemini.google.com'], copilot:['copilot.microsoft.com'],
        google:['google.com','google.co.jp','google.co.kr','google.com.tw','google.com.hk'],
        bing:['bing.com'], naver:['naver.com'], baidu:['baidu.com'], yahoo:['yahoo.com','yahoo.co.jp']
      };
      for (const [label, domains] of Object.entries(groups)) if (domains.some(matches)) return label;
      return 'other_referral';
    } catch { return 'direct_unknown'; }
  }
  function snapshot(ctx) {
    if (ctx.optOut) return null;
    const data = read();
    if (data.sessionId !== ctx.sessionId) return null;
    if (!data.journey || data.journey.session !== ctx.sessionId || data.journey.internal !== ctx.internal) {
      data.journey = { session:ctx.sessionId, internal:ctx.internal, source:source(), landingPage:page(), landingLanguage:language(), step:0 };
    }
    const j = data.journey;
    if (j.step >= 100000) return null;
    j.step++; write(data);
    return { version:1, source:j.source, landingPage:j.landingPage, landingLanguage:j.landingLanguage, page:page(), step:j.step };
  }
  function view() {
    if (!production || document.visibilityState !== 'visible') return;
    try {
      const ctx = context();
      if (ctx.optOut) { lastView = ''; return; }
      const signature = [ctx.sessionId, ctx.internal, page(), language()].join('|');
      if (lastView === signature) return;
      const journey = snapshot(ctx);
      if (!journey) return;
      lastView = signature;
      fetch('/api/analytics-event', {method:'POST', headers:{'Content-Type':'application/json'}, keepalive:true,
        body:JSON.stringify({id:crypto.randomUUID(), kind:'journey_view', language:language(), telemetry:ctx, journey})}).catch(() => {});
    } catch {} // Measurement must never interrupt navigation.
  }
  window.marketingJourney = {
    context, readPreferences:read, writePreferences:write,
    forClick(ctx) { view(); return snapshot(ctx); },
    refresh() { lastView = ''; view(); }
  };
  function start() {
    view();
    new MutationObserver(view).observe(document.body, {attributes:true, attributeFilter:['class']});
    new MutationObserver(view).observe(document.documentElement, {attributes:true, attributeFilter:['data-site-language','lang']});
    document.addEventListener('visibilitychange', view);
    window.addEventListener('pageshow', view);
    window.addEventListener('storage', e => {
      if (e.key !== key && e.key !== 'va-disable') return;
      const data = read();
      const privacy = String(data.internal === true) + '|' + String(data.optOut === true || navigator.globalPrivacyControl === true || !!localStorageDisabled());
      // Ordinary activity writes in another tab must not cause a write/ping-pong loop.
      if (privacy !== lastPrivacy) view();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
