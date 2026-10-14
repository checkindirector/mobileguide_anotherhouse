import { next } from '@vercel/functions';

// Only legacy screen aliases use this redirect. Normal pages and assets skip it.
export default function middleware(request: Request) {
  const url = new URL(request.url);
  const homes = ['/', '/en', '/ja', '/zh-cn', '/zh-tw'];
  const home = homes.find(path => url.pathname === path || url.pathname === (path === '/' ? '' : path) + '/tours');
  const screen = url.searchParams.get('page');
  if (!home || !['home', 'tours'].includes(screen || '')) return next();
  const destination = screen === 'tours' ? (home === '/' ? '' : home) + '/tours' : home;
  url.searchParams.delete('page');
  // A relative Location cannot redirect to an untrusted Host or destination.
  return new Response(null, {status: 308, headers: {Location: destination + url.search}});
}

export const config = {
  matcher: [
    {source: '/', has: [{type: 'query', key: 'page', value: '(home|tours)'}]},
    {source: '/en', has: [{type: 'query', key: 'page', value: '(home|tours)'}]},
    {source: '/ja', has: [{type: 'query', key: 'page', value: '(home|tours)'}]},
    {source: '/zh-cn', has: [{type: 'query', key: 'page', value: '(home|tours)'}]},
    {source: '/zh-tw', has: [{type: 'query', key: 'page', value: '(home|tours)'}]},
    {source: '/tours', has: [{type: 'query', key: 'page', value: '(home|tours)'}]},
    {source: '/en/tours', has: [{type: 'query', key: 'page', value: '(home|tours)'}]},
    {source: '/ja/tours', has: [{type: 'query', key: 'page', value: '(home|tours)'}]},
    {source: '/zh-cn/tours', has: [{type: 'query', key: 'page', value: '(home|tours)'}]},
    {source: '/zh-tw/tours', has: [{type: 'query', key: 'page', value: '(home|tours)'}]},
  ],
};
