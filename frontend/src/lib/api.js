const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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
    throw new ApiError(
      typeof detail === "string" ? detail : JSON.stringify(detail),
      res.status,
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res);
}

export async function sendChatMessage(query, filters, signal) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, filters: filters ?? null }),
    signal,
  });
  return handleResponse(res);
}

export async function uploadDocument(file, docType, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const url = new URL(`${API_BASE}/documents`, window.location.origin);
  if (docType) url.searchParams.set("doc_type", docType);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url.pathname + url.search);
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
  const res = await fetch(`${API_BASE}/documents`);
  return handleResponse(res);
}

export async function deleteDocument(documentId) {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

export { ApiError };
