export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** Fetch JSON from the API, turning error responses into an Error with the server's message. */
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Could not reach the server. Check that the API is running.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail ?? body?.message;
    throw new Error(typeof detail === "string" ? detail : `Request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}
