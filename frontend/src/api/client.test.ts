import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_EXPIRED_EVENT, apiFetch } from "./client";
import { fetchDashboardSummary } from "./dashboard";

function respond(status: number, body: unknown) {
  return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

describe("fetchDashboardSummary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends only the filters that are set", async () => {
    const fetchMock = respond(200, { ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await fetchDashboardSummary({ officeId: 2, start: "2026-01-05", end: null });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:8000/dashboard/summary?office_id=2&start=2026-01-05",
    );

    await fetchDashboardSummary({ officeId: null, start: null, end: null });
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:8000/dashboard/summary");
  });

  it("surfaces the server's error message", async () => {
    vi.stubGlobal("fetch", respond(404, { detail: "Office 9 does not exist." }));
    await expect(fetchDashboardSummary({ officeId: 9, start: null, end: null })).rejects.toThrow(
      "Office 9 does not exist.",
    );
  });

  it("explains when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(fetchDashboardSummary({ officeId: null, start: null, end: null })).rejects.toThrow(
      "Could not reach the server",
    );
  });
});

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the session cookie and announces an expired session", async () => {
    const fetchMock = respond(401, { detail: "Please sign in." });
    vi.stubGlobal("fetch", fetchMock);
    const onExpired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);

    await expect(fetchDashboardSummary({ officeId: null, start: null, end: null })).rejects.toThrow(
      "Please sign in.",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "include" });
    expect(onExpired).toHaveBeenCalledTimes(1);

    // A wrong password at sign-in is not an expired session.
    await apiFetch("/auth/login", { method: "POST" });
    expect(onExpired).toHaveBeenCalledTimes(1);
    window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  });
});
