import type { DataSource, UploadOutcome } from "../types/upload";
import { API_URL, getJson } from "./client";

export const TEMPLATE_URL = `${API_URL}/uploads/template`;

export function fetchDataSources(signal?: AbortSignal): Promise<DataSource[]> {
  return getJson<DataSource[]>("/data-sources", signal);
}

/**
 * Send a file to the API. Validation errors and already-uploaded weeks come back as
 * outcomes the page can show; anything else (unreadable file, server down) throws.
 */
export async function uploadFile(file: File, dataSourceId: number, replace = false): Promise<UploadOutcome> {
  const form = new FormData();
  form.append("file", file);
  form.append("data_source_id", String(dataSourceId));
  form.append("replace", String(replace));

  let response: Response;
  try {
    response = await fetch(`${API_URL}/uploads`, { method: "POST", body: form });
  } catch {
    throw new Error("Could not reach the server. Check that the API is running.");
  }
  const body = await response.json().catch(() => null);

  if (response.status === 201) return { kind: "saved", result: body };
  if (response.status === 409) return { kind: "conflict", message: body.message, conflicts: body.conflicts };
  if (response.status === 422 && Array.isArray(body?.errors)) {
    return { kind: "invalid", message: body.message, errors: body.errors };
  }
  const detail = body?.message ?? body?.detail;
  throw new Error(typeof detail === "string" ? detail : `Upload failed (${response.status}).`);
}
