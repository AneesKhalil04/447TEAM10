export interface AggregateRecord {
  office: string;
  period_start: string;
  period_end: string;
  visits: number;
  students_served: number;
  pounds_distributed: number;
}

export interface UploadResponse {
  row_count: number;
  records: AggregateRecord[];
}
