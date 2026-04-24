/**
 * Auth (Yetkilendirme) modülü TypeScript tip tanımlamaları.
 * Backend'deki auth_dto.py şemasıyla birebir uyumludur.
 */

// --- Kullanıcı Rolleri ---
export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";

// --- Hesap onay durumu ---
export type ApprovalStatus = "pending" | "approved" | "rejected";

// --- Bölüm özet bilgisi ---
export interface DepartmentInfo {
  id: string;
  name: string;
}

// --- Login İsteği ---
export interface LoginRequest {
  email: string;
  password: string;
}

// --- Register İsteği ---
export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: "STUDENT" | "TEACHER";
  department_ids: string[];
  student_no?: string;
}

// --- Backend'den dönen Token yanıtı ---
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// --- /auth/register endpoint'inden dönen yanıt ---
export interface RegisterResponse {
  approval_status: ApprovalStatus;
  message: string;
  access_token?: string | null;
  refresh_token?: string | null;
  token_type: string;
}

// --- /auth/me endpoint'inden dönen kullanıcı bilgisi ---
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  departments: DepartmentInfo[];
  student_no?: string;
  grade_label?: string;
  entry_year?: number;
  approval_status: ApprovalStatus;
  is_active: boolean;
}
