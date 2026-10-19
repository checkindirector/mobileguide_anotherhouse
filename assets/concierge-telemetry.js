/* First-party measurement; disclosed message originals are encrypted server-side. No IP or chat history payload. */
(() => {
  const production = location.hostname === 'anotherhouse-guide.vercel.app';
  const key = 'another-analytics';
  let memory = {}, lastVisit = false;
  const uuid = () => crypto.randomUUID();
  function read() { if (window.marketingJourney) return window.marketingJourney.readPreferences(); try { const value=JSON.parse(localStorage.getItem(key) || '{}'); return value && typeof value==='object' && !Array.isArray(value) ? value : {}; } catch { return memory; } }
  function write(data) { if (window.marketingJourney) return window.marketingJourney.writePreferences(data); memory = data; try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }
  function context() {
    if (window.marketingJourney) return { ...window.marketingJourney.context(), messagePolicy: 'internal-original-v1' };
    const data = read(), now = Date.now();
    if (!data.visitorId || now - (data.created || 0) > 30 * 86400000) { data.visitorId = uuid(); data.created = now; }
    if (!data.sessionId || now - (data.last || 0) > 30 * 60000) { data.sessionId = uuid(); data.turn = 0; }
    data.last = now; write(data);
    return { visitorId: data.visitorId, sessionId: data.sessionId, turn: data.turn || 0, internal: data.internal === true, optOut: data.optOut === true || navigator.globalPrivacyControl === true, messagePolicy: 'internal-original-v1' };
  }
  async function event(kind, language, fields = {}, supplied) {
    if (!production) return;
    try {
      const current = context(), telemetry = supplied || current;
      if (current.optOut || telemetry.optOut || current.internal !== telemetry.internal) return false;
      if (kind === 'ota_click' && window.marketingJourney) {
        const journey = window.marketingJourney.forClick(current);
        if (journey) fields = { ...fields, journey };
      }
      const response = await fetch('/api/analytics-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: uuid(), kind, language, telemetry, ...fields }), keepalive: true });
      return response.ok;
    } catch { return false; }
  }
  const faqIds = ['checkin_time', 'checkin_method', 'early_checkin', 'checkout_time', 'luggage', 'amenities'];
  let currentChat = null, privacyEpoch = 0;
  // Privacy is independent of visibility. A hidden tab has no visibleContext;
  // comparing ordinary storage writes with that null value caused two-tab loops.
  function privacySignature() {
    const data = read(); let disabled = false;
    try { disabled = !!localStorage.getItem('va-disable'); } catch {}
    return [data.internal === true, data.optOut === true || navigator.globalPrivacyControl === true || disabled].join('|');
  }
  let observedPrivacy = privacySignature();
  function emitQuality(kind, fields, tracking = currentChat) {
    if (!tracking || tracking.epoch !== privacyEpoch) return Promise.resolve(false);
    return event(kind, tracking.language, { interactionId: tracking.interactionId, ...fields }, tracking.telemetry);
  }
  function openChat(language) {
    if (currentChat) return;
    try {
      currentChat = { interactionId: uuid(), language, telemetry: context(), epoch: privacyEpoch, stage: 'before_question', requestId: null, paused: null, ready: null, viewedRequestId: null };
      emitQuality('chat_open', {});
    } catch {}
  }
  function closeChat(reason = 'close') {
    if (!currentChat) return;
    emitQuality('chat_close', { stage: currentChat.stage, reason, requestId: currentChat.requestId });
    currentChat = null;
  }
  function pauseChat(reason) {
    if (!currentChat || currentChat.paused === reason || (currentChat.paused && reason !== 'pagehide')) return;
    emitQuality('chat_pause', { stage: currentChat.stage, reason, requestId: currentChat.requestId });
    currentChat.paused = reason;
  }
  function viewReady() {
    if (!currentChat?.ready || currentChat.paused || document.visibilityState !== 'visible') return;
    const outcome = currentChat.ready;
    currentChat.stage = outcome === 'error' ? 'after_error' : 'after_answer';
    currentChat.viewedRequestId = currentChat.requestId;
    currentChat.ready = null;
    emitQuality('answer_view', { requestId: currentChat.requestId, outcome });
  }
  function resumeChat() {
    if (!currentChat || document.visibilityState !== 'visible' || pageHidden) return;
    if (currentChat.paused) { currentChat.paused = null; emitQuality('chat_resume', { stage: currentChat.stage, requestId: currentChat.requestId }); }
    viewReady();
  }
  function resetTracking() {
    privacyEpoch++; currentChat = null;
    if (document.getElementById('chatPanel')?.classList.contains('open')) openChat(language());
  }
  function beginQuestion(language) {
    try {
      openChat(language);
      const telemetry = window.conciergeTelemetry.next();
      const tracking = { requestId: uuid(), interactionId: currentChat.interactionId, language, telemetry, epoch: privacyEpoch };
      Object.assign(currentChat, tracking, { stage: 'waiting_answer', ready: null, viewedRequestId: null });
      emitQuality('chat_submit', { requestId: tracking.requestId }, tracking);
      return tracking;
    } catch { return { telemetry: { optOut: true } }; }
  }
  function finishQuestion(tracking, outcome = 'answer') {
    if (!currentChat || tracking?.epoch !== privacyEpoch || tracking.requestId !== currentChat.requestId || tracking.interactionId !== currentChat.interactionId || currentChat.viewedRequestId === tracking.requestId) return;
    currentChat.ready = outcome; viewReady();
  }
  const feedbackCopy = {
    ko: ['도움이 되었나요?', '도움됐어요', '해결되지 않았어요', '의견 감사합니다.', '저장하지 못했습니다. 다시 눌러주세요.', '수집 제외 설정으로 의견은 저장되지 않습니다.'],
    en: ['Was this helpful?', 'Helpful', 'Not resolved', 'Thank you for your feedback.', 'Could not save. Please try again.', 'Feedback is not saved while collection is disabled.'],
    ja: ['お役に立ちましたか？', '役に立った', '解決しなかった', 'ご意見ありがとうございます。', '保存できませんでした。もう一度お試しください。', '収集停止の設定によりご意見は保存されません。'],
    zh: ['这条回答有帮助吗？', '有帮助', '未解决', '感谢您的反馈。', '保存失败，请重试。', '已关闭统计收集，反馈不会保存。'],
    'zh-TW': ['這則回答有幫助嗎？', '有幫助', '未解決', '感謝您的回饋。', '儲存失敗，請重試。', '已關閉統計收集，回饋不會儲存。']
  };
  function addFeedback(message, tracking) {
    try {
    if (!tracking?.requestId || message.querySelector?.('.answer-feedback')) return;
    const text = feedbackCopy[tracking.language] || feedbackCopy.ko;
    const group = document.createElement('div'); group.className = 'answer-feedback'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', text[0]);
    const title = document.createElement('span'); title.className = 'answer-feedback-title'; title.textContent = text[0]; group.append(title);
    const choices = document.createElement('div'); choices.className = 'answer-feedback-choices';
    const status = document.createElement('span'); status.className = 'answer-feedback-status'; status.setAttribute('role', 'status');
    let selected = null, pending = false;
    for (const [vote, label] of [['helpful', text[1]], ['unresolved', text[2]]]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.dataset.vote = vote; button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', async () => {
        if (pending || selected === vote) return;
        pending = true; const buttons = [...choices.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
        const accepted = await emitQuality('answer_feedback', { requestId: tracking.requestId, vote }, tracking);
        let excluded = tracking.epoch !== privacyEpoch || tracking.telemetry.optOut;
        try { excluded = excluded || context().optOut; } catch { excluded = true; }
        if (accepted || excluded) { selected = vote; buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vote === vote))); }
        status.textContent = excluded ? text[5] : accepted ? text[3] : text[4];
        buttons.forEach(b => b.disabled = false); pending = false;
      });
      choices.append(button);
    }
    group.append(choices, status); message.append(group);
    } catch {} // Optional analytics UI must never turn a valid answer into an error.
  }
  // Visible-screen time, not attention or reading time. Unique, bounded chunks
  // avoid double counting on pagehide/visibilitychange and limit lost final time.
  let visibleSince = null, visibleContext = null, pageHidden = false;
  function language() { const explicit = document.documentElement?.dataset?.siteLanguage; if (explicit) return explicit; try { return localStorage.getItem('another-house-lang') || 'ko'; } catch { return 'ko'; } }
  // Delegation survives language changes and dynamically rendered reservation links.
  // Only fixed provider/surface values leave the browser, never the destination URL.
  function reservationClick(e) {
    if (e.defaultPrevented || (e.type === 'click' ? e.button !== 0 : e.button !== 1)) return;
    const link = e.target?.closest?.('a[data-ota]');
    if (!link) return;
    const provider = link.dataset.ota;
    const surface = link.closest('.home-support-card') ? 'home' : link.closest('#checkinContent') ? 'checkin' : null;
    const hosts = { booking: ['booking.com'], agoda: ['agoda.com'], trip: ['trip.com'] };
    if (!surface || !Object.hasOwn(hosts, provider)) return;
    try {
      const url = new URL(link.href);
      if (url.protocol !== 'https:' || !hosts[provider].some(host => url.hostname === host || url.hostname.endsWith('.' + host))) return;
      event('ota_click', language(), { provider, surface });
    } catch {}
  }
  function resumeTime() {
    visibleSince = null; visibleContext = null;
    if (!production || pageHidden || document.visibilityState !== 'visible') return;
    try { const ctx = context(); if (!ctx.optOut) { visibleContext = ctx; visibleSince = performance.now(); } } catch {}
  }
  function flushTime() {
    if (visibleSince === null) return;
    const now = performance.now(), activeMs = Math.min(60000, Math.max(0, Math.floor(now - visibleSince)));
    visibleSince = now;
    try {
      const current = context();
      if (!current.optOut && current.internal === visibleContext.internal && activeMs > 0) event('engagement', language(), { activeMs }, visibleContext);
    } catch {}
  }
  function startTime() {
    if (!production) return;
    resumeTime();
    setInterval(() => { flushTime(); resumeTime(); }, 30000);
    document.addEventListener('visibilitychange', () => { flushTime(); resumeTime(); if (document.visibilityState === 'hidden') pauseChat('hidden'); else resumeChat(); });
    window.addEventListener('pagehide', () => { flushTime(); pauseChat('pagehide'); pageHidden = true; resumeTime(); });
    window.addEventListener('pageshow', () => { pageHidden = false; resumeTime(); resumeChat(); });
    window.addEventListener('storage', e => {
      if (e.key !== key && e.key !== 'va-disable') return;
      const nextPrivacy = privacySignature();
      if (nextPrivacy === observedPrivacy) return;
      observedPrivacy = nextPrivacy;
      resumeTime(); resetTracking(); render();
    });
  }
  window.conciergeTelemetry = {
    next() { try { context(); const data = read(); data.turn = (data.turn || 0) + 1; write(data); return context(); } catch { return {optOut:true}; } },
    failure(language) { return event('client_failure', language); },
    open: openChat, close: closeChat, begin: beginQuestion, finish: finishQuestion, decorate: addFeedback,
    reset(language) { if (currentChat?.language === language) return; closeChat('language'); if (document.getElementById('chatPanel')?.classList.contains('open')) openChat(language); },
    faq(index, surface, accepted, language) { if (faqIds[index]) event('faq_click', language, { faqId: faqIds[index], surface, accepted }); },
    link(tracking, link) {
      try {
        const kind = link.kind === 'map' ? 'map' : link.kind === 'guide' ? 'guide' : 'source', host = new URL(link.url).hostname;
        const destination = kind === 'guide' ? link.route : kind === 'source' ? 'external_source' : /(^|\.)naver\.com$/i.test(host) ? 'naver_map' : /(^|\.)google\.(com|co\.kr)$/i.test(host) ? 'google_maps' : 'other_map';
        emitQuality('answer_link', { requestId: tracking?.requestId, linkKind: kind, destination }, tracking);
      } catch {}
    },
    preferences({ optOut, internal } = {}) { const data = read(); if (typeof optOut === 'boolean') data.optOut = optOut; if (typeof internal === 'boolean') data.internal = internal; write(data); observedPrivacy = privacySignature(); resumeTime(); resetTracking(); render(); window.marketingJourney?.refresh(); },
    context
  };
  const copy = {
    ko: ['서비스 개선을 위해 보낸 질문과 실제 답변 원문을 분석 서버에 약 90일 암호화 저장하며, 운영팀의 내부 보고서에도 별도 보관합니다. 입력한 이름·연락처 등 개인정보도 원문에 포함되며 숙소 운영팀이 내부 보고서에서 확인합니다. 불필요한 개인정보·비밀번호는 입력하지 마세요. 익명 이용 통계(화면 표시 체류시간, 답변 평가, 안내 링크·FAQ 이용, 챗봇 이용 단계)도 수집합니다. 전송 전 작성 중인 문장은 저장하지 않습니다. 아래에서 수집을 제외할 수 있습니다.', '대화·이용 통계 수집 제외', '운영팀 테스트 모드'],
    en: ['To improve service, we encrypt and store your sent questions and actual answers on our analysis server for about 90 days; accommodation staff also retain them in internal reports. Original messages include any names, contact details or other personal information you enter and are reviewed by accommodation staff in internal reports. Do not enter unnecessary personal details or passwords. We also collect anonymous usage statistics: visible-screen time, feedback, guide-link/FAQ use and chat stages. Unsent drafts are not stored. You can opt out below.', 'Exclude my chat and usage statistics', 'Staff test mode'],
    ja: ['サービス改善のため、送信した質問と実際の回答の原文を分析サーバーに暗号化して約90日間保存し、運営チームの内部報告書にも別途保管します。入力した氏名・連絡先などの個人情報も含まれ、宿泊施設の運営スタッフが内部報告書で確認します。不要な個人情報やパスワードは入力しないでください。画面表示時間、回答評価、案内リンク・FAQの利用、チャットの利用段階の匿名統計も収集します。未送信の文章は保存しません。下記で収集を停止できます。', '会話・利用統計の収集を停止', 'スタッフのテストモード'],
    zh: ['为改善服务，您发送的问题和实际回答原文会在分析服务器加密保存约90天，运营团队也会另行保留在内部报告中。原文包含您输入的姓名、联系方式等个人信息，住宿运营团队会在内部报告中查看。请勿输入不必要的个人信息或密码。另收集屏幕显示时长、回答评价、指引链接/FAQ使用及聊天阶段的匿名统计。不保存未发送的草稿。您可在下方关闭收集。', '不收集我的对话及使用统计', '员工测试模式'],
    'zh-TW': ['為改善服務，您傳送的問題和實際回答原文會在分析伺服器加密儲存約90天，營運團隊也會另行保留在內部報告中。原文包含您輸入的姓名、聯絡方式等個人資訊，住宿營運團隊會在內部報告中查看。請勿輸入不必要的個人資訊或密碼。另收集螢幕顯示時間、回答評價、指引連結/FAQ使用及聊天階段的匿名統計。不儲存未傳送的草稿。您可在下方關閉收集。', '不收集我的對話及使用統計', '員工測試模式']
  };
  const reservationPrivacy = {
    ko: ' 예약 사이트 버튼을 누르면 예약 플랫폼·화면 위치·선택 언어를 같은 기간 동안 기록합니다. 실제 예약 완료 여부는 알 수 없습니다.',
    en: ' Reservation-button clicks also record the platform, screen location and selected language for the same period. We cannot see whether a booking is completed.',
    ja: ' 予約サイトのボタンを押すと、予約プラットフォーム・画面内の位置・選択言語も同じ期間保存します。予約が完了したかは分かりません。',
    zh: ' 点击预订平台按钮时，也会在相同期限内记录平台、页面位置及所选语言。无法得知是否完成预订。',
    'zh-TW': ' 點擊訂房平台按鈕時，也會在相同期限內記錄平台、頁面位置及所選語言。無法得知是否完成訂房。'
  };
  function render() {
    const holder = document.getElementById('analyticsPrivacy');
    if (!holder) return;
    let language = document.documentElement?.dataset?.siteLanguage || 'ko'; try { language = document.documentElement?.dataset?.siteLanguage || localStorage.getItem('another-house-lang') || 'ko'; } catch {}
    const text = copy[language] || copy.ko, ctx = context();
    holder.replaceChildren();
    const details = document.createElement('details'), summary = document.createElement('summary');
    summary.textContent = ({ko:'대화 원문은 운영팀 내부 보고서에 저장됩니다 · 수집 설정',en:'Original messages are saved for internal staff reports · Privacy',ja:'会話原文を内部報告書に保存します · 収集設定',zh:'对话原文用于运营团队内部报告 · 收集设置','zh-TW':'對話原文用於營運團隊內部報告 · 收集設定'})[language] || 'Original messages are saved for internal staff reports · Privacy';
    details.append(summary);
    const p = document.createElement('p'); p.textContent = text[0] + (reservationPrivacy[language] || reservationPrivacy.ko); details.append(p);
    for (const [field, label] of [['optOut', text[1]], ['internal', text[2]]]) {
      const row = document.createElement('label'), input = document.createElement('input'); input.type = 'checkbox'; input.checked = ctx[field];
      input.addEventListener('change', () => window.conciergeTelemetry.preferences({ [field]: input.checked }));
      row.append(input, document.createTextNode(' ' + label)); details.append(row);
    }
    holder.append(details);
  }
  function start() {
    const panel = document.querySelector('.chat-note');
    if (panel) { const holder = document.createElement('div'); holder.id = 'analyticsPrivacy'; holder.style.cssText = 'padding:6px 16px;font-size:12px;line-height:1.5;color:#625046;background:#fffaf3;max-height:100px;overflow:auto'; panel.after(holder); }
    const style = document.createElement('style'); style.textContent = '#analyticsPrivacy label{display:block;margin:5px 0}#analyticsPrivacy summary{cursor:pointer}'; document.head.append(style);
    render();
    document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setTimeout(render, 0)));
    document.addEventListener('click', reservationClick);
    document.addEventListener('auxclick', reservationClick);
    if (!lastVisit) { lastVisit = true; event('visit', language(), { marketingVersion: 1 }); startTime(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
