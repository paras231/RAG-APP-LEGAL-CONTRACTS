import { AlertCircle, CheckCircle2, Timer, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

export default function AssessmentRunner({ assessment, onSubmit }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const timeLimitSeconds = assessment.time_limit_minutes ? assessment.time_limit_minutes * 60 : null;
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds);

  const questions = assessment.questions ?? [];
  const question = questions[index];
  const answeredCount = Object.keys(answers).length;

  const submit = useMemo(
    () => async () => {
      if (result || isSubmitting) return;
      setIsSubmitting(true);
      setError(null);
      try {
        const attempt = await onSubmit(answers);
        setResult(attempt);
      } catch (err) {
        setError(err.message || "Could not submit your answers.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [answers, isSubmitting, onSubmit, result],
  );

  useEffect(() => {
    if (secondsLeft === null || result) return;
    if (secondsLeft <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, result, submit]);

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="flex items-center gap-3 rounded-xl border p-4"
          style={{ borderColor: "var(--color-border)", backgroundImage: "var(--gradient-brand-soft)" }}
        >
          <span className="brand-gradient-text text-2xl font-bold">
            {result.score}/{result.total}
          </span>
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {Math.round((result.score / Math.max(result.total, 1)) * 100)}% correct
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {result.questions.map((q, i) => {
            const given = answers[q.id];
            const correct = given?.trim() === q.correct_answer.trim();
            return (
              <div
                key={q.id}
                className="rounded-xl border p-3 text-sm"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex items-start gap-2">
                  {correct ? (
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-accent)" }} />
                  ) : (
                    <XCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-danger)" }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {i + 1}. {q.question}
                    </p>
                    <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
                      Your answer: {given || "—"}
                    </p>
                    {!correct && (
                      <p className="mt-0.5" style={{ color: "var(--color-accent)" }}>
                        Correct answer: {q.correct_answer}
                      </p>
                    )}
                    {q.explanation && (
                      <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        This assessment has no questions.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <span>
          Question {index + 1} of {questions.length} · {answeredCount} answered
        </span>
        {secondsLeft !== null && (
          <span className="flex flex-shrink-0 items-center gap-1 font-medium" style={{ color: secondsLeft < 60 ? "var(--color-danger)" : "var(--color-text-muted)" }}>
            <Timer size={14} />
            {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
            {String(secondsLeft % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)" }}>
        <p className="mb-3 font-medium">{question.question}</p>
        <div className="flex flex-col gap-2">
          {question.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: choice }))}
              className={clsx(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                answers[question.id] === choice ? "font-medium" : "hover:bg-[var(--color-surface)]",
              )}
              style={{
                borderColor: answers[question.id] === choice ? "var(--color-accent)" : "var(--color-border)",
                backgroundColor: answers[question.id] === choice ? "var(--color-surface)" : "transparent",
              }}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-danger)" }}>
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-surface)] disabled:opacity-40"
          style={{ borderColor: "var(--color-border)" }}
        >
          Previous
        </button>
        {index < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            className="rounded-lg px-4 py-1.5 text-sm font-medium"
            style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-contrast)" }}
          >
            {isSubmitting ? "Submitting…" : "Submit"}
          </button>
        )}
      </div>
    </div>
  );
}
