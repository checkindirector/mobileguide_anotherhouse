function contextualAnswerTone(answer, message) {
  const question = String(message || "");
  const asksAttribute = /어디|언제|몇\s*시|얼마|방법|용량|where|when|what\s*time|how\s*(?:much|many)|どこ|いつ|何時|哪里|哪裡|几点|幾點|多少/i.test(question);
  const asksYesNo = /있(?:나|어|니|는지)|없(?:나|어|니)|가능|되(?:나|나요|니)|돼|할\s*수|됩니까|입니까|인가요|\b(?:can|could|may|do|does|is|are)\b|ありますか|できますか|可能|ですか|ますか|可以|能否|有没有|有沒有|吗|嗎/i.test(question);
  if (asksYesNo && !asksAttribute) return answer;
  // Remove only a standalone acknowledgement, never the factual conclusion.
  return String(answer || "").replace(/^(?:네|아니요|아니오)[,.，。]\s*|^(?:yes|no)[,.]\s*|^(?:はい|いいえ)[、，,.]\s*|^(?:可以|不可以|有|没有|沒有)[，,]\s*/iu, "");
}

module.exports = { contextualAnswerTone };
