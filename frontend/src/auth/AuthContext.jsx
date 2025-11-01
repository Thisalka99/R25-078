import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("jwt") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user"); return raw ? JSON.parse(raw) : null;
  });
  const [socket, setSocket] = useState(null);

  const login = (token, user) => {
    setToken(token); setUser(user);
    localStorage.setItem("jwt", token);
    localStorage.setItem("user", JSON.stringify(user));
  };
  const logout = () => {
    setToken(""); setUser(null);
    localStorage.removeItem("jwt"); localStorage.removeItem("user");
    socket?.disconnect();
  };

  useEffect(() => {
    if (!user) return;
    const s = io(process.env.REACT_APP_API_BASE_URL || "http://localhost:3001", { transports: ["websocket"] });
    s.on("connect", () => {
      s.emit("join_user_room", { userId: user.id });
    });
    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  const value = useMemo(() => ({ token, user, login, logout, socket, setUser }), [token, user, socket]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
