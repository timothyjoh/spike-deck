/**
 * SM-2 Spaced Repetition Scheduler
 *
 * Rating → quality mapping:
 *   again → 1  (complete blackout / failed recall)
 *   hard  → 2  (significant difficulty)
 *   good  → 3  (correct with some hesitation)
 *   easy  → 4  (perfect recall, effortless)
 *
 * Interval rules:
 *   - again (lapse): interval resets to 1 day, reps resets to 0, lapses++, ease -= 0.20
 *   - hard:          interval = max(interval * 1.2, 1), ease -= 0.15
 *   - good:          interval = max(interval * ease, 1) on reps >= 2; first two reps: 1d → 6d
 *   - easy:          interval = max(interval * ease * 1.3, 1), ease += 0.15
 *
 * Ease floor is always 1.3.
 * reps counts reviews without a lapse in the current streak; reset to 0 on lapse.
 */

export type Rating = "again" | "hard" | "good" | "easy";

export interface Card {
  id: string;
  front: string;
  back: string;
  /** Ease factor, starts at 2.5, floor 1.3 */
  ease: number;
  /** Days until next review */
  intervalDays: number;
  /** ISO date yyyy-mm-dd for next review */
  dueDate: string;
  /** Number of consecutive successful reviews (reset on lapse) */
  reps: number;
  /** Total number of lapses */
  lapses: number;
}

const EASE_MIN = 1.3;

/**
 * Format a Date as yyyy-mm-dd using UTC accessors.
 * All scheduling math operates in UTC-date space; callers should construct
 * Date objects via `new Date(Date.UTC(y, m-1, d))` or pass midnight-UTC dates.
 */
export function toISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Return a new Date that is `days` calendar days after `base` (UTC) */
export function addDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Returns true if the card is due on or before `today`.
 * Compares ISO date strings lexicographically — valid because format is fixed.
 */
export function isDue(card: Card, today: Date): boolean {
  return card.dueDate <= toISODate(today);
}

/**
 * Pure SM-2 scheduler.
 * Returns a new Card with updated ease, intervalDays, dueDate, reps, lapses.
 * Does NOT mutate the input card.
 *
 * @param card   The card being reviewed (current state)
 * @param rating The user's rating of their recall
 * @param today  The date of the review (injected — no Date.now() inside)
 */
export function schedule(card: Card, rating: Rating, today: Date): Card {
  let { ease, intervalDays, reps, lapses } = card;

  switch (rating) {
    case "again": {
      // Lapse: reset streak, bump lapses, drop ease, reset interval
      lapses += 1;
      reps = 0;
      ease = Math.max(ease - 0.2, EASE_MIN);
      intervalDays = 1;
      break;
    }

    case "hard": {
      ease = Math.max(ease - 0.15, EASE_MIN);
      // Grow interval slowly; at least 1 day
      intervalDays = Math.max(Math.round(intervalDays * 1.2), 1);
      reps += 1;
      break;
    }

    case "good": {
      // First two reps use fixed graduated steps (1d → 6d → ease-driven)
      if (reps === 0) {
        intervalDays = 1;
      } else if (reps === 1) {
        intervalDays = 6;
      } else {
        intervalDays = Math.max(Math.round(intervalDays * ease), 1);
      }
      reps += 1;
      break;
    }

    case "easy": {
      ease = Math.min(ease + 0.15, 5.0);
      if (reps === 0) {
        intervalDays = 4; // first review easy — skip straight to 4 days
      } else {
        intervalDays = Math.max(Math.round(intervalDays * ease * 1.3), 1);
      }
      reps += 1;
      break;
    }
  }

  const dueDate = toISODate(addDays(today, intervalDays));

  return { ...card, ease, intervalDays, dueDate, reps, lapses };
}
