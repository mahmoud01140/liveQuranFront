import { create } from 'zustand';
import api from '../services/api';

// Lesson-scoped discussion — pure HTTP polling, no socket.io.
const useDiscussionStore = create((set, get) => ({
  lessonId: null,
  lessonTitle: '',
  groupName: '',
  messages: [],
  pinnedMessages: [],
  isLoading: false,
  hasMore: false,
  totalMessages: 0,

  fetchLessonDiscussion: async (lessonId, { silent = false } = {}) => {
    if (!lessonId) return;
    if (!silent) set({ isLoading: true });
    try {
      const res = await api.get(`/discussions/lesson/${lessonId}`);
      const d = res.data.discussion;
      set({
        lessonId,
        lessonTitle: d.lessonTitle || '',
        groupName: d.groupName || '',
        messages: d.messages || [],
        pinnedMessages: d.pinnedMessages || [],
        totalMessages: d.totalMessages || 0,
        hasMore: !!d.hasMore,
        isLoading: false,
      });
      return d;
    } catch (error) {
      if (!silent) set({ isLoading: false });
      throw error;
    }
  },

  sendLessonMessage: async (lessonId, content, replyTo = null) => {
    const res = await api.post(`/discussions/lesson/${lessonId}/messages`, {
      content,
      type: 'text',
      replyTo,
    });
    const message = res.data.message;
    // Append locally for instant feedback, then the poller reconciles
    set((state) => {
      if (state.lessonId !== lessonId) return state;
      if (state.messages.some(m => m._id === message._id)) return state;
      return { messages: [...state.messages, message] };
    });
    return message;
  },

  pinLessonMessage: async (lessonId, messageId) => {
    const res = await api.put(`/discussions/lesson/${lessonId}/messages/${messageId}/pin`);
    const { isPinned } = res.data;
    set((state) => {
      if (state.lessonId !== lessonId) return state;
      return {
        messages: state.messages.map(m =>
          m._id === messageId ? { ...m, isPinned } : m
        ),
        pinnedMessages: isPinned
          ? [...state.pinnedMessages.filter(m => m._id !== messageId),
             { ...state.messages.find(m => m._id === messageId), isPinned }]
          : state.pinnedMessages.filter(m => m._id !== messageId),
      };
    });
    return res.data;
  },

  deleteLessonMessage: async (lessonId, messageId) => {
    await api.delete(`/discussions/lesson/${lessonId}/messages/${messageId}`);
    set((state) => {
      if (state.lessonId !== lessonId) return state;
      return {
        messages: state.messages.map(m =>
          m._id === messageId ? { ...m, isDeleted: true, content: 'تم حذف هذه الرسالة' } : m
        ),
        pinnedMessages: state.pinnedMessages.filter(m => m._id !== messageId),
      };
    });
  },

  reset: () => set({
    lessonId: null,
    lessonTitle: '',
    groupName: '',
    messages: [],
    pinnedMessages: [],
    isLoading: false,
    hasMore: false,
    totalMessages: 0,
  }),
}));

export default useDiscussionStore;
