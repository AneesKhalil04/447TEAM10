export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** Fired on window when the API says the session is missing or expired, so the app can show the login page. */
export const SESSION_EXPIRED_EVENT = "session-expired";

/**
 * fetch() against the API with the session cookie attached. Throws a friendly Error when the
 * server cannot be reached, and announces SESSION_EXPIRED_EVENT on a 401.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, credentials: "include" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Could not reach the server. Check that the API is running.");
  }
  if (response.status === 401 && path !== "/auth/login") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return response;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail ?? body?.message;
    throw new Error(typeof detail === "string" ? detail : `Request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

/** Fetch JSON from the API, turning error responses into an Error with the server's message. */
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return readJson<T>(await apiFetch(path, { signal }));
}

/** Send a JSON body and read the JSON reply, with the same error handling as getJson. */
export async function sendJson<T>(method: "POST" | "PATCH", path: string, body: unknown): Promise<T> {
  const response = await apiFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson<T>(response);
}
