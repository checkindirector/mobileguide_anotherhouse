// Original messages are encrypted at rest; only the authenticated report may decrypt them.
const { hkdfSync, randomBytes, createCipheriv, createDecipheriv } = require('node:crypto');
const POLICY = 'internal-original-v1';
function key() {
  const token = process.env.ANALYTICS_REPORT_TOKEN;
  if (!token || Buffer.byteLength(token) < 32) throw new Error('original_key_unavailable');
  return Buffer.from(hkdfSync('sha256', token, 'anotherhouse', POLICY, 32));
}
function withoutServerSecrets(input) {
  let text = String(input || '');
  // Guest-facing entrance codes and guest details are intentionally preserved.
  for (const name of ['OPENAI_API_KEY', 'ANALYTICS_REPORT_TOKEN', 'DATABASE_URL', 'CRON_SECRET', 'VERCEL_TOKEN']) {
    const secret = process.env[name];
    if (secret) text = text.split(secret).join('[SERVER_SECRET_REMOVED]');
  }
  return text;
}
function seal(id, question, answer) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(id));
  const plaintext = JSON.stringify({ question: withoutServerSecrets(question), answer: withoutServerSecrets(answer) });
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
}
function open(id, envelope) {
  if (envelope?.version !== 1) throw new Error('original_version_unavailable');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(envelope.iv, 'base64'));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const result = JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
  if (typeof result.question !== 'string' || typeof result.answer !== 'string') throw new Error('invalid_original');
  return result;
}
function forReport(event, includeOriginals = false) {
  const { encryptedOriginal, ...safe } = event;
  if (event.kind !== 'chat') return safe;
  safe.originalMessagesStatus = encryptedOriginal ? 'available_on_request' : (event.originalCaptureStatus || 'unavailable_legacy');
  if (includeOriginals && encryptedOriginal) {
    try { safe.originalMessages = open(event.id, encryptedOriginal); safe.originalMessagesStatus = 'available'; }
    catch { safe.originalMessagesStatus = 'decryption_failed'; }
  }
  return safe;
}
module.exports = { POLICY, seal, open, forReport };
