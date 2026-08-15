import { FileText, Scale, Search, ShieldCheck } from "lucide-react";

const SUGGESTIONS = [
  { icon: Search, text: "Summarize the key obligations in this contract" },
  { icon: ShieldCheck, text: "What are the termination conditions?" },
  { icon: FileText, text: "List all defined terms and their meanings" },
];

export default function EmptyState({ hasDocuments, onOpenDocuments, onSuggestion }) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: "var(--color-accent)",
          color: "var(--color-accent-contrast)",
        }}
      >
        <Scale size={24} />
      </div>
      <h1 className="text-xl font-semibold">How can I help with your documents?</h1>
      <p
        className="mt-2 text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        {hasDocuments
          ? "Ask a question and I'll answer using your uploaded documents, with citations."
          : "Upload a PDF or DOCX first so I have something to search over."}
      </p>

      {!hasDocuments ? (
        <button
          type="button"
          onClick={onOpenDocuments}
          className="mt-5 rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-accent)",
            color: "var(--color-accent-contrast)",
          }}
        >
          Upload a document
        </button>
      ) : (
        <div className="mt-6 flex w-full flex-col gap-2">
          {SUGGESTIONS.map(({ icon: Icon, text }) => (
            <button
              key={text}
              type="button"
              onClick={() => onSuggestion(text)}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--color-surface)]"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Icon size={16} style={{ color: "var(--color-text-muted)" }} />
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
