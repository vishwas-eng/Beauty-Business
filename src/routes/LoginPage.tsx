import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth";

export function LoginPage() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState("name@opptra.com");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await signIn(email);
    setMessage(result.message);
    setBusy(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-copy">
          <p className="eyebrow">
            <Sparkles size={14} />
            Executive preview
          </p>
          <h1>Strategic Growth Dashboard</h1>
          <p>
            Passwordless access for the Opptra team, a manager-ready preview, and a cleaner
            weekly business review for softlines.
          </p>
          <ul className="feature-list">
            <li>
              <ShieldCheck size={16} />
              Only `@opptra.com` work emails can sign in
            </li>
            <li>
              <ShieldCheck size={16} />
              Automated live data refresh
            </li>
            <li>
              <ShieldCheck size={16} />
              Executive insights and priority actions for growth reviews
            </li>
          </ul>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Work email</label>
          <div className="input-row">
            <Mail size={16} />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <button className="primary-button" disabled={busy}>
            {busy ? "Sending..." : "Send magic link"}
          </button>

          <p className="muted-note">
            Access is restricted to Opptra email addresses. Without Supabase env vars, approved
            `@opptra.com` emails start a local preview session.
          </p>
          {message ? <p className="status-note">{message}</p> : null}
        </form>
      </div>
    </div>
  );
}
