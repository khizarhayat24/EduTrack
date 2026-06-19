import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = localStorage.getItem("tutor_token");
    if (!t) { setUser(null); setLoading(false); return; }
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      localStorage.removeItem("tutor_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const loginSuccess = (token, userData) => {
    localStorage.setItem("tutor_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("tutor_token");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, loginSuccess, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
