# Airport transport correction — 2026-10-05

Scope: Another House airport arrival/departure guidance only. This is the operator-approved correction after the latest workbook, not a replacement of other workbook policies.

## Official operator evidence

- 6702: https://www.klimousine.com/bus/limousine.php?bus_no=6702
  - Stop detail: 01901, JW Marriott Dongdaemun entrance roadside, both directions. Coordinates 37.57072708611123, 127.00918872386161.
  - Official stop-detail timetable rechecked: 25 airport-bound departures, 04:07–19:52.
- 6002 airport-bound: https://www.airportlimousine.co.kr/sub/sub01.php?cat_no=5
  - Detail index 47: Heunginjimun, median bus lane near Dongdaemun Exit 3, 01037, 37.5723169394005,127.0134027475270. First 04:15, last 20:39.
- 6002 city-bound: https://www.airportlimousine.co.kr/sub/sub01.php?cat_no=6
  - Detail index 85: Heunginjimun, 01023, 37.5723191896375,127.0134225577350.
  - Jongno 6-ga 01771 is a different stop, not the property-front median stop. Do not conflate it with 6702/01901.
- N6701: https://www.klimousine.com/bus/limousine.php?bus_no=N6701
  - Official stop-detail POST rechecked: DDP Art Hall A3, 02711, 37.56778308434606,127.00917421320439.
  - DDP → airport: 23:00,01:05,01:55,02:55.
  - T2 → city: 23:30,00:20,01:20,03:25,04:20. T1: 23:50,00:40,01:40,03:45,04:40.
  - T1 stop detail specifies 1F 3B; T2 B1 18/19.
- N6002 airport-bound: https://www.airportlimousine.co.kr/sub/sub01.php?cat_no=80
  - Detail index 3914: Heunginjimun 01037, near exits 3–4; cash or transit card. 22:35,23:25,01:55,02:25,02:55,03:35.
- N6002 city-bound: https://www.airportlimousine.co.kr/sub/sub01.php?cat_no=82
  - Index 3923: T2 B1 30, 23:40,00:10,00:40,01:20,03:40,04:20.
  - Index 3924: T1 1F 6A, 00:00,00:30,01:00,01:40,04:00,04:40.
  - Index 3928: Heunginjimun alighting on request. Coordinates match the 6002 inbound Heunginjimun stop, but operator detail labels its number 01773. Number remains unresolved; the guide deliberately omits an N6002 inbound stop number and uses the official location coordinates. No external unofficial stop-number guess has been adopted.

## Distance and maps

Haversine distance between official 01901 and 01037 coordinates: 411.32 m, rounded to 411 m. This is **straight-line distance between stops**, not measured property-to-stop walking distance, nor its difference. Do not infer journey speed from stop proximity.

Naver links search confirmed stop numbers; Google Maps links use official stop coordinates, not a generic hotel-name query. N6002 inbound Naver uses the stop name because its service-specific number is unresolved. All schedules are local 24-hour time and may change. Do not infer N6002 airport arrival times from its departures.

Shared source: assets/airport-bus-data.js → homepage renderers and generated assets/guide-knowledge.json → server responses. Approved workbook records Q020/Q070 remain archived but do not override this newer transport correction.
