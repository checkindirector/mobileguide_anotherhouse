import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// This protocol uses a publicly served ownership key, not an account credential.
// Run manually after a real content release; never run on every build or on a timer.
const root = resolve(import.meta.dirname, '..');
const origin = 'https://anotherhouse-guide.vercel.app';
const endpoint = 'https://api.indexnow.org/indexnow';
const args = process.argv.slice(2);
if (args.some(arg => !['--submit', '--check-live'].includes(arg))) throw new Error('Use --check-live to verify production or --submit to notify IndexNow. Default: local dry run.');
const key = (await readFile(resolve(root, 'indexnow-key.txt'), 'utf8')).trim();
if (!/^[a-f0-9]{32}$/.test(key)) throw new Error('Invalid public ownership key');
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
if (!urlList.length || urlList.length > 10000 || new Set(urlList).size !== urlList.length) throw new Error('Sitemap must contain 1–10000 unique canonical URLs');
for (const value of urlList) {
  const url = new URL(value);
  if (url.origin !== origin || url.search || url.hash) throw new Error('Only canonical URLs on the production host may be submitted');
  const filename = url.pathname === '/' ? 'index.html' : url.pathname.slice(1) + '.html';
  const html = await readFile(resolve(root, filename), 'utf8');
  if (!html.includes(`href="${value}"`) || !html.includes('rel="canonical"')) throw new Error(`Missing local canonical: ${url.pathname}`);
}
const keyLocation = origin + '/indexnow-key.txt';
const get = url => fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
if (args.includes('--submit') || args.includes('--check-live')) {
  const keyResponse = await get(keyLocation);
  if (keyResponse.status !== 200 || (await keyResponse.text()).trim() !== key) throw new Error('Production key not deployed or does not match');
  const liveSitemap = await get(origin + '/sitemap.xml');
  if (liveSitemap.status !== 200 || (await liveSitemap.text()).trim() !== sitemap.trim()) throw new Error('Production sitemap differs from local sitemap');
  await Promise.all(urlList.map(async url => {
    const response = await get(url);
    const html = await response.text();
    if (response.status !== 200 || /noindex/i.test(response.headers.get('x-robots-tag') || '') || !html.includes(`href="${url}"`)) throw new Error(`Production URL failed verification: ${url}`);
  }));
}
if (!args.includes('--submit')) {
  console.log(JSON.stringify({mode: args.includes('--check-live') ? 'live-check' : 'dry-run', host: new URL(origin).host, urlCount: urlList.length, urlList, submitted: false}, null, 2));
} else {
  const response = await fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/json; charset=utf-8'}, body:JSON.stringify({host:new URL(origin).host, key, keyLocation, urlList}), signal:AbortSignal.timeout(30000)});
  console.log(JSON.stringify({submittedAt:new Date().toISOString(), endpoint, status:response.status, urlCount:urlList.length, urlList, meaning:response.status === 200 ? 'URLs received; indexing is not confirmed' : response.status === 202 ? 'URLs received; ownership key validation pending; indexing is not confirmed' : 'Submission failed; inspect status before retrying'}, null, 2));
  if (![200,202].includes(response.status)) process.exitCode = 1;
}
