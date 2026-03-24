/**
 * Auth (Yetkilendirme) modülü TypeScript tip tanımlamaları.
 *
 * Backend'deki auth_dto.py şemasıyla birebir uyumludur.
 * Tüm API isteklerinde ve Context'te bu tipler kullanılacaktır.
 */

// --- Kullanıcı Rolleri ---
export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";

// --- Login İsteği ---
export interface LoginRequest {
  email: string;
  password: string;
}

// --- Register İsteği ---
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  department?: string;
}

// --- Backend'den dönen Token yanıtı ---
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// --- /auth/me endpoint'inden dönen kullanıcı bilgisi ---
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  is_active: boolean;
}
