export interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
  teacher_id: string;
  is_active: boolean;
  require_youtube: boolean;
  require_file: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseCreate {
  name: string;
  code: string;
  semester: string;
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
