import { TABS } from "./StudyToolsPanel.jsx";

/** Floating vertical rail of study-tool shortcuts docked to the right edge
 * of the chat, so summary/keypoints/flashcards/quiz/test stay one click
 * away without ever leaving the conversation. Hidden while the panel it
 * opens is itself open, since that panel has its own tab switcher. */
export default function StudyToolsDock({ hidden, onOpenTool }) {
  if (hidden) return null;

  return (
    <div
      className="fixed right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1 rounded-2xl border p-1.5 shadow-lg sm:right-4"
      style={{ backgroundColor: "var(--color-bg-elevated)", borderColor: "var(--color-border)" }}
    >
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onOpenTool(id)}
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-[var(--color-surface)]"
          style={{ color: "var(--color-text-muted)" }}
          aria-label={label}
          title={label}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
}
