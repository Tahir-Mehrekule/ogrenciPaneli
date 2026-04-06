export type ProjectStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'review';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  course_id: string | null;
  course_name: string | null;
  course_code: string | null;
  status: ProjectStatus;
  created_by: string;
  ai_task_plan: any | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  title: string;
  description: string;
  course_id?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  project_id: string;
  assigned_to: string | null;
  status: TaskStatus;
  due_date: string | null;
  ai_suggested: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description: string;
  project_id: string;
  due_date?: string;
}
