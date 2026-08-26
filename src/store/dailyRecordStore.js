import { create } from 'zustand';
import api from '../services/api';

const useDailyRecordStore = create((set, get) => ({
  records: [],
  weeklyStats: null,
  groupRecords: [],
  pendingCount: 0,
  isLoading: false,

  // Student: fetch my records
  fetchMyRecords: async (params = {}) => {
    set({ isLoading: true });
    try {
      const res = await api.get('/daily-records/my', { params });
      set({ records: res.data.records, weeklyStats: res.data.weeklyStats, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  // Student: create record
  createRecord: async (data) => {
    const res = await api.post('/daily-records', data);
    set((state) => ({ records: [res.data.record, ...state.records] }));
    // Refresh weekly stats
    get().fetchMyRecords({ week: 'current' });
    return res.data.record;
  },

  // Student: delete record
  deleteRecord: async (id) => {
    await api.delete(`/daily-records/${id}`);
    set((state) => ({ records: state.records.filter(r => r._id !== id) }));
  },

  // Teacher: fetch group records
  fetchGroupRecords: async (groupId, params = {}) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/daily-records/group/${groupId}`, { params });
      set({ groupRecords: res.data.records, pendingCount: res.data.pendingCount, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  // Teacher: review record
  reviewRecord: async (id, data) => {
    const res = await api.put(`/daily-records/${id}/review`, data);
    set((state) => ({
      groupRecords: state.groupRecords.map(r => r._id === id ? res.data.record : r),
      pendingCount: data.status === 'approved' || data.status === 'needs_review'
        ? Math.max(0, state.pendingCount - 1) : state.pendingCount,
    }));
    return res.data.record;
  },
}));

export default useDailyRecordStore;
