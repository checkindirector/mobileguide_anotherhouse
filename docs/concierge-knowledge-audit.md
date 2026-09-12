# Concierge knowledge audit

Version: 2026-09-12.3

| Area | Current page source | Previous chatbot state | Unified result |
|---|---|---|---|
| Address, check-in/out, transport, parking, luggage, rules | Current rendered page data | Sent ad hoc from the browser | Generated into one server-owned knowledge bundle |
| Five-language quick guide | The same current page data in Korean, English, Japanese, Simplified Chinese and Traditional Chinese | Browser fallback omitted several property topics and the server could misclassify them as public search | Eleven common property topics are generated once and shared by the server and browser fallback |
| Appliances, laundry, waste | Current page instructions; official manuals are secondary | Sent ad hoc from the browser | Current page text is primary; manual links remain supporting sources |
| Nearby essentials | Naver Maps plus official venue/public sources | Depended on live search even for common needs | Seven property-specific places are pre-verified with exact addresses and map links |
| Restaurants and tours | 26 restaurant cards and 21 tour cards | Loaded only for matching browser keywords | Included as clearly labeled host recommendations |
| Wi-Fi | Network and password are visible on the Wi-Fi screen | Password could be sent to the model | Network retained; password deliberately excluded as sensitive |
| Door/access and reservation data | Page tells guests where to retrieve guest-specific information | Could be mixed into browser context | Codes, room assignment, booking status and guest-specific details are prohibited |
| Airport departures | Official K Airport Limousine, Incheon Airport and Seoul Metro timetables | Depended on live search and often missed embedded timetable rows | Every 6702/N6701 departure and every relevant Line 5 train to Gimpo Airport are pre-verified and selected deterministically |
| General public information | Not part of the property manual | Previously rejected | Official-source web search is permitted only for non-property public questions |
| Emergency | Booking-platform contact plus Korean public emergency services | No dedicated normalized section | 112/119 and official agency sources added; property-specific issues still use the booking platform |

The generator executes the same ordered data scripts as the website. Tests regenerate the bundle and fail if it is stale or contains the known Wi-Fi password.
