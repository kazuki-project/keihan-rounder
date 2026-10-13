# Progress and resumption

2026-10-13. Full 17-section specification received. Original room app and existing repositories were not changed.

- Workspace: `C:\Users\owner\Documents\Codex\2026-10-13\task\keihan-rounder`
- Repo: https://github.com/kazuki-project/keihan-rounder
- Working branch: `feature/initial-app`
- Draft PR: https://github.com/kazuki-project/keihan-rounder/pull/1
- Initial main was created by GitHub's auto_init README; no direct main push or force push.
- Buildless runtime, dependency-free build/test tooling; PWA/UI/preferences/isolated routing implemented.
- Data feed remains disconnected. No unauthorized API, scraping, timetable copying, contract, API-key creation, or inquiry sent.
- Local build and tests pass. Browser QA recorded in QA.md. Production deployment is pending at this checkpoint.

GitHub CLI authentication works under approved network execution. The sandbox-only `gh auth status` misleadingly reported invalid; direct API proved the issue was blocked networking, not expired credentials. For authorized network Git operations use per-command `safe.directory` for this exact newly-created path and `credential.helper=!gh auth git-credential`; do not alter global Git trust.

A private Sites project was registered while exploring publishing, ID `appgprj_6acdac489ee08191b5df714176f90b56`. It is NOT deployed, has no uploaded source, and is not the intended delivery URL. Its short-lived credential was never saved/output. GitHub Pages was chosen to preserve feature→PR→merge workflow. `.openai/hosting.json` preserves that unused registration to avoid accidental duplicate creation; do not treat its expected URL as live.

Next steps at this checkpoint: push follow-up QA fixes to the same feature branch, wait for PR CI, mark ready and merge normally, verify Pages workflow and actual URL, test primary actions from that URL, record the result through a follow-up PR. If all independent work completes, the remaining blocker is a permitted provider/contract; report that work is then stopped rather than suggesting autonomous background activity continues.

Resumption: inspect git status and PR state, run build/test, start dev server only for browser QA, and read DATA_CONTRACT and RESEARCH before any provider integration. Never reuse fixtures as actual data. No secrets are needed for the current PWA.
