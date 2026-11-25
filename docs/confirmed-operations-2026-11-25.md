# Operator confirmation — 2026-11-25

The operator supplied these policies directly in the ongoing request:

1. Check-in instructions use the booking site's messages (Booking.com, Trip.com,
   Agoda or Airbnb). The identical instructions are sent at reservation
   confirmation, 7 days, 3 days, 1 day before arrival, and on arrival day. For a
   same-day booking, the instructions are sent at reservation confirmation. No
   exact clock time was specified; the old 09:00 delivery deadline is removed.
2. Guests may eat food, snacks and drinks in their room, mainly light meals and
   refreshments. Eating only in the lounge is not required.
3. Food delivery is allowed. The guest collects it in person outside the 1F
   entrance and may bring it to the room. This does not permit staff parcel
   acceptance or change the separate parcel policy.

`assets/operations-policies.js` is the shared five-language source for the
website, generated model evidence and fixed operational answers. The exact
clock-time field remains null; no dispatch automation or booking system was
modified. Complex questions about fees, delivery times, staff acceptance,
resending messages or other facilities retain semantic handling.

The native operations spreadsheet is updated narrowly: summary item 21,
new items 44–45, and AI training answers Q054 and Q097. The source's existing
item 43 and all other guest examples remain intact. The local approved-answer
archive keeps its original row associations and records the operator correction.

Validation: 298 tests and production build pass. Five-language regressions cover
message schedules and channels, same-day bookings, absent exact clock times,
food/snacks/drinks in rooms, delivery pickup outside 1F, compound requests,
parcel-vs-food distinctions and message resend requests. Live release checks
are stored in private reports after deployment.

The check-in renderer also displays additional operational sections as visible
cards. A rendered-DOM regression checks that the complete five-event message
schedule appears once, outside a collapsed section, in all five languages.
