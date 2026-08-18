import { useCallback, useEffect, useState } from "react";
import * as api from "../lib/api.js";

function toUiMessage(message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    sources: message.sources ?? [],
    status: "done",
  };
}

export function useChats() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const refreshChats = useCallback(async () => {
    try {
      setChats(await api.listChats());
    } catch {
      setChats([]);
    }
  }, []);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMessagesLoading(true);
    api
      .getChat(activeChatId)
      .then((chat) => {
        if (!cancelled) setMessages(chat.messages.map(toUiMessage));
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  const newChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
  }, []);

  const deleteChat = useCallback((id) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    api.deleteChat(id).catch(() => {});
  }, []);

  const renameChat = useCallback((id, title) => {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    api.renameChat(id, title).catch(() => {});
  }, []);

  const appendMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback((messageId, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...patch } : m)));
  }, []);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  return {
    chats,
    activeChat,
    activeChatId,
    setActiveChatId,
    messages,
    messagesLoading,
    newChat,
    deleteChat,
    renameChat,
    appendMessage,
    updateMessage,
    refreshChats,
  };
}
