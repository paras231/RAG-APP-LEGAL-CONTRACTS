import {
  BookText,
  MoonStar,
  ScanSearch,
  Scale,
  ShieldCheck,
  Sun,
  UploadCloud,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";

const FEATURES = [
  {
    icon: ScanSearch,
    title: "Grounded, hybrid retrieval",
    description:
      "Semantic vector search fused with full-text search finds the exact clause, term, or citation — not just the vibe of your question.",
  },
  {
    icon: BookText,
    title: "Citation-backed answers",
    description:
      "Every answer traces back to the source document and section, so you can verify it in seconds, not minutes.",
  },
  {
    icon: UploadCloud,
    title: "Drop in PDFs & DOCX",
    description:
      "Upload contracts, statutes, or policies. Legal-structure-aware chunking keeps Articles and Sections intact.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    description:
      "Chat history stays in your browser's local storage only — nothing is stored server-side beyond your documents.",
  },
];

const STEPS = [
  { step: "01", title: "Upload", description: "Add your PDF or DOCX documents in seconds." },
  { step: "02", title: "Ask", description: "Ask questions in plain language, like chatting with a colleague." },
  { step: "03", title: "Verify", description: "Get grounded answers with citations back to the source text." },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "var(--color-accent-contrast)",
            }}
          >
            C
          </span>
          Counsel
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md p-2 hover:bg-[var(--color-surface)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <MoonStar size={18} />}
          </button>
          <Link
            to="/app"
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "var(--color-accent-contrast)",
            }}
          >
            Launch app
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 pb-20 pt-14 text-center sm:px-8 sm:pt-20">
        <div
          className="mx-auto mb-5 flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          <Zap size={13} style={{ color: "var(--color-accent)" }} />
          Retrieval-augmented, not hallucinated
        </div>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Ask your documents.
          <br />
          Get answers you can cite.
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl text-base sm:text-lg"
          style={{ color: "var(--color-text-muted)" }}
        >
          Upload contracts, statutes, or policies and chat with them directly.
          Every answer is grounded in your source text — no guessing.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/app"
            className="w-full rounded-lg px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] sm:w-auto"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "var(--color-accent-contrast)",
            }}
          >
            Start chatting — it's free
          </Link>
        </div>
      </section>

      <section
        className="border-y"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-subtle)" }}
      >
        <div className="mx-auto grid max-w-6xl gap-px px-5 py-14 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col gap-3 p-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                <Icon size={19} style={{ color: "var(--color-accent)" }} />
              </div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">
          Three steps to grounded answers
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map(({ step, title, description }) => (
            <div key={step} className="text-center sm:text-left">
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--color-accent)" }}
              >
                {step}
              </span>
              <h3 className="mt-2 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-5 py-20 text-center sm:px-8">
          <Scale size={32} style={{ color: "var(--color-accent)" }} />
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Stop searching. Start asking.
          </h2>
          <Link
            to="/app"
            className="rounded-lg px-6 py-3 text-sm font-semibold"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "var(--color-accent-contrast)",
            }}
          >
            Launch the app
          </Link>
        </div>
      </section>

      <footer
        className="border-t px-5 py-6 text-center text-xs sm:px-8"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        Built for document-grounded conversations. Chat history stays in your browser.
      </footer>
    </div>
  );
}
