import { describe, it, expect } from "vitest";
import {
  schedule,
  isDue,
  addDays,
  toISODate,
  type Card,
  type Rating,
} from "../src/sm2.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TODAY = new Date("2024-06-01");

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "test-1",
    front: "Q",
    back: "A",
    ease: 2.5,
    intervalDays: 1,
    dueDate: "2024-06-01",
    reps: 0,
    lapses: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// toISODate / addDays
// ---------------------------------------------------------------------------

describe("toISODate", () => {
  it("formats a date correctly", () => {
    expect(toISODate(new Date("2024-01-05"))).toBe("2024-01-05");
    expect(toISODate(new Date("2024-12-31"))).toBe("2024-12-31");
  });
});

describe("addDays", () => {
  it("adds days correctly", () => {
    const base = new Date("2024-06-01");
    expect(toISODate(addDays(base, 0))).toBe("2024-06-01");
    expect(toISODate(addDays(base, 1))).toBe("2024-06-02");
    expect(toISODate(addDays(base, 30))).toBe("2024-07-01");
  });

  it("does not mutate the base date", () => {
    const base = new Date("2024-06-01");
    addDays(base, 10);
    expect(toISODate(base)).toBe("2024-06-01");
  });
});

// ---------------------------------------------------------------------------
// isDue
// ---------------------------------------------------------------------------

