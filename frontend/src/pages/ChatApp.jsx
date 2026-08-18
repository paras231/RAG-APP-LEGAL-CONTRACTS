import { GraduationCap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Composer from "../components/Composer.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import DocumentPicker from "../components/DocumentPicker.jsx";
import DocumentsPanel from "../components/DocumentsPanel.jsx";
import EmptyState from "../components/EmptyState.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import SaveProgressDialog from "../components/SaveProgressDialog.jsx";
import Sidebar, { SidebarToggleButton } from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useChats } from "../hooks/useChats.js";
import { listDocuments, sendChatMessage } from "../lib/api.js";

export default function ChatApp() {
  const {
    chats,
    activeChat,
    activeChatId,
    setActiveChatId,
    messages,
    messagesLoading,
    newChat,
    deleteChat,
    appendMessage,
    updateMessage,
    refreshChats,
  } = useChats();
  const { user, isSavePromptOpen, promptSaveProgress, dismissSavePrompt } = useAuth();

  const { chatId } = useParams();
  const navigate = useNavigate();
  const hasPromptedGuestRef = useRef(false);
  const docDefaultedForChatRef = useRef("__uninitialized__");

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [selectedDocumentLabel, setSelectedDocumentLabel] = useState(null);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  const hasDocuments = documentsLoaded ? documents.length > 0 : null;
  const canChat = hasDocuments === true && Boolean(selectedDocumentId);

  // The URL is the single source of truth for which chat is active.
  useEffect(() => {
    if (chatId !== activeChatId) setActiveChatId(chatId ?? null);
  }, [chatId, activeChatId, setActiveChatId]);

  // A document pin is a per-visit convenience, not persisted server-side.
  // Default it once per chat, after both the document list and this chat's
  // messages have loaded: reuse the document the chat's last answer was
  // grounded in if there is one, otherwise fall back to the most recently
  // uploaded document. Never re-runs mid-chat, so it won't clobber a
  // manual pick the user makes while sending messages.
  useEffect(() => {
    if (!documentsLoaded || messagesLoading) return;
    if (docDefaultedForChatRef.current === chatId) return;
    docDefaultedForChatRef.current = chatId;

    if (documents.length === 0) {
      setSelectedDocumentId(null);
      setSelectedDocumentLabel(null);
      return;
    }

    const lastSourceDocId = [...messages]
      .reverse()
      .find((m) => m.sources?.length > 0)?.sources[0]?.document_id;
    const defaultDoc = documents.find((d) => d.id === lastSourceDocId) ?? documents[0];
    setSelectedDocumentId(defaultDoc.id);
    setSelectedDocumentLabel(defaultDoc.filename);
  }, [chatId, documentsLoaded, messagesLoading, documents, messages]);

  const handleDocumentsChanged = useCallback((docs) => {
    setDocuments(docs);
    setDocumentsLoaded(true);
  }, []);

  useEffect(() => {
    listDocuments()
      .then(handleDocumentsChanged)
      .catch(() => setDocumentsLoaded(false));
  }, [handleDocumentsChanged]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const handleSelectChat = (id) => {
    navigate(`/app/${id}`);
    setIsSidebarOpen(false);
  };

  const handleNewChat = useCallback(() => {
    newChat();
    navigate("/app");
    setIsSidebarOpen(false);
  }, [newChat, navigate]);

  const handleSend = useCallback(
    async (text) => {
      const userMessage = { id: crypto.randomUUID(), role: "user", content: text, status: "done" };
      appendMessage(userMessage);

      const assistantId = crypto.randomUUID();
      appendMessage({ id: assistantId, role: "assistant", content: "", status: "pending" });

      setIsSending(true);
      abortRef.current = new AbortController();

      const filters = selectedDocumentId ? { document_id: selectedDocumentId } : null;

      try {
        const result = await sendChatMessage(text, activeChatId, filters, abortRef.current.signal);
        updateMessage(assistantId, {
          content: result.answer,
          model: result.model,
          cached: result.cached,
          sources: result.sources ?? [],
          status: "done",
        });
        if (!activeChatId) {
          navigate(`/app/${result.chat_id}`, { replace: true });
        }
        refreshChats();
        if (user?.is_guest && !hasPromptedGuestRef.current) {
          hasPromptedGuestRef.current = true;
          promptSaveProgress();
        }
      } catch (err) {
        updateMessage(assistantId, {
          content:
            err.name === "AbortError"
              ? "Stopped."
              : err.message || "Something went wrong. Please try again.",
          status: "error",
        });
      } finally {
        setIsSending(false);
        abortRef.current = null;
      }
    },
    [
      activeChatId,
      appendMessage,
      navigate,
      promptSaveProgress,
      refreshChats,
      selectedDocumentId,
      updateMessage,
      user,
    ],
  );

  const handleStop = () => {
    abortRef.current?.abort();
    setIsSending(false);
  };

  const confirmDeleteChat = () => {
    if (pendingDeleteId) {
      deleteChat(pendingDeleteId);
      if (pendingDeleteId === activeChatId) {
        navigate("/app", { replace: true });
      }
    }
    setPendingDeleteId(null);
  };

  return (
    <div className="flex h-dvh" style={{ backgroundColor: "var(--color-bg)" }}>
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={setPendingDeleteId}
        onOpenDocuments={() => setIsDocumentsOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex items-center gap-2 border-b px-3 py-2.5 md:px-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
          <h1 className="min-w-0 flex-1 truncate text-sm font-medium">
            {activeChat?.title ?? "New chat"}
          </h1>
          <DocumentPicker
            documents={documents}
            selectedId={selectedDocumentId}
            onSelect={(id, label) => {
              setSelectedDocumentId(id);
              setSelectedDocumentLabel(label);
            }}
          />
          {selectedDocumentId && (
            <button
              type="button"
              onClick={() => navigate(`/app/study/${selectedDocumentId}`)}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-colors hover:bg-[var(--color-surface)] sm:px-2.5"
              style={{ borderColor: "var(--color-border)" }}
              aria-label={`Study tools for ${selectedDocumentLabel}`}
              title={`Study tools for ${selectedDocumentLabel}`}
            >
              <GraduationCap size={13} />
              <span className="hidden sm:inline">Study tools</span>
            </button>
          )}
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState
              hasDocuments={hasDocuments !== false}
              hasSelectedDocument={Boolean(selectedDocumentId)}
              onOpenDocuments={() => setIsDocumentsOpen(true)}
              onSuggestion={canChat ? handleSend : undefined}
            />
          ) : (
            <div className="mx-auto max-w-3xl pb-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
          )}
        </main>

        <Composer
          onSend={handleSend}
          isSending={isSending}
          onStop={handleStop}
          disabled={!canChat}
          disabledHint={
            hasDocuments === false
              ? "Upload a document before asking a question."
              : !selectedDocumentId
                ? "Select a document above before asking a question."
                : null
          }
        />
      </div>

      <DocumentsPanel
        open={isDocumentsOpen}
        onClose={() => setIsDocumentsOpen(false)}
        onDocumentsChanged={handleDocumentsChanged}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Delete chat?"
        description="This chat and its messages will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={confirmDeleteChat}
        onCancel={() => setPendingDeleteId(null)}
      />

      <SaveProgressDialog open={isSavePromptOpen} onClose={dismissSavePrompt} />
    </div>
  );
}
