import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: localStorage.getItem('user')
    ? JSON.parse(localStorage.getItem('user'))
    : null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),

  login: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));

export const useQueueStore = create((set) => ({
  queue: [],
  userQueueStatus: null,

  setQueue: (queue) => set({ queue }),
  setUserQueueStatus: (status) => set({ userQueueStatus: status }),
}));
