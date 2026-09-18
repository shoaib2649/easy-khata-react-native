import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Set this to your machine's local Wi-Fi IP address
export const API_BASE_URL = 'http://192.168.1.50:8000/api/v1';

export const TOKEN_KEY = 'easy_khata_auth_token';
export const USER_KEY = 'easy_khata_user_data';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
});

// Automatically inject Bearer Token into requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Error reading auth token from SecureStore:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthenticated 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear expired token
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      } catch {}
    }
    return Promise.reject(error);
  }
);
