import {
  FileText,
  GraduationCap,
  LogOut,
  Menu,
  MessageSquarePlus,
  MoonStar,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

function groupByRecency(chats) {
  const now = Date.now();
  const day = 86400000;
  const groups = { Today: [], Yesterday: [], "Previous 7 days": [], Older: [] };
  for (const chat of chats) {
    const age = now - new Date(chat.updated_at).getTime();
    if (age < day) groups.Today.push(chat);
    else if (age < 2 * day) groups.Yesterday.push(chat);
    else if (age < 7 * day) groups["Previous 7 days"].push(chat);
    else groups.Older.push(chat);
  }
  return Object.entries(groups).filter(([, list]) => list.length > 0);
}

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onOpenDocuments,
  isOpen,
  onClose,
}) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, promptSaveProgress } = useAuth();
  const grouped = groupByRecency(
    [...chats].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)),
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r transition-transform duration-200 md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          backgroundColor: "var(--color-bg-subtle)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between gap-2 p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-[var(--color-surface)]"
          >
            <span
              className="brand-gradient flex h-7 w-7 items-center justify-center rounded-md"
              style={{ color: "var(--color-accent-contrast)" }}
            >
              <GraduationCap size={16} />
            </span>
            StudyMate
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-[var(--color-surface)] md:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2 px-3">
          <button
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface)]"
            style={{ borderColor: "var(--color-border)" }}
          >
            <MessageSquarePlus size={17} />
            New chat
          </button>
          <button
            type="button"
            onClick={onOpenDocuments}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface)]"
            style={{ borderColor: "var(--color-border)" }}
          >
            <FileText size={17} />
            Documents
          </button>
        </div>

        {user?.is_guest && (
          <div className="px-3 pt-3">
            <button
              type="button"
              onClick={promptSaveProgress}
              className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium"
              style={{
                borderColor: "var(--color-border)",
                backgroundImage: "var(--gradient-brand-soft)",
                color: "var(--color-accent)",
              }}
            >
              <ShieldCheck size={14} className="flex-shrink-0" />
              <span className="flex-1">You're a guest — save your progress</span>
            </button>
          </div>
        )}

        <nav className="mt-3 flex-1 space-y-4 overflow-y-auto px-3 pb-3">
          {grouped.length === 0 && (
            <p
              className="px-2 py-6 text-center text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              No chats yet. Start a new one.
            </p>
          )}
          {grouped.map(([label, list]) => (
            <div key={label}>
              <h3
                className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                {label}
              </h3>
              <ul className="space-y-0.5">
                {list.map((chat) => (
                  <li key={chat.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => onSelectChat(chat.id)}
                      className={clsx(
                        "block w-full truncate rounded-lg px-2 py-2 pr-8 text-left text-sm transition-colors",
                        chat.id === activeChatId
                          ? "bg-[var(--color-surface)] font-medium"
                          : "hover:bg-[var(--color-surface)]",
                      )}
                    >
                      {chat.title}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 opacity-0 transition-opacity hover:bg-[var(--color-surface-hover)] group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={`Delete chat: ${chat.title}`}
                    >
                      <Trash2 size={14} style={{ color: "var(--color-danger)" }} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div
          className="flex items-center justify-between gap-2 border-t p-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span
            className="min-w-0 flex-1 truncate text-xs"
            style={{ color: "var(--color-text-muted)" }}
            title={user?.email}
          >
            {user?.full_name || user?.email}
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex-shrink-0 rounded-md p-1.5 hover:bg-[var(--color-surface)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={17} /> : <MoonStar size={17} />}
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex-shrink-0 rounded-md p-1.5 hover:bg-[var(--color-surface)]"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}

export function SidebarToggleButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md p-2 hover:bg-[var(--color-surface)] md:hidden"
      aria-label="Open sidebar"
    >
      <Menu size={20} />
    </button>
  );
}
