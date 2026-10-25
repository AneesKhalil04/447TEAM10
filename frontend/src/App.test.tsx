import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the dashboard heading", () => {
    // Keep the dashboard's request pending; this test only checks the page shell.
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /retriever essentials impact dashboard/i }),
    ).toBeInTheDocument();
  });
});
