import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Android Emülatörler localhost için 10.0.2.2 adresini ararlar. iOS için localhost.
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === "android") return "http://10.0.2.2:8000";
  return "http://localhost:8000";
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Token refresh için kilit — aynı anda birden fazla refresh isteği atılmasını engeller
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Request interceptor — her isteğe token ekler
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.log("[API] Token bulunamadı — istek token'sız gidiyor:", config.url);
      }
    } catch (e) {
      console.error("[API] Token okuma hatası:", e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — 401'de otomatik token refresh dener
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 değilse veya zaten retry edildiyse direkt reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Refresh endpoint'inin kendisi 401 verdiyse döngüye girme
    if (originalRequest.url?.includes("/auth/refresh") || originalRequest.url?.includes("/auth/login")) {
      console.log("[API] Auth endpoint 401 verdi — logout tetikleniyor");
      await clearTokens();
      return Promise.reject(error);
    }

    // Zaten refresh yapılıyorsa, kuyruğa ekle ve bekle
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject: (err: any) => reject(err),
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync("refresh_token");

      if (!refreshToken) {
        console.log("[API] Refresh token yok — logout");
        await clearTokens();
        processQueue(error, null);
        return Promise.reject(error);
      }

      console.log("[API] Access token expired — refresh deneniyor...");

      const { data } = await axios.post(`${getBaseUrl()}/api/v1/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token;

      await SecureStore.setItemAsync("access_token", newAccessToken);
      if (newRefreshToken) {
        await SecureStore.setItemAsync("refresh_token", newRefreshToken);
      }

      console.log("[API] Token yenilendi — istek tekrarlanıyor");

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      processQueue(null, newAccessToken);

      return apiClient(originalRequest);
    } catch (refreshError) {
      console.log("[API] Refresh başarısız — logout:", refreshError);
      processQueue(refreshError, null);
      await clearTokens();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

async function clearTokens() {
  try {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("user_data");
  } catch (e) {
    console.error("[API] Token silme hatası:", e);
  }
}

export default apiClient;
