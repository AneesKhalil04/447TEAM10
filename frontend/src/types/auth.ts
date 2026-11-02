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

export interface Office {
  id: number;
  name: string;
}

export interface AuditEntry {
  id: number;
  created_at: string;
  username: string;
  action: "upload" | "replace";
  office: string;
  filename: string;
  upload_batch_id: number | null;
  details: {
    rows?: number;
    first_week?: string | null;
    last_week?: string | null;
    replaced_rows?: number;
    replaced_files?: string[];
  };
}
