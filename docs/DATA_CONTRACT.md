# Provider adapter contract (schemaVersion 1)

The production endpoint is disabled. No provider, account, API key, data license, or scraping permission is assumed. Only enable after permission is documented for this exact use, including commercial work, retention and redistribution.

The server normalizes authorized data to the following JSON. Tests contain isolated examples; they are not production data.

- `schemaVersion: 1`, `mode: realtime | timetable`
- `source`: name, HTTPS URL, license description, `redistributionApproved: true` backed by actual documented authorization
- `observedAt`: provider observation/update timestamp, `fetchedAt`: retrieval timestamp, `expiresAt`: absolute provider-supported validity end; all ISO8601 with timezone
- `maxAgeSeconds`: provider-supported maximum age, not a guessed freshness guarantee
- `validFrom`, `validThrough`: inclusive current timetable revision dates in JST
- `trips[]`: id (unique trip instance including service date), type (known class), current destination station ID, status scheduled/cancelled/changed, notice required for changed service
- `ticketPolicy`: standard/reservation-required/unknown. Only standard included; liner always excluded in this release
- `serviceDates[]`: explicitly materialized dates in JST, accounting for weekday/weekend/holiday and temporary overrides. No local weekday guessing. A trip instance has absolute times matching a service day; after-midnight operation supported up to 06:00 following service day. Longer exceptional operation needs schema/review update.
- `stops[]`: actual ordered current stop sequence with stationId, Boolean pickup/dropoff (unknown is rejected), timezone-qualified scheduledArrival and scheduledDeparture. Missing arrival is not substituted with departure.
- realtime stops require `boardingStatus`: scheduled/open/departed/unknown. departed/unknown are excluded for boarding.
- optional stop fields: platform, predictedArrival, predictedDeparture, predictionBasis official/app, predictionExplanation (mandatory for app predictions)
- optional trip fields: delayMinutes (informational only), position (plain text), notice

Canceled trips are removed before routing. Current destination must match the end of the current stop list. Unknown classes, incomplete records, invalid chronology, duplicate IDs, missing source/permission dates invalidate the feed. Empty valid trips means no confirmed candidate; not necessarily no service.

The client makes one request at a time, so older parallel responses cannot roll back newer state. Visibility return triggers absolute-time re-evaluation. The client never derives an ETA by adding delay. Times used in ranking retain scheduled/official/app provenance. Rankings are labeled as based on supplied times, not certainty of actual arrival. Delays without an ETA do not revive a departed scheduled service.

Transfers require at least four minutes and at most 60 minutes waiting, with one transfer supported. These limits do not guarantee a physically possible interchange; obtain station/platform-specific paths before claiming connection assurance. Fee/reservation tickets and unconfirmed boarding are excluded. No boarding/door state is inferred from position.

Provider integration checklist: legal authorization, coverage, rate limits, freshness semantics, holiday/exception expansion, timezone/service-day mapping, trip-specific sequence and pickup/dropoff, cancellation/change chronology, arrival fields, endpoint security, server-held credentials, real-data reconciliation with timestamps, accuracy review, and source UI update.
