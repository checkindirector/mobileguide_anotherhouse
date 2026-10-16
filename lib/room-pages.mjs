import { roomGuides } from './room-content.mjs';
const origin = 'https://anotherhouse-guide.vercel.app';
const gallery = '/assets/images/gallery/another-house/';
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const photo = (file, caption, portrait = false) => `<figure><img src="${gallery}${file}.webp" alt="${escape(caption)}" width="${portrait ? 1200 : 1600}" height="${portrait ? 1600 : 1200}" loading="lazy" decoding="async"><figcaption>${escape(caption)}</figcaption></figure>`;

export function renderRoomGuide(guide, devices) {
  // Keep amenity descriptions in sync with the operator's existing guide.
  const amenityNames = ['객실 비품', '공용 욕실 비품', '공용주방 이용'];
  const amenities = amenityNames.map(name => {
    const device = devices.find(item => item.name.ko === name);
    if (!device?.steps?.[guide.key]?.length) throw new Error(`Missing operator amenity: ${name}/${guide.key}`);
    return device.steps[guide.key];
  });
  const schema = {'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':origin+guide.path+'#webpage',url:origin+guide.path,name:guide.title,description:guide.description,inLanguage:guide.language,about:{'@id':origin+'/#lodging'},breadcrumb:{'@id':origin+guide.path+'#breadcrumb'}},
    {'@type':'BreadcrumbList','@id':origin+guide.path+'#breadcrumb',itemListElement:[
      {'@type':'ListItem',position:1,name:guide.homeLabel,item:origin+guide.home},
      {'@type':'ListItem',position:2,name:guide.heading,item:origin+guide.path}
    ]}
  ]};
  return `<!doctype html>
<html lang="${guide.language}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(guide.title)}</title><meta name="description" content="${escape(guide.description)}">
<link rel="canonical" href="${origin}${guide.path}">
${roomGuides.map(other => `<link rel="alternate" hreflang="${other.hreflang}" href="${origin}${other.path}">`).join('\n')}
<meta property="og:type" content="article"><meta property="og:title" content="${escape(guide.title)}"><meta property="og:description" content="${escape(guide.description)}"><meta property="og:url" content="${origin}${guide.path}"><meta property="og:image" content="${origin}${gallery}single-01-503-1.webp"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/assets/access-guide.css?v=20261013-1"><link rel="stylesheet" href="/assets/room-guide.css?v=20261014-1">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
<script src="/assets/visitor-analytics.js" defer></script>
<script src="/assets/marketing-journey.js?v=20261016-1" defer></script>
</head>
<body>
<header><a class="brand" href="${guide.home}">ANOTHER HOUSE</a><nav aria-label="Language">${roomGuides.map(other => `<a href="${other.path}" lang="${other.language}" hreflang="${other.hreflang}"${other.path===guide.path?' aria-current="page"':''}>${other.label}</a>`).join('')}</nav></header>
<main>
<p class="eyebrow">ANOTHER HOUSE · DONGDAEMUN</p><h1>${escape(guide.heading)}</h1><p>${escape(guide.lead)}</p>
<nav class="contents" aria-label="${escape(guide.jumpLabel)}"><a href="#rooms">${escape(guide.roomTitle)}</a><a href="#bathrooms">${escape(guide.bathTitle)}</a><a href="#amenities">${escape(guide.amenityTitle)}</a></nav>
<section id="rooms"><h2>${escape(guide.roomTitle)}</h2>
<table><caption>${escape(guide.roomTitle)}</caption><thead><tr>${guide.tableHeaders.map(label=>`<th scope="col">${escape(label)}</th>`).join('')}</tr></thead><tbody>${guide.roomRows.map(row=>`<tr><th scope="row">${escape(row[0])}</th>${row.slice(1).map(cell=>`<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>
<p>${escape(guide.privacy)}</p><div class="photo-grid">${photo('single-01-503-1',guide.singleCaptions[0])}${photo('single-03-506-1',guide.singleCaptions[1])}</div>${photo('double-08-bed-4',guide.doubleCaption)}<p class="photo-note">${escape(guide.photoNote)}</p></section>
<section id="bathrooms"><h2>${escape(guide.bathTitle)}</h2><p>${escape(guide.bath)}</p><div class="photo-grid">${photo('common-29-shower-2',guide.bathCaptions[0],true)}${photo('common-30-powder-1',guide.bathCaptions[1],true)}</div></section>
<section id="amenities"><h2>${escape(guide.amenityTitle)}</h2><dl>${amenities.slice(0,2).map((lines,index)=>`<dt>${escape(guide.amenityLabels[index])}</dt><dd>${lines.map(line=>`<p>${escape(line)}</p>`).join('')}</dd>`).join('')}</dl>
<h2>${escape(guide.kitchenTitle)}</h2>${amenities[2].map(line=>`<p>${escape(line)}</p>`).join('')}${photo('common-22-kitchen-6',guide.kitchenCaption)}</section>
<section class="notice"><h2>${escape(guide.beforeTitle)}</h2><p>${escape(guide.before)}</p><p>${escape(guide.luggage)}</p><a href="${guide.home}/access">${escape(guide.accessLabel)}</a></section>
<section><h2>${escape(guide.bookingTitle)}</h2><p>${escape(guide.booking)}</p><a class="cta" href="${guide.home}#homeBookingHint">${escape(guide.bookingLabel)}</a></section>
</main><footer><a href="${guide.home}">${escape(guide.editor)}</a></footer>
</body></html>\n`;
}
