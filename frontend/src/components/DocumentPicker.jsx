import { Check, ChevronDown, File as FileIcon, Files } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

export default function DocumentPicker({ documents, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClickAway);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClickAway);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedDoc = documents.find((d) => d.id === selectedId);
  const label = selectedDoc ? selectedDoc.filename : "All documents";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--color-surface)]"
        style={{ borderColor: "var(--color-border)" }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedDoc ? <FileIcon size={13} /> : <Files size={13} />}
        <span className="max-w-[160px] truncate sm:max-w-[240px]">{label}</span>
        <ChevronDown size={13} style={{ color: "var(--color-text-muted)" }} />
      </button>

      {open && (
        <div
          className="absolute left-0 z-20 mt-1.5 max-h-72 w-64 overflow-y-auto rounded-xl border p-1 shadow-lg animate-fade-in"
          style={{
            backgroundColor: "var(--color-bg-elevated)",
            borderColor: "var(--color-border)",
          }}
          role="listbox"
        >
          <button
            type="button"
            onClick={() => {
              onSelect(null, "All documents");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--color-surface)]"
          >
            <Files size={15} style={{ color: "var(--color-text-muted)" }} />
            <span className="flex-1 truncate">All documents</span>
            {!selectedId && <Check size={14} style={{ color: "var(--color-accent)" }} />}
          </button>

          {documents.length > 0 && (
            <div
              className="my-1 border-t"
              style={{ borderColor: "var(--color-border)" }}
            />
          )}

          {documents.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => {
                onSelect(doc.id, doc.filename);
                setOpen(false);
              }}
              className={clsx(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-[var(--color-surface)]",
              )}
            >
              <FileIcon size={15} style={{ color: "var(--color-text-muted)" }} />
              <span className="flex-1 truncate">{doc.filename}</span>
              {selectedId === doc.id && (
                <Check size={14} style={{ color: "var(--color-accent)" }} />
              )}
            </button>
          ))}

          {documents.length === 0 && (
            <p
              className="px-2.5 py-2 text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              No documents uploaded yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
