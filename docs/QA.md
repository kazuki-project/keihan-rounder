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

Post-publication same-station selection testing found that the rejection toast was outside the modal's top layer and therefore not visible to its user. The selection already failed safely. Feedback was moved inside the station dialog and re-tested in the browser: the visible message now says 出発駅と目的駅は別の駅を選んでください. Source syntax and build checks passed. SW cache advanced to v3 for this UI fix.

The final public revisit exposed old JavaScript from browser HTTP cache alongside updated HTML. Public assets themselves already matched the new build. SW v4 now installs with cache reload and uses HTTP revalidation for online static shell requests before falling back to its offline cache. Added three behavior tests using an isolated SW event harness: install/online cache modes, API non-interception, and offline shell fallback (56 total). Existing open tabs may require closing and reopening to activate the waiting SW; no train information is cached at any point.

## Independent routing QA follow-up

Independent review of release 81ca1d8 found three future-provider defects while the production endpoint remained disconnected: a terminal time beyond the service-day boundary was admitted; a sequential older source response could revive a cancelled trip; and an undirected station graph allowed an unsupported same-train reversal between the Nakanoshima and Yodoyabashi branches.

The service-day-boundaries change validates every scheduled and predicted arrival/departure at every stop against one real service date, 00:00 inclusive through next 06:00 exclusive. It preserves valid 23:58→00:15 trips and labels the latter 翌日. Calendar-invalid/multi-date absolute instances are rejected. Existing chronology checks remain. Unsupported direct branch reversal is excluded while an actual transfer at Temmabashi still passes.

The actual app now adopts data through a tested controller and guard. It compares source identity, snapshot serviceDate, observedAt and monotonically increasing version. Stale and contradictory snapshots clear displayed candidates without clearing the guard watermark. New versions, authorized source switches and legitimate new service days recover correctly. Snapshot dates cannot be advanced early to reset a revision. Ordering memory is session-local; durable provider/server ordering remains a prerequisite to connecting a real feed.

Automated result: 74/74 tests pass, including the independent fixed reproduction (now 2026-10-13 12:00 JST; cancelled observed 12:00 followed by scheduled observed 11:58, maxAge 300 seconds). The second response is stale and displays zero candidates. Same-version conflicting content also gives zero; a valid newer revision gives one synthetic candidate.

Browser integration: `node scripts/serve-qa.mjs` serves an isolated harness at 127.0.0.1:4174 with a prominent synthetic-only banner. It serves the real built app, controller and engine, changes only the local endpoint/minimum interval and test clock, and never enters dist or GitHub Pages. In Chrome, exercised cancelled→older response→same-version conflict→newer revision→out-of-window arrival→valid midnight crossing→next service day revision 0. Observed respectively zero/zero/zero/one/zero/one/one cards, correct rejection explanations and 翌日 00:15 in both main and timetable labels. No captured console warnings/errors. These remain synthetic tests, not operational train accuracy evidence.
