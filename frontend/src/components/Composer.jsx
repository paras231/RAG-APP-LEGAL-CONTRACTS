import { AlertCircle, ArrowUp, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_LENGTH = 4000;

export default function Composer({ onSend, isSending, onStop, disabled, disabledHint }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSending || disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_LENGTH) {
      setError(`Message is too long (${trimmed.length}/${MAX_LENGTH} characters).`);
      return;
    }
    setError(null);
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
      {disabled && disabledHint && (
        <p
          className="mb-2 px-1 text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          {disabledHint}
        </p>
      )}
      <div
        className="flex items-end gap-2 rounded-2xl border p-2 shadow-sm"
        style={{
          backgroundColor: "var(--color-bg-elevated)",
          borderColor: "var(--color-border)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask a question about your notes…"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        {isSending ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text)",
            }}
            aria-label="Stop generating"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            className="brand-gradient flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
            style={{ color: "var(--color-accent-contrast)" }}
            aria-label="Send message"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
      {error ? (
        <p
          className="mt-2 flex items-center justify-center gap-1.5 px-1 text-center text-xs"
          style={{ color: "var(--color-danger)" }}
        >
          <AlertCircle size={13} />
          {error}
        </p>
      ) : (
        <p
          className="mt-2 px-1 text-center text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          StudyMate can make mistakes. Verify important information against your notes.
        </p>
      )}
    </form>
  );
}
