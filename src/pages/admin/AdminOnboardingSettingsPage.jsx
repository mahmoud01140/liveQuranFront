import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, HelpCircle, FileCheck2, Plus, Trash2, Save,
  CheckCircle, Book, Clock, Award, Users, GraduationCap,
  HeartHandshake, ChevronDown, ChevronUp, Copy, Sparkles,
  AlertCircle, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../services/api';
import QURAN_SURAHS from '../../utils/quranData';

const USER_ROLES = [
  { id: 'student', title: 'الطلاب', desc: 'تحديد المستوى واستبيان الطلاب الجدد', icon: Users, color: 'emerald' },
  { id: 'teacher', title: 'المعلمون', desc: 'اختبار كفاءة واستبيان المعلمين', icon: GraduationCap, color: 'blue' },
  { id: 'senior', title: 'كبار السن', desc: 'استبيان واختبار الفئات الخاصة', icon: HeartHandshake, color: 'amber' },
];

const QUESTION_TYPES = [
  { value: 'mcq', label: 'اختيار من متعدد', emoji: '🔵', color: 'blue' },
  { value: 'true_false', label: 'صح / خطأ', emoji: '✅', color: 'amber' },
  { value: 'written', label: 'إكمال / كتابي', emoji: '✏️', color: 'purple' },
  { value: 'recitation', label: 'تلاوة / تجويد', emoji: '🎙️', color: 'emerald' },
];

const EMPTY_EXAM_Q = {
  type: 'mcq',
  text: '',
  arabicText: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  correctAnswerBool: true,
  correctAnswerText: '',
  points: 1,
  surahNumber: '',
  fromVerse: '',
  toVerse: '',
  mode: 'practice',
};

const EMPTY_SURVEY_Q = {
  id: '',
  text: '',
  options: ['', '', ''],
};

