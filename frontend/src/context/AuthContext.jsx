import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "../lib/api.js";
import { getToken, setToken } from "../lib/authToken.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false);
      return;
    }
    api
      .getMe()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { access_token } = await api.login(email, password);
    setToken(access_token);
    const me = await api.getMe();
    setUser(me);
    return me;
  }, []);

  const signup = useCallback(async (email, password, fullName) => {
    const { access_token } = await api.signup(email, password, fullName);
    setToken(access_token);
    const me = await api.getMe();
    setUser(me);
    return me;
  }, []);

  const continueAsGuest = useCallback(async () => {
    const { access_token } = await api.continueAsGuest();
    setToken(access_token);
    const me = await api.getMe();
    setUser(me);
    return me;
  }, []);

  // Upgrades the current guest account in place (same user id), so any
  // documents/chats/flashcards the guest already created carry over.
  const upgradeAccount = useCallback(async (email, password, fullName) => {
    const { access_token } = await api.upgradeAccount(email, password, fullName);
    setToken(access_token);
    const me = await api.getMe();
    setUser(me);
    setIsSavePromptOpen(false);
    return me;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const promptSaveProgress = useCallback(() => setIsSavePromptOpen(true), []);
  const dismissSavePrompt = useCallback(() => setIsSavePromptOpen(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        continueAsGuest,
        upgradeAccount,
        logout,
        isSavePromptOpen,
        promptSaveProgress,
        dismissSavePrompt,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
