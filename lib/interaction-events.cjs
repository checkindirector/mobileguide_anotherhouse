// Allowlisted, text-free client quality events. Never persist arbitrary URLs/labels.
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const QUALITY_KINDS = new Set(['chat_open', 'chat_submit', 'answer_view', 'answer_feedback', 'answer_link', 'faq_click', 'chat_close', 'chat_pause', 'chat_resume']);
const FAQ_IDS = ['checkin_time', 'checkin_method', 'early_checkin', 'checkout_time', 'luggage', 'amenities'];
const ROUTES = ['home', 'checkin', 'transport', 'airport-departure', 'wifi', 'appliances', 'laundry', 'trash', 'restaurants', 'tours', 'gallery', 'guidebook', 'rules'];
const STAGES = ['before_question', 'waiting_answer', 'after_answer', 'after_error'];
function clientFields(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (body.kind === 'visit' || body.kind === 'client_failure') return {};
  if (body.kind === 'engagement') return Number.isInteger(body.activeMs) && body.activeMs > 0 && body.activeMs <= 60000 ? { activeMs: body.activeMs } : null;
  if (!QUALITY_KINDS.has(body.kind)) return null;
  if (body.kind === 'faq_click') return FAQ_IDS.includes(body.faqId) && ['home', 'chat'].includes(body.surface) && typeof body.accepted === 'boolean'
    ? { faqId: body.faqId, surface: body.surface, accepted: body.accepted } : null;
  if (!UUID.test(body.interactionId || '')) return null;
  const fields = { interactionId: body.interactionId };
  if (['chat_submit', 'answer_view', 'answer_feedback', 'answer_link'].includes(body.kind)) {
    if (!UUID.test(body.requestId || '')) return null;
    fields.requestId = body.requestId;
  } else if (body.requestId !== undefined && body.requestId !== null) {
    if (!UUID.test(body.requestId)) return null;
    fields.requestId = body.requestId;
  }
  if (body.kind === 'answer_feedback') {
    if (!['helpful', 'unresolved'].includes(body.vote)) return null;
    fields.vote = body.vote;
  }
  if (body.kind === 'answer_view') {
    if (!['answer', 'fallback', 'error'].includes(body.outcome)) return null;
    fields.outcome = body.outcome;
  }
  if (body.kind === 'answer_link') {
    if (!['map', 'guide', 'source'].includes(body.linkKind)) return null;
    const allowed = body.linkKind === 'guide' ? ROUTES : body.linkKind === 'map' ? ['naver_map', 'google_maps', 'other_map'] : ['external_source'];
    if (!allowed.includes(body.destination)) return null;
    fields.linkKind = body.linkKind; fields.destination = body.destination;
  }
  if (['chat_close', 'chat_pause', 'chat_resume'].includes(body.kind)) {
    if (!STAGES.includes(body.stage)) return null;
    fields.stage = body.stage;
    if (body.kind !== 'chat_resume') {
      const reasons = body.kind === 'chat_close' ? ['close', 'guide', 'language'] : ['hidden', 'pagehide'];
      if (!reasons.includes(body.reason)) return null;
      fields.reason = body.reason;
    }
  }
  return fields;
}
module.exports = { clientFields, QUALITY_KINDS, FAQ_IDS, ROUTES, STAGES };
