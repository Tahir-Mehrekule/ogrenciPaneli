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

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {}
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      try {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("user_data");
        // Auth ekranına yönlendirme işini Context veya Navigasyon halledecek.
      } catch (e) {}
    }
    return Promise.reject(error);
  }
);

export default apiClient;
