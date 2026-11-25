/**
 * Merkezi API İstemcisi (apiClient)
 *
 * Tüm backend (FastAPI) isteklerinin geçtiği tek nokta.
 * DRY prensibi: Her dosyada tekrar tekrar base URL yazmak yerine
 * bu modülü import ederek kullanırız.
 *
 * Dikkat edilen noktalar:
 * 1. Request Interceptor: Cookie'den access_token alıp her isteğin
 *    Authorization header'ına otomatik ekler.
 * 2. Response Interceptor: 401 (Unauthorized) hatası dönerse,
 *    kullanıcının token'ları temizlenip /login sayfasına yönlendirilir.
 * 3. Base URL: .env dosyasından okunur, varsayılan localhost:8000.
 */

import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:19000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 saniye zaman aşımı
});

// ─── Request Interceptor ───
// Her istekten önce Cookie'deki token'ı header'a ekle
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ───
// 401 dönerse önce refresh dene (access 15 dk yaşar), olmazsa login'e at.
// Sonsuz döngüyü önlemek için refresh isteğinin kendisi tekrar denenmez.
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

function hardLogout() {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && !original?._retry && !original?.url?.includes("/auth/refresh")) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (!token) return reject(error);
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = Cookies.get("refresh_token");
        if (!refreshToken) throw error;
        const { data } = await apiClient.post("/api/v1/auth/refresh", {
          refresh_token: refreshToken,
        });
        Cookies.set("access_token", data.access_token, { expires: 7 });
        if (data.refresh_token) {
          Cookies.set("refresh_token", data.refresh_token, { expires: 7 });
        }
        flushQueue(data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(original);
      } catch {
        flushQueue(null);
        hardLogout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 401) {
      hardLogout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
