export type ProjectType = 'individual' | 'team' | 'both';

export interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
  teacher_id: string;
  teacher_name: string;
  department_id: string | null;
  is_active: boolean;
  project_type: ProjectType;
  require_youtube: boolean;
  require_file: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseCreate {
  name: string;
  code: string;
  semester: string;
  department_id: string;
  teacher_id: string;
  project_type?: ProjectType;
  grade_level?: string;
  branch?: string;
  require_youtube?: boolean;
  require_file?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
