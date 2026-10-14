// The locale is fixed by the route module, never supplied by a visitor.
module.exports = function legacyScreen(home) {
  if (!['/', '/en', '/ja', '/zh-cn', '/zh-tw'].includes(home)) throw new Error('Invalid locale');
  return function handler(req, res) {
    const url = new URL(req.url, 'https://anotherhouse-guide.vercel.app');
    const screen = url.searchParams.get('page');
    if (!['home', 'tours'].includes(screen)) {
      res.statusCode = 400; res.end('Invalid screen'); return;
    }
    const destination = screen === 'tours' ? (home === '/' ? '' : home) + '/tours' : home;
    url.searchParams.delete('page');
    res.statusCode = 308;
    res.setHeader('Location', destination + url.search);
    res.end();
  };
};
