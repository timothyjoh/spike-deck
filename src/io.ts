/**
 * Import / Export helpers for Deck (m4).
 *
 * exportDeck  — serialize a Deck + its cards to a JSON string with a version marker.
 * importDeck  — parse + validate; assigns a NEW deck id to avoid collisions.
 * deckStats   — count total cards and cards due today.
 */

import { isDue, type Card } from "./sm2.js";
import { type Deck } from "./storage.js";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const EXPORT_VERSION = 1;

interface ExportSchema {
  version: number;
  deck: {
    id: string;
    name: string;
    cards: Card[];
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Serialize a deck (and all its cards) to a JSON string.
 * The envelope carries { version, deck } for forward-compat detection.
 */
export function exportDeck(deck: Deck): string {
  const payload: ExportSchema = {
    version: EXPORT_VERSION,
    deck: {
      id: deck.id,
      name: deck.name,
      cards: deck.cards,
    },
  };
  return JSON.stringify(payload, null, 2);
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNumber(v: unknown): v is number {
  return typeof v === "number";
}

function validateCard(c: unknown, idx: number): Card {
  if (typeof c !== "object" || c === null) {
    throw new Error(`Card at index ${idx} is not an object`);
  }
  const card = c as Record<string, unknown>;
  const required: Array<[string, (v: unknown) => boolean, string]> = [
    ["id", isString, "string"],
    ["front", isString, "string"],
    ["back", isString, "string"],
    ["ease", isNumber, "number"],
    ["intervalDays", isNumber, "number"],
    ["dueDate", isString, "string"],
    ["reps", isNumber, "number"],
    ["lapses", isNumber, "number"],
  ];
  for (const [field, check, type] of required) {
    if (!(field in card) || !check(card[field])) {
      throw new Error(`Card at index ${idx} missing or invalid field "${field}" (expected ${type})`);
    }
  }
  return {
    id: card["id"] as string,
    front: card["front"] as string,
    back: card["back"] as string,
    ease: card["ease"] as number,
    intervalDays: card["intervalDays"] as number,
    dueDate: card["dueDate"] as string,
    reps: card["reps"] as number,
    lapses: card["lapses"] as number,
  };
}

/**
 * Parse + validate an exported JSON string and return a Deck.
 * A NEW deck id is assigned so importing never collides with an existing deck.
 * Card state (ease/intervalDays/dueDate/reps/lapses) is preserved exactly.
 *
 * Throws a descriptive Error on any validation failure.
 */
export function importDeck(json: string): Deck {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON: could not parse import data");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Invalid import: top-level value must be an object");
  }

  const obj = parsed as Record<string, unknown>;

  // Version check
  if (!("version" in obj)) {
    throw new Error("Invalid import: missing \"version\" field");
  }
  if (obj["version"] !== EXPORT_VERSION) {
    throw new Error(
      `Unsupported export version ${String(obj["version"])} (expected ${EXPORT_VERSION})`
    );
  }

  // Deck envelope
  if (!("deck" in obj) || typeof obj["deck"] !== "object" || obj["deck"] === null) {
    throw new Error("Invalid import: missing or invalid \"deck\" field");
  }
  const deckObj = obj["deck"] as Record<string, unknown>;

  if (!("name" in deckObj) || !isString(deckObj["name"])) {
    throw new Error("Invalid import: deck missing required string field \"name\"");
  }

  if (!("cards" in deckObj) || !Array.isArray(deckObj["cards"])) {
    throw new Error("Invalid import: deck missing \"cards\" array");
  }

  const cards: Card[] = (deckObj["cards"] as unknown[]).map(validateCard);

  return {
    id: crypto.randomUUID(),
    name: deckObj["name"] as string,
    cards,
  };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface DeckStats {
  total: number;
  due: number;
}

/**
 * Count cards in a deck and how many are due on/before `today`.
 */
export function deckStats(deck: Deck, today: Date): DeckStats {
  const total = deck.cards.length;
  const due = deck.cards.filter((c) => isDue(c, today)).length;
  return { total, due };
}
