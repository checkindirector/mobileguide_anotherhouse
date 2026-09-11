# Concierge knowledge audit

Version: 2026-09-11.1

| Area | Current page source | Previous chatbot state | Unified result |
|---|---|---|---|
| Address, check-in/out, transport, parking, luggage, rules | Current rendered page data | Sent ad hoc from the browser | Generated into one server-owned knowledge bundle |
| Appliances, laundry, waste | Current page instructions; official manuals are secondary | Sent ad hoc from the browser | Current page text is primary; manual links remain supporting sources |
| Restaurants and tours | 26 restaurant cards and 21 tour cards | Loaded only for matching browser keywords | Included as clearly labeled host recommendations |
| Wi-Fi | Network and password are visible on the Wi-Fi screen | Password could be sent to the model | Network retained; password deliberately excluded as sensitive |
| Door/access and reservation data | Page tells guests where to retrieve guest-specific information | Could be mixed into browser context | Codes, room assignment, booking status and guest-specific details are prohibited |
| General public information | Not part of the property manual | Previously rejected | Official-source web search is permitted only for non-property public questions |
| Emergency | Booking-platform contact plus Korean public emergency services | No dedicated normalized section | 112/119 and official agency sources added; property-specific issues still use the booking platform |

The generator executes the same ordered data scripts as the website. Tests regenerate the bundle and fail if it is stale or contains the known Wi-Fi password.
