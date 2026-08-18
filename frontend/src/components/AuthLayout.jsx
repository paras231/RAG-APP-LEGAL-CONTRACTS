import {
  AlertCircle,
  ArrowLeft,
  Brain,
  GraduationCap,
  Layers,
  ListChecks,
  Loader2,
  MoonStar,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

const VALUE_PROPS = [
  {
    icon: Brain,
    title: "Grounded answers, not guesses",
    description: "Every response cites the exact passage in your notes it came from.",
  },
  {
    icon: Layers,
    title: "Flashcards & summaries, generated",
    description: "Turn a dense chapter into study-ready material in one click.",
  },
  {
    icon: ListChecks,
    title: "Quizzes & timed tests",
    description: "Practice retrieval, not just recognition, and track your score over time.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    description: "Your notes and study history are tied to your account, never shared.",
  },
];

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
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
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]" style={{ backgroundColor: "var(--color-bg)" }}>
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        <div
          className="blob -left-20 -top-20 h-72 w-72"
          style={{ backgroundColor: "rgba(255,255,255,0.35)" }}
          aria-hidden="true"
        />
        <div
          className="blob -bottom-24 right-0 h-80 w-80"
          style={{ backgroundColor: "rgba(0,0,0,0.2)", animationDelay: "-8s" }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
              <GraduationCap size={17} />
            </span>
            StudyMate
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={13} />
            Back to site
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            AI-native study platform
          </div>
          <h2 className="text-3xl font-semibold leading-tight text-white">
            Your notes, turned into an AI tutor that actually knows your material.
          </h2>
          <ul className="mt-8 flex flex-col gap-5">
            {VALUE_PROPS.map(({ icon: Icon, title: t, description }) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon size={16} className="text-white" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{t}</p>
                  <p className="mt-0.5 text-sm text-white/75">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/60">
          Built on retrieval-augmented generation — answers are grounded in what you upload, not the open internet.
        </p>
      </aside>

      <div className="relative flex flex-col items-center justify-center px-6 py-10 sm:px-10">
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute right-4 top-4 rounded-md p-2 hover:bg-[var(--color-surface)] sm:right-6 sm:top-6"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <MoonStar size={18} />}
        </button>

        <Link
          to="/"
          className="mb-8 flex items-center gap-2 text-sm font-semibold lg:hidden"
          style={{ color: "var(--color-text)" }}
        >
          <span
            className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ color: "var(--color-accent-contrast)" }}
          >
            <GraduationCap size={17} />
          </span>
          StudyMate
        </Link>

        <div className="w-full max-w-sm">
          {eyebrow && <p className="ai-badge mb-4 w-fit">{eyebrow}</p>}
          <h1 className="text-2xl font-semibold" style={{ color: "var(--color-text)" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
              {subtitle}
            </p>
          )}

          <div className="mt-7">{children}</div>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              or
            </span>
            <span className="h-px flex-1" style={{ backgroundColor: "var(--color-border)" }} />
          </div>

          <button
            type="button"
            onClick={handleTryIt}
            disabled={isTrying}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-surface)] disabled:opacity-60"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            {isTrying && <Loader2 size={14} className="animate-spin" />}
            Try it without an account
          </button>
          {tryError && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs" style={{ color: "var(--color-danger)" }}>
              <AlertCircle size={13} />
              {tryError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
