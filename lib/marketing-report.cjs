// Reservation-site handoffs only. No booking completion data is available.
function summarizeMarketing(events, startedAt, from, to) {
  const start = Date.parse(startedAt), available = Number.isFinite(start) && start < to;
  const complete = available && start <= from;
  if (!available) return { available: false, complete: false, clicks: null, clickedSessions: null, measuredSessions: null, matchedClickSessions: null, unmatchedClickSessions: null, clickSessionRate: null, byProvider: null, byLanguage: null, bySurface: null };
  const guests = events.filter(e => !e.internal);
  const visits = guests.filter(e => e.kind === 'visit' && e.marketingVersion === 1);
  const clicks = guests.filter(e => e.kind === 'ota_click');
  const sessions = new Set(visits.map(e => e.session).filter(Boolean));
  const clicked = new Set(clicks.map(e => e.session).filter(Boolean));
  const matched = [...clicked].filter(id => sessions.has(id)).length;
  function breakdown(key) {
    const groups = new Map();
    for (const e of clicks) {
      const group = groups.get(e[key]) || { label: e[key], clicks: 0, sessions: new Set() };
      group.clicks++; if (e.session) group.sessions.add(e.session); groups.set(e[key], group);
    }
    return [...groups.values()].map(g => ({ label: g.label, clicks: g.clicks, clickedSessions: g.sessions.size })).sort((a, b) => b.clicks - a.clicks);
  }
  return { available, complete, clicks: clicks.length, clickedSessions: clicked.size, measuredSessions: sessions.size,
    matchedClickSessions: matched, unmatchedClickSessions: clicked.size - matched,
    clickSessionRate: sessions.size ? matched / sessions.size : null,
    byProvider: breakdown('provider'), byLanguage: breakdown('language'), bySurface: breakdown('surface') };
}
module.exports = { summarizeMarketing };
