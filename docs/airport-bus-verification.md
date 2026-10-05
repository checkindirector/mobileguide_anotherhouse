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
  - Index 3928: Heunginjimun alighting on request. Operator detail labels its number 01773, inconsistent with the current Seoul stop/map registration. Naver's selected Seoul stop 01023 (station 105523) explicitly lists city-bound N6002 towards Cheongnyangni. The guide uses that confirmed current stop and tells guests to request Heunginjimun alighting, not the inconsistent operator number.

## Distance and maps

Earlier operator-map coordinates gave a 411 m straight-line estimate. It is withdrawn: operator 6002 map coordinates differ from Seoul's current official stop dataset and must not determine proximity or Google pins.

Current coordinate source: Seoul official bus stop locations, 2026-09-02, https://data.seoul.go.kr/dataList/OA-15067/A/1/datasetView.do. Download file sequence 58, Data columns A:F, latitude=Y and longitude=X:

| Stop | Data row | Latitude | Longitude | Naver station |
| --- | --- | --- | --- | --- |
| 01023 (6002/N6002 city-bound) | 32 | 37.572447536 | 127.013815948 | 105523 |
| 01037 (6002/N6002 airport-bound) | 33 | 37.5721524474 | 127.0124191046 | 80606 |
| 01901 (6702 both directions) | 383 | 37.5706369793 | 127.0092820998 | 55012217 |
| 02711 (N6701 DDP) | 608 | 37.5678529085 | 127.009213839 | 55012226 |

Naver recommended walking routes checked on 2026-10-05 to/from the public building address **서울 종로구 종로 294** (address ID 09110174), not the fifth-floor reception/elevator:

- Property → 6002 stop 01037: 182 m / 2 min. Property → 6702 stop 01901: 285 m / 5 min. **6002 is 103 m closer for boarding.**
- 6002 alighting stop 01023 → property: 331 m / 5 min. 6702 stop 01901 → property: 285 m / 5 min. **6702 is 46 m closer for alighting.**
- Signal waits and luggage affect actual time; do not infer airport journey speed from stop proximity.

Walking evidence (route coordinates are Naver's observed URL values, not Google GPS coordinates):

- https://map.naver.com/p/directions/3zj2i4,2AMfoD,서울%20종로구%20종로%20294,09110174,ADDRESS_POI/3zj6Qe,2AMhDa,동대문역.흥인지문,80606,BUS_STATION/-/walk
- https://map.naver.com/p/directions/3zj2i4,2AMfoD,서울%20종로구%20종로%20294,09110174,ADDRESS_POI/3ziXZG,2AMe46,동대문역JW메리어트동대문호텔,55012217,BUS_STATION/-/walk
- https://map.naver.com/p/directions/3zjas6,2AMiyC,동대문역.흥인지문,105523,BUS_STATION/3zj2i4,2AMfoD,서울%20종로구%20종로%20294,09110174,ADDRESS_POI/-/walk

Naver links use exact selected station URLs `/p/search/{ARS}/bus-station/{NaverID}`. Searching only a five-digit number is ambiguous nationwide (01037/01023 also match Suwon). All four selected station IDs and their airport routes were checked visibly. Google Maps pins use Seoul's current official coordinates. All schedules are local 24-hour time and may change. Do not infer N6002 airport arrival times from its departures.

Shared source: assets/airport-bus-data.js → homepage renderers and generated assets/guide-knowledge.json → server responses. Approved workbook records Q020/Q070 remain archived but do not override this newer transport correction.
