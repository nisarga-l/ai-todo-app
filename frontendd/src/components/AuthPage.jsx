import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// Single screen that toggles between Login and Signup.
export default function AuthPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  // Live password requirements (signup only). Must match the backend rule
  // in routes/auth.js so the two never disagree.
  const passwordReqs = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "An uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "A lowercase letter", ok: /[a-z]/.test(password) },
    { label: "A number", ok: /[0-9]/.test(password) },
  ];
  const passwordStrong = passwordReqs.every((r) => r.ok);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        await signup(name.trim(), email.trim(), password);
      }
      // On success the AuthProvider updates and the app swaps to the dashboard.
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>🌸 AI Todo</h1>
        <p className="auth-sub">
          {isLogin
            ? "Welcome back! Log in to your tasks."
            : "Create an account to get started."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder={isLogin ? "Password" : "Create a password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {!isLogin && (
            <ul className="pw-reqs" aria-live="polite">
              {passwordReqs.map((r) => (
                <li key={r.label} className={r.ok ? "met" : ""}>
                  <span className="pw-check" aria-hidden="true">
                    {r.ok ? "✓" : "○"}
                  </span>
                  {r.label}
                </li>
              ))}
            </ul>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="add-btn auth-submit"
            disabled={busy || (!isLogin && !passwordStrong)}
          >
            {busy
              ? "Please wait…"
              : isLogin
              ? "Log In"
              : "Sign Up"}
          </button>
        </form>

        <p className="auth-toggle">
          {isLogin
            ? "New here? "
            : "Already have an account? "}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setMode(isLogin ? "signup" : "login");
              setError("");
            }}
          >
            {isLogin ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
