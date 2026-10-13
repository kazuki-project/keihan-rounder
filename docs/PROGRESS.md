# Progress and resumption

2026-10-13. Full 17-section specification received. Original room app and existing repositories were not changed.

- Workspace: `C:\Users\owner\Documents\Codex\2026-10-13\task\keihan-rounder`
- Repo: https://github.com/kazuki-project/keihan-rounder
- Implementation branch: `feature/initial-app`; release QA: `feature/release-verification`; final UI fix: `feature/modal-feedback`
- Implementation PR: https://github.com/kazuki-project/keihan-rounder/pull/1 (normal merge completed 2026-10-13 04:16:33 UTC)
- Initial main was created by GitHub's auto_init README; no direct main push or force push.
- Buildless runtime, dependency-free build/test tooling; PWA/UI/preferences/isolated routing implemented.
- Data feed remains disconnected. No unauthorized API, scraping, timetable copying, contract, API-key creation, or inquiry sent.
- Public app: https://kazuki-project.github.io/keihan-rounder/ (deployed and actual browser operation verified)
- Initial release commit: c848ff2b05a9f9ee1e79d869cca9a53c5640a089; initial deployment succeeded 2026-10-13 04:17:22 UTC.
- Local build and tests pass. Browser QA recorded in QA.md. Runtime and source remain a preparation version, NOT a working timetable/live-train decision app.

GitHub CLI authentication works under approved network execution. The sandbox-only `gh auth status` misleadingly reported invalid; direct API proved the issue was blocked networking, not expired credentials. For authorized network Git operations use per-command `safe.directory` for this exact newly-created path and `credential.helper=!gh auth git-credential`; do not alter global Git trust.

A private Sites project was registered while exploring publishing, ID `appgprj_6acdac489ee08191b5df714176f90b56`. It is NOT deployed, has no uploaded source, and is not the intended delivery URL. Its short-lived credential was never saved/output. GitHub Pages was chosen to preserve feature→PR→merge workflow. `.openai/hosting.json` preserves that unused registration to avoid accidental duplicate creation; do not treat its expected URL as live.

Follow-up feature/release-verification (PR #2) records public QA and hardens malformed records; it was normally merged after CI success. The final feature/modal-feedback fix puts the same-station rejection explanation inside its modal and bumps SW to v3. After its normal merge and deployment, run `node scripts/check-deployment.mjs`; evidence/deployment.json records the exact timestamp and asset hashes locally. The final PR body/final task response records this post-deployment outcome without repeatedly redeploying evidence-only documentation.

After those release checks, independent implementation work is complete for this preparation release. Remaining blocker: an authorized data source/contract. Resume by confirming permitted operational data or timetable scope, retention, redistribution, commercial-use conditions, keys and limits. No autonomous background development is scheduled; do not imply continued execution while awaiting this external dependency. Actual iPhone verification also remains open.

Independent QA subsequently requested another fix: `feature/service-day-boundaries`, based on release 81ca1d8. It addresses all-stop service-window validation, explicit day-crossing display, sequential feed rollback/same-version conflicts, and unsupported same-train branch reversal. 74 tests pass and the real app adoption path was exercised in a local synthetic browser harness. See QA.md. Production remains disconnected; no contract or provider API key was created. Final release outcome is recorded on the corresponding PR after normal merge/deployment and 16-asset verification.

Resumption: inspect git status and PR state, run build/test, start dev server only for browser QA, and read DATA_CONTRACT and RESEARCH before any provider integration. Never reuse fixtures as actual data. No secrets are needed for the current PWA.
