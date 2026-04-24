export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface DepartmentInfo {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_active: boolean;
  departments: DepartmentInfo[];
  student_no?: string;
  approval_status: ApprovalStatus;
  entry_year?: number | null;
  grade_label?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface RegisterResponse {
  approval_status: ApprovalStatus;
  message: string;
  access_token?: string | null;
  refresh_token?: string | null;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'STUDENT' | 'TEACHER';
  department_ids: string[];
  student_no?: string;
}
