# Deck — spaced-repetition flashcards

A keyboard-driven flashcard app implementing the **SM-2** spaced-repetition
algorithm. Single-page app, no backend, persists to **localStorage**.

## Stack (required)
- Vite + TypeScript. Vanilla TS or lit — NO heavy framework.
- Persistence: `localStorage` only.
- Unit tests: **vitest**. E2E: **Playwright** (Chromium).
- Dev server MUST run on **port 5180** (`vite --port 5180`), so it won't collide
  with the other spikes.

## Core domain
A card: `{ id, front, back, ease, intervalDays, dueDate, reps, lapses }`.
SM-2 scheduling on review rating (Again / Hard / Good / Easy):
- ease starts 2.5, adjusts per rating, floor 1.3.
- interval grows interval*ease on Good/Easy; resets on Again (lapse).
- dueDate = today + intervalDays.

## Acceptance criteria
1. **Deck + card CRUD** — create/rename/delete decks; add/edit/delete cards;
   everything persists to localStorage and survives reload.
2. **Review mode** — shows only cards due today, one at a time; press **Space** to
   reveal answer; press **1–4** to rate (Again/Hard/Good/Easy); SM-2 reschedules the
   card; session ends when no cards remain due.
3. **SM-2 correct** — implemented as a pure, exported function and covered by unit
   tests across multiple review rounds, all four ratings, and a lapse.
4. **Import / export** — export a deck to JSON, import it back.
5. **Stats** — show # cards, # due today.

## Required tests
- **Unit** (`npm test`): SM-2 scheduler — interval/ease progression over several
  rounds, each rating, a lapse resetting interval. `executed > 0`, all pass.
- **E2E** (`npm run e2e`): create a deck + a card → enter review → reveal → rate
  Good → card leaves the due queue → reload page → data persisted.

## npm scripts expected
`dev` (port 5180), `build`, `test` (vitest run), `e2e` (playwright test).

## Definition of done
The app builds, unit + e2e pass with `executed > 0`, and the **tester subagent**
drives real Chrome through the review flow and returns PASS with a screenshot of a
card being reviewed. Passing unit tests alone is NOT done.
