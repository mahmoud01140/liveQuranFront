import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Trash2, Edit2, Clock, Star, Radio, ArrowRight,
  FileText, Eye, X, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import api from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import useExamStore from '../../store/examStore';
import { getLevelLabel } from '../../utils/helpers';

const LESSON_TYPES = [
  { value: 'reading', label: 'قراءة' }, { value: 'writing', label: 'كتابة' },
  { value: 'dictation', label: 'إملاء' }, { value: 'memorization', label: 'حفظ' },
  { value: 'tajweed', label: 'تجويد' }, { value: 'recitation', label: 'تلاوة' },
  { value: 'live_class', label: 'حصة مباشرة' }, { value: 'review', label: 'مراجعة' },
  { value: 'exam', label: 'امتحان' },
];
const TYPE_COLORS = {
  reading: 'bg-blue-50 text-blue-700', writing: 'bg-purple-50 text-purple-700',
  dictation: 'bg-yellow-50 text-yellow-700', memorization: 'bg-green-50 text-green-700',
  tajweed: 'bg-indigo-50 text-indigo-700', recitation: 'bg-teal-50 text-teal-700',
  live_class: 'bg-red-50 text-red-700', review: 'bg-orange-50 text-orange-700',
  exam: 'bg-gray-100 text-gray-700',
};
const EMPTY_LESSON = { title: '', description: '', type: 'reading', duration: 45, isLiveRequired: false, resources: '' };
const EMPTY_Q = { type: 'mcq', text: '', options: ['', '', '', ''], correctAnswer: 0, correctAnswerText: '', points: 1, instruction: '' };

