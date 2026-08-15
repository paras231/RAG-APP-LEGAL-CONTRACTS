import { useCallback, useEffect, useState } from "react";
import { createChat, deriveTitle, loadChats, saveChats } from "../lib/storage";

export function useChats() {
  const [chats, setChats] = useState(loadChats);
  const [activeChatId, setActiveChatId] = useState(
    () => loadChats()[0]?.id ?? null,
  );

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  const newChat = useCallback(() => {
    const chat = createChat();
    setChats((prev) => [chat, ...prev]);
    return chat.id;
  }, []);

  const deleteChat = useCallback(
    (id) => {
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) setActiveChatId(null);
    },
    [activeChatId],
  );

  const clearAllChats = useCallback(() => {
    setChats([]);
    setActiveChatId(null);
  }, []);

  const renameChat = useCallback((id, title) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
  }, []);

  const appendMessage = useCallback((chatId, message) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        const isFirstUserMessage =
          c.messages.length === 0 && message.role === "user";
        return {
          ...c,
          title: isFirstUserMessage ? deriveTitle(message.content) : c.title,
          messages: [...c.messages, message],
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const setChatDocument = useCallback((chatId, documentId, documentLabel) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, documentId, documentLabel } : c,
      ),
    );
  }, []);

  const updateMessage = useCallback((chatId, messageId, patch) => {
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === messageId ? { ...m, ...patch } : m,
          ),
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  return {
    chats,
    activeChat,
    activeChatId,
    setActiveChatId,
    newChat,
    deleteChat,
    clearAllChats,
    renameChat,
    setChatDocument,
    appendMessage,
    updateMessage,
  };
}
