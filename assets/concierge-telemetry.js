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
  async function event(kind, language) {
    if (!production) return;
    const telemetry = context();
    if (telemetry.optOut) return;
    try { await fetch('/api/analytics-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: uuid(), kind, language, telemetry }), keepalive: true }); } catch {}
  }
  window.conciergeTelemetry = {
    next() { try { context(); const data = read(); data.turn = (data.turn || 0) + 1; write(data); return context(); } catch { return {optOut:true}; } },
    failure(language) { return event('client_failure', language); },
    preferences({ optOut, internal } = {}) { const data = read(); if (typeof optOut === 'boolean') data.optOut = optOut; if (typeof internal === 'boolean') data.internal = internal; write(data); render(); },
    context
  };
  const copy = {
    ko: ['서비스 개선을 위해 질문·답변과 익명 이용 통계를 약 90일 저장합니다. 연락처·비밀번호를 입력하지 마세요. 일반적인 개인정보는 자동 마스킹합니다.', '대화·이용 통계 수집 제외', '운영팀 테스트 모드'],
    en: ['Questions, answers and anonymous usage statistics are saved for about 90 days to improve service. Do not enter contact details or passwords. Common personal details are automatically masked.', 'Exclude my chat and usage statistics', 'Staff test mode'],
    ja: ['改善のため質問・回答と匿名の利用統計を約90日間保存します。連絡先やパスワードは入力しないでください。一般的な個人情報は自動でマスクします。', '会話・利用統計の収集を停止', 'スタッフのテストモード'],
    zh: ['为改善服务，问题、回答和匿名使用统计保存约90天。请勿输入联系方式或密码。常见个人信息会自动遮盖。', '不收集我的对话及使用统计', '员工测试模式'],
    'zh-TW': ['為改善服務，問題、回答和匿名使用統計保存約90天。請勿輸入聯絡方式或密碼。常見個人資訊會自動遮蓋。', '不收集我的對話及使用統計', '員工測試模式']
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
    if (!lastVisit) { lastVisit = true; let language; try { language = localStorage.getItem('another-house-lang'); } catch {} event('visit', language || 'ko'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
