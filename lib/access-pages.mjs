import { accessGuides } from './access-content.mjs';
import { roomGuides } from './room-content.mjs';

const origin = 'https://anotherhouse-guide.vercel.app';
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function renderAccessGuide(guide) {
  const rooms = roomGuides.find(room => room.home === guide.home);
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {'@type': 'WebPage', '@id': origin + guide.path + '#webpage', url: origin + guide.path, name: guide.title, description: guide.description, inLanguage: guide.language, about: {'@id': origin + '/#lodging'}, breadcrumb: {'@id': origin + guide.path + '#breadcrumb'}},
      {'@type': 'BreadcrumbList', '@id': origin + guide.path + '#breadcrumb', itemListElement: [
        {'@type': 'ListItem', position: 1, name: guide.homeLabel, item: origin + guide.home},
        {'@type': 'ListItem', position: 2, name: guide.heading, item: origin + guide.path}
      ]}
    ]
  };
  return `<!doctype html>
<html lang="${escape(guide.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(guide.title)}</title>
<meta name="description" content="${escape(guide.description)}">
<link rel="canonical" href="${origin}${guide.path}">
${accessGuides.map(other => `<link rel="alternate" hreflang="${other.hreflang}" href="${origin}${other.path}">`).join('\n')}
<meta property="og:type" content="article">
<meta property="og:title" content="${escape(guide.title)}">
<meta property="og:description" content="${escape(guide.description)}">
<meta property="og:url" content="${origin}${guide.path}">
<meta property="og:image" content="${origin}/assets/images/exit6-entrance-route.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/access-guide.css?v=20261013-1">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
<script src="/assets/visitor-analytics.js" defer></script>
</head>
<body>
<header><a class="brand" href="${guide.home}">ANOTHER HOUSE</a>
<nav aria-label="Language">${accessGuides.map(other => `<a href="${other.path}" lang="${other.language}" hreflang="${other.hreflang}"${other.path === guide.path ? ' aria-current="page"' : ''}>${other.label}</a>`).join('')}</nav>
</header>
<main>
<p class="eyebrow">ANOTHER HOUSE · DONGDAEMUN</p>
<h1>${escape(guide.heading)}</h1>
<p>${escape(guide.lead)}</p>
<div class="address"><span>${escape(guide.addressLabel)}</span><strong lang="ko">서울 종로구 종로 294 5층</strong><a href="https://naver.me/FbVSIXlL">${escape(guide.mapLabel)}</a></div>
<figure><img src="/assets/images/exit6-entrance-route.webp" alt="${escape(guide.stationCaption)}"><figcaption>${escape(guide.stationCaption)}</figcaption></figure>
<h2>${escape(guide.routeTitle)}</h2>
<ol>${guide.steps.map(([title, body]) => `<li><h3>${escape(title)}</h3><p>${escape(body)}</p></li>`).join('')}</ol>
<figure class="entrance"><img src="/assets/images/building-entrance.webp" alt="${escape(guide.entranceCaption)}" loading="lazy"><figcaption>${escape(guide.entranceCaption)}</figcaption></figure>
<section class="notice"><h2>${escape(guide.luggageTitle)}</h2><p>${escape(guide.luggage)}</p></section>
<section><h2>${escape(guide.stayTitle)}</h2><p>${escape(guide.stay)}</p><p><a href="${rooms.path}">${escape(rooms.roomTitle)}</a></p><a class="cta" href="${guide.home}#bookingFaq">${escape(guide.cta)}</a></section>
</main>
<footer><a href="${guide.home}">${escape(guide.editor)}</a></footer>
</body>
</html>
`;
}
