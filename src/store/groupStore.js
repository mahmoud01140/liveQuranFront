import { create } from 'zustand';
import api from '../services/api';

const useGroupStore = create((set, get) => ({
  group: null,
  groups: [],
  students: [],
  schedule: [],
  studyPlan: null,
  isLoading: false,

  fetchMyGroup: async (groupId) => {
    if (!groupId) return;
    set({ isLoading: true });
    try {
      const res = await api.get(`/groups/${groupId}`);
      set({ group: res.data.group, schedule: res.data.group.schedule, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  fetchAllGroups: async (params = {}) => {
    set({ isLoading: true });
    try {
      const res = await api.get('/groups', { params });
      set({ groups: res.data.groups, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  fetchGroupStudents: async (groupId) => {
    try {
      const res = await api.get(`/groups/${groupId}/students`);
      set({ students: res.data.students });
    } catch (_) {}
  },

  fetchStudyPlan: async (groupId) => {
    try {
      const res = await api.get(`/study-plans/group/${groupId}`);
      set({ studyPlan: res.data.plan });
    } catch (_) {}
  },

  createGroup: async (data) => {
    const res = await api.post('/groups', data);
    set((state) => ({ groups: [res.data.group, ...state.groups] }));
    return res.data.group;
  },

  updateGroup: async (id, data) => {
    const res = await api.put(`/groups/${id}`, data);
    set((state) => ({
      groups: state.groups.map((g) => (g._id === id ? res.data.group : g)),
      group: state.group?._id === id ? res.data.group : state.group,
    }));
    return res.data.group;
  },

  deleteGroup: async (id) => {
    await api.delete(`/groups/${id}`);
    set((state) => ({ groups: state.groups.filter((g) => g._id !== id) }));
  },

  addStudent: async (groupId, studentId) => {
    const res = await api.post(`/groups/${groupId}/add-student`, { studentId });
    await get().fetchAllGroups();
    return res.data;
  },

  removeStudent: async (groupId, studentId) => {
    await api.delete(`/groups/${groupId}/remove-student/${studentId}`);
    set((state) => ({
      students: state.students.filter((s) => s._id !== studentId),
    }));
  },

  assignTeacher: async (groupId, teacherId) => {
    const res = await api.put(`/groups/${groupId}/assign-teacher`, { teacherId });
    set((state) => ({
      groups: state.groups.map((g) => (g._id === groupId ? res.data.group : g)),
    }));
    return res.data;
  },

  updateSchedule: async (groupId, schedule) => {
    const res = await api.put(`/groups/${groupId}/schedule`, { schedule });
    set({ schedule: res.data.schedule });
    return res.data;
  },

  updateDays: async (groupId, days) => {
    const res = await api.put(`/groups/${groupId}/days`, { days });
    set((state) => ({
      groups: state.groups.map((g) => (g._id === groupId ? res.data.group : g)),
      group: state.group?._id === groupId ? res.data.group : state.group,
    }));
    return res.data;
  },
}));

export default useGroupStore;
