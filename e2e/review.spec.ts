import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createDeck(page: import("@playwright/test").Page, name: string) {
  await page.getByTestId("new-deck-name").fill(name);
  await page.getByTestId("create-deck-btn").click();
  // Wait for the deck to appear
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
// Test A: create deck + card, review, rate Good, card leaves due queue, reload persists
// ---------------------------------------------------------------------------

test("create deck + card, review, rate Good, card is rescheduled and survives reload", async ({
  page,
}) => {
  const deckName = "Test Deck";
  const cardFront = "What is 2+2?";
  const cardBack = "4";

  // a. Create a deck
  await createDeck(page, deckName);
  await expect(page.getByTestId("deck-item")).toHaveCount(1);

  // b. Select the deck and add a card
  await selectDeck(page, deckName);
  await addCard(page, cardFront, cardBack);
  await expect(page.getByTestId("card-item")).toHaveCount(1);

  // c. Click review-deck-btn → review-view visible, review-front shows card front
  await page.getByTestId("review-deck-btn").click();
  await expect(page.getByTestId("review-view")).toBeVisible();
  await expect(page.getByTestId("review-front")).toHaveText(cardFront);

  // d. Click reveal-btn → review-back becomes visible with back text
  await page.getByTestId("reveal-btn").click();
  await expect(page.getByTestId("review-back")).toBeVisible();
  await expect(page.getByTestId("review-back")).toHaveText(cardBack);

  // e. Rate Good
  await page.getByTestId("rate-good").click();

  // f. Assert session is complete (only card was due, now rescheduled to future)
  await expect(page.getByTestId("review-complete")).toBeVisible();

  // g. Exit review and reload
  await page.getByTestId("exit-review-btn").click();
  await page.reload();

  // Re-select the deck
  await selectDeck(page, deckName);
  await expect(page.getByTestId("deck-item")).toHaveCount(1);
  await expect(page.getByTestId("card-item")).toHaveCount(1);

  // Start review again — should show review-complete immediately since card is scheduled to future
  await page.getByTestId("review-deck-btn").click();
  await expect(page.getByTestId("review-view")).toBeVisible();
  // Card was rated Good → rescheduled to a future date → no cards due today
  await expect(page.getByTestId("review-complete")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test B: persistence of CRUD — create deck + card, reload, data still present
// ---------------------------------------------------------------------------

test("CRUD persistence survives reload", async ({ page }) => {
  const deckName = "Persistent Deck";
  const cardFront = "Capital of France?";
  const cardBack = "Paris";

  await createDeck(page, deckName);
  await selectDeck(page, deckName);
  await addCard(page, cardFront, cardBack);

  // Verify card was added
  await expect(page.getByTestId("card-front").first()).toHaveText(cardFront);
  await expect(page.getByTestId("card-back").first()).toHaveText(cardBack);

  // Reload
  await page.reload();

  // Deck and card should still be there
  await expect(page.getByTestId("deck-name").filter({ hasText: deckName })).toBeVisible();

  // Select the deck again to see its cards
  await selectDeck(page, deckName);
  await expect(page.getByTestId("card-front").first()).toHaveText(cardFront);
  await expect(page.getByTestId("card-back").first()).toHaveText(cardBack);
});
