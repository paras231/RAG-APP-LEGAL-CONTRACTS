import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { validateConfirmPassword, validateEmail, validateSignupPassword } from "../lib/validators.js";
import FormField from "./FormField.jsx";

export default function SaveProgressDialog({ open, onClose }) {
  const { upgradeAccount } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const runValidators = () => ({
    email: validateEmail(email),
    password: validateSignupPassword(password),
    confirmPassword: validateConfirmPassword(password, confirmPassword),
  });

  const validateField = (name) => {
    const error = runValidators()[name];
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setFieldErrors((prev) => ({
      ...prev,
      password: prev.password ? validateSignupPassword(value) : prev.password,
      confirmPassword: prev.confirmPassword
        ? validateConfirmPassword(value, confirmPassword)
        : prev.confirmPassword,
    }));
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setFieldErrors((prev) => ({
      ...prev,
      confirmPassword: prev.confirmPassword ? validateConfirmPassword(password, value) : prev.confirmPassword,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const errors = runValidators();
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      await upgradeAccount(email, password, fullName.trim());
      onClose();
    } catch (err) {
      setFormError(err.message || "Could not save your progress.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-progress-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-5 shadow-xl animate-fade-in"
        style={{ backgroundColor: "var(--color-bg-elevated)", borderColor: "var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2.5">
          <span
            className="brand-gradient flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ color: "var(--color-accent-contrast)" }}
          >
            <ShieldCheck size={17} />
          </span>
          <h2 id="save-progress-title" className="text-base font-semibold">
            Save your chat &amp; progress
          </h2>
        </div>
        <p className="mb-4 mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
          You're using StudyMate as a guest. Create a free account and everything you've made in
          this session — chats, documents, flashcards, quizzes — stays with you.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          <FormField
            label="Name"
            id="save-fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            maxLength={200}
          />
          <FormField
            label="Email"
            id="save-email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            onBlur={() => validateField("email")}
            error={fieldErrors.email}
            autoComplete="email"
          />
          <FormField
            label="Password"
            id="save-password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            onBlur={() => validateField("password")}
            error={fieldErrors.password}
            autoComplete="new-password"
          />
          <FormField
            label="Confirm password"
            id="save-confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            onBlur={() => validateField("confirmPassword")}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />

          {formError && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-danger)" }}>
              <AlertCircle size={15} />
              {formError}
            </div>
          )}

          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-surface)]"
            >
              Maybe later
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="brand-gradient flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold shadow-sm disabled:opacity-60"
              style={{ color: "var(--color-accent-contrast)" }}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Save progress
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
