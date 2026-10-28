import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.location.hash = "";
  });

  it("opens on the dashboard and switches to the upload tab", () => {
    // Keep API requests pending; this test only checks the page shell and tabs.
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<App />);
    expect(screen.getByRole("heading", { name: /retriever essentials impact dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "Upload data" }));
    expect(screen.getByRole("tab", { name: "Upload data" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("How uploading works")).toBeInTheDocument();
    expect(window.location.hash).toBe("#upload");
  });
});
