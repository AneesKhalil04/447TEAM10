import { getJson, sendJson } from "./client";

export interface ResetResult {
  deleted_uploads: number;
  deleted_rows: number;
  loaded_rows: number;
}

export async function fetchTestToolsEnabled(signal?: AbortSignal): Promise<boolean> {
  return (await getJson<{ enabled: boolean }>("/testing", signal)).enabled;
}

/** Delete every upload, then reload the sample year if asked. Only works when the API has test tools on. */
export function resetData(loadSample: boolean): Promise<ResetResult> {
  return sendJson<ResetResult>("POST", "/testing/reset", { load_sample: loadSample });
}
