import {
  ArrowLeft,
  BookOpen,
  Layers,
  ListChecks,
  Loader2,
  Plus,
  Sparkles,
  Timer,
} from "lucide-react";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router-dom";
import AssessmentRunner from "../components/AssessmentRunner.jsx";
import FlashcardViewer from "../components/FlashcardViewer.jsx";
import * as api from "../lib/api.js";
import { validateIntInRange } from "../lib/validators.js";

const TABS = [
  { id: "summary", label: "Summary", icon: BookOpen },
  { id: "keypoints", label: "Key points", icon: Sparkles },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "quiz", label: "Quiz", icon: ListChecks },
  { id: "test", label: "Test", icon: Timer },
];

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active && "brand-gradient",
      )}
      style={{
        backgroundColor: active ? undefined : "transparent",
        color: active ? "var(--color-accent-contrast)" : "var(--color-text-muted)",
      }}
    >
      <Icon size={15} />
      {tab.label}
    </button>
  );
}

function GenerateButton({ label, onClick, isLoading }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="brand-gradient flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-transform hover:scale-[1.02] disabled:opacity-60"
      style={{ color: "var(--color-accent-contrast)" }}
    >
      {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
      {label}
    </button>
  );
}

function SummaryTab({ documentId }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await api.listSummaries(documentId);
      setSummary(list[0] ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const created = await api.createSummary(documentId);
      setSummary(created);
    } catch (err) {
      setError(err.message || "Could not generate a summary.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <Loading />;

  return (
    <div className="flex flex-col gap-4">
      <GenerateButton
        label={summary ? "Regenerate summary" : "Generate summary"}
        onClick={generate}
        isLoading={isGenerating}
      />
      {error && (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      {summary ? (
        <div className="markdown-body rounded-xl border p-4 text-sm" style={{ borderColor: "var(--color-border)" }}>
          <ReactMarkdown>{summary.content}</ReactMarkdown>
        </div>
      ) : (
        <EmptyHint text="No summary yet. Generate one from this document's notes." />
      )}
    </div>
  );
}

function KeypointsTab({ documentId }) {
  const [keypoints, setKeypoints] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await api.listKeypoints(documentId);
      setKeypoints(list[0] ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const created = await api.createKeypoints(documentId);
      setKeypoints(created);
    } catch (err) {
      setError(err.message || "Could not generate key points.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <Loading />;

  return (
    <div className="flex flex-col gap-4">
      <GenerateButton
        label={keypoints ? "Regenerate key points" : "Generate key points"}
        onClick={generate}
        isLoading={isGenerating}
      />
      {error && (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      {keypoints && keypoints.points.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {keypoints.points.map((point, i) => (
            <li
              key={i}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            >
              {point}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyHint text="No key points yet. Generate them from this document's notes." />
      )}
    </div>
  );
}

function FlashcardsTab({ documentId }) {
  const [sets, setSets] = useState([]);
  const [activeSet, setActiveSet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [count, setCount] = useState(10);
  const [countError, setCountError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await api.listFlashcardSets(documentId);
      setSets(list);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = async () => {
    const error = validateIntInRange(count, { min: 3, max: 30, label: "Number of cards" });
    setCountError(error);
    if (error) return;

    setIsGenerating(true);
    try {
      const created = await api.createFlashcards(documentId, count);
      setSets((prev) => [created, ...prev]);
      setActiveSet(created);
    } catch (err) {
      setCountError(err.message || "Could not generate flashcards.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <Loading />;

  if (activeSet) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setActiveSet(null)}
          className="flex w-fit items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ArrowLeft size={14} />
          Back to sets
        </button>
        <FlashcardViewer flashcards={activeSet.flashcards} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="flashcard-count" className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          Number of cards
        </label>
        <input
          id="flashcard-count"
          type="number"
          min={3}
          max={30}
          value={count}
          onChange={(e) => {
            const next = e.target.value === "" ? "" : Number(e.target.value);
            setCount(next);
            if (countError) setCountError(validateIntInRange(next, { min: 3, max: 30, label: "Number of cards" }));
          }}
          aria-invalid={Boolean(countError)}
          className="w-16 rounded-md border px-2 py-1 text-xs"
          style={{
            borderColor: countError ? "var(--color-danger)" : "var(--color-border)",
            backgroundColor: "var(--color-bg-elevated)",
          }}
        />
        <GenerateButton label="Generate flashcards" onClick={generate} isLoading={isGenerating} />
      </div>
      {countError && (
        <p className="-mt-2 text-xs" style={{ color: "var(--color-danger)" }}>
          {countError}
        </p>
      )}

      {sets.length === 0 ? (
        <EmptyHint text="No flashcard sets yet. Generate your first set above." />
      ) : (
        <ul className="flex flex-col gap-2">
          {sets.map((set) => (
            <li key={set.id}>
              <button
                type="button"
                onClick={() => setActiveSet(set)}
                className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-[var(--color-surface)]"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span>{set.title}</span>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {set.flashcards.length} cards
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssessmentTab({ documentId, kind }) {
  const [assessments, setAssessments] = useState([]);
  const [active, setActive] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [timeLimit, setTimeLimit] = useState(10);
  const [errors, setErrors] = useState({});

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await api.listAssessments(documentId);
      setAssessments(list.filter((a) => a.kind === kind));
    } finally {
      setIsLoading(false);
    }
  }, [documentId, kind]);

  useEffect(() => {
    refresh();
    setActive(null);
    setErrors({});
  }, [refresh]);

  const validate = () => {
    const next = {
      numQuestions: validateIntInRange(numQuestions, { min: 3, max: 20, label: "Questions" }),
      timeLimit:
        kind === "test"
          ? validateIntInRange(timeLimit, { min: 1, max: 300, label: "Time limit" })
          : null,
    };
    setErrors(next);
    return next;
  };

  const generate = async () => {
    const validation = validate();
    if (Object.values(validation).some(Boolean)) return;

    setIsGenerating(true);
    try {
      const created = await api.createAssessment(documentId, {
        kind,
        numQuestions,
        timeLimitMinutes: kind === "test" ? timeLimit : null,
      });
      setAssessments((prev) => [created, ...prev]);
      setActive(created);
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: err.message || `Could not generate ${kind}.` }));
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <Loading />;

  if (active) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setActive(null)}
          className="flex w-fit items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ArrowLeft size={14} />
          Back to {kind === "test" ? "tests" : "quizzes"}
        </button>
        <AssessmentRunner
          assessment={active}
          onSubmit={(answers) => api.submitAttempt(active.id, answers)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="num-questions" className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          Questions
        </label>
        <input
          id="num-questions"
          type="number"
          min={3}
          max={20}
          value={numQuestions}
          onChange={(e) => {
            const next = e.target.value === "" ? "" : Number(e.target.value);
            setNumQuestions(next);
            if (errors.numQuestions) {
              setErrors((prev) => ({
                ...prev,
                numQuestions: validateIntInRange(next, { min: 3, max: 20, label: "Questions" }),
              }));
            }
          }}
          aria-invalid={Boolean(errors.numQuestions)}
          className="w-16 rounded-md border px-2 py-1 text-xs"
          style={{
            borderColor: errors.numQuestions ? "var(--color-danger)" : "var(--color-border)",
            backgroundColor: "var(--color-bg-elevated)",
          }}
        />
        {kind === "test" && (
          <>
            <label htmlFor="time-limit" className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Time limit (min)
            </label>
            <input
              id="time-limit"
              type="number"
              min={1}
              max={300}
              value={timeLimit}
              onChange={(e) => {
                const next = e.target.value === "" ? "" : Number(e.target.value);
                setTimeLimit(next);
                if (errors.timeLimit) {
                  setErrors((prev) => ({
                    ...prev,
                    timeLimit: validateIntInRange(next, { min: 1, max: 300, label: "Time limit" }),
                  }));
                }
              }}
              aria-invalid={Boolean(errors.timeLimit)}
              className="w-16 rounded-md border px-2 py-1 text-xs"
              style={{
                borderColor: errors.timeLimit ? "var(--color-danger)" : "var(--color-border)",
                backgroundColor: "var(--color-bg-elevated)",
              }}
            />
          </>
        )}
        <GenerateButton
          label={`Generate ${kind}`}
          onClick={generate}
          isLoading={isGenerating}
        />
      </div>
      {(errors.numQuestions || errors.timeLimit || errors.form) && (
        <p className="-mt-2 text-xs" style={{ color: "var(--color-danger)" }}>
          {errors.numQuestions || errors.timeLimit || errors.form}
        </p>
      )}

      {assessments.length === 0 ? (
        <EmptyHint text={`No ${kind === "test" ? "tests" : "quizzes"} yet. Generate one above.`} />
      ) : (
        <ul className="flex flex-col gap-2">
          {assessments.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setActive(a)}
                className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-[var(--color-surface)]"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span>{a.title}</span>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {a.questions.length} questions
                  {a.time_limit_minutes ? ` · ${a.time_limit_minutes} min` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 py-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
      <Loader2 size={16} className="animate-spin" />
      Loading…
    </div>
  );
}

function EmptyHint({ text }) {
  return (
    <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
      {text}
    </p>
  );
}

export default function StudyToolsPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [documentName, setDocumentName] = useState(null);
  const [tab, setTab] = useState("summary");

  useEffect(() => {
    api
      .listDocuments()
      .then((docs) => {
        const doc = docs.find((d) => d.id === documentId);
        setDocumentName(doc?.filename ?? null);
      })
      .catch(() => {});
  }, [documentId]);

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      <header
        className="flex items-center gap-3 border-b px-4 py-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-md p-1.5 hover:bg-[var(--color-surface)]"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{documentName ?? "Study tools"}</p>
          <Link to="/app" className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Back to chat
          </Link>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b px-3 py-2" style={{ borderColor: "var(--color-border)" }}>
        {TABS.map((t) => (
          <TabButton key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-4">
        {tab === "summary" && <SummaryTab documentId={documentId} />}
        {tab === "keypoints" && <KeypointsTab documentId={documentId} />}
        {tab === "flashcards" && <FlashcardsTab documentId={documentId} />}
        {tab === "quiz" && <AssessmentTab documentId={documentId} kind="quiz" />}
        {tab === "test" && <AssessmentTab documentId={documentId} kind="test" />}
      </main>
    </div>
  );
}
