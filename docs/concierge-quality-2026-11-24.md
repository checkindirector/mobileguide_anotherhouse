# 2026-11-24 concierge quality changes

Based on the 2026-11-23 weekly review and the operations sheet re-read on
2026-11-24. Guest originals and access credentials are not included here.

- Missing entry messages and continuing reservation/no-reply questions now get
  verified common-entrance and kiosk steps in all five languages. The entrance
  credential comes only from the server environment. It is explicitly distinct
  from a room-door credential; no later key reissue is promised.
- Check-in method replies use reviewed Korean, English, Japanese, Simplified
  Chinese and Traditional Chinese text. Plain check-out time starts with 11:00,
  without an unrelated check-in preface. Plain check-in time does not promise an
  unconfirmed message-delivery deadline.
- Short hair-tool usage-time questions use the immediately preceding guest
  question. They do not trigger public search or irrelevant map suggestions.
  An unconfirmed usage restriction remains unconfirmed.
- The chat does not claim to look up a reservation, resend a message, forward a
  request to staff, or arrange a later reply. Contact instructions distinguish
  the AI from the operations team and state the approved 09:00–18:00 hours.
- Earlier unresolved examples are covered too: a key left in the power slot
  before closing the door; Wi-Fi missing from the network list; phone contact
  after a key problem; ambiguous key-problem and mail fragments.
- Existing approved key-recovery wording and later operator policy corrections
  are preserved. Compounds, different facilities, positive receipt statements,
  unrelated outside venues and topic changes are tested as negative controls.

The 279-test suite and production build pass. The added suite exercises all five
languages through the actual handler with provider calls forbidden for fixed
operational answers, plus semantic-routing negative controls. Production smoke
checks are recorded privately after release.

## Still requiring an operations decision

The sheet does not establish a guaranteed arrival-message delivery time or the
full permission policy for eating in rooms / receiving food deliveries. Chat
replies omit that guarantee and distinguish confirmed lounge dining guidance
from unconfirmed permissions. This release does not invent or edit those
operational policies.
