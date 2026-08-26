import { create } from 'zustand';
import api from '../services/api';

const useDiscussionStore = create((set, get) => ({
  messages: [],
  pinnedMessages: [],
  isLoading: false,
  hasMore: false,
  totalMessages: 0,
  onlineCount: 0,
  typingUsers: [],
  groupName: '',

  fetchDiscussion: async (groupId) => {
    if (!groupId) return;
    set({ isLoading: true });
    try {
      const res = await api.get(`/discussions/${groupId}`);
      const { messages, pinnedMessages, totalMessages, hasMore, groupName } = res.data.discussion;
      set({
        messages,
        pinnedMessages,
        totalMessages,
        hasMore,
        groupName: groupName || '',
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      console.error('fetchDiscussion error:', error);
    }
  },

  addMessage: (message) => {
    set((state) => {
      // Prevent duplicates
      const exists = state.messages.some(m => m._id === message._id);
      if (exists) return state;
      return { messages: [...state.messages, message] };
    });
  },

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.map(m =>
        m._id === messageId ? { ...m, isDeleted: true, content: 'تم حذف هذه الرسالة' } : m
      ),
    }));
  },

  togglePin: (messageId, isPinned) => {
    set((state) => ({
      messages: state.messages.map(m =>
        m._id === messageId ? { ...m, isPinned } : m
      ),
      pinnedMessages: isPinned
        ? [...state.pinnedMessages, state.messages.find(m => m._id === messageId)]
        : state.pinnedMessages.filter(m => m._id !== messageId),
    }));
  },

  setOnlineCount: (count) => set({ onlineCount: count }),

  addTypingUser: (userId, userName) => {
    set((state) => {
      if (state.typingUsers.some(u => u.userId === userId)) return state;
      return { typingUsers: [...state.typingUsers, { userId, userName }] };
    });
  },

  removeTypingUser: (userId) => {
    set((state) => ({
      typingUsers: state.typingUsers.filter(u => u.userId !== userId),
    }));
  },

  // REST fallback
  sendMessageRest: async (groupId, content, type = 'text', replyTo = null) => {
    try {
      const res = await api.post(`/discussions/${groupId}/messages`, { content, type, replyTo });
      return res.data.message;
    } catch (error) {
      console.error('sendMessage error:', error);
      throw error;
    }
  },

  pinMessage: async (groupId, messageId) => {
    try {
      const res = await api.put(`/discussions/${groupId}/messages/${messageId}/pin`);
      return res.data;
    } catch (error) {
      console.error('pinMessage error:', error);
      throw error;
    }
  },

  deleteMessage: async (groupId, messageId) => {
    try {
      await api.delete(`/discussions/${groupId}/messages/${messageId}`);
    } catch (error) {
      console.error('deleteMessage error:', error);
      throw error;
    }
  },

  reset: () => set({
    messages: [],
    pinnedMessages: [],
    isLoading: false,
    hasMore: false,
    totalMessages: 0,
    onlineCount: 0,
    typingUsers: [],
    groupName: '',
  }),
}));

export default useDiscussionStore;
