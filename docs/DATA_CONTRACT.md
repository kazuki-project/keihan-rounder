# Provider adapter contract (schemaVersion 1)

The production endpoint is disabled. No provider, account, API key, data license, or scraping permission is assumed. Only enable after permission is documented for this exact use, including commercial work, retention and redistribution.

The server normalizes authorized data to the following JSON. Tests contain isolated examples; they are not production data.

- `schemaVersion: 1`, `mode: realtime | timetable`
- `source`: stable provider `id`, name, HTTPS URL, license description, `redistributionApproved: true` backed by actual documented authorization. An adapter must not mint a fresh identity to bypass ordering checks.
- `serviceDate`: snapshot revision scope date in JST; `version`: nonnegative safe integer, monotonically increasing within source.id + serviceDate. This is a source version, not a client fetch counter. The source observation must lie within this snapshot date's 00:00 to following 06:00 window (end exclusive). A provider without trustworthy revisions needs a reviewed server normalization/versioning contract before connection.
- `observedAt`: provider observation/update timestamp, `fetchedAt`: retrieval timestamp, `expiresAt`: absolute provider-supported validity end; all ISO8601 with timezone
- `maxAgeSeconds`: provider-supported maximum age, not a guessed freshness guarantee
- `validFrom`, `validThrough`: inclusive current timetable revision dates in JST
- `trips[]`: id (unique trip instance including service date), type (known class), current destination station ID, status scheduled/cancelled/changed, notice required for changed service
- `ticketPolicy`: standard/reservation-required/unknown. Only standard included; liner always excluded in this release
- `serviceDates[]`: exactly one materialized real calendar date per absolute trip instance, accounting for weekday/weekend/holiday and temporary overrides. No local weekday guessing. All scheduled and predicted arrival/departure events at every stop must be within service-date 00:00 inclusive to the following 06:00 exclusive. Multiple service dates require separate instances, not multiple windows for the same absolute times. Longer exceptional operation is unsupported and needs a reviewed contract update.
- `stops[]`: actual ordered current stop sequence with stationId, Boolean pickup/dropoff (unknown is rejected), timezone-qualified scheduledArrival and scheduledDeparture. Missing arrival is not substituted with departure.
- realtime stops require `boardingStatus`: scheduled/open/departed/unknown. departed/unknown are excluded for boarding.
- optional stop fields: platform, predictedArrival, predictedDeparture, predictionBasis official/app, predictionExplanation (mandatory for app predictions)
- optional trip fields: delayMinutes (informational only), position (plain text), notice

Canceled trips are removed before routing. Current destination must match the end of the current stop list. Unknown classes, incomplete records, invalid chronology, duplicate IDs, missing source/permission dates invalidate the feed. Empty valid trips means no confirmed candidate; not necessarily no service.

The actual app adopts responses through createFeedController/createFeedGuard. Within a running app instance, it remembers source observation high-watermarks and revision/content fingerprints per source/day. Older observations, lower versions and contradictory same-version content are rejected with stale state and no candidates; HTTP fetchedAt/expiry renewal alone is not a new source revision. Network errors/rejected feeds do not reset the high-watermark. Authorized source switching and genuinely later service days with reset revision numbers remain possible. This client memory is not persisted through a full page reload; any real provider integration must also enforce durable ordering at the server boundary. Do not claim that single-flight request control alone prevents rollback.

Visibility return triggers absolute-time re-evaluation. The client never derives an ETA by adding delay. Times used in ranking retain scheduled/official/app provenance. Rankings are labeled as based on supplied times, not certainty of actual arrival. Delays without an ETA do not revive a departed scheduled service. Train times include 翌日/前日 or a full date when they differ from the current JST calendar day.

The undirected station graph alone does not prove train operating direction. A same-train sequence spanning both the Nakanoshima branch (KH51+) and the Yodoyabashi branch (KH01/KH02) is rejected in this release, because it would require an unsupported reversal at Temmabashi. A transfer there is still supported. No class-wide synthetic stopping pattern is substituted for actual trip data.

Transfers require at least four minutes and at most 60 minutes waiting, with one transfer supported. These limits do not guarantee a physically possible interchange; obtain station/platform-specific paths before claiming connection assurance. Fee/reservation tickets and unconfirmed boarding are excluded. No boarding/door state is inferred from position.

Provider integration checklist: legal authorization, coverage, rate limits, freshness semantics, holiday/exception expansion, timezone/service-day mapping, trip-specific sequence and pickup/dropoff, cancellation/change chronology, arrival fields, endpoint security, server-held credentials, real-data reconciliation with timestamps, accuracy review, and source UI update.
