export default function FormField({
  label,
  id,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  minLength,
  maxLength,
  placeholder,
}) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1 block text-xs font-medium">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
        style={{
          borderColor: error ? "var(--color-danger)" : "var(--color-border)",
          backgroundColor: "var(--color-bg-elevated)",
        }}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
