const CHATS_KEY = "legal-rag:chats";

function safeParse(json, fallback) {
  try {
    const parsed = JSON.parse(json);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadChats() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CHATS_KEY);
  if (!raw) return [];
  return safeParse(raw, []);
}

export function saveChats(chats) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch (err) {
    console.error("Failed to persist chats to localStorage", err);
  }
}

export function createChat() {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    // null = grounded in all documents; otherwise a specific document's id
    documentId: null,
    documentLabel: "All documents",
  };
}

export function deriveTitle(text) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 48) return trimmed || "New chat";
  return `${trimmed.slice(0, 48)}…`;
}
