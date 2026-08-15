import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Composer from "../components/Composer.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import DocumentPicker from "../components/DocumentPicker.jsx";
import DocumentsPanel from "../components/DocumentsPanel.jsx";
import EmptyState from "../components/EmptyState.jsx";
import MessageBubble from "../components/MessageBubble.jsx";
import Sidebar, { SidebarToggleButton } from "../components/Sidebar.jsx";
import { useChats } from "../hooks/useChats.js";
import { listDocuments, sendChatMessage } from "../lib/api.js";

export default function ChatApp() {
  const {
    chats,
    activeChat,
    activeChatId,
    setActiveChatId,
    newChat,
    deleteChat,
    setChatDocument,
    appendMessage,
    updateMessage,
  } = useChats();

  const { chatId } = useParams();
  const navigate = useNavigate();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  const hasDocuments = documentsLoaded ? documents.length > 0 : null;

  // The URL is the single source of truth for which chat is active: reading
  // the :chatId param into state here, and always navigating (never calling
  // setActiveChatId directly) elsewhere, avoids the two effects fighting
  // over activeChatId and flashing back to the previous chat.
  useEffect(() => {
    if (chatId !== activeChatId) setActiveChatId(chatId ?? null);
  }, [chatId, activeChatId, setActiveChatId]);

  // On first load at /app with no :chatId, reflect the most recent chat
  // (restored from localStorage) in the URL, once.
  useEffect(() => {
    if (!chatId && activeChatId) {
      navigate(`/app/${activeChatId}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable identity: passed to DocumentsPanel as a prop and used as a
  // dependency inside it, so an inline arrow here would give it a new
  // reference every render and retrigger its fetch effect in a loop.
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
  }, [activeChat?.messages.length]);

  const handleSelectChat = (id) => {
    navigate(`/app/${id}`);
    setIsSidebarOpen(false);
  };

  const handleNewChat = useCallback(() => {
    const id = newChat();
    navigate(`/app/${id}`);
    setIsSidebarOpen(false);
  }, [newChat, navigate]);

  const handleSend = useCallback(
    async (text) => {
      let targetChatId = activeChatId;
      let targetChat = activeChat;
      if (!targetChatId) {
        targetChatId = newChat();
        targetChat = null;
        navigate(`/app/${targetChatId}`);
      }

      const userMessage = { id: crypto.randomUUID(), role: "user", content: text };
      appendMessage(targetChatId, userMessage);

      const assistantId = crypto.randomUUID();
      appendMessage(targetChatId, {
        id: assistantId,
        role: "assistant",
        content: "",
        status: "pending",
      });

      setIsSending(true);
      abortRef.current = new AbortController();

      const filters = targetChat?.documentId
        ? { document_id: targetChat.documentId }
        : null;

      try {
        const result = await sendChatMessage(text, filters, abortRef.current.signal);
        updateMessage(targetChatId, assistantId, {
          content: result.answer,
          model: result.model,
          cached: result.cached,
          sources: result.sources ?? [],
          status: "done",
        });
      } catch (err) {
        updateMessage(targetChatId, assistantId, {
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
    [activeChat, activeChatId, appendMessage, navigate, newChat, updateMessage],
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
            selectedId={activeChat?.documentId ?? null}
            onSelect={(id, label) => {
              let targetChatId = activeChatId;
              if (!targetChatId) {
                targetChatId = newChat();
                navigate(`/app/${targetChatId}`);
              }
              setChatDocument(targetChatId, id, label);
            }}
          />
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto">
          {!activeChat || activeChat.messages.length === 0 ? (
            <EmptyState
              hasDocuments={hasDocuments !== false}
              onOpenDocuments={() => setIsDocumentsOpen(true)}
              onSuggestion={handleSend}
            />
          ) : (
            <div className="mx-auto max-w-3xl pb-4">
              {activeChat.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
          )}
        </main>

        <Composer
          onSend={handleSend}
          isSending={isSending}
          onStop={handleStop}
          disabled={hasDocuments === false}
          disabledHint={
            hasDocuments === false
              ? "Upload a document before asking a question."
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
        description="This chat and its messages will be permanently removed from this browser."
        confirmLabel="Delete"
        onConfirm={confirmDeleteChat}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
