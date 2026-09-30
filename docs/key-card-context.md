# Key-card guidance by situation

Operator clarification, 2026-09-30:

- Check-in / early check-in: preserve the workbook's preventive loss warning. Do not introduce the replacement exception into unrelated arrival guidance.
- Actual first loss: kiosk-phone procedure, one replacement only, and explicit warning against losing it again.
- Guest reports replacement received: remind them to keep it safe; a second replacement is unavailable.
- Guest reports losing a received replacement: no additional replacement promise; contact the operations team through booking-platform messages.
- "Lost again" without confirmed replacement history: ask whether the guest already received one. Assistant instructions, failed attempts, hypothetical questions and not-yet-received reports do not count as receipt.

`lib/key-card-context.cjs` reads guest reports from current/recent conversation only. It is not a verified operational issuance ledger or persistent guest tracking. New unrelated questions still follow normal guide routing. Existing credential safeguards remain; repeat-loss support does not issue an entrance code or promise another replacement.

Check-in workbook answers remain unchanged. Recovery answers retain the approved procedure and add the operator-authorized repeat-loss warning. The same policy is passed to the semantic answer model and translated in five languages.

Verification covers first loss, reissued-key loss, separate-turn receipt and re-loss, ambiguous re-loss, negation, failed receipt, hypothetical questions, unrelated follow-ups, five languages and credential protection.
