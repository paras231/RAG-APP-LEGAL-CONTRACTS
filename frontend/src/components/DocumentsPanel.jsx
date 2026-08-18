import {
  AlertCircle,
  CheckCircle2,
  File as FileIcon,
  MessageSquare,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { deleteDocument, listDocuments, uploadDocument } from "../lib/api.js";
import ConfirmDialog from "./ConfirmDialog.jsx";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB client-side guard

const DOC_TYPES = [
  { value: "unknown", label: "Unspecified" },
  { value: "lecture_notes", label: "Lecture notes" },
  { value: "textbook", label: "Textbook chapter" },
  { value: "slides", label: "Slides" },
  { value: "study_guide", label: "Study guide" },
  { value: "other", label: "Other" },
];

function validateFile(file) {
  const lowerName = file.name.toLowerCase();
  const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext),
  );
  if (!hasValidExtension) {
    return `Unsupported file type. Only ${ACCEPTED_EXTENSIONS.join(", ")} are allowed.`;
  }
  if (file.size === 0) {
    return "File is empty.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).`;
  }
  return null;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function DocumentsPanel({ open, onClose, onDocumentsChanged, onSelectDocument }) {
  const [documents, setDocuments] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [docType, setDocType] = useState("unknown");
  const [uploads, setUploads] = useState([]); // { id, name, progress, status, error }
  const [isDragging, setIsDragging] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const fileInputRef = useRef(null);

  const refreshDocuments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      onDocumentsChanged?.(docs);
    } catch (err) {
      setLoadError(err.message || "Failed to load documents.");
    } finally {
      setIsLoading(false);
    }
  }, [onDocumentsChanged]);

  useEffect(() => {
    if (open) refreshDocuments();
  }, [open, refreshDocuments]);

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList);
      files.forEach((file) => {
        const uploadId = crypto.randomUUID();
        const error = validateFile(file);

        setUploads((prev) => [
          ...prev,
          {
            id: uploadId,
            name: file.name,
            progress: 0,
            status: error ? "error" : "uploading",
            error,
          },
        ]);

        if (error) return;

        uploadDocument(file, docType, (progress) => {
          setUploads((prev) =>
            prev.map((u) => (u.id === uploadId ? { ...u, progress } : u)),
          );
        })
          .then(() => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === uploadId ? { ...u, status: "done", progress: 100 } : u,
              ),
            );
            refreshDocuments();
          })
          .catch((err) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === uploadId
                  ? { ...u, status: "error", error: err.message || "Upload failed" }
                  : u,
              ),
            );
          });
      });
    },
    [docType, refreshDocuments],
  );

  const dismissUpload = (id) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    try {
      await deleteDocument(id);
      onDocumentsChanged?.(documents.filter((d) => d.id !== id));
    } catch (err) {
      setLoadError(err.message || "Failed to delete document.");
      refreshDocuments();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-xl animate-fade-in"
        style={{
          backgroundColor: "var(--color-bg-elevated)",
          borderColor: "var(--color-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b p-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="text-base font-semibold">Documents</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-[var(--color-surface)]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label
              htmlFor="doc-type-select"
              className="text-xs font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              Document type for new uploads
            </label>
            <select
              id="doc-type-select"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="rounded-md border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg-elevated)",
              }}
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors"
            style={{
              borderColor: isDragging
                ? "var(--color-accent)"
                : "var(--color-border)",
              backgroundColor: isDragging ? "var(--color-surface)" : "transparent",
            }}
          >
            <UploadCloud
              size={28}
              style={{ color: "var(--color-text-muted)" }}
            />
            <p className="text-sm font-medium">
              Drag & drop a file, or click to browse
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              PDF or DOCX, up to 25MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {uploads.length > 0 && (
            <ul className="mt-3 space-y-2">
              {uploads.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {u.status === "uploading" && (
                    <Loader2 size={16} className="flex-shrink-0 animate-spin" />
                  )}
                  {u.status === "done" && (
                    <CheckCircle2
                      size={16}
                      className="flex-shrink-0"
                      style={{ color: "var(--color-accent)" }}
                    />
                  )}
                  {u.status === "error" && (
                    <AlertCircle
                      size={16}
                      className="flex-shrink-0"
                      style={{ color: "var(--color-danger)" }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{u.name}</p>
                    {u.status === "uploading" && (
                      <div
                        className="mt-1 h-1 w-full overflow-hidden rounded-full"
                        style={{ backgroundColor: "var(--color-surface)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${u.progress}%`,
                            backgroundColor: "var(--color-accent)",
                          }}
                        />
                      </div>
                    )}
                    {u.status === "error" && (
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--color-danger)" }}
                      >
                        {u.error}
                      </p>
                    )}
                  </div>
                  {u.status !== "uploading" && (
                    <button
                      type="button"
                      onClick={() => dismissUpload(u.id)}
                      className="flex-shrink-0 rounded-md p-1 hover:bg-[var(--color-surface)]"
                      aria-label="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5">
            <h3
              className="mb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}
            >
              Uploaded documents
            </h3>

            {loadError && (
              <p className="mb-2 text-sm" style={{ color: "var(--color-danger)" }}>
                {loadError}
              </p>
            )}

            {isLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
                <Loader2 size={16} className="animate-spin" />
                Loading…
              </div>
            ) : documents.length === 0 ? (
              <p className="py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
                No documents uploaded yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <FileIcon
                      size={16}
                      className="flex-shrink-0"
                      style={{ color: "var(--color-text-muted)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{doc.filename}</p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {doc.doc_type} · {formatDate(doc.uploaded_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDocument?.(doc);
                        onClose();
                      }}
                      className="flex-shrink-0 rounded-md p-1.5 hover:bg-[var(--color-surface)]"
                      aria-label={`Chat and use study tools with ${doc.filename}`}
                      title="Use in chat"
                    >
                      <MessageSquare size={15} style={{ color: "var(--color-text-muted)" }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(doc)}
                      className="flex-shrink-0 rounded-md p-1.5 hover:bg-[var(--color-surface)]"
                      aria-label={`Delete ${doc.filename}`}
                    >
                      <Trash2 size={15} style={{ color: "var(--color-danger)" }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete document?"
        description={
          pendingDelete
            ? `"${pendingDelete.filename}" and all of its indexed content will be permanently removed.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
