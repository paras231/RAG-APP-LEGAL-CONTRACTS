import { AlertTriangle, BookText, Scale, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-2 w-2 rounded-full"
          style={{
            backgroundColor: "var(--color-text-muted)",
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={clsx(
        "flex gap-3 px-4 py-4 animate-fade-in",
        isUser && "flex-row-reverse",
      )}
    >
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: isUser ? "var(--color-surface)" : "var(--color-accent)",
          color: isUser ? "var(--color-text)" : "var(--color-accent-contrast)",
        }}
      >
        {isUser ? <User size={16} /> : <Scale size={16} />}
      </div>

      <div className={clsx("flex max-w-[85%] flex-col gap-1.5 sm:max-w-[75%]", isUser && "items-end")}>
        <div
          className={clsx(
            "rounded-2xl px-4 py-2.5 text-[0.925rem] leading-relaxed",
            isUser ? "rounded-tr-sm" : "rounded-tl-sm",
          )}
          style={{
            backgroundColor: isUser
              ? "var(--color-accent)"
              : "var(--color-surface)",
            color: isUser ? "var(--color-accent-contrast)" : "var(--color-text)",
          }}
        >
          {message.status === "pending" ? (
            <TypingIndicator />
          ) : message.status === "error" ? (
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} style={{ color: "var(--color-danger)" }} />
              <span>{message.content}</span>
            </div>
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.sources?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {message.sources.map((source, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                style={{
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-muted)",
                }}
                title={source.heading_path ?? source.filename ?? undefined}
              >
                <BookText size={12} />
                {source.filename ?? source.heading_path ?? `Source ${i + 1}`}
              </span>
            ))}
          </div>
        )}

        {!isUser && message.status === "done" && (
          <div
            className="flex items-center gap-2 px-1 text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {message.model && <span>{message.model}</span>}
            {message.cached && <span>· cached</span>}
          </div>
        )}
      </div>
    </div>
  );
}
