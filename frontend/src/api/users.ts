import type { AuditEntry, Office, Role, User } from "../types/auth";
import { getJson, sendJson } from "./client";

export interface NewUser {
  username: string;
  password: string;
  role: Role;
  office_id: number | null;
}

/** Only the fields that are set are changed. */
export interface UserChanges {
  role?: Role;
  office_id?: number | null;
  is_active?: boolean;
  password?: string;
}

export function fetchUsers(signal?: AbortSignal): Promise<User[]> {
  return getJson<User[]>("/users", signal);
}

export function createUser(user: NewUser): Promise<User> {
  return sendJson<User>("POST", "/users", user);
}

export function updateUser(id: number, changes: UserChanges): Promise<User> {
  return sendJson<User>("PATCH", `/users/${id}`, changes);
}

export function fetchOffices(signal?: AbortSignal): Promise<Office[]> {
  return getJson<Office[]>("/offices", signal);
}

export function fetchAuditLog(signal?: AbortSignal): Promise<AuditEntry[]> {
  return getJson<AuditEntry[]>("/audit-log", signal);
}
