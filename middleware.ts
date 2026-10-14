import { next } from '@vercel/functions';

// Only the ten home/tour paths run this; assets and APIs skip it entirely.
export default function middleware(request: Request) {
  const url = new URL(request.url);
  const screen = url.searchParams.get('page');
  if (!['home', 'tours'].includes(screen || '')) return next();
  const home = ['/', '/en', '/ja', '/zh-cn', '/zh-tw'].find(path => url.pathname === path || url.pathname === (path === '/' ? '' : path) + '/tours');
  if (!home) return next();
  const destination = screen === 'tours' ? (home === '/' ? '' : home) + '/tours' : home;
  url.searchParams.delete('page');
  return new Response(null, {status: 308, headers: {Location: destination + url.search}});
}

export const config = {
  matcher: ['/', '/en', '/ja', '/zh-cn', '/zh-tw', '/tours', '/en/tours', '/ja/tours', '/zh-cn/tours', '/zh-tw/tours'],
};
