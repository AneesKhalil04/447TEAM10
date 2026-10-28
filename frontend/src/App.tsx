import { useEffect, useState } from "react";
import Dashboard from "./components/dashboard/Dashboard";
import UploadPage from "./components/upload/UploadPage";
import "./App.css";

type Tab = "dashboard" | "upload";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "upload", label: "Upload data" },
];

// The tab lives in the URL hash so a page refresh stays on the same tab.
function tabFromHash(): Tab {
  return window.location.hash === "#upload" ? "upload" : "dashboard";
}

function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);

  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const open = (next: Tab) => {
    window.location.hash = next === "upload" ? "upload" : "";
    setTab(next);
  };

  return (
    <main className="dash-page">
      <header className="dash-header">
        <p className="dash-eyebrow">Dean of Students &middot; Basic Needs Impact</p>
        <h1>Retriever Essentials Impact Dashboard</h1>
      </header>

      <nav className="app-tabs" role="tablist" aria-label="Sections">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => open(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="app-panel">
        {tab === "dashboard" ? (
          <Dashboard onGoToUpload={() => open("upload")} />
        ) : (
          <UploadPage onViewDashboard={() => open("dashboard")} />
        )}
      </div>
    </main>
  );
}

export default App;
