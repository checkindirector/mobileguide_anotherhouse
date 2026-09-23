# Short guest question review — 2026-09-23

Scope: prioritize luggage storage and check-in, using the operations workbook already imported in `api/concierge-training.json` and the generated website knowledge as factual sources. The workbook's `어나더 통계` C3:D4 reports 42 luggage inquiries (34.7%) and 19 check-in inquiries (15.7%) out of 121.

## Behavior

- Normalize spacing, punctuation and common check-in/luggage misspellings across the five supported languages. A bare bag/luggage word defaults to property storage; a bare check-in word returns time and arrival guidance.
- Preserve exact staff training examples. Remove partial-sentence matching against historical examples, which could select an unrelated intent.
- Answer basic storage and check-in-time questions directly from current guide data. Keep follow-up context for location, cost and time questions.
- Send conditions, problems and compound questions to the model with the current property facts. In particular, do not turn lost luggage, missing arrival instructions, locker-size questions or overnight storage into an unconditional storage confirmation.
- Public station/airport storage and airline check-in are separate from property guidance. Mixed storage/travel questions retain property facts and public search.
- Access recovery remains the existing server-controlled flow; no credentials are added to training data or prompts.

## Verification

`npm test`: 125 tests cover the existing staff example corpus, new unseen short/typo/paraphrase cases in five languages, conversation continuations, negative cases, mixed travel requests and overnight arrival date ambiguity. Model-path tests verify routing, source context and preserved questions with mocked responses; deployment smoke tests additionally inspect actual model answers.

`npm run build`: passed. No website facts, model selection, billing settings or shared master prompts were changed.

Production smoke review: five-language short questions returned property facts and guide links without web search (approximately 0.5 seconds in this sample). Actual model responses handled 14:00 arrival and luggage-plus-parcel questions in approximately 3–4 seconds. Review identified two wording issues, corrected in instructions: a relative storage date must be conditional on the booking date, and a lost-item reply must not append routine storage availability.

A further overnight-arrival probe identified that 1am was treated as automatically early. The final instruction explicitly gives overnight arrival priority over the early-check-in rule and requires both date-dependent possibilities when the booking date is unknown.
