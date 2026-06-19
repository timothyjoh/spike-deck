/**
 * Vanilla-TS DOM rendering for the Deck app.
 *
 * renderApp() is the single entry point — call it after every mutation and
 * on initial load. It renders into #app from scratch each time.
 *
 * data-testid attributes are kept stable for e2e tests (m3/m4).
 *
 * === Plug-in zones ===
 * - Review mode (m3): mount into the element with id="review-zone"
 * - Import/Export + Stats (m4): mount into id="import-export-zone"
 */

import { Store, type Deck } from "./storage.js";

// ---------------------------------------------------------------------------
// State held outside the render cycle (just what deck is selected)
// ---------------------------------------------------------------------------

let selectedDeckId: string | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  if (text !== undefined) e.textContent = text;
  return e;
}

function textInput(testid: string, placeholder: string): HTMLInputElement {
  const i = el("input", { type: "text", "data-testid": testid, placeholder });
  return i;
}

function btn(label: string, cls = ""): HTMLButtonElement {
  const b = el("button", { class: cls.trim() }, label);
  return b;
}

// ---------------------------------------------------------------------------
// Deck panel
// ---------------------------------------------------------------------------

function renderDeckPanel(store: Store, container: HTMLElement): void {
  const panel = el("div", { class: "panel" });
  panel.appendChild(el("h2", {}, "Decks"));

  // Create-deck row
  const createRow = el("div", { class: "row" });
  const nameInput = textInput("new-deck-name", "New deck name…");
  const createBtn = btn("Create", "");
  createBtn.setAttribute("data-testid", "create-deck-btn");

  createBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) return;
    store.createDeck(name);
    nameInput.value = "";
    renderApp(store);
  });
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") createBtn.click();
  });

  createRow.append(nameInput, createBtn);
  panel.appendChild(createRow);

  // Deck list
  const decks = store.listDecks();
  if (decks.length === 0) {
    panel.appendChild(el("p", { style: "color:#999;font-size:.85rem" }, "No decks yet."));
  }

  for (const deck of decks) {
    panel.appendChild(renderDeckItem(store, deck));
  }

  container.appendChild(panel);
}

function renderDeckItem(store: Store, deck: Deck): HTMLElement {
  const row = el("div", { "data-testid": "deck-item" });
  if (deck.id === selectedDeckId) row.classList.add("selected");

  const nameSpan = el("span", { "data-testid": "deck-name" }, deck.name);
  nameSpan.addEventListener("click", () => {
    selectedDeckId = deck.id;
    renderApp(store);
  });

  const renameBtn = btn("Rename", "secondary small");
  renameBtn.setAttribute("data-testid", "rename-deck-btn");
  renameBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const newName = prompt("New name:", deck.name)?.trim();
    if (newName) {
      store.renameDeck(deck.id, newName);
      renderApp(store);
    }
  });

  const deleteBtn = btn("Delete", "danger small");
  deleteBtn.setAttribute("data-testid", "delete-deck-btn");
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!confirm(`Delete deck "${deck.name}"?`)) return;
    store.deleteDeck(deck.id);
    if (selectedDeckId === deck.id) selectedDeckId = null;
    renderApp(store);
  });

  row.append(nameSpan, renameBtn, deleteBtn);
  return row;
}

// ---------------------------------------------------------------------------
// Card panel
// ---------------------------------------------------------------------------

function renderCardPanel(store: Store, container: HTMLElement): void {
  const panel = el("div", { class: "panel" });

  if (!selectedDeckId) {
    panel.appendChild(el("p", { style: "color:#999" }, "Select a deck to see its cards."));
    container.appendChild(panel);
    return;
  }

  const deck = store.getDeck(selectedDeckId);
  if (!deck) {
    panel.appendChild(el("p", {}, "Deck not found."));
    container.appendChild(panel);
    return;
  }

  panel.appendChild(el("h2", {}, deck.name));

  // Add-card form
  panel.appendChild(el("h3", {}, "Add card"));
  const addRow = el("div", { class: "row" });
  const frontInput = textInput("new-card-front", "Front…");
  const backInput = textInput("new-card-back", "Back…");
  const addBtn = btn("Add card", "");
  addBtn.setAttribute("data-testid", "add-card-btn");

  addBtn.addEventListener("click", () => {
    const front = frontInput.value.trim();
    const back = backInput.value.trim();
    if (!front || !back) return;
    store.addCard(deck.id, front, back);
    frontInput.value = "";
    backInput.value = "";
    renderApp(store);
  });

  addRow.append(frontInput, backInput, addBtn);
  panel.appendChild(addRow);

  // Card list
  panel.appendChild(el("h3", {}, `Cards (${deck.cards.length})`));
  if (deck.cards.length === 0) {
    panel.appendChild(el("p", { style: "color:#999;font-size:.85rem" }, "No cards yet."));
  }

  for (const card of deck.cards) {
    const cardEl = el("div", { "data-testid": "card-item" });

    const frontEl = el("div", { "data-testid": "card-front" }, card.front);
    const backEl = el("div", { "data-testid": "card-back" }, card.back);
    cardEl.append(frontEl, backEl);

    // Actions
    const actions = el("div", { class: "card-actions" });

    const editBtn = btn("Edit", "secondary small");
    editBtn.setAttribute("data-testid", "edit-card-btn");

    const deleteBtn = btn("Delete", "danger small");
    deleteBtn.setAttribute("data-testid", "delete-card-btn");

    deleteBtn.addEventListener("click", () => {
      store.deleteCard(deck.id, card.id);
      renderApp(store);
    });

    // Inline edit form (hidden until Edit pressed)
    const editForm = el("div", { class: "edit-card-form", style: "display:none" });
    const editFront = textInput("edit-card-front", "Front");
    const editBack = textInput("edit-card-back", "Back");
    editFront.value = card.front;
    editBack.value = card.back;
    const saveBtn = btn("Save", "small");
    const cancelBtn = btn("Cancel", "secondary small");
    const editRow = el("div", { class: "row" });
    editRow.append(saveBtn, cancelBtn);
    editForm.append(editFront, editBack, editRow);

    editBtn.addEventListener("click", () => {
      editForm.style.display = editForm.style.display === "none" ? "block" : "none";
    });

    saveBtn.addEventListener("click", () => {
      const f = editFront.value.trim();
      const b = editBack.value.trim();
      if (!f || !b) return;
      store.editCard(deck.id, card.id, f, b);
      renderApp(store);
    });

    cancelBtn.addEventListener("click", () => {
      editForm.style.display = "none";
    });

    actions.append(editBtn, deleteBtn);
    cardEl.append(actions, editForm);
    panel.appendChild(cardEl);
  }

  // === m3 review-mode plug-in zone ===
  const reviewZone = el("div", { id: "review-zone", class: "plugin-zone" });
  reviewZone.textContent = "[m3 review mode mounts here]";
  panel.appendChild(reviewZone);

  container.appendChild(panel);
}

// ---------------------------------------------------------------------------
// Main render entry point
// ---------------------------------------------------------------------------

export function renderApp(store: Store): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) return;
  app.innerHTML = "";

  const heading = el("h1", {}, "Deck");
  app.appendChild(heading);

  const layout = el("div", { class: "layout" });
  renderDeckPanel(store, layout);
  renderCardPanel(store, layout);
  app.appendChild(layout);

  // === m4 import/export + stats plug-in zone ===
  const importExportZone = el("div", { id: "import-export-zone", class: "plugin-zone" });
  importExportZone.textContent = "[m4 import/export + stats mounts here]";
  app.appendChild(importExportZone);
}
