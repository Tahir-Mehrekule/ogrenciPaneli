import React, { createContext, useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import apiClient from "../lib/apiClient";
import { User, LoginRequest, RegisterRequest, RegisterResponse } from "../types/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync("user_data");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("User bootstrap falled:", e);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const fetchUser = async () => {
    try {
      const { data } = await apiClient.get("/api/v1/auth/me");
      await SecureStore.setItemAsync("user_data", JSON.stringify(data));
      setUser(data);
    } catch (error) {
      await logout();
    }
  };

  const login = async (data: LoginRequest) => {
    const response = await apiClient.post("/api/v1/auth/login", data);
    const { access_token, refresh_token } = response.data;

    await SecureStore.setItemAsync("access_token", access_token);
    if (refresh_token) {
      await SecureStore.setItemAsync("refresh_token", refresh_token);
    }
    await fetchUser();
  };

  const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>("/api/v1/auth/register", data);
    const result = response.data;

    // Sadece APPROVED hesaplar (öğretmen/admin) token alır ve otomatik giriş yapar.
    // PENDING öğrenciler token almaz; ekran modalı gösterir.
    if (result.approval_status === 'approved' && result.access_token) {
      await SecureStore.setItemAsync("access_token", result.access_token);
      if (result.refresh_token) {
        await SecureStore.setItemAsync("refresh_token", result.refresh_token);
      }
      await fetchUser();
    }

    return result;
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("user_data");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
