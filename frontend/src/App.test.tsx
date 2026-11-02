import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { SESSION_EXPIRED_EVENT } from "./api/client";
import type { Role, User } from "./types/auth";

function makeUser(role: Role): User {
  return {
    id: 1,
    username: `${role}-user`,
    role,
    office_id: role === "staff" ? 1 : null,
    office: role === "staff" ? "Retriever Essentials" : null,
    is_active: true,
  };
}

function renderApp(user: User | null, testTools = false) {
  const signOut = vi.fn(() => Promise.resolve());
  render(
    <App
      loadCurrentUser={() => Promise.resolve(user)}
      loadTestToolsEnabled={() => Promise.resolve(testTools)}
      signOut={signOut}
    />,
  );
  return { signOut };
}

async function tabNames() {
  await screen.findByRole("tab", { name: "Dashboard" });
  return screen.getAllByRole("tab").map((tab) => tab.textContent);
}

describe("App", () => {
  beforeEach(() => {
    // Keep page data requests pending; these tests only check the shell, tabs and sign-in.
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.location.hash = "";
  });

  it("shows the sign-in page when nobody is signed in", async () => {
    renderApp(null);
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("opens on the dashboard and switches to the upload tab", async () => {
    renderApp(makeUser("staff"));
    expect(await screen.findByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("staff-user")).toBeInTheDocument();
    expect(screen.getByText(/Staff, Retriever Essentials/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Upload data" }));
    expect(screen.getByRole("tab", { name: "Upload data" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("How uploading works")).toBeInTheDocument();
    expect(window.location.hash).toBe("#upload");
  });

  it("shows tabs by role", async () => {
    renderApp(makeUser("leadership"), true);
    expect(await tabNames()).toEqual(["Dashboard"]);
  });

  it("shows the Testing tab only to admins when the server has test tools on", async () => {
    renderApp(makeUser("admin"), true);
    fireEvent.click(await screen.findByRole("tab", { name: "Testing" }));
    expect(screen.getByText("Testing tools")).toBeInTheDocument();
  });

  it("hides the Testing tab when test tools are off", async () => {
    renderApp(makeUser("admin"), false);
    expect(await tabNames()).toEqual(["Dashboard", "Upload data", "Users"]);
  });

  it("falls back to the dashboard when the hash names a tab the role cannot use", async () => {
    window.location.hash = "#upload";
    renderApp(makeUser("leadership"));
    expect(await screen.findByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "true");
  });

  it("signs out", async () => {
    const { signOut } = renderApp(makeUser("admin"));
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
  });

  it("returns to the sign-in page with a notice when the session expires", async () => {
    renderApp(makeUser("admin"));
    await screen.findByRole("tab", { name: "Dashboard" });

    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });
    await waitFor(() => expect(screen.getByText(/your session ended/i)).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});
