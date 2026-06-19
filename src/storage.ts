/**
 * localStorage-backed persistence layer for the Deck app.
 *
 * Injectable storage backend (default: window.localStorage) so tests can
 * pass a fake in-memory Storage without touching the DOM.
 */

import { type Card, toISODate } from "./sm2.js";

export interface Deck {
  id: string;
  name: string;
  cards: Card[];
}

export interface AppState {
  decks: Deck[];
}

const STORAGE_KEY = "deck.v1";

function today(): string {
  return toISODate(new Date());
}

function newCard(front: string, back: string): Card {
  return {
    id: crypto.randomUUID(),
    front,
    back,
    ease: 2.5,
    intervalDays: 0,
    dueDate: today(),
    reps: 0,
    lapses: 0,
  };
}

export class Store {
  private storage: Storage;
  private state: AppState;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
    this.state = this.load();
  }

  load(): AppState {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return { decks: [] };
      const parsed = JSON.parse(raw) as unknown;
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !Array.isArray((parsed as AppState).decks)
      ) {
        return { decks: [] };
      }
      this.state = parsed as AppState;
      return this.state;
    } catch {
      return { decks: [] };
    }
  }

  private save(): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  listDecks(): Deck[] {
    return this.state.decks;
  }

  getDeck(id: string): Deck | undefined {
    return this.state.decks.find((d) => d.id === id);
  }

  createDeck(name: string): Deck {
    const deck: Deck = { id: crypto.randomUUID(), name, cards: [] };
    this.state.decks.push(deck);
    this.save();
    return deck;
  }

  renameDeck(id: string, name: string): boolean {
    const deck = this.getDeck(id);
    if (!deck) return false;
    deck.name = name;
    this.save();
    return true;
  }

  deleteDeck(id: string): boolean {
    const idx = this.state.decks.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    this.state.decks.splice(idx, 1);
    this.save();
    return true;
  }

  addCard(deckId: string, front: string, back: string): Card | undefined {
    const deck = this.getDeck(deckId);
    if (!deck) return undefined;
    const card = newCard(front, back);
    deck.cards.push(card);
    this.save();
    return card;
  }

  editCard(
    deckId: string,
    cardId: string,
    front: string,
    back: string
  ): boolean {
    const deck = this.getDeck(deckId);
    if (!deck) return false;
    const card = deck.cards.find((c) => c.id === cardId);
    if (!card) return false;
    card.front = front;
    card.back = back;
    this.save();
    return true;
  }

  deleteCard(deckId: string, cardId: string): boolean {
    const deck = this.getDeck(deckId);
    if (!deck) return false;
    const idx = deck.cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return false;
    deck.cards.splice(idx, 1);
    this.save();
    return true;
  }

  /** Replace the card in-place (used by review mode to persist SM-2 result). */
  updateCard(deckId: string, card: Card): boolean {
    const deck = this.getDeck(deckId);
    if (!deck) return false;
    const idx = deck.cards.findIndex((c) => c.id === card.id);
    if (idx === -1) return false;
    deck.cards[idx] = card;
    this.save();
    return true;
  }
}
