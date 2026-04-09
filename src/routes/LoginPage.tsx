import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { Lock, Mail, User } from "lucide-react";
import { useAuth } from "../lib/auth";

type Mode = "signin" | "signup";

export function LoginPage() {
  const { session, signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    const result = mode === "signin" ? await signIn(email, password) : await signUp(email, password);
    if (result.ok) {
      setMessage(result.message);
    } else {
      setError(result.message);
    }
    setBusy(false);
  }

  async function handleGoogle() {
    setError("");
    setMessage("");
    setBusy(true);
    const result = await signInWithGoogle();
    if (!result.ok) {
      setError(result.message);
    }
    setBusy(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-copy">
          <div className="login-logo-block">
            <img
              src="https://cdn.prod.website-files.com/67a44396c211269f785f9dfe/67a4a8650573be9ae072ae9e_Opptra-logo.svg"
              alt="Opptra"
              className="login-opptra-logo"
            />
          </div>
          <h1 className="login-lumara-title">Lumara</h1>
          <p className="login-lumara-by">by Opptra</p>
          <p className="login-lumara-desc">
            AI-powered beauty brand pipeline intelligence. Track brands, score opportunities, generate visuals, and get weekly AI briefs — all in one place.
          </p>
          <ul className="feature-list">
            <li>
              <Lock size={16} />
              Pipeline scoring &amp; smart alerts
            </li>
            <li>
              <Mail size={16} />
              AI weekly brief &amp; email drafts
            </li>
            <li>
              <User size={16} />
              Image Studio for beauty brands
            </li>
          </ul>
        </div>

        <div className="login-form">
          <div className="login-tabs">
            <button
              type="button"
              className={`tab-pill${mode === "signin" ? " is-active" : ""}`}
              onClick={() => { setMode("signin"); setError(""); setMessage(""); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tab-pill${mode === "signup" ? " is-active" : ""}`}
              onClick={() => { setMode("signup"); setError(""); setMessage(""); }}
            >
              Sign Up
            </button>
          </div>

          <button
            type="button"
            className="google-button"
            onClick={handleGoogle}
            disabled={busy}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="login-divider">
            <span>or</span>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <div className="input-row">
              <Mail size={16} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <label htmlFor="password">Password</label>
            <div className="input-row">
              <Lock size={16} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            {mode === "signup" ? (
              <>
                <label htmlFor="confirm-password">Confirm password</label>
                <div className="input-row">
                  <Lock size={16} />
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                </div>
              </>
            ) : null}

            <button className="primary-button login-submit" type="submit" disabled={busy}>
              {busy
                ? "Please wait..."
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          {error ? <p className="login-error">{error}</p> : null}
          {message ? <p className="status-note">{message}</p> : null}

          <p className="muted-note" style={{ textAlign: "center", marginTop: 8 }}>
            {mode === "signin"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              type="button"
              className="link-button"
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
