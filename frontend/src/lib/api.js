import { getToken } from "./authToken.js";

const API_BASE = "https://rag-app-legal-contracts.onrender.com" ?? "/api";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// FastAPI's 422 validation errors come back as
// { detail: [{ loc: ["body", "password"], msg: "...", type: "..." }, ...] }.
// Flatten that into a readable sentence instead of dumping raw JSON.
function formatValidationDetail(detail) {
  if (!Array.isArray(detail)) return null;
  return detail
    .map((issue) => {
      const field = Array.isArray(issue.loc) ? issue.loc.at(-1) : null;
      const msg = issue.msg || "Invalid value";
      return field && typeof field === "string" ? `${field}: ${msg}` : msg;
    })
    .join("; ");
}

async function handleResponse(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response had no JSON body
    }
    const message =
      typeof detail === "string" ? detail : formatValidationDetail(detail) ?? JSON.stringify(detail);
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders(options.headers),
  });
  return handleResponse(res);
}

function apiGet(path, signal) {
  return apiFetch(path, { signal });
}

function apiJson(path, method, body) {
  return apiFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res);
}

// --- Auth ---------------------------------------------------------------

export async function signup(email, password, fullName) {
  return apiJson("/auth/signup", "POST", { email, password, full_name: fullName });
}

export async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return handleResponse(res);
}

export async function getMe() {
  return apiGet("/auth/me");
}

export async function continueAsGuest() {
  return apiFetch("/auth/guest", { method: "POST" });
}

export async function upgradeAccount(email, password, fullName) {
  return apiJson("/auth/upgrade", "POST", { email, password, full_name: fullName });
}

// --- Chat / chat history --------------------------------------------------

export async function sendChatMessage(query, chatId, filters, signal) {
  return apiFetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, chat_id: chatId ?? null, filters: filters ?? null }),
    signal,
  });
}

export async function listChats() {
  return apiGet("/chats");
}

export async function getChat(chatId) {
  return apiGet(`/chats/${chatId}`);
}

export async function renameChat(chatId, title) {
  return apiJson(`/chats/${chatId}`, "PATCH", { title });
}

export async function deleteChat(chatId) {
  return apiFetch(`/chats/${chatId}`, { method: "DELETE" });
}

// --- Documents ------------------------------------------------------------

export async function uploadDocument(file, docType, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const url = new URL(`${API_BASE}/documents`, window.location.origin);
  if (docType) url.searchParams.set("doc_type", docType);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // Use the full URL, not just pathname+search — API_BASE is an absolute
    // origin in production (no dev-server proxy once this is a static
    // build), and stripping the origin here would silently send the
    // request to the frontend's own domain instead of the API.
    xhr.open("POST", url.toString());
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // ignore
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        reject(new ApiError(body?.detail ?? xhr.statusText, xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError("Network error", 0));
    xhr.send(formData);
  });
}

export async function listDocuments() {
  return apiGet("/documents");
}

export async function deleteDocument(documentId) {
  return apiFetch(`/documents/${documentId}`, { method: "DELETE" });
}

// --- Study tools: summaries, keypoints, flashcards -------------------------

export async function createSummary(documentId) {
  return apiFetch(`/documents/${documentId}/summary`, { method: "POST" });
}

export async function listSummaries(documentId) {
  return apiGet(`/documents/${documentId}/summary`);
}

export async function createKeypoints(documentId) {
  return apiFetch(`/documents/${documentId}/keypoints`, { method: "POST" });
}

export async function listKeypoints(documentId) {
  return apiGet(`/documents/${documentId}/keypoints`);
}

export async function createFlashcards(documentId, count) {
  return apiJson(`/documents/${documentId}/flashcards`, "POST", { count });
}

export async function listFlashcardSets(documentId) {
  return apiGet(`/documents/${documentId}/flashcards`);
}

export async function getFlashcardSet(setId) {
  return apiGet(`/flashcards/${setId}`);
}

// --- Assessments: quizzes & tests -----------------------------------------

export async function createAssessment(documentId, { kind, numQuestions, timeLimitMinutes }) {
  return apiJson(`/documents/${documentId}/assessments`, "POST", {
    kind,
    num_questions: numQuestions,
    time_limit_minutes: timeLimitMinutes ?? null,
  });
}

export async function listAssessments(documentId) {
  return apiGet(`/documents/${documentId}/assessments`);
}

export async function getAssessment(assessmentId) {
  return apiGet(`/assessments/${assessmentId}`);
}

export async function submitAttempt(assessmentId, answers) {
  return apiJson(`/assessments/${assessmentId}/attempts`, "POST", { answers });
}

export async function listAttempts(assessmentId) {
  return apiGet(`/assessments/${assessmentId}/attempts`);
}

export { ApiError };
