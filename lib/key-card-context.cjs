const { normalizeGuestLanguage } = require('./guest-language.cjs');
const KEY = /카드키|열쇠|재발급|key\s*card|\bkeys?\b|replacement|キーカード|カードキー|鍵|再発行|房卡|钥匙|鑰匙|补办|補辦|补发|補發/iu;
const OTHER = /차키|자동차|집\s*열쇠|car key|house key|bike key|車の鍵|家の鍵|车钥匙|車鑰匙/iu;
const FOLLOWUP = /분실|잃|두고|놓고|전화|비번|비밀번호|알려|재발급|받았|lost|missing|forgot|left|code|password|phone|received|again|紛失|忘れ|教えて|電話|再発行|遺失|遗失|丢|丟|密码|密碼|告诉|告訴|补办|補辦|补发|補發/iu;

// Context recognition only. The owner withdrew the historical one-time
// replacement exception on 2026-10-27; conversation history cannot revive it.
function keyCardSituation(message, history = []) {
  const current = normalizeGuestLanguage(message);
  const explicit = KEY.test(current) && !OTHER.test(current);
  const prior = history.filter(x => x?.role === 'user').some(x => {
    const text = normalizeGuestLanguage(x.content || x.text || '');
    return KEY.test(text) && !OTHER.test(text);
  });
  return { related: explicit || (prior && FOLLOWUP.test(current)), followup: prior && FOLLOWUP.test(current), replacementReceived: false };
}
module.exports = { keyCardSituation };
