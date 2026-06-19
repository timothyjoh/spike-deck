import { describe, it, expect } from "vitest";
import { dueCards, ReviewSession } from "../src/review.js";
import { type Card } from "../src/sm2.js";
import { type Deck } from "../src/storage.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TODAY = new Date("2024-06-10");

function makeCard(id: string, dueDate: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    front: `Front ${id}`,
    back: `Back ${id}`,
    ease: 2.5,
    intervalDays: 1,
    dueDate,
    reps: 0,
    lapses: 0,
    ...overrides,
  };
}

function makeDeck(cards: Card[]): Deck {
  return { id: "deck-1", name: "Test Deck", cards };
}

// ---------------------------------------------------------------------------
// dueCards
// ---------------------------------------------------------------------------

describe("dueCards", () => {
  it("returns only cards due on or before today", () => {
    const deck = makeDeck([
      makeCard("c1", "2024-06-10"), // today — included
      makeCard("c2", "2024-06-09"), // yesterday — included (overdue)
      makeCard("c3", "2024-06-11"), // tomorrow — excluded
    ]);
    const due = dueCards(deck, TODAY);
    expect(due.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("returns empty array when no cards are due", () => {
    const deck = makeDeck([
      makeCard("c1", "2024-06-11"),
      makeCard("c2", "2024-06-20"),
    ]);
    expect(dueCards(deck, TODAY)).toHaveLength(0);
  });

  it("includes overdue cards (past due dates)", () => {
    const deck = makeDeck([makeCard("c1", "2024-01-01")]);
    expect(dueCards(deck, TODAY)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// ReviewSession — basic navigation
// ---------------------------------------------------------------------------

describe("ReviewSession — empty due queue", () => {
  it("is immediately done", () => {
    const deck = makeDeck([makeCard("c1", "2024-06-11")]); // not due today
    const session = new ReviewSession(deck, TODAY);
    expect(session.isDone()).toBe(true);
    expect(session.current()).toBeUndefined();
    expect(session.remaining()).toBe(0);
  });
});

describe("ReviewSession — reveal", () => {
  it("starts unrevealed", () => {
    const deck = makeDeck([makeCard("c1", "2024-06-10")]);
    const session = new ReviewSession(deck, TODAY);
    expect(session.isRevealed()).toBe(false);
  });

  it("reveal() toggles isRevealed to true", () => {
    const deck = makeDeck([makeCard("c1", "2024-06-10")]);
    const session = new ReviewSession(deck, TODAY);
    session.reveal();
    expect(session.isRevealed()).toBe(true);
  });

  it("reveal() is idempotent", () => {
    const deck = makeDeck([makeCard("c1", "2024-06-10")]);
    const session = new ReviewSession(deck, TODAY);
    session.reveal();
    session.reveal();
    expect(session.isRevealed()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ReviewSession — rate and advance
// ---------------------------------------------------------------------------

describe("ReviewSession — rate()", () => {
  it("rate('good') advances session and returns updated card", () => {
    const card = makeCard("c1", "2024-06-10");
    const deck = makeDeck([card]);
    const session = new ReviewSession(deck, TODAY);

    session.reveal();
    const result = session.rate("good");

    expect(result).toBeDefined();
    expect(result!.deckId).toBe("deck-1");
    // schedule() with good on reps=0 gives intervalDays=1
    expect(result!.updatedCard.id).toBe("c1");
    expect(result!.updatedCard.reps).toBe(1);
    // dueDate must advance (intervalDays=1 → tomorrow = 2024-06-11)
    expect(result!.updatedCard.dueDate).toBe("2024-06-11");
  });

  it("rate('good') advances dueDate relative to today", () => {
    const card = makeCard("c1", "2024-06-10", { reps: 2, intervalDays: 6, ease: 2.5 });
    const deck = makeDeck([card]);
    const session = new ReviewSession(deck, TODAY);

    const result = session.rate("good");
    // reps=2: intervalDays = round(6 * 2.5) = 15 → dueDate = 2024-06-25
    expect(result!.updatedCard.intervalDays).toBe(15);
    expect(result!.updatedCard.dueDate).toBe("2024-06-25");
  });

  it("session advances to next card after rate()", () => {
    const deck = makeDeck([
      makeCard("c1", "2024-06-10"),
      makeCard("c2", "2024-06-09"),
    ]);
    const session = new ReviewSession(deck, TODAY);

    expect(session.current()!.id).toBe("c1");
    session.rate("good");
    expect(session.current()!.id).toBe("c2");
  });

  it("session is done after rating all cards", () => {
    const deck = makeDeck([
      makeCard("c1", "2024-06-10"),
      makeCard("c2", "2024-06-09"),
    ]);
    const session = new ReviewSession(deck, TODAY);

    session.rate("good");
    expect(session.isDone()).toBe(false);
    session.rate("again");
    expect(session.isDone()).toBe(true);
    expect(session.current()).toBeUndefined();
  });

  it("done() and remaining() track correctly", () => {
    const deck = makeDeck([
      makeCard("c1", "2024-06-10"),
      makeCard("c2", "2024-06-09"),
      makeCard("c3", "2024-06-08"),
    ]);
    const session = new ReviewSession(deck, TODAY);

    expect(session.done()).toBe(0);
    expect(session.remaining()).toBe(3);

    session.rate("good");
    expect(session.done()).toBe(1);
    expect(session.remaining()).toBe(2);

    session.rate("hard");
    expect(session.done()).toBe(2);
    expect(session.remaining()).toBe(1);
  });

  it("reveal resets after each rate()", () => {
    const deck = makeDeck([
      makeCard("c1", "2024-06-10"),
      makeCard("c2", "2024-06-09"),
    ]);
    const session = new ReviewSession(deck, TODAY);

    session.reveal();
    expect(session.isRevealed()).toBe(true);
    session.rate("good");
    // After advancing to next card, revealed resets
    expect(session.isRevealed()).toBe(false);
  });

  it("rate() returns undefined when queue is empty", () => {
    const deck = makeDeck([]);
    const session = new ReviewSession(deck, TODAY);
    expect(session.rate("good")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// No re-show within session even if new dueDate is today
// ---------------------------------------------------------------------------

describe("ReviewSession — no infinite loop on again", () => {
  it("again-rated card does not re-appear in current session", () => {
    // Single card, due today. After 'again', intervalDays=1, so new dueDate = tomorrow.
    // But even if it were today, it must not re-enter the queue.
    const card = makeCard("c1", "2024-06-10");
    const deck = makeDeck([card]);
    const session = new ReviewSession(deck, TODAY);

    session.rate("again");
    expect(session.isDone()).toBe(true);
    expect(session.current()).toBeUndefined();
  });

  it("all cards rated once and session ends exactly once", () => {
    const cards = [
      makeCard("c1", "2024-06-10"),
      makeCard("c2", "2024-06-09"),
    ];
    const deck = makeDeck(cards);
    const session = new ReviewSession(deck, TODAY);

    let count = 0;
    while (!session.isDone()) {
      session.rate("again");
      count++;
      if (count > 10) throw new Error("Infinite loop detected");
    }
    expect(count).toBe(2);
  });
});
