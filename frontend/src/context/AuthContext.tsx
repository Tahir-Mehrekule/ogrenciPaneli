"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import Cookies from "js-cookie";
import apiClient from "@/lib/apiClient";
import type {
  User,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
} from "@/types/auth";

// ─── Context Tipi ───
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

// ─── Context Oluşturma ───
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => { },
  register: async () => { },
  logout: () => { },
});

// ─── Provider Bileşeni ───
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sayfa yenilendiğinde mevcut token ile profil bilgisini çek
  const fetchUser = useCallback(async () => {
    const token = Cookies.get("access_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await apiClient.get<User>("/api/v1/auth/me");
      setUser(data);
    } catch {
      // Token geçersizse temizle
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // ─── Giriş Yap ───
  const login = async (credentials: LoginRequest) => {
    const { data } = await apiClient.post<TokenResponse>(
      "/api/v1/auth/login",
      credentials
    );

    // Token'ları cookie'ye kaydet (7 gün geçerli)
    Cookies.set("access_token", data.access_token, { expires: 7 });
    Cookies.set("refresh_token", data.refresh_token, { expires: 7 });

    // Giriş sonrası profil bilgisini çek
    await fetchUser();
  };

  // ─── Kayıt Ol ───
  const register = async (formData: RegisterRequest) => {
    const { data } = await apiClient.post<TokenResponse>(
      "/api/v1/auth/register",
      formData
    );

    Cookies.set("access_token", data.access_token, { expires: 7 });
    Cookies.set("refresh_token", data.refresh_token, { expires: 7 });

    await fetchUser();
  };

  // ─── Çıkış Yap ───
  const logout = () => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    setUser(null);

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
