# Approved workbook answers — 2026-09-23

Source: `Q&A 표준화 (1).xlsx`, `어나더 질문 & 답변 AI학습`, A1:E122.

The earlier importer retained question examples and routing labels but discarded the operator's answer text. That caused clear questions such as `얼리체크인` to return separately authored templates rather than the approved wording.

The importer now retains 36 approved responses covering all 121 source rows, with source row numbers and question IDs. For Korean exact examples and unambiguous topics, the server returns the approved wording directly. For paraphrases requiring model interpretation, the model can select an approved response ID and the server returns the stored text. Unsupported details, conditional dates and compound questions that are not fully covered still require an answer grounded in the available facts.

The user's existing credential-release condition remains in force. Credential clauses are replaced with the existing booking-message guidance; the remaining source wording is retained. No raw access or Wi-Fi credentials or hashes of credential-bearing answers are added to public data. Early-check-in translations and the offline Korean quick answer also reflect the operator response.

Yes/no is not a mandatory opening. Bare topics start with the subject or policy, actual yes/no questions may use a natural yes/no, and location/time questions start with the requested detail. Approved text is not given an additional prefix.

Validation: 128 tests and production build passed. Tests cover source reply equality, semantic response-ID selection, source-row coverage, credential protection, appropriate yes/no retention and removal, and the existing access-recovery flow. Hash checks confirm unchanged source wording for every response without a credential replacement.
