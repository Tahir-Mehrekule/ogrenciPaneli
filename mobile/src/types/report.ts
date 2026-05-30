export type ReportStatus = 'draft' | 'submitted' | 'reviewed';

export interface Report {
  id: string;
  project_id: string;
  submitted_by: string;
  week_number: number;
  year: number;
  content: string;
  youtube_url: string | null;
  status: ReportStatus;
  reviewer_note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  course_id?: string | null;
  course_name?: string | null;
  course_code?: string | null;
  project_title?: string | null;
  submitted_by_name?: string | null;
}

export interface ReportCreate {
  project_id: string;
  content: string;
  youtube_url?: string;
}

export interface ReviewRequest {
  reviewer_note: string;
}
