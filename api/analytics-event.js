const { enabled, context, persist, background, bodyOf, randomUUID, UUID, validActiveMs } = require('../lib/telemetry.cjs');
const limits = new Map();
module.exports = async function(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!enabled()) return res.status(503).json({ error: 'Collection not configured' });
  // Browser requests only; never accept arbitrary origins or payload text.
  if (req.headers.origin !== 'https://anotherhouse-guide.vercel.app') return res.status(403).json({ error: 'Origin not allowed' });
  if (Number(req.headers['content-length'] || 0) > 2048) return res.status(413).json({ error: 'Too large' });
  const body = bodyOf(req), ctx = context(body);
  if (!ctx.session || !ctx.visitor || !UUID.test(body.id || '') || !['visit', 'client_failure', 'engagement'].includes(body.kind)) return res.status(400).json({ error: 'Invalid event' });
  if (body.kind === 'engagement' && !validActiveMs(body.activeMs)) return res.status(400).json({ error: 'Invalid visible time' });
  if (body.telemetry?.optOut) return res.status(204).end();
  const now = Date.now();
  if (limits.size > 5000) limits.clear();
  const bucket = limits.get(ctx.session);
  if (bucket && now - bucket.at < 60000 && bucket.count >= 20) return res.status(429).json({ error: 'Rate limit' });
  limits.set(ctx.session, { at: bucket && now - bucket.at < 60000 ? bucket.at : now, count: bucket && now - bucket.at < 60000 ? bucket.count + 1 : 1 });
  background(persist({ id: body.id || randomUUID(), at: new Date(now).toISOString(), kind: body.kind, ...ctx,
    ...(body.kind === 'engagement' ? { activeMs: body.activeMs } : {}) }));
  return res.status(202).json({ accepted: true });
};
