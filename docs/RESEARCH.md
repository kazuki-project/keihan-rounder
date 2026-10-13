# Data research — 2026-10-13

Source findings supplied by the parent research task, based on official pages. No data acquisition agreement exists. No internal endpoint was called. This record distinguishes accessible information from permission to reproduce it.

1. Keihan official timetable change: weekends/holidays 2026-08-22, weekdays 2026-08-24. Official notice: https://www.keihan.co.jp/traffic/news/2026/detail/2026-08henkou.html and release https://www.keihan.co.jp/corporate/info/release/assets/260626_keihan-railway2.pdf . All-train PDF https://www.keihan.co.jp/traffic/time-fare/pdf/time01-1.pdf was identified, but not ingested or republished.
2. Keihan site terms https://www.keihan.co.jp/terms.html restrict reuse outside permitted private use and commercial preparation without consent. The app links to the official top page only and does not frame it. Operational notices likewise are not permission for redistribution. No 30-minute advisory does not mean zero delay.
3. No verified unauthenticated and redistribution-permitted dataset for all three requested lines was found in research of ODPT. This is not a claim that none exists.
4. NAVITIME transport_diagram-segment and transport_stops have contractual/paid timetable requirements: https://api-sdk.navitime.co.jp/api/specs/api_guide/transport_diagram-segment.html . No contract/key created.
5. Ekispert train timetable requires appropriate Standard terms: https://docs.ekispert.com/v1/api/station/timetable/train.html ; https://docs.ekispert.com/v1/WebService_TOS.pdf includes restrictions on storage/reuse of times. No contract/key created.
6. Liner has reservation and pickup-only conditions. https://www.keihan.co.jp/traffic/liner/ . Engine excludes liner until these are explicitly supported.

Consequences: no live data, no copied timetable fallback, no actual ETA. The preparation PWA is useful for selecting/saving sections and opening official information, but does not meet the final train-decision goal. Completion requires an authorized source with actual stop sequences, arrivals, departures, delays and validity semantics, followed by provider-specific implementation and real-data tests.
