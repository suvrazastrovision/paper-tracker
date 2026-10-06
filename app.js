"use strict";

const storageKey = "paper-tracker.papers";
const form = document.getElementById("paper-form");
const fields = document.getElementById("paper-fields");
const titleInput = document.getElementById("title");
const authorsInput = document.getElementById("authors");
const topicInput = document.getElementById("topic");
const list = document.getElementById("paper-list");
const emptyState = document.getElementById("empty-state");
const count = document.getElementById("paper-count");
const status = document.getElementById("status");
let papers = [];
let storageReady = false;

function announce(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function render() {
  list.replaceChildren();
  emptyState.hidden = papers.length > 0 || !storageReady;
  count.textContent = storageReady
    ? `${papers.length} ${papers.length === 1 ? "paper" : "papers"}`
    : "Unavailable";
  for (const paper of papers) {
    const card = element("li", "paper-card", "");
    card.dataset.id = paper.id;
    const top = element("div", "paper-top", "");
    top.append(
      element("h3", "paper-title", paper.title),
      element("span", `badge${paper.read ? " read" : ""}`, paper.read ? "Read" : "Unread")
    );
    card.append(top);
    if (paper.authors) card.append(element("p", "metadata", paper.authors));
    if (paper.topic) card.append(element("p", "topic", `Topic: ${paper.topic}`));
    const actions = element("div", "paper-actions", "");
    if (!paper.read) {
      const readButton = element("button", "mark-read", "Mark as read");
      readButton.type = "button";
      readButton.dataset.action = "read";
      readButton.setAttribute("aria-label", `Mark "${paper.title}" as read`);
      actions.append(readButton);
    }
    const deleteButton = element("button", "delete", "Delete");
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.setAttribute("aria-label", `Delete "${paper.title}"`);
    actions.append(deleteButton);
    card.append(actions);
    list.append(card);
  }
}

function loadPapers() {
  try {
    const saved = localStorage.getItem(storageKey);
    const records = saved === null ? [] : JSON.parse(saved);
    const ids = new Set();
    if (!Array.isArray(records) || !records.every(paper => {
      if (!paper || typeof paper.id !== "string" || !paper.id || ids.has(paper.id)
        || typeof paper.title !== "string" || !paper.title.trim()
        || typeof paper.authors !== "string" || typeof paper.topic !== "string"
        || typeof paper.read !== "boolean") return false;
      ids.add(paper.id);
      return true;
    })) throw new Error("Invalid saved papers");
    papers = records;
    storageReady = true;
  } catch {
    fields.disabled = true;
    announce("Your saved papers could not be loaded. No data has been changed. Check browser storage access or your saved data, then reload.", true);
  }
  render();
}

function savePapers(nextPapers) {
  if (!storageReady) return false;
  try {
    localStorage.setItem(storageKey, JSON.stringify(nextPapers));
  } catch {
    announce("Your change could not be saved. Your list is unchanged. Check browser storage access or available space and try again.", true);
    return false;
  }
  papers = nextPapers;
  render();
  return true;
}

titleInput.addEventListener("input", () => titleInput.setCustomValidity(""));
form.addEventListener("submit", event => {
  event.preventDefault();
  if (!storageReady) return;
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.setCustomValidity("Enter a paper title.");
    titleInput.reportValidity();
    titleInput.focus();
    return;
  }
  titleInput.setCustomValidity("");
  const paper = {
    id: crypto.randomUUID(),
    title,
    authors: authorsInput.value.trim(),
    topic: topicInput.value.trim(),
    read: false
  };
  if (savePapers([...papers, paper])) {
    form.reset();
    titleInput.focus();
    announce(`Added "${title}".`);
  }
});

list.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button || !list.contains(button) || !storageReady) return;
  const card = button.closest("[data-id]");
  const index = papers.findIndex(paper => paper.id === card.dataset.id);
  if (index < 0) return;
  const paper = papers[index];
  const hadFocus = document.activeElement === button;
  if (button.dataset.action === "read" && !paper.read) {
    const nextPapers = papers.map(record => record.id === paper.id ? { ...record, read: true } : record);
    if (savePapers(nextPapers)) {
      if (hadFocus) list.children[index].querySelector(".delete").focus();
      announce(`Marked "${paper.title}" as read.`);
    }
  } else if (button.dataset.action === "delete") {
    if (savePapers(papers.filter(record => record.id !== paper.id))) {
      if (hadFocus) {
        const nextCard = list.children[Math.min(index, papers.length - 1)];
        (nextCard ? nextCard.querySelector("button") : titleInput).focus();
      }
      announce(`Deleted "${paper.title}".`);
    }
  }
});

loadPapers();
