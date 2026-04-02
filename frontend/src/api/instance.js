import axios from 'axios';
import { API_CONFIG } from './config';

/**
 * Axios instance with interceptors for authentication.
 */
const instance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

// Request Interceptor: Attach Token
instance.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Unauthorized and Errors
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data;

    if (typeof window !== 'undefined') {
      if (status === 401) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      } else if (status === 403 && errorData?.error === 'Wrong portal') {
        // Portal Guard triggered - wrong portal for this user
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
