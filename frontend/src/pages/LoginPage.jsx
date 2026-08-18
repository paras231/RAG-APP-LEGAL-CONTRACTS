import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { validateEmail, validateLoginPassword } from "../lib/validators.js";

const VALIDATORS = {
  email: validateEmail,
  password: validateLoginPassword,
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const values = { email, password };

  const validateField = (name) => {
    const error = VALIDATORS[name](values[name]);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (name, setter) => (e) => {
    setter(e.target.value);
    if (fieldErrors[name]) validateField(name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const errors = {
      email: validateEmail(email),
      password: validateLoginPassword(password),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/app", { replace: true });
    } catch (err) {
      setFormError(err.message || "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout eyebrow="Welcome back" title="Sign in to StudyMate" subtitle="Pick up your study session where you left off.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
        <FormField
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={handleChange("email", setEmail)}
          onBlur={() => validateField("email")}
          error={fieldErrors.email}
          autoComplete="email"
        />
        <FormField
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={handleChange("password", setPassword)}
          onBlur={() => validateField("password")}
          error={fieldErrors.password}
          autoComplete="current-password"
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
          Sign in
        </button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        New to StudyMate?{" "}
        <Link to="/signup" className="font-medium" style={{ color: "var(--color-accent)" }}>
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
