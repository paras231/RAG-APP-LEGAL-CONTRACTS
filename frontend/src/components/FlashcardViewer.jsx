import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useState } from "react";

export default function FlashcardViewer({ flashcards }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!flashcards || flashcards.length === 0) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        No flashcards in this set.
      </p>
    );
  }

  const card = flashcards[index];

  const goTo = (next) => {
    setFlipped(false);
    setIndex(next);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-[180px] w-full max-w-md flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center transition-colors"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-bg-elevated)",
        }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          {flipped ? "Answer" : "Question"}
        </span>
        <p className="text-base leading-relaxed">{flipped ? card.answer : card.question}</p>
        <span
          className="mt-1 flex items-center gap-1 text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          <RotateCw size={12} />
          Click to flip
        </span>
      </button>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => goTo(Math.max(0, index - 1))}
          disabled={index === 0}
          className="rounded-full p-2 hover:bg-[var(--color-surface)] disabled:opacity-30"
          aria-label="Previous card"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {index + 1} / {flashcards.length}
        </span>
        <button
          type="button"
          onClick={() => goTo(Math.min(flashcards.length - 1, index + 1))}
          disabled={index === flashcards.length - 1}
          className="rounded-full p-2 hover:bg-[var(--color-surface)] disabled:opacity-30"
          aria-label="Next card"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
