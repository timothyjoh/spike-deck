import { describe, it, expect } from "vitest";
import { exportDeck, importDeck, deckStats } from "../src/io.js";
import { type Deck } from "../src/storage.js";
import { type Card } from "../src/sm2.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    front: "What is 2+2?",
    back: "4",
    ease: 2.5,
    intervalDays: 6,
    dueDate: "2024-03-01",
    reps: 3,
    lapses: 1,
    ...overrides,
  };
}

function makeDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: "deck-abc",
    name: "Test Deck",
    cards: [makeCard()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Export + Import round-trip
// ---------------------------------------------------------------------------

describe("exportDeck / importDeck round-trip", () => {
  it("round-trips: imported deck has same name", () => {
    const original = makeDeck();
    const json = exportDeck(original);
    const imported = importDeck(json);
    expect(imported.name).toBe(original.name);
  });

  it("round-trips: imported deck has a NEW id (not the original id)", () => {
    const original = makeDeck({ id: "deck-abc" });
    const json = exportDeck(original);
    const imported = importDeck(json);
    expect(imported.id).not.toBe(original.id);
    expect(typeof imported.id).toBe("string");
    expect(imported.id.length).toBeGreaterThan(0);
  });

  it("round-trips: same number of cards", () => {
    const original = makeDeck();
    const imported = importDeck(exportDeck(original));
    expect(imported.cards).toHaveLength(original.cards.length);
  });

  it("round-trips: preserves card ease", () => {
    const card = makeCard({ ease: 1.8 });
    const original = makeDeck({ cards: [card] });
    const imported = importDeck(exportDeck(original));
    expect(imported.cards[0].ease).toBe(1.8);
  });

  it("round-trips: preserves card intervalDays", () => {
    const card = makeCard({ intervalDays: 42 });
    const original = makeDeck({ cards: [card] });
    const imported = importDeck(exportDeck(original));
    expect(imported.cards[0].intervalDays).toBe(42);
  });

  it("round-trips: preserves card dueDate", () => {
    const card = makeCard({ dueDate: "2099-12-31" });
    const original = makeDeck({ cards: [card] });
    const imported = importDeck(exportDeck(original));
    expect(imported.cards[0].dueDate).toBe("2099-12-31");
  });

  it("round-trips: preserves card reps", () => {
    const card = makeCard({ reps: 17 });
    const original = makeDeck({ cards: [card] });
    const imported = importDeck(exportDeck(original));
    expect(imported.cards[0].reps).toBe(17);
  });

  it("round-trips: preserves card lapses", () => {
    const card = makeCard({ lapses: 5 });
    const original = makeDeck({ cards: [card] });
    const imported = importDeck(exportDeck(original));
    expect(imported.cards[0].lapses).toBe(5);
  });

  it("round-trips: preserves card front + back text", () => {
    const card = makeCard({ front: "Q?", back: "A!" });
    const original = makeDeck({ cards: [card] });
    const imported = importDeck(exportDeck(original));
    expect(imported.cards[0].front).toBe("Q?");
    expect(imported.cards[0].back).toBe("A!");
  });

  it("round-trips a deck with no cards", () => {
    const original = makeDeck({ cards: [] });
    const imported = importDeck(exportDeck(original));
    expect(imported.cards).toHaveLength(0);
    expect(imported.name).toBe(original.name);
  });

  it("round-trips multiple cards, all fields preserved", () => {
    const c1 = makeCard({ id: "c1", front: "F1", back: "B1", ease: 1.3, intervalDays: 1, dueDate: "2024-01-01", reps: 0, lapses: 3 });
    const c2 = makeCard({ id: "c2", front: "F2", back: "B2", ease: 2.9, intervalDays: 14, dueDate: "2024-06-15", reps: 7, lapses: 0 });
    const original = makeDeck({ cards: [c1, c2] });
    const imported = importDeck(exportDeck(original));
    expect(imported.cards).toHaveLength(2);
    // c1
    expect(imported.cards[0].ease).toBe(c1.ease);
    expect(imported.cards[0].intervalDays).toBe(c1.intervalDays);
    expect(imported.cards[0].dueDate).toBe(c1.dueDate);
    expect(imported.cards[0].reps).toBe(c1.reps);
    expect(imported.cards[0].lapses).toBe(c1.lapses);
    // c2
    expect(imported.cards[1].ease).toBe(c2.ease);
    expect(imported.cards[1].intervalDays).toBe(c2.intervalDays);
    expect(imported.cards[1].dueDate).toBe(c2.dueDate);
    expect(imported.cards[1].reps).toBe(c2.reps);
    expect(imported.cards[1].lapses).toBe(c2.lapses);
  });
});

// ---------------------------------------------------------------------------
// importDeck error cases
// ---------------------------------------------------------------------------

describe("importDeck — error cases", () => {
  it("throws on invalid JSON string", () => {
    expect(() => importDeck("not json {{{")).toThrow(/Invalid JSON/i);
  });

  it("throws on empty string", () => {
    expect(() => importDeck("")).toThrow();
  });

  it("throws on missing version field", () => {
    const bad = JSON.stringify({ deck: { name: "x", cards: [] } });
    expect(() => importDeck(bad)).toThrow(/version/i);
  });

  it("throws on wrong version number", () => {
    const bad = JSON.stringify({ version: 99, deck: { name: "x", cards: [] } });
    expect(() => importDeck(bad)).toThrow(/version/i);
  });

  it("throws on missing deck field", () => {
    const bad = JSON.stringify({ version: 1 });
    expect(() => importDeck(bad)).toThrow(/deck/i);
  });

  it("throws on null top level", () => {
    expect(() => importDeck("null")).toThrow();
  });

  it("throws when deck.name is missing", () => {
    const bad = JSON.stringify({ version: 1, deck: { cards: [] } });
    expect(() => importDeck(bad)).toThrow(/name/i);
  });

  it("throws when deck.cards is missing", () => {
    const bad = JSON.stringify({ version: 1, deck: { name: "x" } });
    expect(() => importDeck(bad)).toThrow(/cards/i);
  });

  it("throws when a card is missing a required field (ease)", () => {
    const card = { id: "c1", front: "F", back: "B", intervalDays: 1, dueDate: "2024-01-01", reps: 0, lapses: 0 };
    const bad = JSON.stringify({ version: 1, deck: { name: "x", cards: [card] } });
    expect(() => importDeck(bad)).toThrow(/ease/i);
  });

  it("throws when a card has wrong type for a field (reps as string)", () => {
    const card = { id: "c1", front: "F", back: "B", ease: 2.5, intervalDays: 1, dueDate: "2024-01-01", reps: "bad", lapses: 0 };
    const bad = JSON.stringify({ version: 1, deck: { name: "x", cards: [card] } });
    expect(() => importDeck(bad)).toThrow(/reps/i);
  });
});

// ---------------------------------------------------------------------------
// deckStats
// ---------------------------------------------------------------------------

describe("deckStats", () => {
  const TODAY = new Date(Date.UTC(2024, 5, 15)); // 2024-06-15

  it("total counts all cards regardless of due date", () => {
    const cards = [
      makeCard({ dueDate: "2024-06-14" }), // past
      makeCard({ dueDate: "2024-06-15" }), // today
      makeCard({ dueDate: "2024-06-16" }), // future
    ];
    const deck = makeDeck({ cards });
    const stats = deckStats(deck, TODAY);
    expect(stats.total).toBe(3);
  });

  it("due counts only cards due on or before today", () => {
    const cards = [
      makeCard({ dueDate: "2024-06-14" }), // past — due
      makeCard({ dueDate: "2024-06-15" }), // today — due
      makeCard({ dueDate: "2024-06-16" }), // future — not due
      makeCard({ dueDate: "2025-01-01" }), // far future — not due
    ];
    const deck = makeDeck({ cards });
    const stats = deckStats(deck, TODAY);
    expect(stats.due).toBe(2);
  });

  it("due is 0 when all cards are in the future", () => {
    const cards = [
      makeCard({ dueDate: "2025-01-01" }),
      makeCard({ dueDate: "2099-12-31" }),
    ];
    const deck = makeDeck({ cards });
    const stats = deckStats(deck, TODAY);
    expect(stats.due).toBe(0);
  });

  it("due equals total when all cards are past-due", () => {
    const cards = [
      makeCard({ dueDate: "2020-01-01" }),
      makeCard({ dueDate: "2024-06-14" }),
    ];
    const deck = makeDeck({ cards });
    const stats = deckStats(deck, TODAY);
    expect(stats.total).toBe(2);
    expect(stats.due).toBe(2);
  });

  it("works on empty deck", () => {
    const deck = makeDeck({ cards: [] });
    const stats = deckStats(deck, TODAY);
    expect(stats.total).toBe(0);
    expect(stats.due).toBe(0);
  });
});
