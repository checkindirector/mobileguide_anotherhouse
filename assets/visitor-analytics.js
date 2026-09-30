/* Visitor/page-view counts only. Never send concierge questions or answers. */
(() => {
  if (location.hostname !== 'anotherhouse-guide.vercel.app') return;
  try {
    if (localStorage.getItem('va-disable')) return;
  } catch (_) { /* Storage may be unavailable in private browsing. */ }
  if (document.querySelector('script[data-another-analytics]')) return;

  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', event => {
    const url = new URL(event.url);
    // Do not collect arbitrary query strings, entrance details, or fragments.
    url.search = '';
    url.hash = '';
    return { ...event, url: url.toString() };
  });
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  script.dataset.anotherAnalytics = 'true';
  document.head.appendChild(script);
})();
