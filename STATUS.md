# Deck — build status

**Project:** spaced-repetition flashcards (Vite + TS, SM-2, localStorage)
**Port:** 5180
**Engine:** cyc-coordinator (autonomous)

## Milestones
| id | title | state |
|----|-------|-------|
| m1 | Scaffold + SM-2 scheduler with unit tests | todo |
| m2 | Deck/card CRUD persisted to localStorage | todo |
| m3 | Review mode: due cards, Space reveal, 1-4 rate, SM-2 reschedule | todo |
| m4 | Import/export JSON + stats (counts) | todo |

## Current
Starting m1.

## Gates (fail-closed)
- Unit: executed>0, failed==0
- E2E: executed>0, pass
- Browser VERIFY (tester subagent): PASS + screenshot

_Last updated: build start._
