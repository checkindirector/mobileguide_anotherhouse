/* First-party, pseudonymous quality measurement. No IP, URL, name, or history payload. */
(() => {
  const production = location.hostname === 'anotherhouse-guide.vercel.app';
  const key = 'another-analytics';
  let memory = {}, lastVisit = false;
  const uuid = () => crypto.randomUUID();
  function read() { try { const value=JSON.parse(localStorage.getItem(key) || '{}'); return value && typeof value==='object' && !Array.isArray(value) ? value : {}; } catch { return memory; } }
  function write(data) { memory = data; try { localStorage.setItem(key, JSON.stringify(data)); } catch {} }
  function context() {
    const data = read(), now = Date.now();
    if (!data.visitorId || now - (data.created || 0) > 30 * 86400000) { data.visitorId = uuid(); data.created = now; }
    if (!data.sessionId || now - (data.last || 0) > 30 * 60000) { data.sessionId = uuid(); data.turn = 0; }
    data.last = now; write(data);
    return { visitorId: data.visitorId, sessionId: data.sessionId, turn: data.turn || 0, internal: data.internal === true, optOut: data.optOut === true || navigator.globalPrivacyControl === true };
  }
  async function event(kind, language, fields = {}, supplied) {
    if (!production) return;
    try {
      const current = context(), telemetry = supplied || current;
      if (current.optOut || telemetry.optOut || current.internal !== telemetry.internal) return false;
      const response = await fetch('/api/analytics-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: uuid(), kind, language, telemetry, ...fields }), keepalive: true });
      return response.ok;
    } catch { return false; }
  }
  const faqIds = ['checkin_time', 'checkin_method', 'early_checkin', 'checkout_time', 'luggage', 'amenities'];
  let currentChat = null, privacyEpoch = 0;
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
  function language() { try { return localStorage.getItem('another-house-lang') || 'ko'; } catch { return 'ko'; } }
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
      if (e.key === key) { const data = read(); if (data.optOut === true || (data.internal === true) !== visibleContext?.internal) { resumeTime(); resetTracking(); } }
    });
  }
  window.conciergeTelemetry = {
    next() { try { context(); const data = read(); data.turn = (data.turn || 0) + 1; write(data); return context(); } catch { return {optOut:true}; } },
    failure(language) { return event('client_failure', language); },
    open: openChat, close: closeChat, begin: beginQuestion, finish: finishQuestion, decorate: addFeedback,
    reset(language) { closeChat('language'); if (document.getElementById('chatPanel')?.classList.contains('open')) openChat(language); },
    faq(index, surface, accepted, language) { if (faqIds[index]) event('faq_click', language, { faqId: faqIds[index], surface, accepted }); },
    link(tracking, link) {
      try {
        const kind = link.kind === 'map' ? 'map' : link.kind === 'guide' ? 'guide' : 'source', host = new URL(link.url).hostname;
        const destination = kind === 'guide' ? link.route : kind === 'source' ? 'external_source' : /(^|\.)naver\.com$/i.test(host) ? 'naver_map' : /(^|\.)google\.(com|co\.kr)$/i.test(host) ? 'google_maps' : 'other_map';
        emitQuality('answer_link', { requestId: tracking?.requestId, linkKind: kind, destination }, tracking);
      } catch {}
    },
    preferences({ optOut, internal } = {}) { const data = read(); if (typeof optOut === 'boolean') data.optOut = optOut; if (typeof internal === 'boolean') data.internal = internal; write(data); resumeTime(); resetTracking(); render(); },
    context
  };
  const copy = {
    ko: ['서비스 개선을 위해 질문·답변과 익명 이용 통계(화면 표시 체류시간, 답변 평가, 답변 링크·FAQ 버튼 이용, 챗봇 열기·전송·표시·닫기·화면 숨김)를 약 90일 저장합니다. 입력 중인 문장과 링크 전체 주소는 저장하지 않습니다. 연락처·비밀번호를 입력하지 마세요. 일반적인 개인정보는 자동 마스킹합니다.', '대화·이용 통계 수집 제외', '운영팀 테스트 모드'],
    en: ['We save questions, answers and anonymous usage statistics for about 90 days: visible-screen time, answer feedback, answer-link/FAQ clicks, and chat opening, sending, display, closing and screen hiding. Unsent text and full link URLs are not saved. Do not enter contact details or passwords. Common personal details are automatically masked.', 'Exclude my chat and usage statistics', 'Staff test mode'],
    ja: ['改善のため質問・回答と匿名利用統計（画面表示時間、回答評価、回答リンク・FAQボタン、チャットの開閉・送信・表示・画面非表示）を約90日間保存します。未送信の文章やリンクの完全なURLは保存しません。連絡先やパスワードは入力しないでください。一般的な個人情報は自動でマスクします。', '会話・利用統計の収集を停止', 'スタッフのテストモード'],
    zh: ['为改善服务，问题、回答和匿名使用统计保存约90天，包括屏幕显示时长、回答评价、回答链接/FAQ按钮点击及聊天打开、发送、显示、关闭和屏幕隐藏。不保存未发送的文字或完整链接地址。请勿输入联系方式或密码。常见个人信息会自动遮盖。', '不收集我的对话及使用统计', '员工测试模式'],
    'zh-TW': ['為改善服務，問題、回答和匿名使用統計保存約90天，包括螢幕顯示時間、回答評價、回答連結/FAQ按鈕點擊及聊天開啟、傳送、顯示、關閉和螢幕隱藏。不儲存未傳送的文字或完整連結網址。請勿輸入聯絡方式或密碼。常見個人資訊會自動遮蓋。', '不收集我的對話及使用統計', '員工測試模式']
  };
  function render() {
    const holder = document.getElementById('analyticsPrivacy');
    if (!holder) return;
    let language = 'ko'; try { language = localStorage.getItem('another-house-lang') || 'ko'; } catch {}
    const text = copy[language] || copy.ko, ctx = context();
    holder.replaceChildren();
    const details = document.createElement('details'), summary = document.createElement('summary');
    summary.textContent = ({ko:'개인정보·이용 통계 설정',en:'Privacy & usage settings',ja:'プライバシー・利用統計',zh:'隐私和使用统计','zh-TW':'隱私與使用統計'})[language] || 'Privacy & usage settings';
    details.append(summary);
    const p = document.createElement('p'); p.textContent = text[0]; details.append(p);
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
    if (!lastVisit) { lastVisit = true; event('visit', language()); startTime(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
