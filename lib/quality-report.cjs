const { FAQ_IDS } = require('./interaction-events.cjs');
const requestKey = x => x.session && x.requestId ? x.session + ':' + x.requestId : null;
const interactionKey = x => x.session && x.interactionId ? x.session + ':' + x.interactionId : null;
function unique(items, key) { return new Set(items.map(key).filter(Boolean)); }
function breakdown(items, label) {
  const counts = new Map();
  for (const x of items) { const k = label(x); counts.set(k, (counts.get(k) || 0) + 1); }
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}
function latestVotes(events) {
  const votes = new Map();
  for (const e of events.filter(x => !x.internal && x.kind === 'answer_feedback').sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    const key = requestKey(e); if (key && ['helpful', 'unresolved'].includes(e.vote)) votes.set(key, e);
  }
  return votes;
}
function summarizeQuality(events, referenceEvents = events) {
  const votes = latestVotes(events), ratings = [...votes.values()];
  const views = events.filter(x => x.kind === 'answer_view'), viewed = unique(views, requestKey);
  const linkedServerAnswers = unique(referenceEvents.filter(x => !x.internal && x.kind === 'chat' && x.state !== 'pending' && x.links?.length), requestKey);
  const eligibleLinked = new Set([...viewed].filter(key => linkedServerAnswers.has(key)));
  const links = events.filter(x => x.kind === 'answer_link'), clicked = unique(links, requestKey);
  const faqs = events.filter(x => x.kind === 'faq_click');
  const opens = unique(events.filter(x => x.kind === 'chat_open'), interactionKey);
  const submits = unique(events.filter(x => x.kind === 'chat_submit'), interactionKey);
  const closed = unique(events.filter(x => x.kind === 'chat_close'), interactionKey);
  const pauses = events.filter(x => x.kind === 'chat_pause'), closes = events.filter(x => x.kind === 'chat_close');
  const helpful = ratings.filter(x => x.vote === 'helpful').length;
  const ratedViewed = [...viewed].filter(key => votes.has(key)).length;
  return {
    feedback: { ratings: ratings.length, helpful, unresolved: ratings.length - helpful,
      helpfulShare: ratings.length ? helpful / ratings.length : null, answerViews: viewed.size, ratedViewedAnswers: ratedViewed,
      participationRate: viewed.size ? ratedViewed / viewed.size : null,
      ratingsWithoutViewInPeriod: ratings.filter(x => !viewed.has(requestKey(x))).length,
      byLanguage: breakdown(ratings, x => x.language || 'unknown') },
    links: { clicks: links.length, clickedAnswers: clicked.size, linkedAnswersShown: eligibleLinked.size,
      clickThroughRate: eligibleLinked.size ? [...eligibleLinked].filter(key => clicked.has(key)).length / eligibleLinked.size : null,
      byDestination: breakdown(links, x => x.linkKind + ':' + x.destination), byLanguage: breakdown(links, x => x.language || 'unknown') },
    faq: { clicks: faqs.length, acceptedClicks: faqs.filter(x => x.accepted).length, blockedWhileWaiting: faqs.filter(x => !x.accepted).length,
      byQuestion: FAQ_IDS.map(faqId => ({ faqId, clicks: faqs.filter(x => x.faqId === faqId).length,
        home: faqs.filter(x => x.faqId === faqId && x.surface === 'home').length,
        chat: faqs.filter(x => x.faqId === faqId && x.surface === 'chat').length })), byLanguage: breakdown(faqs, x => x.language || 'unknown') },
    flow: { opens: opens.size, openedWithQuestion: [...opens].filter(key => submits.has(key)).length,
      questionSendRate: opens.size ? [...opens].filter(key => submits.has(key)).length / opens.size : null,
      submissions: events.filter(x => x.kind === 'chat_submit').length,
      answerViews: viewed.size, displayedOutcomes: breakdown(views, x => x.outcome),
      closes: closed.size, closesByStageAndReason: breakdown(closes, x => x.stage + ':' + x.reason),
      pauses: pauses.length, pausesByStageAndReason: breakdown(pauses, x => x.stage + ':' + x.reason),
      waitingAnswerClosed: unique(closes.filter(x => x.stage === 'waiting_answer' && x.reason === 'close'), interactionKey).size,
      waitingAnswerPageHidden: unique(pauses.filter(x => x.stage === 'waiting_answer' && x.reason === 'hidden'), interactionKey).size,
      waitingAnswerPageLeft: unique(pauses.filter(x => x.stage === 'waiting_answer' && x.reason === 'pagehide'), interactionKey).size,
      resumedInteractions: unique(events.filter(x => x.kind === 'chat_resume'), interactionKey).size,
      byLanguage: [...new Set(events.filter(x => x.kind === 'chat_open').map(x => x.language || 'unknown'))].map(language => {
        const own = events.filter(x => (x.language || 'unknown') === language);
        return { language, opens: unique(own.filter(x => x.kind === 'chat_open'), interactionKey).size,
          waitingAnswerClosed: unique(own.filter(x => x.kind === 'chat_close' && x.stage === 'waiting_answer' && x.reason === 'close'), interactionKey).size,
          waitingAnswerPageHidden: unique(own.filter(x => x.kind === 'chat_pause' && x.stage === 'waiting_answer' && x.reason === 'hidden'), interactionKey).size };
      }),
      openedWithoutCloseInPeriod: [...opens].filter(key => !closed.has(key)).length,
      submittedWithoutOpenInPeriod: [...submits].filter(key => !opens.has(key)).length }
  };
}
function requestQuality(events, chat) {
  const key = requestKey(chat);
  if (!key) return { feedback: null, linkClicks: [], displayed: false, associationAvailable: false };
  const matched = events.filter(x => !x.internal && requestKey(x) === key);
  const vote = latestVotes(matched).get(key);
  return { feedback: vote ? { vote: vote.vote, at: vote.at } : null,
    linkClicks: matched.filter(x => x.kind === 'answer_link').map(x => ({ at: x.at, kind: x.linkKind, destination: x.destination })),
    displayed: matched.some(x => x.kind === 'answer_view'), associationAvailable: true,
    flowSignals: matched.filter(x => ['chat_pause', 'chat_resume', 'chat_close', 'answer_view'].includes(x.kind))
      .map(x => ({ at: x.at, kind: x.kind, stage: x.stage || null, reason: x.reason || null, outcome: x.outcome || null })) };
}
function qualityReviewCases(periodEvents, allEvents) {
  const cases = [], chats = new Map(allEvents.filter(x => !x.internal && x.kind === 'chat').map(x => [requestKey(x), x]));
  const candidates = new Map();
  for (const [key, rating] of latestVotes(periodEvents)) {
    if (rating.vote !== 'unresolved') continue;
    candidates.set(key, { ...rating, signals: ['unresolved_feedback'] });
  }
  for (const e of periodEvents.filter(x => !x.internal && x.stage === 'waiting_answer' &&
    ((x.kind === 'chat_close' && x.reason === 'close') || (x.kind === 'chat_pause' && x.reason === 'pagehide')))) {
    const key = requestKey(e); if (!key) continue;
    const signal = e.kind === 'chat_close' ? 'closed_before_answer' : 'page_left_before_answer';
    const existing = candidates.get(key);
    if (existing) { if (!existing.signals.includes(signal)) existing.signals.push(signal); }
    else candidates.set(key, { ...e, signals: [signal] });
  }
  for (const [key, rating] of candidates) {
    const chat = chats.get(key);
    cases.push({ at: rating.at, requestId: rating.requestId, language: rating.language, vote: rating.vote || null, signals: rating.signals,
      parentFound: !!chat, parentAt: chat?.at || null, question: chat?.question || null, answer: chat?.answer || null,
      intent: chat?.intent || null, sourceRows: chat?.sourceRows || [], ...requestQuality(allEvents, chat || rating) });
  }
  return cases;
}
module.exports = { summarizeQuality, requestQuality, qualityReviewCases };
