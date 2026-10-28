import { useEffect, useState } from "react";
import { fetchTestToolsEnabled } from "./api/testing";
import Dashboard from "./components/dashboard/Dashboard";
import TestingPage from "./components/testing/TestingPage";
import UploadPage from "./components/upload/UploadPage";
import "./App.css";

type Tab = "dashboard" | "upload" | "testing";

interface AppProps {
  loadTestToolsEnabled?: () => Promise<boolean>;
}

// The tab lives in the URL hash so a page refresh stays on the same tab.
function tabFromHash(): Tab {
  const hash = window.location.hash.slice(1);
  return hash === "upload" || hash === "testing" ? hash : "dashboard";
}

function App({ loadTestToolsEnabled = fetchTestToolsEnabled }: AppProps) {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [testTools, setTestTools] = useState(false);

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    loadTestToolsEnabled()
      .then(setTestTools)
      .catch(() => setTestTools(false));
  }, [loadTestToolsEnabled]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "upload", label: "Upload data" },
    ...(testTools ? [{ id: "testing" as const, label: "Testing" }] : []),
  ];
  const current = tab === "testing" && !testTools ? "dashboard" : tab;

  const open = (next: Tab) => {
    window.location.hash = next === "dashboard" ? "" : next;
    setTab(next);
  };

  return (
    <main className="dash-page">
      <header className="dash-header">
        <p className="dash-eyebrow">Dean of Students &middot; Basic Needs Impact</p>
        <h1>Retriever Essentials Impact Dashboard</h1>
      </header>

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
        {current === "dashboard" && <Dashboard onGoToUpload={() => open("upload")} />}
        {current === "upload" && <UploadPage onViewDashboard={() => open("dashboard")} />}
        {current === "testing" && <TestingPage />}
      </div>
    </main>
  );
}

export default App;
