export type Role = "admin" | "staff" | "leadership";

export interface User {
  id: number;
  username: string;
  role: Role;
  office_id: number | null;
  office: string | null;
  is_active: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  staff: "Staff",
  leadership: "Leadership",
};
