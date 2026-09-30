# Concierge question review — 2026-09-30

## Source

- `Q&A 표준화 (2).xlsx`, `어나더 질문 & 답변 AI학습`, A1:E122.
- All 121 question/answer records match the prior workbook. Reimported with source/version metadata updated; 36 approved answers across 33 intent groups remain unchanged.
- Door-code/password clauses retain the existing server-side disclosure policy.

## Findings and changes

- The recovery gate recognized 카드키/키카드 but omitted 객실키/룸키 and their multilingual equivalents. Shared normalization now runs on current and historical questions. Korean loss questions return the approved key-reissue reply, including the one-reissue limit.
- Added topic evidence hints across workbook subjects and site facilities, covering colloquial names and five languages. Hints select evidence, not a generic answer; original questions remain available to the model.
- Unknown wording no longer forces public search. The model gets full property evidence and approved answers first, with optional search for genuinely external questions. Ambiguous meaning should prompt a short clarification.
- Compound questions bypass simple-topic templates; source-approved exact compound answers still take precedence.
- Added six localized primary buttons: check-in time, method, early check-in / check-out time, luggage storage, shared amenities. Same 3-column layout on small phones.

## Verification

- Existing workbook-example coverage and credential-release tests retained.
- Room-key variants, other-topic synonyms, negative examples (car/house/credit-card loss), six buttons, compound questions and semantic fallback tested.
- Browser: 5 languages × 320/375/390/430px widths; two rows/three columns, no horizontal overflow, all 30 localized button clicks send their labels, no page errors.
- This is evidence/routing improvement, not model fine-tuning. Arbitrary natural-language wording cannot be exhaustively guaranteed; regression tests cover representative variations and ambiguity.
