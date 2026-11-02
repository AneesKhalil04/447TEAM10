import { useState, type FormEvent } from "react";
import { login } from "../../api/auth";
import type { User } from "../../types/auth";
import "./LoginPage.css";

interface LoginPageProps {
  onSignedIn: (user: User) => void;
  signIn?: (username: string, password: string) => Promise<User>;
  /** Shown above the form, e.g. after a session runs out. */
  notice?: string | null;
}

function LoginPage({ onSignedIn, signIn = login, notice }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await signIn(username, password));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
      setPassword("");
      setBusy(false);
    }
  };

  return (
    <section className="dash-card login-card" aria-labelledby="login-title">
      <h2 id="login-title">Sign in</h2>
      <p className="card-note">Use the username and password your administrator gave you.</p>
      {notice && !error && <div className="login-notice">{notice}</div>}
      {error && (
        <div className="dash-alert" role="alert">
          {error}
        </div>
      )}
      <form className="login-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="login-username">Username</label>
        <input
          id="login-username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </section>
  );
}

export default LoginPage;
