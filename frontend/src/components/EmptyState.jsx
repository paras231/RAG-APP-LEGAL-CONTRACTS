import { BookOpen, FileText, GraduationCap, ListChecks } from "lucide-react";

const SUGGESTIONS = [
  { icon: BookOpen, text: "Summarize the key ideas in these notes" },
  { icon: ListChecks, text: "Quiz me on the most important concepts" },
  { icon: FileText, text: "List the key terms and their definitions" },
];

export default function EmptyState({ hasDocuments, hasSelectedDocument, onOpenDocuments, onSuggestion }) {
  const canChat = hasDocuments && hasSelectedDocument;

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 text-center">
      <div
        className="brand-gradient brand-glow mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ color: "var(--color-accent-contrast)" }}
      >
        <GraduationCap size={24} />
      </div>
      <h1 className="text-xl font-semibold">What are you studying today?</h1>
      <p
        className="mt-2 text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        {canChat
          ? "Ask a question and I'll answer using this document, with citations."
          : hasDocuments
            ? "Pick a document above to start chatting about it."
            : "Upload a PDF or DOCX of your notes first so I have something to study from."}
      </p>

      {!hasDocuments && (
        <button
          type="button"
          onClick={onOpenDocuments}
          className="brand-gradient mt-5 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-transform hover:scale-[1.02]"
          style={{ color: "var(--color-accent-contrast)" }}
        >
          Upload your notes
        </button>
      )}

      {canChat && (
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
