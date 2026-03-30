export type ProjectStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Project {
  id: string;
  title: string;
  description: string;
  course_id: string | null;
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
