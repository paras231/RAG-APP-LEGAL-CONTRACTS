const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value) {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required.";
  if (!EMAIL_RE.test(trimmed)) return "Enter a valid email address.";
  return null;
}

export function validateRequired(value, label) {
  return value.trim() ? null : `${label} is required.`;
}

export function validateLoginPassword(value) {
  return value ? null : "Password is required.";
}

export function validateSignupPassword(value) {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (value.length > 128) return "Password must be at most 128 characters.";
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export function validateIntInRange(value, { min, max, label }) {
  if (value === "" || value === null || value === undefined) {
    return `${label} is required.`;
  }
  const num = Number(value);
  if (!Number.isInteger(num)) return `${label} must be a whole number.`;
  if (num < min || num > max) return `${label} must be between ${min} and ${max}.`;
  return null;
}
