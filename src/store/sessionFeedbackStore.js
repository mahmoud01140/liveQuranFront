import { create } from 'zustand';
import api from '../services/api';

const useSessionFeedbackStore = create((set) => ({
  feedbacks: [],
  myFeedbacks: [],
  commonErrors: [],
  avgRatings: null,
  students: [],
  groupName: '',
  isLoading: false,

  // Admin/Teacher: get group students
  fetchGroupStudents: async (groupId) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/session-feedback/group/${groupId}/students`);
      set({ students: res.data.students, groupName: res.data.groupName, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  // Admin/Teacher: create feedback
  createFeedback: async (data) => {
    const res = await api.post('/session-feedback', data);
    set((state) => ({ feedbacks: [res.data.feedback, ...state.feedbacks] }));
    return res.data.feedback;
  },

  // Admin/Teacher: get group feedbacks
  fetchGroupFeedbacks: async (groupId, params = {}) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/session-feedback/group/${groupId}`, { params });
      set({ feedbacks: res.data.feedbacks, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  // Student: get my feedbacks
  fetchMyFeedbacks: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/session-feedback/my');
      set({
        myFeedbacks: res.data.feedbacks,
        commonErrors: res.data.commonErrors,
        avgRatings: res.data.avgRatings,
        isLoading: false,
      });
    } catch { set({ isLoading: false }); }
  },
}));

export default useSessionFeedbackStore;
