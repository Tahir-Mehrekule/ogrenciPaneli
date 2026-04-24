export type ProjectStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'review';
export type MemberRole = 'MANAGER' | 'MEMBER';
export type MemberStatus = 'ACTIVE' | 'INVITED' | 'JOIN_REQUESTED' | 'REJECTED';

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
  is_archived: boolean;
  share_code: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  invited_by: string | null;
  joined_at: string | null;
  responded_at: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    student_no: string | null;
    grade_label: string | null;
  };
}

export interface ProjectCategory {
  id: string;
  name: string;
  course_id: string;
  color: string | null;
  created_at: string;
}

export interface StudentPrefix {
  id: string;
  prefix: string;
  entry_year: number;
  label: string;
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