export default function AdminOnboardingSettingsPage() {
  const [selectedRole, setSelectedRole] = useState('student');
  const [activeTab, setActiveTab] = useState('placement'); // 'placement' | 'survey'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Placement Exam state
  const [placementExam, setPlacementExam] = useState({
    title: '',
    duration: 30,
    passingScore: 60,
    questions: [],
    oralTasks: [],
  });

  // Survey state
  const [surveyData, setSurveyData] = useState({
    title: '',
    questions: [],
  });

  // Expanded question indices
  const [expandedExamQ, setExpandedExamQ] = useState(0);

  // Load Data for current selected role
  useEffect(() => {
    fetchData();
  }, [selectedRole]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examRes, surveyRes] = await Promise.all([
        api.get(`/exams/placement/${selectedRole}`).catch(() => ({ data: { exam: null } })),
        api.get(`/survey/${selectedRole}`).catch(() => ({ data: { survey: null } })),
      ]);

      if (examRes.data?.exam) {
        setPlacementExam({
          title: examRes.data.exam.title || 'امتحان تحديد المستوى',
          duration: examRes.data.exam.duration || 30,
          passingScore: examRes.data.exam.passingScore || 60,
          questions: examRes.data.exam.questions || [],
          oralTasks: examRes.data.exam.oralTasks || [],
        });
      } else {
        setPlacementExam({
          title: `امتحان تحديد المستوى — ${USER_ROLES.find(r => r.id === selectedRole)?.title || ''}`,
          duration: 30,
          passingScore: 60,
          questions: [{ ...EMPTY_EXAM_Q }],
          oralTasks: [],
        });
      }

      if (surveyRes.data?.survey) {
        setSurveyData({
          title: surveyRes.data.survey.title || 'استبيان التسجيل',
          questions: surveyRes.data.survey.questions || [],
        });
      } else {
        setSurveyData({
          title: `استبيان تسجيل ${USER_ROLES.find(r => r.id === selectedRole)?.title || ''}`,
          questions: [],
        });
      }
    } catch (err) {
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  // ── Placement Exam Handlers ────────────────────────────────────────────────
  const addExamQuestion = () => {
    setPlacementExam(prev => ({
      ...prev,
      questions: [...prev.questions, { ...EMPTY_EXAM_Q }],
    }));
    setExpandedExamQ(placementExam.questions.length);
  };

  const updateExamQuestion = (idx, field, value) => {
    setPlacementExam(prev => {
      const qList = [...prev.questions];
      qList[idx] = { ...qList[idx], [field]: value };
      return { ...prev, questions: qList };
    });
  };

  const updateExamOption = (qIdx, optIdx, value) => {
    setPlacementExam(prev => {
      const qList = [...prev.questions];
      const opts = [...(qList[qIdx].options || ['', '', '', ''])];
      opts[optIdx] = value;
      qList[qIdx] = { ...qList[qIdx], options: opts };
      return { ...prev, questions: qList };
    });
  };

  const removeExamQuestion = (idx) => {
    setPlacementExam(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  const duplicateExamQuestion = (idx) => {
    setPlacementExam(prev => {
      const qToDup = { ...prev.questions[idx] };
      const qList = [...prev.questions];
      qList.splice(idx + 1, 0, qToDup);
      return { ...prev, questions: qList };
    });
  };

  const savePlacementExam = async () => {
    try {
      setSaving(true);
      await api.put(`/exams/admin/placement/${selectedRole}`, placementExam);
      toast.success('تم حفظ امتحان تحديد المستوى بنجاح!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطأ في حفظ الامتحان');
    } finally {
      setSaving(false);
    }
  };

  // ── Survey Handlers ────────────────────────────────────────────────────────
  const addSurveyQuestion = () => {
    setSurveyData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { id: `q_${Date.now()}`, text: '', options: ['خيار 1', 'خيار 2'] },
      ],
    }));
  };

  const updateSurveyQuestion = (idx, field, value) => {
    setSurveyData(prev => {
      const qList = [...prev.questions];
      qList[idx] = { ...qList[idx], [field]: value };
      return { ...prev, questions: qList };
    });
  };

  const updateSurveyOption = (qIdx, optIdx, value) => {
    setSurveyData(prev => {
      const qList = [...prev.questions];
      const opts = [...(qList[qIdx].options || [])];
      opts[optIdx] = value;
      qList[qIdx] = { ...qList[qIdx], options: opts };
      return { ...prev, questions: qList };
    });
  };

  const addSurveyOption = (qIdx) => {
    setSurveyData(prev => {
      const qList = [...prev.questions];
      const opts = [...(qList[qIdx].options || []), `خيار جديد`];
      qList[qIdx] = { ...qList[qIdx], options: opts };
      return { ...prev, questions: qList };
    });
  };

  const removeSurveyOption = (qIdx, optIdx) => {
    setSurveyData(prev => {
      const qList = [...prev.questions];
      const opts = (qList[qIdx].options || []).filter((_, i) => i !== optIdx);
      qList[qIdx] = { ...qList[qIdx], options: opts };
      return { ...prev, questions: qList };
    });
  };

  const removeSurveyQuestion = (idx) => {
    setSurveyData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  const saveSurvey = async () => {
    try {
      setSaving(true);
      await api.put(`/survey/admin/${selectedRole}`, surveyData);
      toast.success('تم حفظ أسئلة الاستبيان بنجاح!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطأ في حفظ الاستبيان');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">إدارة تحديد المستوى والاستبيانات</h1>
          </div>
          <p className="text-sm text-gray-500">
            تخصيص أسئلة اختبارات تحديد المستوى واستبيانات التسجيل لجميع فئات المستخدمين
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="btn-ghost text-xs flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          تحديث البيانات
        </button>
      </div>

      {/* Role Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {USER_ROLES.map((r) => {
          const isSelected = selectedRole === r.id;
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className={`p-4 rounded-2xl border-2 text-right transition-all flex items-center gap-3.5 ${
                isSelected
                  ? 'border-primary-500 bg-primary-50/70 shadow-sm shadow-primary-100 ring-2 ring-primary-500/20'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className={`font-black text-sm ${isSelected ? 'text-primary-900' : 'text-gray-800'}`}>
                  {r.title}
                </h3>
                <p className="text-xs text-gray-500 truncate mt-0.5">{r.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Section Switcher (Placement Exam vs Survey) */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('placement')}
          className={`pb-3 text-sm font-black flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'placement'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          امتحان تحديد المستوى ({placementExam.questions?.length || 0} أسئلة)
        </button>

        <button
          onClick={() => setActiveTab('survey')}
          className={`pb-3 text-sm font-black flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'survey'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          استبيان التسجيل ({surveyData.questions?.length || 0} أسئلة)
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" text="جارٍ جلب إعدادات القسم..." />
        </div>
      ) : activeTab === 'placement' ? (
        /* ══════════════════════════════════════════════════════════════════════
           TAB 1: PLACEMENT EXAM BUILDER
           ══════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* General Exam Settings Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
            <h2 className="font-black text-gray-900 text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-500" />
              إعدادات الامتحان الأساسية
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">عنوان الاختبار</label>
                <input
                  type="text"
                  value={placementExam.title}
                  onChange={e => setPlacementExam(p => ({ ...p, title: e.target.value }))}
                  className="input-base text-sm"
                  placeholder="مثال: امتحان تحديد المستوى للطلاب"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">المدة الزمنية (بالدقائق)</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" />
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={placementExam.duration}
                    onChange={e => setPlacementExam(p => ({ ...p, duration: parseInt(e.target.value) || 30 }))}
                    className="input-base text-sm pr-9"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">نسبة النجاح للترقية (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={placementExam.passingScore}
                  onChange={e => setPlacementExam(p => ({ ...p, passingScore: parseInt(e.target.value) || 60 }))}
                  className="input-base text-sm"
                />
              </div>
            </div>
          </div>

          {/* Questions Header & Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-gray-900 text-lg">أسئلة الامتحان التحريري</h2>
              <p className="text-xs text-gray-500">يدعم الاختيار من متعدد، صح/خطأ، إكمال كتابي، وتلاوة قرآنية</p>
            </div>
            <button
              type="button"
              onClick={addExamQuestion}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              إضافة سؤال جديد
            </button>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {placementExam.questions.map((q, qi) => {
              const isExpanded = expandedExamQ === qi;
              const typeObj = QUESTION_TYPES.find(t => t.value === q.type) || QUESTION_TYPES[0];

              return (
                <div
                  key={qi}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all"
                >
                  {/* Collapsed Header */}
                  <div
                    onClick={() => setExpandedExamQ(isExpanded ? -1 : qi)}
                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50/80 select-none"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gray-100 font-black text-gray-700 text-xs flex items-center justify-center flex-shrink-0">
                      {qi + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {q.text || q.arabicText || <span className="text-gray-400 italic">سؤال جديد...</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {typeObj.emoji} {typeObj.label}
                        </span>
                        <span className="text-[11px] text-gray-400 font-semibold">{q.points || 1} نقطة</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); duplicateExamQuestion(qi); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="نسخ السؤال"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {placementExam.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeExamQuestion(qi); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف السؤال"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <div className="p-1 text-gray-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Body */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-5 pt-3 border-t border-gray-100 space-y-4"
                      >
                        {/* Type Selector */}
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-2 block">نوع السؤال</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {QUESTION_TYPES.map((t) => (
                              <button
                                key={t.value}
                                type="button"
                                onClick={() => updateExamQuestion(qi, 'type', t.value)}
                                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                  q.type === t.value
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <span>{t.emoji}</span>
                                <span>{t.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Question Text */}
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-1.5 block">نص السؤال *</label>
                          <textarea
                            value={q.text || ''}
                            onChange={e => updateExamQuestion(qi, 'text', e.target.value)}
                            className="input-base text-sm resize-none h-18"
                            placeholder="اكتب نص السؤال هنا..."
                          />
                        </div>

                        {/* Question Points */}
                        <div className="w-32">
                          <label className="text-xs font-bold text-gray-600 mb-1.5 block">الدرجة</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={q.points || 1}
                            onChange={e => updateExamQuestion(qi, 'points', parseInt(e.target.value) || 1)}
                            className="input-base text-sm text-center"
                          />
                        </div>

                        {/* 1. MCQ OPTIONS */}
                        {q.type === 'mcq' && (
                          <div className="space-y-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <label className="text-xs font-bold text-gray-700 block">
                              خيارات الإجابة (اضغط الدائرة لتحديد الإجابة الصحيحة):
                            </label>
                            {(q.options || ['', '', '', '']).map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => updateExamQuestion(qi, 'correctAnswer', oi)}
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                    q.correctAnswer === oi
                                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                                      : 'border-gray-300 bg-white hover:border-emerald-400'
                                  }`}
                                >
                                  {q.correctAnswer === oi && <CheckCircle className="w-4 h-4" />}
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={e => updateExamOption(qi, oi, e.target.value)}
                                  className="input-base text-sm py-2 flex-1"
                                  placeholder={`الخيار ${oi + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 2. TRUE / FALSE */}
                        {q.type === 'true_false' && (
                          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60">
                            <label className="text-xs font-bold text-amber-900 mb-2.5 block">
                              الإجابة الصحيحة لهذا السؤال:
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => updateExamQuestion(qi, 'correctAnswerBool', true)}
                                className={`py-3 px-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                  q.correctAnswerBool !== false
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-600'
                                }`}
                              >
                                <span className="text-lg">✅</span>
                                <span>صحيح (صح)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => updateExamQuestion(qi, 'correctAnswerBool', false)}
                                className={`py-3 px-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                  q.correctAnswerBool === false
                                    ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-sm'
                                    : 'border-gray-200 bg-white text-gray-600'
                                }`}
                              >
                                <span className="text-lg">❌</span>
                                <span>خطأ</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 3. WRITTEN */}
                        {q.type === 'written' && (
                          <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200/60">
                            <label className="text-xs font-bold text-purple-900 mb-1.5 block">
                              الإجابة النموذجية (للتصحيح والمقارنة):
                            </label>
                            <input
                              type="text"
                              value={q.correctAnswerText || ''}
                              onChange={e => updateExamQuestion(qi, 'correctAnswerText', e.target.value)}
                              className="input-base text-sm"
                              placeholder="أدخل نص الإجابة النموذجية..."
                            />
                          </div>
                        )}

                        {/* 4. RECITATION */}
                        {q.type === 'recitation' && (
                          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/60 space-y-3">
                            <div className="flex items-center gap-2">
                              <Book className="w-4 h-4 text-emerald-700" />
                              <span className="text-xs font-bold text-emerald-900">تحديد الآيات المطلوبة للتلاوة</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">السورة</label>
                                <select
                                  value={q.surahNumber || ''}
                                  onChange={e => updateExamQuestion(qi, 'surahNumber', e.target.value)}
                                  className="input-base text-sm"
                                >
                                  <option value="">اختر السورة</option>
                                  {QURAN_SURAHS.map((s) => (
                                    <option key={s.number} value={s.number}>
                                      {s.number}. {s.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">من آية</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={q.fromVerse || ''}
                                  onChange={e => updateExamQuestion(qi, 'fromVerse', e.target.value)}
                                  className="input-base text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">إلى آية</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={q.toVerse || ''}
                                  onChange={e => updateExamQuestion(qi, 'toVerse', e.target.value)}
                                  className="input-base text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Sticky Save Bar */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={savePlacementExam}
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-8 py-3 text-base shadow-md disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'جارٍ الحفظ...' : 'حفظ اختبار تحديد المستوى'}
            </button>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════
           TAB 2: SURVEY BUILDER
           ══════════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Survey Title Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">عنوان الاستبيان</label>
            <input
              type="text"
              value={surveyData.title}
              onChange={e => setSurveyData(p => ({ ...p, title: e.target.value }))}
              className="input-base text-sm"
              placeholder="مثال: استبيان تسجيل الطلاب الجدد"
            />
          </div>

          {/* Survey Header & Add Button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-gray-900 text-lg">أسئلة استبيان التسجيل</h2>
              <p className="text-xs text-gray-500">تظهر للمستخدم عند التسجيل لتحديد أهدافه وتوجيهه للحلقة المناسبة</p>
            </div>
            <button
              type="button"
              onClick={addSurveyQuestion}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              إضافة سؤال استبيان
            </button>
          </div>

          {/* Survey Questions List */}
          <div className="space-y-4">
            {surveyData.questions.map((sq, sqi) => (
              <div key={sqi} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
                    سؤال استبيان #{sqi + 1}
                  </span>
                  {surveyData.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSurveyQuestion(sqi)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف السؤال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1 block">نص السؤال</label>
                  <input
                    type="text"
                    value={sq.text}
                    onChange={e => updateSurveyQuestion(sqi, 'text', e.target.value)}
                    className="input-base text-sm font-semibold"
                    placeholder="مثال: ما هو هدفك الأساسي من التسجيل؟"
                  />
                </div>

                {/* Survey Options */}
                <div className="space-y-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-700">خيارات الإجابة</span>
                    <button
                      type="button"
                      onClick={() => addSurveyOption(sqi)}
                      className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      إضافة خيار
                    </button>
                  </div>

                  {(sq.options || []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-5 text-center">{oi + 1}</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => updateSurveyOption(sqi, oi, e.target.value)}
                        className="input-base text-sm py-1.5 flex-1"
                        placeholder={`خيار ${oi + 1}`}
                      />
                      {(sq.options || []).length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeSurveyOption(sqi, oi)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sticky Save Bar */}
          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={saveSurvey}
              disabled={saving}
              className="btn-primary flex items-center gap-2 px-8 py-3 text-base shadow-md disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'جارٍ الحفظ...' : 'حفظ أسئلة الاستبيان'}
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
