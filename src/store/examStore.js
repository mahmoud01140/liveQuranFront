import { create } from 'zustand';
import api from '../services/api';

const useExamStore = create((set, get) => ({
  currentExam: null,
  answers: {},          // MCQ answers: { [questionIndex]: optionIndex }
  writtenAnswers: {},   // Written answers: { [questionIndex]: 'text' }
  surveyAnswers: [],
  oralRecordings: [],   // [{ questionId, audioBlob, audioUrl }]
  result: null,
  results: [],          // student's past results
  groupExams: [],       // exams for a group
  availableExams: [],   // exams the student hasn't taken yet
  groupResults: [],     // admin: results for a group
  examResults: [],      // admin: results for a specific exam
  isLoading: false,
  isSubmitting: false,
  currentQuestion: 0,

  setCurrentExam: (exam) => set({ currentExam: exam, answers: {}, writtenAnswers: {}, currentQuestion: 0 }),

  setAnswer: (questionIndex, answer) => set((state) => ({
    answers: { ...state.answers, [questionIndex]: answer },
  })),

  setWrittenAnswer: (questionIndex, text) => set((state) => ({
    writtenAnswers: { ...state.writtenAnswers, [questionIndex]: text },
  })),

  setSurveyAnswer: (index, option) => set((state) => {
    const updated = [...state.surveyAnswers];
    updated[index] = option;
    return { surveyAnswers: updated };
  }),

  addOralRecording: (questionId, audioBlob, audioUrl) => set((state) => ({
    oralRecordings: [
      ...state.oralRecordings.filter((r) => r.questionId !== questionId),
      { questionId, audioBlob, audioUrl },
    ],
  })),

  nextQuestion: () => set((state) => ({
    currentQuestion: Math.min(state.currentQuestion + 1, (state.currentExam?.questions?.length || 1) - 1),
  })),

  prevQuestion: () => set((state) => ({
    currentQuestion: Math.max(state.currentQuestion - 1, 0),
  })),

  placementCompleted: false,
  placementResult: null,

  fetchPlacementExam: async (type) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/exams/placement/${type}`);
      if (res.data.alreadyCompleted) {
        set({
          currentExam: res.data.exam,
          placementCompleted: true,
          placementResult: res.data.result,
          isLoading: false,
        });
        return res.data.exam;
      }
      set({ currentExam: res.data.exam, placementCompleted: false, placementResult: null, isLoading: false });
      return res.data.exam;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Submit exam with MCQ + Written answers
  submitWrittenExam: async (examId) => {
    const { answers, writtenAnswers, surveyAnswers, currentExam } = get();
    set({ isSubmitting: true });
    try {
      const answersArray = (currentExam?.questions || []).map((_, idx) => answers[idx] ?? -1);
      const writtenAnswersArray = (currentExam?.questions || []).map((_, idx) => writtenAnswers[idx] ?? '');
      const res = await api.post(`/exams/${examId}/submit`, {
        answers: answersArray,
        writtenAnswers: writtenAnswersArray,
        surveyAnswers,
        examType: currentExam?.type,
      });
      set({ result: res.data.result, isSubmitting: false });
      return res.data.result;
    } catch (error) {
      set({ isSubmitting: false });
      throw error;
    }
  },

  // Submit oral exam (old placement flow)
  submitOralExam: async (examId, resultId) => {
    const { oralRecordings } = get();
    set({ isSubmitting: true });
    try {
      const formData = new FormData();
      if (resultId) formData.append('resultId', resultId);
      oralRecordings.forEach((rec, idx) => {
        if (rec.audioBlob) formData.append('recordings', rec.audioBlob, `recording-${idx}.webm`);
        if (rec.taskId) formData.append(`taskId_${idx}`, rec.taskId);
      });
      const res = await api.post(`/exams/${examId}/submit-oral`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ isSubmitting: false });
      return res.data.result;
    } catch (error) {
      set({ isSubmitting: false });
      throw error;
    }
  },

  // Submit recitation recordings for lesson exam
  submitRecitationAnswers: async (examId, resultId) => {
    const { oralRecordings } = get();
    set({ isSubmitting: true });
    try {
      const formData = new FormData();
      if (resultId) formData.append('examResultId', resultId);
      oralRecordings.forEach((rec, idx) => {
        if (rec.audioBlob) formData.append('recordings', rec.audioBlob, `recitation-${idx}.webm`);
        if (rec.questionId) formData.append(`questionId_${idx}`, rec.questionId);
      });
      const res = await api.post(`/exams/${examId}/submit-recitation`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ isSubmitting: false });
      return res.data.result;
    } catch (error) {
      set({ isSubmitting: false });
      throw error;
    }
  },

  fetchMyResults: async (studentId) => {
    try {
      const res = await api.get(`/exams/results/student/${studentId}`);
      set({ results: res.data.results });
    } catch (_) {}
  },

  fetchGroupExams: async (groupId) => {
    try {
      const res = await api.get(`/exams/group/${groupId}`);
      set({ groupExams: res.data.exams });
      return res.data.exams;
    } catch (_) {}
  },

  // Fetch exams for the student's group + filter out ones already taken
  fetchAvailableExams: async (groupId, studentId) => {
    try {
      const [examsRes, resultsRes] = await Promise.all([
        api.get(`/exams/group/${groupId}`),
        api.get(`/exams/results/student/${studentId}`),
      ]);
      const allExams = examsRes.data.exams || [];
      const takenExamIds = new Set((resultsRes.data.results || []).map(r => r.exam?._id));
      const available = allExams.filter(e => !takenExamIds.has(e._id));
      set({ availableExams: available, groupExams: allExams });
      return available;
    } catch (_) {
      return [];
    }
  },

  // Admin: get all results for a group
  fetchGroupResults: async (groupId) => {
    try {
      const res = await api.get(`/exams/group/${groupId}/results`);
      set({ groupResults: res.data.results });
      return res.data;
    } catch (_) {}
  },

  // Admin: get results for a specific exam
  fetchExamResults: async (examId) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/exams/${examId}/results`);
      set({ examResults: res.data.results, isLoading: false });
      return res.data.results;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchResult: async (resultId) => {
    const res = await api.get(`/exams/results/${resultId}`);
    set({ result: res.data.result });
    return res.data.result;
  },

  // Admin/Teacher: create exam
  createGroupExam: async (examData) => {
    const res = await api.post('/exams', examData);
    return res.data.exam;
  },

  // Admin/Teacher: update exam
  updateGroupExam: async (examId, examData) => {
    const res = await api.put(`/exams/${examId}`, examData);
    return res.data.exam;
  },

  // Admin/Teacher: delete exam
  deleteGroupExam: async (examId) => {
    await api.delete(`/exams/${examId}`);
    set((state) => ({
      groupExams: state.groupExams.filter(e => e._id !== examId),
    }));
  },

  resetExam: () => set({
    currentExam: null, answers: {}, writtenAnswers: {}, surveyAnswers: [], oralRecordings: [],
    result: null, currentQuestion: 0,
  }),
}));

export default useExamStore;
