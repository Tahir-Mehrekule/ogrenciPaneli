export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  department?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  department?: string;
}
