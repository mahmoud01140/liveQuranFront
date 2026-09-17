import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — add auth token if stored
api.interceptors.request.use(
  (config) => {
    try {
      const storedState = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      const token = storedState?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      // Tell the student instead of silently wiping the session.
      // Skip auth pages to avoid redirect loops.
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        try { toast.error('انتهت الجلسة. سجل الدخول مجدداً.'); } catch (_) {}
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper to set multipart header for file uploads
export const createFormData = (data) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => formData.append(key, v));
    } else if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
};
