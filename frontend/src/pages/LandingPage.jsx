import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Brain,
  GraduationCap,
  ListChecks,
  Loader2,
  MoonStar,
  Sparkles,
  Sun,
  Timer,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

const FEATURES = [
  {
    icon: Brain,
    title: "Ask your notes anything",
    description:
      "Hybrid semantic + keyword search finds the exact passage in your notes, so answers are grounded — not guessed.",
  },
  {
    icon: ListChecks,
    title: "Flashcards, quizzes & tests",
    description:
      "Auto-generate flashcards, summaries, key points, quizzes, and timed tests from any document in one click.",
  },
  {
    icon: UploadCloud,
    title: "Drop in PDFs & DOCX",
    description:
      "Upload lecture notes, slides, or textbook chapters. Heading-aware chunking keeps chapters and sections intact.",
  },
  {
    icon: Timer,
    title: "Track your progress",
    description:
      "Every quiz and test attempt is saved to your account, so you can see how your understanding improves over time.",
  },
];

const STEPS = [
  { step: "01", title: "Upload", description: "Add your PDF or DOCX notes in seconds." },
  { step: "02", title: "Study", description: "Chat, generate flashcards, summaries, and key points." },
  { step: "03", title: "Test yourself", description: "Take an auto-generated quiz or timed test and track your score." },
];

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const { continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const [isTrying, setIsTrying] = useState(false);
  const [tryError, setTryError] = useState(null);

  const handleTryIt = async () => {
    setTryError(null);
    setIsTrying(true);
    try {
      await continueAsGuest();
      navigate("/app");
    } catch (err) {
      setTryError(err.message || "Could not start a guest session.");
    } finally {
      setIsTrying(false);
    }
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span
            className="brand-gradient flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ color: "var(--color-accent-contrast)" }}
          >
            <GraduationCap size={17} />
          </span>
          <span className="hidden sm:inline">StudyMate</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex-shrink-0 rounded-md p-2 hover:bg-[var(--color-surface)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <MoonStar size={18} />}
          </button>
          <Link
            to="/login"
            className="flex-shrink-0 rounded-md px-2.5 py-2 text-sm font-medium hover:bg-[var(--color-surface)] sm:px-3"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="brand-gradient flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-transform hover:scale-[1.03] sm:px-4"
            style={{ color: "var(--color-accent-contrast)" }}
          >
            Get started
          </Link>
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div
          className="blob -left-24 -top-24 h-72 w-72"
          style={{ backgroundColor: "var(--color-accent)" }}
          aria-hidden="true"
        />
        <div
          className="blob -right-16 top-10 h-80 w-80"
          style={{ backgroundColor: "var(--color-accent-2)", animationDelay: "-6s" }}
          aria-hidden="true"
        />

        <section className="relative mx-auto max-w-4xl px-5 pb-20 pt-14 text-center sm:px-8 sm:pt-20">
          <div className="ai-badge mx-auto mb-5 w-fit">
            <Sparkles size={13} />
            AI-powered study assistant
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Turn your notes into
            <br />
            <span className="brand-gradient-text">flashcards, quizzes &amp; answers.</span>
          </h1>
          <p
            className="mx-auto mt-5 max-w-xl text-base sm:text-lg"
            style={{ color: "var(--color-text-muted)" }}
          >
            Upload your PDF or DOCX notes and chat with them directly. Get instant
            summaries, key points, flashcards, and quizzes — all grounded in your
            own material.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="brand-glow brand-gradient w-full rounded-lg px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] sm:w-auto"
              style={{ color: "var(--color-accent-contrast)" }}
            >
              Start studying — it's free
            </Link>
            <button
              type="button"
              onClick={handleTryIt}
              disabled={isTrying}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border px-6 py-3 text-sm font-semibold transition-colors hover:bg-[var(--color-surface)] disabled:opacity-60 sm:w-auto"
              style={{ borderColor: "var(--color-border)" }}
            >
              {isTrying ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              Try it — no signup
            </button>
          </div>
          {tryError && (
            <p
              className="mt-3 flex items-center justify-center gap-1.5 text-sm"
              style={{ color: "var(--color-danger)" }}
            >
              <AlertCircle size={14} />
              {tryError}
            </p>
          )}
          <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
            No account needed to try it — sign up any time to save your chat and progress.
          </p>
        </section>
      </div>

      <section
        className="border-y"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-subtle)" }}
      >
        <div className="mx-auto grid max-w-6xl gap-px px-5 py-14 sm:px-8 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="card-elevated flex flex-col gap-3 rounded-2xl p-4"
              style={{ backgroundColor: "var(--color-bg-elevated)" }}
            >
              <div
                className="brand-gradient flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ color: "var(--color-accent-contrast)" }}
              >
                <Icon size={19} />
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
          Three steps to studying smarter
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map(({ step, title, description }) => (
            <div key={step} className="text-center sm:text-left">
              <span className="brand-gradient-text text-sm font-bold">{step}</span>
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
          <span
            className="brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ color: "var(--color-accent-contrast)" }}
          >
            <BookOpen size={26} />
          </span>
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Stop re-reading. Start recalling.
          </h2>
          <Link
            to="/signup"
            className="brand-glow brand-gradient rounded-lg px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.02]"
            style={{ color: "var(--color-accent-contrast)" }}
          >
            Create your free account
          </Link>
        </div>
      </section>

      <footer
        className="border-t px-5 py-6 text-center text-xs sm:px-8"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        Built for students who'd rather understand than re-read.
      </footer>
    </div>
  );
}
