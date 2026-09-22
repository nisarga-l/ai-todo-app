import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    localStorage.getItem("token")
  );
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  // While true, we're checking whether a saved token is still valid.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await client.get("/auth/me");
        setUser(res.data.user);
        localStorage.setItem(
          "user",
          JSON.stringify(res.data.user)
        );
      } catch {
        // Token invalid/expired — the axios interceptor will handle cleanup.
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
    // We only want this to run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveAuth(data) {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  async function login(email, password) {
    const res = await client.post("/auth/login", {
      email,
      password,
    });
    saveAuth(res.data);
  }

  async function signup(name, email, password) {
    const res = await client.post("/auth/signup", {
      name,
      email,
      password,
    });
    saveAuth(res.data);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  return (
    <AuthContext.Provider
      value={{ token, user, loading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
