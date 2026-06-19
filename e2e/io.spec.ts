import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ---------------------------------------------------------------------------
// Helpers (mirroring review.spec.ts style)
// ---------------------------------------------------------------------------

async function createDeck(page: import("@playwright/test").Page, name: string) {
  await page.getByTestId("new-deck-name").fill(name);
  await page.getByTestId("create-deck-btn").click();
  await expect(page.getByTestId("deck-name").filter({ hasText: name })).toBeVisible();
}

async function selectDeck(page: import("@playwright/test").Page, name: string) {
  await page.getByTestId("deck-name").filter({ hasText: name }).click();
}

async function addCard(
  page: import("@playwright/test").Page,
  front: string,
  back: string
) {
  await page.getByTestId("new-card-front").fill(front);
  await page.getByTestId("new-card-back").fill(back);
  await page.getByTestId("add-card-btn").click();
  await expect(page.getByTestId("card-item").first()).toBeVisible();
}

// ---------------------------------------------------------------------------
// Test 1: Stats reflect cards and due count
// ---------------------------------------------------------------------------

test("stats reflect cards and due count", async ({ page }) => {
  await createDeck(page, "Stats Deck");
  await selectDeck(page, "Stats Deck");

  // Initially 0 cards
  await expect(page.getByTestId("stats-total")).toHaveText("0");

  // Add two cards
  await addCard(page, "Front 1", "Back 1");
  await addCard(page, "Front 2", "Back 2");

  // Stats should now show 2 total and 2 due (new cards are due today)
  await expect(page.getByTestId("stats-total")).toHaveText("2");
  await expect(page.getByTestId("stats-due")).toHaveText("2");
});

// ---------------------------------------------------------------------------
// Test 2: Export then import round-trips a deck
// ---------------------------------------------------------------------------

test("export then import round-trips a deck", async ({ page }) => {
  // Create source deck and add a card
  await createDeck(page, "Source");
  await selectDeck(page, "Source");
  await addCard(page, "q1", "a1");

  // Export the deck
  await page.getByTestId("export-deck-btn").click();

  // Read exported JSON from hidden textarea
  const json = await page.locator('[data-testid="export-output"]').inputValue();

  // Assert non-empty, parseable, contains card content
  expect(json.length).toBeGreaterThan(0);
  const parsed = JSON.parse(json);
  expect(JSON.stringify(parsed)).toContain("q1");
  expect(JSON.stringify(parsed)).toContain("a1");

  // Import the deck via the textarea
  await page.getByTestId("import-textarea").fill(json);
  await page.getByTestId("import-deck-btn").click();

  // Should now have 2 deck-items (original + imported)
  await expect(page.getByTestId("deck-item")).toHaveCount(2);

  // The imported deck is now selected (import selects it); its card "q1" should be visible
  await expect(page.getByTestId("card-front").filter({ hasText: "q1" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 3: Bad import shows an error, does not crash
// ---------------------------------------------------------------------------

test("bad import shows an error, does not crash", async ({ page }) => {
  // Fill with invalid JSON
  await page.getByTestId("import-textarea").fill("not valid json {{{");
  await page.getByTestId("import-deck-btn").click();

  // Error element should become visible
  await expect(page.getByTestId("import-error")).toBeVisible();

  // App still works: create-deck-btn present and no bogus deck was added
  await expect(page.getByTestId("create-deck-btn")).toBeVisible();
  await expect(page.getByTestId("deck-item")).toHaveCount(0);
});
