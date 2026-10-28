import type { DashboardSummary } from "../types/dashboard";
import { getJson } from "./client";

export interface DashboardFilters {
  officeId: number | null;
  start: string | null;
  end: string | null;
}

export function fetchDashboardSummary(filters: DashboardFilters, signal?: AbortSignal): Promise<DashboardSummary> {
  const params = new URLSearchParams();
  if (filters.officeId !== null) params.set("office_id", String(filters.officeId));
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  const query = params.toString();
  return getJson<DashboardSummary>(`/dashboard/summary${query ? `?${query}` : ""}`, signal);
}
