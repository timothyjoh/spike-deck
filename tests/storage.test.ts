import { describe, it, expect, beforeEach } from "vitest";
import { Store } from "../src/storage.js";

// ---------------------------------------------------------------------------
// In-memory fake Storage (matches the Storage interface from lib.dom.d.ts)
// ---------------------------------------------------------------------------

class FakeStorage implements Storage {
  private data: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.data).length;
  }

  clear(): void {
    this.data = {};
  }

  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.data, key)
      ? this.data[key]
      : null;
  }

  key(index: number): string | null {
    return Object.keys(this.data)[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.data[key];
  }

  setItem(key: string, value: string): void {
    this.data[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore(storage: FakeStorage = new FakeStorage()): Store {
  return new Store(storage as unknown as Storage);
}

// ---------------------------------------------------------------------------
// Deck CRUD
// ---------------------------------------------------------------------------

describe("Store — deck CRUD", () => {
  let storage: FakeStorage;
  let store: Store;

  beforeEach(() => {
    storage = new FakeStorage();
    store = makeStore(storage);
  });

  it("starts with no decks", () => {
    expect(store.listDecks()).toHaveLength(0);
  });

  it("createDeck adds a deck and listDecks returns it", () => {
    const deck = store.createDeck("French");
    expect(deck.name).toBe("French");
    expect(typeof deck.id).toBe("string");
    const list = store.listDecks();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("French");
  });

  it("createDeck multiple decks are all listed", () => {
    store.createDeck("French");
    store.createDeck("Spanish");
    store.createDeck("German");
    expect(store.listDecks()).toHaveLength(3);
  });

  it("getDeck returns the deck by id", () => {
    const created = store.createDeck("French");
    const found = store.getDeck(created.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("French");
  });

  it("getDeck returns undefined for unknown id", () => {
    expect(store.getDeck("non-existent")).toBeUndefined();
  });

  it("renameDeck changes the name", () => {
    const deck = store.createDeck("Old Name");
    const ok = store.renameDeck(deck.id, "New Name");
    expect(ok).toBe(true);
    expect(store.getDeck(deck.id)!.name).toBe("New Name");
  });

  it("renameDeck returns false for unknown id", () => {
    expect(store.renameDeck("bad-id", "x")).toBe(false);
  });

  it("deleteDeck removes the deck", () => {
    const d1 = store.createDeck("A");
    const d2 = store.createDeck("B");
    const ok = store.deleteDeck(d1.id);
    expect(ok).toBe(true);
    expect(store.listDecks()).toHaveLength(1);
    expect(store.listDecks()[0].id).toBe(d2.id);
  });

  it("deleteDeck returns false for unknown id", () => {
    expect(store.deleteDeck("bad-id")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Card CRUD
// ---------------------------------------------------------------------------

describe("Store — card CRUD", () => {
  let storage: FakeStorage;
  let store: Store;
  let deckId: string;

  beforeEach(() => {
    storage = new FakeStorage();
    store = makeStore(storage);
    deckId = store.createDeck("Test Deck").id;
  });

  it("addCard adds a card to the deck", () => {
    const card = store.addCard(deckId, "front 1", "back 1");
    expect(card).toBeDefined();
    expect(card!.front).toBe("front 1");
    expect(card!.back).toBe("back 1");
    const deck = store.getDeck(deckId)!;
    expect(deck.cards).toHaveLength(1);
  });

  it("new cards have sensible SM-2 defaults", () => {
    const card = store.addCard(deckId, "Q", "A")!;
    expect(card.ease).toBe(2.5);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.intervalDays).toBe(0);
    expect(typeof card.dueDate).toBe("string");
    expect(card.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("addCard returns undefined for unknown deck", () => {
    expect(store.addCard("bad-deck", "f", "b")).toBeUndefined();
  });

  it("editCard updates front and back", () => {
    const card = store.addCard(deckId, "old front", "old back")!;
    const ok = store.editCard(deckId, card.id, "new front", "new back");
    expect(ok).toBe(true);
    const updated = store.getDeck(deckId)!.cards[0];
    expect(updated.front).toBe("new front");
    expect(updated.back).toBe("new back");
  });

  it("editCard returns false for unknown deck", () => {
    const card = store.addCard(deckId, "f", "b")!;
    expect(store.editCard("bad-deck", card.id, "f", "b")).toBe(false);
  });

  it("editCard returns false for unknown card", () => {
    expect(store.editCard(deckId, "bad-card", "f", "b")).toBe(false);
  });

  it("deleteCard removes the card", () => {
    const c1 = store.addCard(deckId, "f1", "b1")!;
    const c2 = store.addCard(deckId, "f2", "b2")!;
    const ok = store.deleteCard(deckId, c1.id);
    expect(ok).toBe(true);
    const deck = store.getDeck(deckId)!;
    expect(deck.cards).toHaveLength(1);
    expect(deck.cards[0].id).toBe(c2.id);
  });

  it("deleteCard returns false for unknown card", () => {
    expect(store.deleteCard(deckId, "bad-card")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Persistence round-trip ("survives reload" proof)
// ---------------------------------------------------------------------------

describe("Store — persistence round-trip", () => {
  it("deck created in one store instance is visible after constructing a second over the same storage", () => {
    const storage = new FakeStorage();

    // First Store instance — mutate
    const storeA = new Store(storage as unknown as Storage);
    storeA.createDeck("Survived");

    // Second Store instance — same storage, simulates reload
    const storeB = new Store(storage as unknown as Storage);
    expect(storeB.listDecks()).toHaveLength(1);
    expect(storeB.listDecks()[0].name).toBe("Survived");
  });

  it("card added in one instance is visible in a second instance", () => {
    const storage = new FakeStorage();
    const storeA = new Store(storage as unknown as Storage);
    const deck = storeA.createDeck("My Deck");
    storeA.addCard(deck.id, "Capital of France?", "Paris");

    const storeB = new Store(storage as unknown as Storage);
    const reloaded = storeB.getDeck(deck.id);
    expect(reloaded).toBeDefined();
    expect(reloaded!.cards).toHaveLength(1);
    expect(reloaded!.cards[0].front).toBe("Capital of France?");
  });

  it("rename persists across reload", () => {
    const storage = new FakeStorage();
    const storeA = new Store(storage as unknown as Storage);
    const deck = storeA.createDeck("Old Name");
    storeA.renameDeck(deck.id, "New Name");

    const storeB = new Store(storage as unknown as Storage);
    expect(storeB.getDeck(deck.id)!.name).toBe("New Name");
  });

  it("delete persists across reload", () => {
    const storage = new FakeStorage();
    const storeA = new Store(storage as unknown as Storage);
    const deck = storeA.createDeck("To Delete");
    storeA.deleteDeck(deck.id);

    const storeB = new Store(storage as unknown as Storage);
    expect(storeB.listDecks()).toHaveLength(0);
  });

  it("card edit persists across reload", () => {
    const storage = new FakeStorage();
    const storeA = new Store(storage as unknown as Storage);
    const deck = storeA.createDeck("D");
    const card = storeA.addCard(deck.id, "orig front", "orig back")!;
    storeA.editCard(deck.id, card.id, "edited front", "edited back");

    const storeB = new Store(storage as unknown as Storage);
    const c = storeB.getDeck(deck.id)!.cards[0];
    expect(c.front).toBe("edited front");
    expect(c.back).toBe("edited back");
  });

  it("card delete persists across reload", () => {
    const storage = new FakeStorage();
    const storeA = new Store(storage as unknown as Storage);
    const deck = storeA.createDeck("D");
    const card = storeA.addCard(deck.id, "f", "b")!;
    storeA.deleteCard(deck.id, card.id);

    const storeB = new Store(storage as unknown as Storage);
    expect(storeB.getDeck(deck.id)!.cards).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// load() resilience on absent / corrupt storage
// ---------------------------------------------------------------------------

describe("Store — load() resilience", () => {
  it("returns empty state when storage is empty (no key)", () => {
    const storage = new FakeStorage();
    const store = new Store(storage as unknown as Storage);
    const state = store.load();
    expect(state.decks).toHaveLength(0);
  });

  it("returns empty state when stored JSON is corrupt", () => {
    const storage = new FakeStorage();
    storage.setItem("deck.v1", "NOT JSON {{{");
    const store = new Store(storage as unknown as Storage);
    expect(store.listDecks()).toHaveLength(0);
  });

  it("returns empty state when stored value is valid JSON but wrong shape", () => {
    const storage = new FakeStorage();
    storage.setItem("deck.v1", JSON.stringify({ foo: "bar" }));
    const store = new Store(storage as unknown as Storage);
    expect(store.listDecks()).toHaveLength(0);
  });

  it("returns empty state when stored value is a JSON array (not object)", () => {
    const storage = new FakeStorage();
    storage.setItem("deck.v1", JSON.stringify([1, 2, 3]));
    const store = new Store(storage as unknown as Storage);
    expect(store.listDecks()).toHaveLength(0);
  });

  it("load() does not throw", () => {
    const storage = new FakeStorage();
    storage.setItem("deck.v1", "garbage");
    expect(() => new Store(storage as unknown as Storage)).not.toThrow();
  });
});
