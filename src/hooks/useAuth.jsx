import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api } from "../api.js";



const AuthContext = createContext(null);



export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);



  const refresh = useCallback(async () => {

    try {

      const { user: u } = await api("/auth/me");

      setUser(u);

    } catch {

      setUser(null);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    refresh();

  }, [refresh]);



  const register = async ({
    firstName,
    lastName,
    username,
    email,
    password,
    passwordConfirm,
    rememberMe = true,
  }) => {
    const data = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        firstName,
        lastName,
        username,
        email: email?.trim(),
        password,
        passwordConfirm,
        rememberMe: Boolean(rememberMe),
      }),
    });
    setUser(data.user);
    return data;
  };

  const login = async ({ username, password, rememberMe }) => {

    const { user: u } = await api("/auth/login", {

      method: "POST",

      body: JSON.stringify({ username, password, rememberMe: Boolean(rememberMe) }),

    });

    setUser(u);

    return u;

  };



  const logout = async () => {

    await api("/auth/logout", { method: "POST" });

    setUser(null);

  };



  return (

    <AuthContext.Provider value={{ user, loading, refresh, register, login, logout }}>

      {children}

    </AuthContext.Provider>

  );

}



export function useAuth() {

  const ctx = useContext(AuthContext);

  if (!ctx) throw new Error("useAuth must be inside AuthProvider");

  return ctx;

}