export default function AdminGroupCurriculumPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { createGroupExam, deleteGroupExam } = useExamStore();

  const [group, setGroup] = useState(null);
  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Lesson modal
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON);
  const [savingLesson, setSavingLesson] = useState(false);

  // Exam modal
  const [showExamModal, setShowExamModal] = useState(false);
  const [examLesson, setExamLesson] = useState(null);
  const [examForm, setExamForm] = useState({ title: '', duration: 30, passingScore: 60, questions: [] });
  const [savingExam, setSavingExam] = useState(false);
  const [lessonExams, setLessonExams] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const [gRes, planRes, examsRes] = await Promise.all([
          api.get(`/groups/${groupId}`),
          api.get(`/study-plans/group/${groupId}/full`),
          api.get(`/exams/group/${groupId}`),
        ]);
        setGroup(gRes.data.group);
        setPlan(planRes.data.plan);
        const exams = examsRes.data.exams || [];
        const byLesson = {};
        exams.forEach(e => { if (e.lessonId) { if (!byLesson[e.lessonId]) byLesson[e.lessonId] = []; byLesson[e.lessonId].push(e); } });
        setLessonExams(byLesson);
      } catch { toast.error('خطأ في تحميل البيانات'); }
      finally { setIsLoading(false); }
    };
    load();
  }, [groupId]);

  // Lesson handlers
  const openAddLesson = () => { setEditingLesson(null); setLessonForm(EMPTY_LESSON); setShowLessonModal(true); };
  const openEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setLessonForm({ title: lesson.title, description: lesson.description || '', type: lesson.type, duration: lesson.duration, isLiveRequired: lesson.isLiveRequired, resources: lesson.resources || '' });
    setShowLessonModal(true);
  };
  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim()) { toast.error('أدخل عنوان الدرس'); return; }
    setSavingLesson(true);
    try {
      const res = editingLesson
        ? await api.put(`/study-plans/group/${groupId}/lessons/${editingLesson._id}`, lessonForm)
        : await api.post(`/study-plans/group/${groupId}/lessons`, lessonForm);
      setPlan(res.data.plan); setShowLessonModal(false);
      toast.success(editingLesson ? 'تم تعديل الدرس' : 'تم إضافة الدرس ✅');
    } catch { toast.error('خطأ في حفظ الدرس'); }
    finally { setSavingLesson(false); }
  };
  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('حذف هذا الدرس نهائياً؟')) return;
    try { const res = await api.delete(`/study-plans/group/${groupId}/lessons/${lessonId}`); setPlan(res.data.plan); toast.success('تم حذف الدرس'); }
    catch { toast.error('خطأ في الحذف'); }
  };

  // Exam handlers
  const openCreateExam = (lesson) => {
    setExamLesson(lesson);
    setExamForm({ title: 'امتحان ' + lesson.title, duration: 30, passingScore: 60, questions: [{ ...EMPTY_Q }] });
    setShowExamModal(true);
  };
  const addQuestion = () => setExamForm(p => ({ ...p, questions: [...p.questions, { ...EMPTY_Q }] }));
  const removeQuestion = (i) => setExamForm(p => ({ ...p, questions: p.questions.filter((_, idx) => idx !== i) }));
  const updateQ = (i, field, val) => setExamForm(p => { const qs = [...p.questions]; qs[i] = { ...qs[i], [field]: val }; return { ...p, questions: qs }; });
  const updateOption = (qi, oi, val) => setExamForm(p => { const qs = [...p.questions]; const opts = [...qs[qi].options]; opts[oi] = val; qs[qi] = { ...qs[qi], options: opts }; return { ...p, questions: qs }; });

  const handleSaveExam = async () => {
    if (!examForm.title.trim()) { toast.error('أدخل عنوان الامتحان'); return; }
    if (examForm.questions.length === 0) { toast.error('أضف سؤالاً على الأقل'); return; }
    setSavingExam(true);
    try {
      const exam = await createGroupExam({
        title: examForm.title, type: 'lesson', group: groupId,
        lessonId: examLesson._id, lessonTitle: examLesson.title,
        duration: examForm.duration, passingScore: examForm.passingScore,
        questions: examForm.questions,
      });
      setLessonExams(p => ({ ...p, [examLesson._id]: [...(p[examLesson._id] || []), exam] }));
      setShowExamModal(false); toast.success('تم إنشاء الامتحان ✅');
    } catch (e) { toast.error(e?.response?.data?.message || 'خطأ في الحفظ'); }
    finally { setSavingExam(false); }
  };
  const handleDeleteExam = async (examId, lessonId) => {
    if (!window.confirm('حذف الامتحان نهائياً؟')) return;
    try { await deleteGroupExam(examId); setLessonExams(p => ({ ...p, [lessonId]: (p[lessonId] || []).filter(e => e._id !== examId) })); toast.success('تم الحذف'); }
    catch { toast.error('خطأ في الحذف'); }
  };

  if (isLoading) return (<PageLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></PageLayout>);
  const customLessons = plan?.customLessons || [];

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/groups')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ArrowRight className="w-5 h-5 text-gray-400" /></button>
            <div><h1 className="section-title">إدارة منهج المجموعة</h1><p className="section-subtitle">{group?.name} — {getLevelLabel(group?.level)}</p></div>
          </div>
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Stats */}
            <div className="lg:col-span-2 space-y-5">
              <div className="card-base p-5">
                <h3 className="font-bold text-gray-700 text-sm mb-3">إحصائيات الخطة</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-500">عدد الدروس</span><span className="font-bold text-primary-500">{customLessons.length}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-500">الطلاب</span><span className="font-bold text-gray-900">{group?.students?.length || 0}</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="text-gray-500">الامتحانات</span><span className="font-bold text-amber-500">{Object.values(lessonExams).flat().length}</span></div>
                </div>
              </div>
            </div>
            {/* Lessons */}
            <div className="lg:col-span-3 space-y-5">
              <div className="card-base p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-gray-900 text-base flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />الدروس المخصصة
                    {customLessons.length > 0 && <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full font-bold">{customLessons.length}</span>}
                  </h2>
                  <button onClick={openAddLesson} className="btn-primary text-sm py-2"><Plus className="w-4 h-4" />إضافة درس</button>
                </div>
                {customLessons.length === 0 ? (
                  <div className="text-center py-10 text-gray-400"><BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="text-sm">لا توجد دروس مخصصة بعد</p></div>
                ) : (
                  <div className="space-y-2">
                    {customLessons.map((lesson, i) => {
                      const exams = lessonExams[lesson._id] || [];
                      return (
                        <motion.div key={lesson._id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group">
                          <div className="flex items-center gap-3 p-4">
                            <div className="w-9 h-9 bg-gradient-quran rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">{lesson.lessonNumber}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900 text-sm">{lesson.title}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[lesson.type] || 'bg-gray-100 text-gray-600'}`}>{LESSON_TYPES.find(t => t.value === lesson.type)?.label || lesson.type}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{lesson.duration} دقيقة</div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button onClick={() => openCreateExam(lesson)} title="إنشاء امتحان" className="p-1.5 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors text-xs flex items-center gap-1"><FileText className="w-3.5 h-3.5" />امتحان</button>
                              <button onClick={() => navigate('/admin/live', { state: { groupId, groupName: group?.name, lessonTitle: lesson.title, lessonId: lesson._id } })} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-colors"><Radio className="w-3.5 h-3.5" /></button>
                              <button onClick={() => openEditLesson(lesson)} className="p-1.5 hover:bg-primary-100 text-primary-400 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteLesson(lesson._id)} className="p-1.5 hover:bg-red-100 text-red-400 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          {exams.length > 0 && (
                            <div className="px-4 pb-3">
                              <div className="border-t border-gray-200 pt-3 space-y-1.5">
                                {exams.map(exam => (
                                  <div key={exam._id} className="flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-2">
                                    <FileText className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-amber-700 flex-1 truncate">{exam.title}</span>
                                    <span className="text-xs text-amber-500">{exam.questions?.length} سؤال</span>
                                    <button onClick={() => navigate(`/admin/exams/${exam._id}/results`)} className="text-xs text-blue-600 hover:text-blue-800 font-medium"><Eye className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDeleteExam(exam._id, lesson._id)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

      {/* Lesson Modal */}
      <AnimatePresence>
        {showLessonModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-black text-gray-900 mb-5">{editingLesson ? 'تعديل الدرس' : 'إضافة درس مخصص'}</h2>
              <div className="space-y-4">
                <div><label className="text-sm font-semibold text-gray-700 mb-1 block">عنوان الدرس *</label><input value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} className="input-base" placeholder="مثال: أحكام النون الساكنة" /></div>
                <div><label className="text-sm font-semibold text-gray-700 mb-1 block">وصف الدرس</label><textarea value={lessonForm.description} onChange={e => setLessonForm(p => ({ ...p, description: e.target.value }))} className="input-base resize-none h-20" placeholder="شرح مختصر للدرس..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-semibold text-gray-700 mb-1 block">نوع الدرس</label><select value={lessonForm.type} onChange={e => setLessonForm(p => ({ ...p, type: e.target.value }))} className="input-base">{LESSON_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                  <div><label className="text-sm font-semibold text-gray-700 mb-1 block">المدة (دقيقة)</label><input type="number" min={5} max={180} value={lessonForm.duration} onChange={e => setLessonForm(p => ({ ...p, duration: parseInt(e.target.value) || 45 }))} className="input-base" /></div>
                </div>
                <div><label className="text-sm font-semibold text-gray-700 mb-1 block">رابط المصادر (اختياري)</label><input value={lessonForm.resources} onChange={e => setLessonForm(p => ({ ...p, resources: e.target.value }))} className="input-base" placeholder="رابط الفيديو أو الملف..." /></div>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                  <input type="checkbox" checked={lessonForm.isLiveRequired} onChange={e => setLessonForm(p => ({ ...p, isLiveRequired: e.target.checked }))} className="w-4 h-4 rounded accent-red-500" />
                  <div><p className="text-sm font-semibold text-gray-800">يتطلب حصة مباشرة</p><p className="text-xs text-gray-500">سيظهر تنبيه للطالب</p></div>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowLessonModal(false)} className="btn-ghost flex-1">إلغاء</button>
                <button onClick={handleSaveLesson} disabled={savingLesson || !lessonForm.title.trim()} className="btn-primary flex-1 disabled:opacity-50">{savingLesson ? <LoadingSpinner size="sm" color="white" /> : (editingLesson ? 'حفظ التعديل' : 'إضافة الدرس')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exam Creation Modal */}
      <AnimatePresence>
        {showExamModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl p-7 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5 text-amber-600" /></div>
                <div><h2 className="text-lg font-black text-gray-900">إنشاء امتحان</h2>{examLesson && <p className="text-xs text-gray-400">للدرس: {examLesson.title}</p>}</div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3 md:col-span-1"><label className="text-sm font-semibold text-gray-700 mb-1 block">عنوان الامتحان *</label><input value={examForm.title} onChange={e => setExamForm(p => ({ ...p, title: e.target.value }))} className="input-base" /></div>
                  <div><label className="text-sm font-semibold text-gray-700 mb-1 block">المدة (دقيقة)</label><input type="number" min={5} value={examForm.duration} onChange={e => setExamForm(p => ({ ...p, duration: parseInt(e.target.value) || 30 }))} className="input-base" /></div>
                  <div><label className="text-sm font-semibold text-gray-700 mb-1 block">درجة النجاح %</label><input type="number" min={1} max={100} value={examForm.passingScore} onChange={e => setExamForm(p => ({ ...p, passingScore: parseInt(e.target.value) || 60 }))} className="input-base" /></div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-800 text-sm">الأسئلة ({examForm.questions.length})</h3>
                    <button onClick={addQuestion} className="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1"><Plus className="w-3.5 h-3.5" />إضافة سؤال</button>
                  </div>
                  <div className="space-y-4">
                    {examForm.questions.map((q, qi) => (
                      <div key={qi} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-gray-500">سؤال {qi + 1}</span>
                          <div className="flex items-center gap-2">
                            <select value={q.type} onChange={e => updateQ(qi, 'type', e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white">
                              <option value="mcq">🔵 اختياري</option><option value="true_false">✅ صح/خطأ</option><option value="written">✏️ إكمال</option><option value="recitation">🎙️ شفهي</option>
                            </select>
                            <input type="number" min={1} max={10} value={q.points} onChange={e => updateQ(qi, 'points', parseInt(e.target.value) || 1)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-16 bg-white" placeholder="نقاط" />
                            {examForm.questions.length > 1 && <button onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>}
                          </div>
                        </div>
                        <textarea value={q.text} onChange={e => updateQ(qi, 'text', e.target.value)} className="input-base resize-none h-16 mb-3 text-sm" placeholder="نص السؤال..." />
                        {q.type === 'mcq' && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500 font-medium">الخيارات (انقر لتحديد الإجابة الصحيحة):</p>
                            {(q.options || ['', '', '', '']).map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <button onClick={() => updateQ(qi, 'correctAnswer', oi)} className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${q.correctAnswer === oi ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-300'}`}>
                                  {q.correctAnswer === oi && <CheckCircle className="w-4 h-4 text-white" />}
                                </button>
                                <input value={opt} onChange={e => updateOption(qi, oi, e.target.value)} className="input-base text-sm flex-1 py-1.5" placeholder={`الخيار ${oi + 1}`} />
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === 'true_false' && (
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-2">الإجابة الصحيحة:</p>
                            <div className="flex gap-3">
                              <button type="button" onClick={() => updateQ(qi, 'correctAnswerBool', true)} className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${q.correctAnswerBool !== false ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white'}`}>✅ صحيح (صح)</button>
                              <button type="button" onClick={() => updateQ(qi, 'correctAnswerBool', false)} className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${q.correctAnswerBool === false ? 'border-rose-500 bg-rose-50 text-rose-800' : 'border-gray-200 bg-white'}`}>❌ خطأ</button>
                            </div>
                          </div>
                        )}
                        {q.type === 'written' && (
                          <div><label className="text-xs text-gray-500 font-medium mb-1 block">الإجابة الصحيحة:</label><input value={q.correctAnswerText} onChange={e => updateQ(qi, 'correctAnswerText', e.target.value)} className="input-base text-sm" placeholder="أدخل الإجابة النموذجية..." /></div>
                        )}
                        {q.type === 'recitation' && (
                          <div><label className="text-xs text-gray-500 font-medium mb-1 block">تعليمات للطالب:</label><textarea value={q.instruction} onChange={e => updateQ(qi, 'instruction', e.target.value)} className="input-base resize-none h-16 text-sm" placeholder="مثال: اقرأ سورة الفاتحة بصوت واضح..." /></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowExamModal(false)} className="btn-ghost flex-1">إلغاء</button>
                <button onClick={handleSaveExam} disabled={savingExam || !examForm.title.trim() || examForm.questions.length === 0} className="btn-primary flex-1 disabled:opacity-50">{savingExam ? <LoadingSpinner size="sm" color="white" /> : 'إنشاء الامتحان ✅'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
