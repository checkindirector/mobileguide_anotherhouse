const { journeyFields } = require('./journey-events.cjs');
// Period-local ordered funnel. Arrival time at the server need not match click order.
function summarizeJourney(events, startedAt, from, to) {
  const start = Date.parse(startedAt), available = Number.isFinite(start) && start < to;
  const empty = { measuredSessions:0, roomViewedSessions:0, roomGuideSessions:0, gallerySessions:0, clickedSessions:0, roomThenClickSessions:0, roomToClickRate:null };
  if (!available) return {available:false, complete:false, ...Object.fromEntries(Object.keys(empty).map(k=>[k,null])), bySource:null, byLandingPage:null, byLanguage:null, unlinkedClicks:null};
  const sessions = new Map();
  const guests = events.filter(e=>!e.internal && Date.parse(e.at) >= from && Date.parse(e.at) < to);
  for (const e of guests) {
    if (!e.session || !['journey_view','ota_click'].includes(e.kind) || !journeyFields(e.journey)) continue;
    const list = sessions.get(e.session) || []; list.push(e); sessions.set(e.session,list);
  }
  const rows = [];
  let unlinkedClicks = guests.filter(e=>e.kind === 'ota_click' && (!e.session || !journeyFields(e.journey))).length;
  for (const list of sessions.values()) {
    list.sort((a,b)=>a.journey.step-b.journey.step);
    const views = list.filter(e=>e.kind==='journey_view');
    const clicks = list.filter(e=>e.kind==='ota_click');
    if (!views.length) { unlinkedClicks += clicks.length; continue; }
    const first = views[0], roomViews = views.filter(e=>['rooms','gallery'].includes(e.journey.page));
    const afterView = clicks.filter(e=>e.journey.step > first.journey.step);
    rows.push({source:first.journey.source, landingPage:first.journey.landingPage, language:first.journey.landingLanguage,
      room:roomViews.length>0, guide:roomViews.some(e=>e.journey.page==='rooms'), gallery:roomViews.some(e=>e.journey.page==='gallery'),
      clicked:afterView.length>0, converted:roomViews.some(room=>afterView.some(click=>click.journey.step>room.journey.step))});
    unlinkedClicks += clicks.length-afterView.length;
  }
  function totals(items) {
    const result = {...empty, measuredSessions:items.length, roomViewedSessions:items.filter(r=>r.room).length,
      roomGuideSessions:items.filter(r=>r.guide).length, gallerySessions:items.filter(r=>r.gallery).length,
      clickedSessions:items.filter(r=>r.clicked).length, roomThenClickSessions:items.filter(r=>r.converted).length};
    result.roomToClickRate = result.roomViewedSessions ? result.roomThenClickSessions/result.roomViewedSessions : null;
    return result;
  }
  function breakdown(key) {
    return [...new Set(rows.map(r=>r[key]))].map(label=>({label,...totals(rows.filter(r=>r[key]===label))})).sort((a,b)=>b.measuredSessions-a.measuredSessions);
  }
  return {available:true, complete:start<=from, ...totals(rows), bySource:breakdown('source'), byLandingPage:breakdown('landingPage'), byLanguage:breakdown('language'), unlinkedClicks};
}
module.exports = { summarizeJourney };
