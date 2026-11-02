import { useEffect, useState } from "react";
import { fetchCurrentUser, logout } from "./api/auth";
import { SESSION_EXPIRED_EVENT } from "./api/client";
import { fetchTestToolsEnabled } from "./api/testing";
import LoginPage from "./components/auth/LoginPage";
import Dashboard from "./components/dashboard/Dashboard";
import TestingPage from "./components/testing/TestingPage";
import UploadPage from "./components/upload/UploadPage";
import { ROLE_LABELS, type User } from "./types/auth";
import "./App.css";

type Tab = "dashboard" | "upload" | "testing";

interface AppProps {
  loadCurrentUser?: () => Promise<User | null>;
  loadTestToolsEnabled?: () => Promise<boolean>;
  signOut?: () => Promise<void>;
}

// The tab lives in the URL hash so a page refresh stays on the same tab.
function tabFromHash(): Tab {
  const hash = window.location.hash.slice(1);
  return hash === "upload" || hash === "testing" ? hash : "dashboard";
}

function App({
  loadCurrentUser = fetchCurrentUser,
  loadTestToolsEnabled = fetchTestToolsEnabled,
  signOut = logout,
}: AppProps) {
  // undefined while the first session check is in flight, null when signed out.
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [testTools, setTestTools] = useState(false);

  useEffect(() => {
    loadCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, [loadCurrentUser]);

  const signedIn = Boolean(user);
  useEffect(() => {
    if (!signedIn) return;
    const onExpired = () => {
      setNotice("Your session ended. Please sign in again.");
      setUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [signedIn]);

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const isAdmin = user?.role === "admin";
  useEffect(() => {
    if (!isAdmin) {
      setTestTools(false);
      return;
    }
    loadTestToolsEnabled()
      .then(setTestTools)
      .catch(() => setTestTools(false));
  }, [isAdmin, loadTestToolsEnabled]);

  const open = (next: Tab) => {
    window.location.hash = next === "dashboard" ? "" : next;
    setTab(next);
  };

  const handleSignOut = async () => {
    await signOut().catch(() => {});
    setNotice(null);
    setUser(null);
  };

  const header = (
    <header className={`dash-header${user ? " with-user" : ""}`}>
      <div>
        <p className="dash-eyebrow">Dean of Students &middot; Basic Needs Impact</p>
        <h1>Retriever Essentials Impact Dashboard</h1>
      </div>
      {user && (
        <div className="user-bar">
          <span>
            Signed in as <strong>{user.username}</strong> ({ROLE_LABELS[user.role]}
            {user.office ? `, ${user.office}` : ""})
          </span>
          <button type="button" className="reset-button" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      )}
    </header>
  );

  if (user === undefined) {
    return (
      <main className="dash-page">
        {header}
        <p className="card-note">Loading…</p>
      </main>
    );
  }

  if (user === null) {
    return (
      <main className="dash-page">
        {header}
        <LoginPage
          notice={notice}
          onSignedIn={(signedIn) => {
            setNotice(null);
            setUser(signedIn);
          }}
        />
      </main>
    );
  }

  const canUpload = user.role === "admin" || user.role === "staff";
  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    ...(canUpload ? [{ id: "upload" as const, label: "Upload data" }] : []),
    ...(testTools ? [{ id: "testing" as const, label: "Testing" }] : []),
  ];
  const current = tabs.some(({ id }) => id === tab) ? tab : "dashboard";

  return (
    <main className="dash-page">
      {header}

      <nav className="app-tabs" role="tablist" aria-label="Sections">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={current === id}
            aria-controls={`panel-${id}`}
            onClick={() => open(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div role="tabpanel" id={`panel-${current}`} aria-labelledby={`tab-${current}`} className="app-panel">
        {current === "dashboard" && <Dashboard onGoToUpload={canUpload ? () => open("upload") : undefined} />}
        {current === "upload" && <UploadPage onViewDashboard={() => open("dashboard")} />}
        {current === "testing" && <TestingPage />}
      </div>
    </main>
  );
}

export default App;
