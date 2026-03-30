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
// 401 dönerse token'ları sil ve login'e yönlendir
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");

      // Tarayıcı ortamındaysa login'e yönlendir
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
