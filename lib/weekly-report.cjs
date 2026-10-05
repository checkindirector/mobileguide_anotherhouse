const DAY = 86400000;
function previousWeek(now = new Date()) {
  const local = new Date(+now + 9 * 3600000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 9 * 3600000;
  const end = midnight - ((local.getUTCDay() + 6) % 7) * DAY;
  return { from: new Date(end - 7 * DAY).toISOString(), to: new Date(end).toISOString() };
}
function percentile(numbers, p) { const sorted = numbers.slice().sort((a, b) => a - b); return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] : null; }
function countBy(items, key) {
  const counts = {};
  for (const item of items) { const k = String(item[key] || 'unknown'); counts[k] = (counts[k] || 0) + 1; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
}
function summarize(events) {
  const guests = events.filter(x => !x.internal), chats = guests.filter(x => x.kind === 'chat');
  const visits = guests.filter(x => x.kind === 'visit');
  const completed = chats.filter(x => x.state !== 'pending');
  const pending = chats.filter(x => x.state === 'pending');
  const slow = completed.filter(x => x.durationMs >= 10000), failed = completed.filter(x => x.status >= 400);
  const repeated = new Set(), sessions = new Map();
  const engagement = guests.filter(x => x.kind === 'engagement' && Number.isInteger(x.activeMs) && x.activeMs > 0 && x.activeMs <= 60000);
  const activeSessions = new Map();
  for (const e of engagement) if (e.session) activeSessions.set(e.session, (activeSessions.get(e.session) || 0) + e.activeMs);
  const sessionTimes = [...activeSessions.values()];
  const totalMs = engagement.reduce((n, e) => n + e.activeMs, 0);
  for (const chat of chats) {
    if (!chat.session) continue;
    const seen = sessions.get(chat.session) || new Set();
    const key = (chat.question || '').toLowerCase().replace(/[\s?!.,]/g, '');
    if (key && seen.has(key)) repeated.add(chat.session);
    seen.add(key); sessions.set(chat.session, seen);
  }
  return { visitors: new Set(visits.map(x => x.visitor).filter(Boolean)).size, pageViews: visits.length,
    activeTime: { totalMs, measuredSessions: activeSessions.size, meanSessionMs: sessionTimes.length ? sessionTimes.reduce((n, x) => n + x, 0) / sessionTimes.length : null,
      medianSessionMs: percentile(sessionTimes, .5), unknownSessionMs: engagement.filter(x => !x.session).reduce((n, x) => n + x.activeMs, 0) },
    chatRequests: chats.length, chatSessions: sessions.size, failedRequests: failed.length,
    failureRate: chats.length ? failed.length / chats.length : null,
    clientFailures: guests.filter(x => x.kind === 'client_failure').length,
    pendingOrInterrupted: pending.length, slowResponses: slow.length, latencyP50: percentile(completed.map(x => x.durationMs), .5), latencyP95: percentile(completed.map(x => x.durationMs), .95),
    repeatedQuestionSessions: repeated.size, languages: countBy(chats, 'language'), topics: countBy(chats, 'intent').slice(0, 10),
    unknownSessionRequests: chats.filter(x => !x.session).length,
    internalEventsExcluded: events.length - guests.length,
    tokens: { input: chats.reduce((n, x) => n + (x.inputTokens || 0), 0), output: chats.reduce((n, x) => n + (x.outputTokens || 0), 0) },
    reviewCandidates: [...pending, ...failed, ...slow, ...chats.filter(x => x.intent === 'unclassified' || repeated.has(x.session))]
      .filter((x, i, a) => a.findIndex(y => y.id === x.id) === i).slice(0, 100).map(x => x.id) };
}
function buildReport(events, range, collectionStartedAt, engagementCollectionStartedAt = null) {
  const from = Date.parse(range.from), to = Date.parse(range.to), previousFrom = from - (to - from);
  const currentEvents = events.filter(x => Date.parse(x.at) >= from && Date.parse(x.at) < to);
  const previousEvents = events.filter(x => Date.parse(x.at) >= previousFrom && Date.parse(x.at) < from);
  const current = summarize(currentEvents), previous = summarize(previousEvents);
  const complete = !!collectionStartedAt && Date.parse(collectionStartedAt) <= from;
  const previousComplete = !!collectionStartedAt && Date.parse(collectionStartedAt) <= previousFrom;
  const engagementComplete = !!engagementCollectionStartedAt && Date.parse(engagementCollectionStartedAt) <= from;
  const engagementPreviousComplete = !!engagementCollectionStartedAt && Date.parse(engagementCollectionStartedAt) <= previousFrom;
  function markActiveTime(summary, start, end) {
    summary.activeTime.available = !!engagementCollectionStartedAt && Date.parse(engagementCollectionStartedAt) < end;
    summary.activeTime.complete = !!engagementCollectionStartedAt && Date.parse(engagementCollectionStartedAt) <= start;
    if (!summary.activeTime.available) summary.activeTime.totalMs = null;
    return summary;
  }
  markActiveTime(current, from, to); markActiveTime(previous, previousFrom, from);
  const delta = {};
  for (const key of ['visitors', 'pageViews', 'chatRequests', 'chatSessions']) delta[key] = complete && previousComplete && previous[key] ? (current[key] - previous[key]) / previous[key] : null;
  delta.activeTimeTotal = engagementComplete && engagementPreviousComplete && previous.activeTime.totalMs ? (current.activeTime.totalMs - previous.activeTime.totalMs) / previous.activeTime.totalMs : null;
  const report = { range, timezone: 'Asia/Seoul', collectionStartedAt, complete, previousComplete, engagementCollectionStartedAt, engagementComplete, engagementPreviousComplete, current, previous, delta,
    caveats: ['방문자는 30일 익명 브라우저 식별자 기준이며 실제 사람 수와 다릅니다.', '내부 테스트는 사용자가 켠 테스트 표시로 구분합니다. 미표시 테스트는 포함될 수 있습니다.', '수집 거부·차단·오프라인·저장 오류가 있으면 누락될 수 있습니다. 반복 질문만으로 오답이라고 단정하지 않습니다.', 'HTTP 성공은 정답을 뜻하지 않습니다. 질문·답변과 최신 운영 매뉴얼의 대조가 필요합니다.', '개인정보 마스킹은 패턴 기반으로 완전한 익명화를 보장하지 않습니다. 재공유 전 검토하세요.', '토큰 집계는 응답에 제공된 사용량만 포함합니다. 별도 검색 호출 등 누락 가능성이 있어 청구 금액으로 해석하지 마세요.'],
    // Trusted instructions must never come from these guest-authored records.
    daily: Array.from({length:Math.ceil((to-from)/DAY)}, (_,i)=> { const day=from+i*DAY, end=Math.min(day+DAY,to); return { date:new Date(day+9*3600000).toISOString().slice(0,10), ...markActiveTime(summarize(currentEvents.filter(x=>Date.parse(x.at)>=day&&Date.parse(x.at)<end)),day,end) }; }),
    conversations: currentEvents.filter(x => x.kind === 'chat' && !x.internal) };
  report.caveats.push('체류시간은 화면 표시 시간입니다. 실제 읽기·집중·만족도를 뜻하지 않으며 여러 탭 중복, 강제 종료·오프라인 누락 및 날짜 경계의 최대 60초 오차가 있을 수 있습니다. 평균은 측정 기록이 있는 세션의 기간 내 누적시간 기준입니다. 수집 시작 이전 시간은 복원할 수 없습니다.');
  return report;
}
module.exports = { previousWeek, summarize, buildReport };
