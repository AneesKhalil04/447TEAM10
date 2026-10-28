import { API_URL, getJson } from "./client";

export interface ResetResult {
  deleted_uploads: number;
  deleted_rows: number;
  loaded_rows: number;
}

export async function fetchTestToolsEnabled(signal?: AbortSignal): Promise<boolean> {
  return (await getJson<{ enabled: boolean }>("/testing", signal)).enabled;
}

/** Delete every upload, then reload the sample year if asked. Only works when the API has test tools on. */
export async function resetData(loadSample: boolean): Promise<ResetResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/testing/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ load_sample: loadSample }),
    });
  } catch {
    throw new Error("Could not reach the server. Check that the API is running.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof body?.detail === "string" ? body.detail : `Reset failed (${response.status}).`);
  }
  return body as ResetResult;
}
