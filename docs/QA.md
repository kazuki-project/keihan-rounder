# Verification record

Date: 2026-10-13. Host: DESKTOP-9CFUBB3. Node.js 24.14.1. All runtime timestamps are recorded separately from any train data (there is no real train dataset).

## Automated

Run `npm run build && npm test`. Raw TAP: [evidence/unit-tests.tap](../evidence/unit-tests.tap). Synthetic fixtures remain in tests; not deployed.

The suite covers: pickup/dropoff/pass-through/direction/short turns/unknown stations; branch direct mismatch and transfer at Temmabashi; through-service across Sanjo; liner/ticket restrictions; same class with different stops; departure observed or unknown; exact transfer boundary and one-second shortage; cancelled connections; later departure earlier arrival; delay is not ETA; provenance and inconsistent predictions; invalid current destination/chronology/topology; source age vs HTTP freshness; expiry; effective dates and explicit service dates; overnight service; JST despite overseas timezone; saving/reloading/reordering/deleting settings; corruption/quota failure; offline/network/HTTP adapter failure; no unconfigured requests; manifest/icons; static-only cache allowlist; no shipped test fixtures; shared station line membership.

No synthetic result is evidence that actual Keihan trains are correctly predicted. Source calendar mapping, actual train coverage, provider freshness contract, reservation conditions, arrival accuracy and operator reconciliation are not verified.

## Browser actions completed locally

Chrome through supported CUA browser interface, http://127.0.0.1:4173/:

- Initial screen: exact unconnected status, last train update = not acquired; no fictional trains/times.
- Swap Hirakatashi/Kuzuha, direction changes with the selected route.
- Search Nakanoshima and Ryukokudai-mae-fukakusa; current and destination selectors work.
- Add Nakanoshima→Hirakatashi favorite, move upward, reload: order and selected section restored.
- Delete that test favorite; return to default section using one favorite tap.
- Station favorite add Watanabebashi; favorite-only station filtering shows it.
- Line filtering showed branch stations. Review detected missing shared junctions in filters; fixed and regression-tested.
- Dark mode and five-minute buffer via settings.
- Requested mobile viewport overrides 390×844 and 320×740. The browser reported effective innerWidth 355 on narrow case, scrollWidth 341 (no horizontal overflow). Do not equate this with exact iPhone emulation.
- Browser console inspected: no captured errors/warnings during tested interactions.

## Remaining verification

Real iPhone Safari, home-screen installation, iOS storage retention and true offline lifecycle were not exercised. PWA/Service Worker configuration and cache isolation have automated checks; do not claim a full offline device test. Live source comparison cannot run because no source is connected.

## Public release verification

Initial deployment completed 2026-10-13 04:17:22 UTC via https://github.com/kazuki-project/keihan-rounder/actions/runs/38345658273 . Public URL https://kazuki-project.github.io/keihan-rounder/ was then opened in Chrome and visibly rendered the actual application over HTTPS.

From the public URL, selected Kyobashi→Yodoyabashi, reversed it, saved Yodoyabashi→Kyobashi, reloaded, confirmed restored section and favorite, removed that test favorite, and selected Hirakatashi→Kuzuha. The normal screen showed no trains and data update “未取得”. At mobile width 390, document scrollWidth=375 (no horizontal overflow). No captured console errors/warnings. Screenshot: [evidence/public-mobile.jpg](../evidence/public-mobile.jpg).

The release follow-up adds malformed nested-record fail-closed coverage (53 tests total) and SW cache version 2. `node scripts/check-deployment.mjs` verifies 14 public assets against local build SHA256 and writes evidence/deployment.json; a successful run after follow-up deployment is the final asset verification. The release log is updated independently to avoid treating an expected URL as proof of publication.

The added malformed-record test initially failed in its fixture builder before reaching the engine. The fixture was corrected to inject null stops after creating a valid trip; the full 53-test suite then passed. This was not a production observation.
