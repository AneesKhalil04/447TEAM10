// Mirrors backend/app/schemas/upload.py and backend/app/schemas/data_source.py.

export interface DataSource {
  id: number;
  name: string;
  office_id: number;
  office: string;
}

export interface RowError {
  row: number;
  column: string | null;
  message: string;
}

export interface UploadConflict {
  upload_batch_id: number;
  filename: string;
  uploaded_at: string;
  service: string | null;
  weeks: string[];
}

export interface UploadResult {
  upload_batch_id: number;
  filename: string;
  data_source_id: number;
  office: string;
  row_count: number;
  replaced_rows: number;
  first_week: string;
  last_week: string;
  uploaded_at: string;
}

export type UploadOutcome =
  | { kind: "saved"; result: UploadResult }
  | { kind: "invalid"; message: string; errors: RowError[] }
  | { kind: "conflict"; message: string; conflicts: UploadConflict[] };

export interface UploadHistoryItem {
  upload_batch_id: number;
  filename: string;
  office: string;
  uploaded_at: string;
  row_count: number;
  weeks_kept: number;
  first_week: string | null;
  last_week: string | null;
}
