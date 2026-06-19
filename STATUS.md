# Deck — build status

**Project:** spaced-repetition flashcards (Vite + TS, SM-2, localStorage)
**Port:** 5180
**Engine:** cyc-coordinator (autonomous)
**State:** COMPLETE — all 4 milestones shipped, all gates green.

## Milestones
| id | title | state |
|----|-------|-------|
| m1 | Scaffold + SM-2 scheduler with unit tests | done |
| m2 | Deck/card CRUD persisted to localStorage | done |
| m3 | Review mode: due cards, Space reveal, 1-4 rate, SM-2 reschedule | done |
| m4 | Import/export JSON + stats (counts) | done |

## Gates (all passed, fail-closed)
- Unit (`npm test`): 88 passed / 0 failed (exit 0).
- E2E (`npm run e2e`): 5 passed / 0 failed (chromium).
- Browser VERIFY (cyc-tester): PASS on full app — review + import/export + stats + reload persistence, real Chromium, 0 console/page errors, screenshots in test-artifacts/.

## Commits
- m1 f5fa770 — scaffold + SM-2 + 18 unit tests
- m2 a1574c0 — CRUD + localStorage
- m3 79c55b8 — review mode (+ e2e + browser verify)
- m4 (this) — import/export + stats; vitest config fix (exclude e2e/)

See DONE.md for the run guide.

_Last updated: m4 complete._
