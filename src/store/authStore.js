import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { connectSocket, disconnectSocket, joinGroupRoom } from '../services/socket';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isCheckingAuth: true,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/register', data);
          set({ user: res.data.user, token: res.data.token, isLoading: false });
          connectSocket(res.data.token);
          return res.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          set({ user: res.data.user, token: res.data.token, isLoading: false });
          connectSocket(res.data.token);
          // Auto-join group room for live broadcasts
          const gId = res.data.user.group?._id || res.data.user.group;
          if (gId) setTimeout(() => joinGroupRoom(gId), 500);
          return res.data;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (_) {}
        disconnectSocket();
        set({ user: null, token: null });
      },

      checkAuth: async () => {
        set({ isCheckingAuth: true });
        try {
          const storedState = JSON.parse(localStorage.getItem('auth-storage') || '{}');
          const token = storedState?.state?.token;
          if (!token) return set({ isCheckingAuth: false });
          const res = await api.get('/auth/me');
          set({ user: res.data.user, token, isCheckingAuth: false });
          connectSocket(token);
          // Auto-join group room for live broadcasts
          const gId = res.data.user.group?._id || res.data.user.group;
          if (gId) setTimeout(() => joinGroupRoom(gId), 500);
        } catch (_) {
          set({ user: null, token: null, isCheckingAuth: false });
        }
      },

      updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),

      verifyEmail: async (otp) => {
        const res = await api.post('/auth/verify-email', { otp });
        set({ user: res.data.user });
        return res.data;
      },

      resendOTP: async () => {
        const res = await api.post('/auth/resend-otp');
        return res.data;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export default useAuthStore;
