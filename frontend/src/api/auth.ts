import type { User } from "../types/auth";
import { apiFetch, sendJson } from "./client";

export function login(username: string, password: string): Promise<User> {
  return sendJson<User>("POST", "/auth/login", { username, password });
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

/** The signed-in user, or null when there is no valid session. */
export async function fetchCurrentUser(): Promise<User | null> {
  const response = await apiFetch("/auth/me");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  return (await response.json()) as User;
}
