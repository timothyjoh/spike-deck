/**
 * Pure review-session logic — no DOM, no side effects.
 *
 * dueCards(deck, today)  — filters to cards due on/before today (uses isDue).
 * ReviewSession          — walks the due queue one card at a time; reveal/rate
 *                          are pure state machines; rate() returns the updated
 *                          Card + its deckId so the caller can persist.
 */

import { isDue, schedule, type Card, type Rating } from "./sm2.js";
import { type Deck } from "./storage.js";

/** Cards from the deck that are due on or before `today`. */
export function dueCards(deck: Deck, today: Date): Card[] {
  return deck.cards.filter((c) => isDue(c, today));
}

export interface RateResult {
  updatedCard: Card;
  deckId: string;
}

export class ReviewSession {
  private queue: Card[];
  private deckId: string;
  private today: Date;
  private _revealed = false;
  private _done = 0;

  constructor(deck: Deck, today: Date) {
    this.deckId = deck.id;
    this.today = today;
    // Snapshot due cards at session start; each rated card leaves this session.
    this.queue = dueCards(deck, today);
  }

  /** The current card, or undefined when queue is exhausted. */
  current(): Card | undefined {
    return this.queue[0];
  }

  /** True when the current card's back side has been revealed. */
  isRevealed(): boolean {
    return this._revealed;
  }

  /** Reveal the current card's back side. No-op if already revealed or done. */
  reveal(): void {
    if (this.queue.length > 0) {
      this._revealed = true;
    }
  }

  /** Number of cards rated so far this session. */
  done(): number {
    return this._done;
  }

  /** Number of cards remaining in the queue. */
  remaining(): number {
    return this.queue.length;
  }

  /** True when no more cards remain. */
  isDone(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Rate the current card, apply SM-2, and advance to the next card.
   * The rated card is removed from the session queue regardless of its new dueDate.
   * Returns RateResult (updated card + deckId) for the caller to persist,
   * or undefined if there is no current card.
   */
  rate(rating: Rating): RateResult | undefined {
    const card = this.queue[0];
    if (!card) return undefined;

    const updatedCard = schedule(card, rating, this.today);
    this.queue.shift(); // remove from session regardless of new dueDate
    this._done += 1;
    this._revealed = false; // reset for next card

    return { updatedCard, deckId: this.deckId };
  }
}
