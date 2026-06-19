# Deck — DONE

Spaced-repetition flashcard app (SM-2), Vite + vanilla TypeScript, persists to
localStorage, no backend. All four milestones shipped; every fail-closed gate green.

## What shipped (vs PROJECT.md acceptance criteria)
- **AC1 Deck + card CRUD, persisted** — create/rename/delete decks, add/edit/delete
  cards; every mutation writes localStorage; survives reload. (`src/storage.ts`, `src/ui.ts`)
- **AC2 Review mode** — per-deck Review shows only cards due today, one at a time;
  **Space** reveals the answer; **1–4** rate (Again/Hard/Good/Easy); SM-2 reschedules
  and persists the card; session ends when no cards remain due. (`src/review.ts`, `src/ui.ts`)
- **AC3 SM-2 correct** — pure exported `schedule()` in `src/sm2.ts`; ease starts 2.5,
  floor 1.3; Good/Easy grow interval, Again is a lapse (reset interval, reps→0, ease↓,
  lapses↑); dueDate = today + interval. Covered by unit tests across multiple rounds,
  all four ratings, and a lapse.
- **AC4 Import / export** — export a deck to versioned JSON; import it back (new deck
  id, card state preserved); malformed import shows an error, never crashes. (`src/io.ts`)
- **AC5 Stats** — # cards and # due today for the selected deck. (`src/io.ts` `deckStats`, UI)

## Test counts (verified by the engine, not just reported by workers)
- **Unit** (`npm test`, vitest): **88 passed / 0 failed**.
  - `tests/sm2.test.ts` (18) · `tests/storage.test.ts` (28) · `tests/review.test.ts` (16) · `tests/io.test.ts` (26)
- **E2E** (`npm run e2e`, Playwright/chromium): **5 passed / 0 failed**.
  - `e2e/review.spec.ts` (2): review-rate-Good leaves the queue + reschedule persists across reload; CRUD survives reload.
  - `e2e/io.spec.ts` (3): stats reflect counts; export→import round-trip; bad import errors without crashing.
- **Browser VERIFY** (cyc-tester, real Chromium): **PASS** on the full app — create deck,
  add cards, review with reveal + rate, export/import, bad-import error, reload persistence;
  0 console/page errors. Proof screenshots in `test-artifacts/` (gitignored):
  `02-card-front.png`, `m4-02-two-cards-stats.png`, `m4-03-card-review.png`, etc.

## How to run it
```bash
npm install
npm run dev      # http://localhost:5180
npm test         # unit (vitest), exits 0
npm run e2e      # e2e (Playwright chromium) — auto-starts/stops the dev server
npm run build    # vite build + tsc --noEmit (typecheck)
```
Usage: create a deck → select it → add cards → **Review** → **Space** to reveal →
**1–4** to rate. Stats and Export/Import are in the panel below the deck.

## Layout
- `src/sm2.ts` — pure SM-2 scheduler + date helpers.
- `src/storage.ts` — localStorage-backed Store (injectable backend) + Deck/Card model.
- `src/review.ts` — pure due-queue + ReviewSession.
- `src/io.ts` — export/import (versioned, validated) + deckStats.
- `src/ui.ts` / `src/main.ts` / `src/style.css` — vanilla-TS DOM UI (stable data-testid selectors).
- `tests/**` — vitest unit tests. `e2e/**` — Playwright specs. `vite.config.ts` scopes
  vitest to `tests/` and excludes `e2e/`.

## Blocked / caveats
None. No milestones blocked. Dev server uses port **5180** per the brief.
test-artifacts/, node_modules/, dist/, playwright-report/, test-results/ are gitignored.