describe("isDue", () => {
  it("returns true when dueDate equals today", () => {
    const card = makeCard({ dueDate: "2024-06-01" });
    expect(isDue(card, TODAY)).toBe(true);
  });

  it("returns true when dueDate is in the past", () => {
    const card = makeCard({ dueDate: "2024-05-01" });
    expect(isDue(card, TODAY)).toBe(true);
  });

  it("returns false when dueDate is in the future", () => {
    const card = makeCard({ dueDate: "2024-06-10" });
    expect(isDue(card, TODAY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// schedule — immutability
// ---------------------------------------------------------------------------

describe("schedule immutability", () => {
  it("does not mutate the original card", () => {
    const card = makeCard();
    const original = { ...card };
    schedule(card, "good", TODAY);
    expect(card).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// Each rating from a baseline card
// ---------------------------------------------------------------------------

describe("schedule — each rating effect on a baseline card (reps=0)", () => {
  const base = makeCard({ ease: 2.5, intervalDays: 1, reps: 0, lapses: 0 });

  it("again: interval=1, reps=0, lapses++, ease drops", () => {
    const result = schedule(base, "again", TODAY);
    expect(result.lapses).toBe(1);
    expect(result.reps).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.ease).toBeLessThan(2.5);
    expect(result.ease).toBeCloseTo(2.3, 5);
  });

  it("hard: interval grows (x1.2), reps++, ease drops slightly", () => {
    const result = schedule(base, "hard", TODAY);
    expect(result.reps).toBe(1);
    expect(result.lapses).toBe(0);
    // interval = max(round(1 * 1.2), 1) = 1
    expect(result.intervalDays).toBe(1);
    expect(result.ease).toBeCloseTo(2.35, 5);
  });

  it("good (reps=0): interval=1 (first step), reps++", () => {
    const result = schedule(base, "good", TODAY);
    expect(result.reps).toBe(1);
    expect(result.lapses).toBe(0);
    expect(result.intervalDays).toBe(1);
    // ease unchanged on good
    expect(result.ease).toBeCloseTo(2.5, 5);
  });

  it("easy (reps=0): interval=4 (first easy), reps++, ease rises", () => {
    const result = schedule(base, "easy", TODAY);
    expect(result.reps).toBe(1);
    expect(result.lapses).toBe(0);
    expect(result.intervalDays).toBe(4);
    expect(result.ease).toBeCloseTo(2.65, 5);
  });
});

// ---------------------------------------------------------------------------
// Hard on a matured card
// ---------------------------------------------------------------------------

describe("schedule — hard on a matured card", () => {
  it("grows interval slowly and drops ease", () => {
    const matured = makeCard({ ease: 2.5, intervalDays: 10, reps: 3 });
    const result = schedule(matured, "hard", TODAY);
    // interval = round(10 * 1.2) = 12
    expect(result.intervalDays).toBe(12);
    expect(result.ease).toBeCloseTo(2.35, 5);
    expect(result.reps).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Interval progression over multiple 'good' reviews
// ---------------------------------------------------------------------------

describe("schedule — interval progression over 4 consecutive good reviews", () => {
  it("interval grows each round: 1 → 6 → ease-driven", () => {
    let card = makeCard({ ease: 2.5, intervalDays: 1, reps: 0 });
    let today = new Date("2024-06-01");

    // Round 1 (reps=0): interval → 1
    card = schedule(card, "good", today);
    expect(card.intervalDays).toBe(1);
    expect(card.reps).toBe(1);
    today = addDays(today, card.intervalDays);

    // Round 2 (reps=1): interval → 6
    card = schedule(card, "good", today);
    expect(card.intervalDays).toBe(6);
    expect(card.reps).toBe(2);
    const afterRound2 = toISODate(today);
    today = addDays(today, card.intervalDays);

    // Round 3 (reps=2): interval → round(6 * 2.5) = 15
    card = schedule(card, "good", today);
    expect(card.intervalDays).toBe(15);
    expect(card.reps).toBe(3);
    today = addDays(today, card.intervalDays);

    // Round 4 (reps=3): interval → round(15 * 2.5) = 38
    card = schedule(card, "good", today);
    expect(card.intervalDays).toBe(38);
    expect(card.reps).toBe(4);

    // dueDate after round 2 is 6 days after the round-2 review date
    // (sanity-check the date advances)
    expect(card.dueDate).not.toBe(afterRound2);
    expect(card.dueDate > afterRound2).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Lapse resets interval and increments lapses
// ---------------------------------------------------------------------------

describe("schedule — lapse (again rating)", () => {
  it("resets interval to 1, increments lapses, resets reps", () => {
    const matured = makeCard({
      ease: 2.5,
      intervalDays: 20,
      reps: 5,
      lapses: 1,
    });
    const result = schedule(matured, "again", TODAY);

    expect(result.intervalDays).toBe(1);
    expect(result.lapses).toBe(2);
    expect(result.reps).toBe(0);
    expect(result.ease).toBeLessThan(2.5);
  });

  it("dueDate after lapse is tomorrow", () => {
    const matured = makeCard({ intervalDays: 20, reps: 4 });
    const result = schedule(matured, "again", TODAY);
    expect(result.dueDate).toBe(toISODate(addDays(TODAY, 1)));
  });
});

// ---------------------------------------------------------------------------
// Ease floor: never drops below 1.3
// ---------------------------------------------------------------------------

describe("schedule — ease floor 1.3", () => {
  it("ease never drops below 1.3 even after many lapses", () => {
    let card = makeCard({ ease: 1.3, intervalDays: 1, reps: 0 });

    for (let i = 0; i < 10; i++) {
      card = schedule(card, "again", TODAY);
      expect(card.ease).toBeGreaterThanOrEqual(1.3);
    }
  });

  it("hard also cannot push ease below 1.3", () => {
    let card = makeCard({ ease: 1.35, intervalDays: 1, reps: 0 });
    card = schedule(card, "hard", TODAY);
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
  });
});

// ---------------------------------------------------------------------------
// Mixed sequence: good progression then lapse then recovery
// ---------------------------------------------------------------------------

describe("schedule — mixed sequence with lapse and recovery", () => {
  it("lapses reset progress, recovery rebuilds interval", () => {
    let card = makeCard({ ease: 2.5 });
    const day = new Date("2024-06-01");

    // Build up interval: reps 0→1→2 (good x3)
    card = schedule(card, "good", day);
    card = schedule(card, "good", day);
    card = schedule(card, "good", day);
    const intervalBeforeLapse = card.intervalDays; // should be 15
    expect(intervalBeforeLapse).toBeGreaterThan(1);

    // Lapse
    card = schedule(card, "again", day);
    expect(card.intervalDays).toBe(1);
    expect(card.lapses).toBe(1);
    expect(card.reps).toBe(0);

    // Recovery: two good reviews
    card = schedule(card, "good", day);
    expect(card.reps).toBe(1);
    card = schedule(card, "good", day);
    expect(card.reps).toBe(2);
    // After recovery the interval should be growing again (6 at reps=2 → good gives 6)
    expect(card.intervalDays).toBe(6);
  });
});
