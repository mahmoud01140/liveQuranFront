import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Save, BookOpen, FileText, Mic, PenLine, ChevronDown, ChevronUp,
  GripVertical, Copy, CheckCircle, AlertCircle, Sparkles, Book, Hash,
  Clock, Award, RotateCcw, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import useGroupStore from '../../store/groupStore';
import useExamStore from '../../store/examStore';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../services/api';
import QURAN_SURAHS from '../../utils/quranData';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'اختيار من متعدد', icon: CheckCircle, color: 'blue', emoji: '🔵' },
  { value: 'true_false', label: 'صح / خطأ', icon: CheckCircle, color: 'amber', emoji: '✅' },
  { value: 'written', label: 'إكمال / كتابي', icon: PenLine, color: 'purple', emoji: '✏️' },
  { value: 'recitation', label: 'شفهي / تسميع', icon: Mic, color: 'emerald', emoji: '🎙️' },
];

const EMPTY_Q = {
  type: 'mcq', text: '', options: ['', '', '', ''], correctAnswer: 0,
  correctAnswerBool: true, correctAnswerText: '', points: 1, instruction: '',
  surahNumber: '', fromVerse: '', toVerse: '', mode: 'practice',
};

export default function CreateExamPage() {
  const { groups, fetchAllGroups } = useGroupStore();
  const { createGroupExam } = useExamStore();
  const [saving, setSaving] = useState(false);
  const [expandedQ, setExpandedQ] = useState(0);

  // Group & Lesson selection
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [lessons, setLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const [exam, setExam] = useState({
    title: '',
    duration: 30,
    passingScore: 60,
    allowRetries: true,
    questions: [{ ...EMPTY_Q }],
  });

  useEffect(() => {
    fetchAllGroups();
  }, []);

  // Load lessons when group changes
  useEffect(() => {
    if (!selectedGroupId) { setLessons([]); setSelectedLessonId(''); return; }
    const loadLessons = async () => {
      setLoadingLessons(true);
      try {
        const res = await api.get(`/study-plans/group/${selectedGroupId}/full`);
        setLessons(res.data.plan?.customLessons || []);
      } catch { setLessons([]); }
      finally { setLoadingLessons(false); }
    };
    loadLessons();
  }, [selectedGroupId]);

  // Auto-set title when lesson is selected
  useEffect(() => {
    if (selectedLessonId) {
      const lesson = lessons.find(l => l._id === selectedLessonId);
      if (lesson && !exam.title) {
        setExam(p => ({ ...p, title: `تقييم: ${lesson.title}` }));
      }
    }
  }, [selectedLessonId]);

  const addQuestion = (type = 'mcq') => {
    const newQ = { ...EMPTY_Q, type };
    setExam(e => ({ ...e, questions: [...e.questions, newQ] }));
    setExpandedQ(exam.questions.length);
  };

  const removeQuestion = (idx) => {
    setExam(e => ({ ...e, questions: e.questions.filter((_, i) => i !== idx) }));
    if (expandedQ >= idx && expandedQ > 0) setExpandedQ(expandedQ - 1);
  };

  const duplicateQuestion = (idx) => {
    const q = { ...exam.questions[idx], options: [...(exam.questions[idx].options || [])] };
    setExam(e => ({ ...e, questions: [...e.questions.slice(0, idx + 1), q, ...e.questions.slice(idx + 1)] }));
    setExpandedQ(idx + 1);
  };

  const updateQ = (idx, field, val) => {
    setExam(e => {
      const qs = [...e.questions];
      qs[idx] = { ...qs[idx], [field]: val };
      // Reset options when switching type
      if (field === 'type') {
        if (val === 'mcq') qs[idx].options = ['', '', '', ''];
        else qs[idx].options = [];
      }
      return { ...e, questions: qs };
    });
  };

  const updateOption = (qi, oi, val) => {
    setExam(e => {
      const qs = [...e.questions];
      const opts = [...(qs[qi].options || [])];
      opts[oi] = val;
      qs[qi] = { ...qs[qi], options: opts };
      return { ...e, questions: qs };
    });
  };

  const moveQuestion = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= exam.questions.length) return;
    setExam(e => {
      const qs = [...e.questions];
      [qs[idx], qs[newIdx]] = [qs[newIdx], qs[idx]];
      return { ...e, questions: qs };
    });
    setExpandedQ(newIdx);
  };

  const handleSave = async () => {
    if (!exam.title) { toast.error('أدخل عنوان التقييم'); return; }
    if (!selectedGroupId) { toast.error('اختر المجموعة'); return; }
    if (!selectedLessonId) { toast.error('اختر الدرس'); return; }
    if (exam.questions.length === 0) { toast.error('أضف سؤالاً واحداً على الأقل'); return; }
    if (exam.questions.some(q => !q.text.trim())) { toast.error('أكمل نص جميع الأسئلة'); return; }

    const selectedLesson = lessons.find(l => l._id === selectedLessonId);

    setSaving(true);
    try {
      await createGroupExam({
        title: exam.title,
        type: 'lesson',
        group: selectedGroupId,
        lessonId: selectedLessonId,
        lessonTitle: selectedLesson?.title || '',
        duration: exam.duration,
        passingScore: exam.passingScore,
        allowRetries: exam.allowRetries,
        questions: exam.questions.map(q => ({
          ...q,
          surahNumber: q.surahNumber ? parseInt(q.surahNumber) : undefined,
          fromVerse: q.fromVerse ? parseInt(q.fromVerse) : undefined,
          toVerse: q.toVerse ? parseInt(q.toVerse) : undefined,
        })),
        totalPoints: exam.questions.reduce((s, q) => s + (q.points || 1), 0),
      });
      toast.success('تم إنشاء تقييم الدرس بنجاح! ✅');
      // Reset
      setExam({
        title: '', duration: 30, passingScore: 60, allowRetries: true,
        questions: [{ ...EMPTY_Q }],
      });
      setSelectedLessonId('');
      setExpandedQ(0);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'خطأ في حفظ التقييم');
    } finally { setSaving(false); }
  };

  const totalPoints = exam.questions.reduce((s, q) => s + (q.points || 1), 0);
  const questionStats = {
    mcq: exam.questions.filter(q => q.type === 'mcq').length,
    true_false: exam.questions.filter(q => q.type === 'true_false').length,
    written: exam.questions.filter(q => q.type === 'written').length,
    recitation: exam.questions.filter(q => q.type === 'recitation').length,
  };

  const getTypeConfig = (type) => QUESTION_TYPES.find(t => t.value === type) || QUESTION_TYPES[0];

  return (
    <PageLayout>
      {/* Header */}
      <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">نشاط / تقييم الدرس التفاعلي</h1>
                <p className="text-sm text-gray-500">إنشاء تقييم شامل بجميع أنواع الأسئلة: اختياري، كتابي، وشفهي</p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Form - 2 cols */}
            <div className="lg:col-span-2 space-y-6">

              {/* Step 1: Group & Lesson Selection */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-black text-blue-600">1</span>
                  </div>
                  <h2 className="font-bold text-gray-900">اختيار المجموعة والدرس</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">المجموعة *</label>
                    <div className="relative">
                      <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select value={selectedGroupId}
                        onChange={e => { setSelectedGroupId(e.target.value); setSelectedLessonId(''); setExam(p => ({ ...p, title: '' })); }}
                        className="input-base pr-10">
                        <option value="">اختر المجموعة...</option>
                        {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">الدرس *</label>
                    <div className="relative">
                      <BookOpen className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select value={selectedLessonId}
                        onChange={e => setSelectedLessonId(e.target.value)}
                        disabled={!selectedGroupId || loadingLessons}
                        className="input-base pr-10 disabled:opacity-50">
                        <option value="">
                          {loadingLessons ? 'جاري التحميل...' : !selectedGroupId ? 'اختر المجموعة أولاً' : 'اختر الدرس...'}
                        </option>
                        {lessons.map(l => <option key={l._id} value={l._id}>{l.lessonNumber}. {l.title}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Step 2: Exam Settings */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-black text-purple-600">2</span>
                  </div>
                  <h2 className="font-bold text-gray-900">إعدادات التقييم</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 block">عنوان التقييم *</label>
                    <input value={exam.title}
                      onChange={e => setExam(p => ({ ...p, title: e.target.value }))}
                      className="input-base" placeholder="مثل: تقييم درس أحكام النون الساكنة" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5 block">
                      <Clock className="w-3.5 h-3.5" /> المدة (دقيقة)
                    </label>
                    <input type="number" value={exam.duration} min={5} max={180}
                      onChange={e => setExam(p => ({ ...p, duration: parseInt(e.target.value) || 30 }))}
                      className="input-base" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5 block">
                      <Award className="w-3.5 h-3.5" /> درجة النجاح %
                    </label>
                    <input type="number" value={exam.passingScore} min={40} max={100}
                      onChange={e => setExam(p => ({ ...p, passingScore: parseInt(e.target.value) || 60 }))}
                      className="input-base" />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer mt-4 p-3 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors">
                  <input type="checkbox" checked={exam.allowRetries}
                    onChange={e => setExam(p => ({ ...p, allowRetries: e.target.checked }))}
                    className="w-4 h-4 rounded accent-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" /> السماح بإعادة المحاولة
                    </p>
                    <p className="text-xs text-gray-500">يمكن للطالب إعادة حل التقييم أكثر من مرة</p>
                  </div>
                </label>
              </motion.div>

              {/* Step 3: Questions */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
                      <span className="text-sm font-black text-amber-600">3</span>
                    </div>
                    <h2 className="font-bold text-gray-900">الأسئلة ({exam.questions.length})</h2>
                  </div>
                </div>

                <AnimatePresence mode="popLayout">
                  {exam.questions.map((q, qi) => {
                    const typeConf = getTypeConfig(q.type);
                    const isExpanded = expandedQ === qi;
                    return (
                      <motion.div key={qi}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${
                          isExpanded ? `border-${typeConf.color}-300 shadow-lg shadow-${typeConf.color}-100/30` : 'border-gray-100 shadow-sm'
                        }`}>
                        {/* Question Header (always visible) */}
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                          onClick={() => setExpandedQ(isExpanded ? -1 : qi)}>
                          <div className="flex flex-col gap-1">
                            <button onClick={(e) => { e.stopPropagation(); moveQuestion(qi, -1); }}
                              disabled={qi === 0}
                              className="text-gray-300 hover:text-gray-600 disabled:opacity-30">
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); moveQuestion(qi, 1); }}
                              disabled={qi === exam.questions.length - 1}
                              className="text-gray-300 hover:text-gray-600 disabled:opacity-30">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 bg-gradient-to-br ${
                            q.type === 'mcq' ? 'from-blue-400 to-blue-600' :
                            q.type === 'written' ? 'from-purple-400 to-purple-600' :
                            'from-emerald-400 to-emerald-600'
                          }`}>
                            {qi + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {q.text || <span className="text-gray-400 italic">سؤال بدون نص...</span>}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-${typeConf.color}-50 text-${typeConf.color}-600`}>
                                {typeConf.emoji} {typeConf.label}
                              </span>
                              <span className="text-xs text-gray-400">{q.points} نقطة</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); duplicateQuestion(qi); }}
                              className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-500 rounded-lg transition-colors" title="نسخ">
                              <Copy className="w-4 h-4" />
                            </button>
                            {exam.questions.length > 1 && (
                              <button onClick={(e) => { e.stopPropagation(); removeQuestion(qi); }}
                                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="حذف">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            </motion.div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden">
                              <div className="px-4 pb-5 space-y-4 border-t border-gray-100 pt-4">
                                {/* Type Selector */}
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 mb-2 block">نوع السؤال</label>
                                  <div className="flex gap-2">
                                    {QUESTION_TYPES.map(t => (
                                      <button key={t.value}
                                        onClick={() => updateQ(qi, 'type', t.value)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                          q.type === t.value
                                            ? `bg-${t.color}-100 text-${t.color}-700 ring-2 ring-${t.color}-300`
                                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                        }`}>
                                        {t.emoji} {t.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Question Text */}
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">نص السؤال *</label>
                                  <textarea value={q.text}
                                    onChange={e => updateQ(qi, 'text', e.target.value)}
                                    className="input-base resize-none h-20"
                                    placeholder={
                                      q.type === 'recitation' ? 'مثال: اقرأ من سورة البقرة الآية 1 إلى الآية 5'
                                      : q.type === 'written' ? 'مثال: أكمل الآية: إياك نعبد و...'
                                      : 'مثال: ما حكم الإدغام في قوله تعالى "من يعمل"؟'
                                    } />
                                </div>

                                {/* Points */}
                                <div className="flex items-center gap-4">
                                  <div className="w-32">
                                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">النقاط</label>
                                    <input type="number" value={q.points} min={1} max={20}
                                      onChange={e => updateQ(qi, 'points', parseInt(e.target.value) || 1)}
                                      className="input-base text-center" />
                                  </div>
                                </div>

                                {/* MCQ Options */}
                                {q.type === 'mcq' && (
                                  <div className="space-y-2.5">
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">الخيارات (اضغط الدائرة لتحديد الإجابة الصحيحة)</label>
                                    {(q.options || ['', '', '', '']).map((opt, oi) => (
                                      <div key={oi} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                                        q.correctAnswer === oi
                                          ? 'border-green-400 bg-green-50/50'
                                          : 'border-gray-200 bg-white hover:border-gray-300'
                                      }`}>
                                        <button onClick={() => updateQ(qi, 'correctAnswer', oi)}
                                          className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                            q.correctAnswer === oi
                                              ? 'border-green-500 bg-green-500 shadow-md shadow-green-200'
                                              : 'border-gray-300 hover:border-green-300'
                                          }`}>
                                          {q.correctAnswer === oi && <CheckCircle className="w-4 h-4 text-white" />}
                                        </button>
                                        <input value={opt}
                                          onChange={e => updateOption(qi, oi, e.target.value)}
                                          className="flex-1 text-sm outline-none bg-transparent font-medium"
                                          placeholder={`الخيار ${oi + 1}`} />
                                        <span className="text-xs font-bold text-gray-300 w-5">{String.fromCharCode(1571 + oi)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* True / False */}
                                {q.type === 'true_false' && (
                                  <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-2 block">حدد الإجابة الصحيحة لهذا السؤال:</label>
                                    <div className="grid grid-cols-2 gap-3">
                                      <button
                                        type="button"
                                        onClick={() => updateQ(qi, 'correctAnswerBool', true)}
                                        className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 font-bold transition-all ${
                                          q.correctAnswerBool !== false
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400/20'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200'
                                        }`}
                                      >
                                        <span>✅</span>
                                        <span>الإجابة: صحيح (صح)</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateQ(qi, 'correctAnswerBool', false)}
                                        className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border-2 font-bold transition-all ${
                                          q.correctAnswerBool === false
                                            ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-400/20'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-rose-200'
                                        }`}
                                      >
                                        <span>❌</span>
                                        <span>الإجابة: خطأ</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Written Answer */}
                                {q.type === 'written' && (
                                  <div>
                                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block">الإجابة النموذجية</label>
                                    <input value={q.correctAnswerText || ''}
                                      onChange={e => updateQ(qi, 'correctAnswerText', e.target.value)}
                                      className="input-base"
                                      placeholder="أدخل الإجابة النموذجية للتصحيح التلقائي..." />
                                  </div>
                                )}

                                {/* Recitation - Quran Fields */}
                                {q.type === 'recitation' && (
                                  <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/50 space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Book className="w-4 h-4 text-emerald-600" />
                                      <span className="text-sm font-bold text-emerald-800">إعدادات المصحف التفاعلي</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">السورة</label>
                                        <select value={q.surahNumber || ''}
                                          onChange={e => updateQ(qi, 'surahNumber', e.target.value)}
                                          className="input-base text-sm">
                                          <option value="">اختر السورة</option>
                                          {QURAN_SURAHS.map((s) => (
                                            <option key={s.number} value={s.number}>{s.number}. {s.name}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">من آية</label>
                                        <input type="number" value={q.fromVerse || ''} min={1}
                                          onChange={e => updateQ(qi, 'fromVerse', e.target.value)}
                                          className="input-base text-sm" placeholder="1" />
                                      </div>
                                      <div>
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">إلى آية</label>
                                        <input type="number" value={q.toVerse || ''} min={1}
                                          onChange={e => updateQ(qi, 'toVerse', e.target.value)}
                                          className="input-base text-sm" placeholder="5" />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-600 mb-1 block">الوضع الافتراضي</label>
                                      <div className="flex gap-2">
                                        <button onClick={() => updateQ(qi, 'mode', 'practice')}
                                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                            q.mode === 'practice' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'
                                          }`}>
                                          📖 تدريب (يرى النص ويسمع)
                                        </button>
                                        <button onClick={() => updateQ(qi, 'mode', 'quiz')}
                                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                            q.mode === 'quiz' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'
                                          }`}>
                                          📝 تسميع (بدون نص)
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-600 mb-1 block">تعليمات للطالب</label>
                                      <textarea value={q.instruction || ''}
                                        onChange={e => updateQ(qi, 'instruction', e.target.value)}
                                        className="input-base resize-none h-16 text-sm"
                                        placeholder="مثال: اقرأ الآيات بصوت واضح مع مراعاة أحكام التجويد..." />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Add Question Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  {QUESTION_TYPES.map(t => (
                    <button key={t.value}
                      onClick={() => addQuestion(t.value)}
                      className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed transition-all hover:shadow-md
                        border-${t.color}-200 hover:border-${t.color}-400 bg-${t.color}-50/30 hover:bg-${t.color}-50 text-${t.color}-600`}>
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-bold">{t.emoji} {t.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Sidebar Stats - 1 col */}
            <div className="space-y-5">
              {/* Summary Card */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sticky top-20">
                <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" /> ملخص التقييم
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">إجمالي الأسئلة</span>
                    <span className="font-black text-gray-900 text-lg">{exam.questions.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">إجمالي النقاط</span>
                    <span className="font-black text-amber-600 text-lg">{totalPoints}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">🔵 اختياري</span>
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{questionStats.mcq}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">✅ صح / خطأ</span>
                      <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{questionStats.true_false}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">✏️ كتابي</span>
                      <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{questionStats.written}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">🎙️ شفهي</span>
                      <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{questionStats.recitation}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">المدة</span>
                      <span className="font-semibold text-gray-700">{exam.duration} دقيقة</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">درجة النجاح</span>
                      <span className="font-semibold text-gray-700">{exam.passingScore}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">إعادة المحاولة</span>
                      <span className={`font-semibold ${exam.allowRetries ? 'text-emerald-600' : 'text-red-500'}`}>
                        {exam.allowRetries ? 'مسموح ✓' : 'غير مسموح'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Validation */}
                {(!selectedGroupId || !selectedLessonId || !exam.title || exam.questions.some(q => !q.text.trim())) && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-1.5 text-amber-700 mb-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-bold">مطلوب للحفظ:</span>
                    </div>
                    <ul className="space-y-1 text-xs text-amber-600">
                      {!selectedGroupId && <li>• اختيار المجموعة</li>}
                      {!selectedLessonId && <li>• اختيار الدرس</li>}
                      {!exam.title && <li>• عنوان التقييم</li>}
                      {exam.questions.some(q => !q.text.trim()) && <li>• إكمال نص جميع الأسئلة</li>}
                    </ul>
                  </div>
                )}

                {/* Save Button */}
                <button onClick={handleSave}
                  disabled={saving || !selectedGroupId || !selectedLessonId || !exam.title || exam.questions.length === 0}
                  className="w-full mt-5 bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3.5 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-200/50 hover:shadow-xl flex items-center justify-center gap-2">
                  {saving ? <LoadingSpinner size="sm" color="white" /> : (
                    <><Save className="w-5 h-5" /> حفظ التقييم</>
                  )}
                </button>
              </motion.div>
            </div>
          </div>
    </PageLayout>
  );
}
