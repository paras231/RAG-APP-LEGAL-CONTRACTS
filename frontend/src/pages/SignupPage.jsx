import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { validateConfirmPassword, validateEmail, validateSignupPassword } from "../lib/validators.js";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runValidators = () => ({
    email: validateEmail(email),
    password: validateSignupPassword(password),
    confirmPassword: validateConfirmPassword(password, confirmPassword),
  });

  const validateField = (name) => {
    const error = runValidators()[name];
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
    }
  };

  const handleBlurRevalidate = (name) => () => validateField(name);

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setFieldErrors((prev) => ({
      ...prev,
      password: prev.password ? validateSignupPassword(e.target.value) : prev.password,
      confirmPassword: prev.confirmPassword
        ? validateConfirmPassword(e.target.value, confirmPassword)
        : prev.confirmPassword,
    }));
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    setFieldErrors((prev) => ({
      ...prev,
      confirmPassword: prev.confirmPassword
        ? validateConfirmPassword(password, e.target.value)
        : prev.confirmPassword,
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
      await signup(email, password, fullName.trim());
      navigate("/app", { replace: true });
    } catch (err) {
      setFormError(err.message || "Could not create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create your account"
      subtitle="Free to start — upload your first set of notes in under a minute."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <FormField
          label="Name"
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          maxLength={200}
        />
        <FormField
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          onBlur={handleBlurRevalidate("email")}
          error={fieldErrors.email}
          autoComplete="email"
        />
        <FormField
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          onBlur={handleBlurRevalidate("password")}
          error={fieldErrors.password}
          autoComplete="new-password"
        />
        {!fieldErrors.password && (
          <p className="-mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
            At least 8 characters, with a letter and a number.
          </p>
        )}
        <FormField
          label="Confirm password"
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          onBlur={handleBlurRevalidate("confirmPassword")}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
        />

        {formError && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-danger)" }}>
            <AlertCircle size={15} />
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="brand-gradient mt-2 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-transform hover:scale-[1.01] disabled:opacity-60"
          style={{ color: "var(--color-accent-contrast)" }}
        >
          {isSubmitting && <Loader2 size={15} className="animate-spin" />}
          Create account
        </button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        Already have an account?{" "}
        <Link to="/login" className="font-medium" style={{ color: "var(--color-accent)" }}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
