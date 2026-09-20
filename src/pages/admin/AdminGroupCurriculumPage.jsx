import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  BookOpen, Plus, Trash2, Edit2, Clock, Radio, ArrowRight,
  FileText, Eye, X, CheckCircle, Check, Users, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import api from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import useExamStore from '../../store/examStore';
import { getLevelLabel } from '../../utils/helpers';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

/* Group curriculum — lessons and their exams. Same data, modals and
   payloads as before; only the visual layer changed. */

const LESSON_TYPES = [
  { value: 'reading', label: 'قراءة' }, { value: 'writing', label: 'كتابة' },
  { value: 'dictation', label: 'إملاء' }, { value: 'memorization', label: 'حفظ' },
  { value: 'tajweed', label: 'تجويد' }, { value: 'recitation', label: 'تلاوة' },
  { value: 'live_class', label: 'حصة مباشرة' }, { value: 'review', label: 'مراجعة' },
  { value: 'exam', label: 'امتحان' },
];
const EMPTY_LESSON = {
  title: '',
  description: '',
  type: 'reading',
  duration: 45,
  isLiveRequired: false,
  resources: '',
  defaultHomework: '',
  defaultQuranHomework: { surahName: '', fromVerse: 1, toVerse: 10, type: 'hifz' },
};
const EMPTY_Q = { type: 'mcq', text: '', options: ['', '', '', ''], correctAnswer: 0, correctAnswerText: '', points: 1, instruction: '' };

const field = {
  width: '100%', minHeight: 48, background: HQ.SURFACE, color: HQ.INK,
  border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 16px',
  fontSize: 14, fontFamily: 'inherit',
};

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
  const [examForm, setExamForm] = useState({ title: '', duration: 30, passingScore: 60, questions: [], targetType: 'group', targetStudent: '' });
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
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      type: lesson.type,
      duration: lesson.duration,
      isLiveRequired: lesson.isLiveRequired,
      resources: lesson.resources || '',
      defaultHomework: lesson.defaultHomework || '',
      defaultQuranHomework: lesson.defaultQuranHomework || { surahName: '', fromVerse: 1, toVerse: 10, type: 'hifz' },
    });
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
      toast.success(editingLesson ? 'تم تعديل الدرس' : 'تم إضافة الدرس');
    } catch { toast.error('خطأ في حفظ الدرس'); }
    finally { setSavingLesson(false); }
  };
  const handleToggleComplete = async (lessonId) => {
    try {
      const res = await api.put(`/study-plans/group/${groupId}/lessons/${lessonId}/toggle-complete`);
      setPlan(res.data.plan);
      toast.success(res.data.message);
    } catch {
      toast.error('خطأ في تحديث حالة الدرس');
    }
  };
  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('حذف هذا الدرس نهائياً؟')) return;
    try { const res = await api.delete(`/study-plans/group/${groupId}/lessons/${lessonId}`); setPlan(res.data.plan); toast.success('تم حذف الدرس'); }
    catch { toast.error('خطأ في الحذف'); }
  };

  // Exam handlers
  const openCreateExam = (lesson) => {
    setExamLesson(lesson);
    setExamForm({ title: 'امتحان ' + lesson.title, duration: 30, passingScore: 60, questions: [{ ...EMPTY_Q }], targetType: 'group', targetStudent: '' });
    setShowExamModal(true);
  };
  const addQuestion = () => setExamForm(p => ({ ...p, questions: [...p.questions, { ...EMPTY_Q }] }));
  const removeQuestion = (i) => setExamForm(p => ({ ...p, questions: p.questions.filter((_, idx) => idx !== i) }));
  const updateQ = (i, fieldName, val) => setExamForm(p => { const qs = [...p.questions]; qs[i] = { ...qs[i], [fieldName]: val }; return { ...p, questions: qs }; });
  const updateOption = (qi, oi, val) => setExamForm(p => { const qs = [...p.questions]; const opts = [...qs[qi].options]; opts[oi] = val; qs[qi] = { ...qs[qi], options: opts }; return { ...p, questions: qs }; });

  const handleSaveExam = async () => {
    if (!examForm.title.trim()) { toast.error('أدخل عنوان الامتحان'); return; }
    if (examForm.questions.length === 0) { toast.error('أضف سؤالاً على الأقل'); return; }
    if (examForm.targetType === 'individual' && !examForm.targetStudent) { toast.error('اختر الطالب المستهدف'); return; }
    setSavingExam(true);
    try {
      const payload = {
        title: examForm.title, type: 'lesson', group: groupId,
        lessonId: examLesson._id, lessonTitle: examLesson.title,
        duration: examForm.duration, passingScore: examForm.passingScore,
        questions: examForm.questions,
        targetType: examForm.targetType,
      };
      if (examForm.targetType === 'individual') {
        payload.targetStudent = examForm.targetStudent;
      }
      const exam = await createGroupExam(payload);
      setLessonExams(p => ({ ...p, [examLesson._id]: [...(p[examLesson._id] || []), exam] }));
      setShowExamModal(false); toast.success('تم إنشاء الامتحان');
    } catch (e) { toast.error(e?.response?.data?.message || 'خطأ في الحفظ'); }
    finally { setSavingExam(false); }
  };
  const handleDeleteExam = async (examId, lessonId) => {
    if (!window.confirm('حذف الامتحان نهائياً؟')) return;
    try { await deleteGroupExam(examId); setLessonExams(p => ({ ...p, [lessonId]: (p[lessonId] || []).filter(e => e._id !== examId) })); toast.success('تم الحذف'); }
    catch { toast.error('خطأ في الحذف'); }
  };

  const panel = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 20,
  };
  const lbl = { fontSize: 14, fontWeight: 700, color: HQ.INK, marginBottom: 6, display: 'block' };
  const iconBtn = {
    minWidth: 44, minHeight: 44, borderRadius: 12, border: 'none', background: 'transparent',
    color: HQ.MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  };
  const primaryBtn = {
    minHeight: 48, padding: '12px 20px', borderRadius: 12, border: 'none',
    background: HQ.MENTOR, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
  const ghostBtn = {
    minHeight: 48, padding: '12px 20px', borderRadius: 12, border: 'none', background: 'transparent',
    color: HQ.MUTED, fontWeight: 800, fontSize: 14, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };

  if (isLoading) return (<PageLayout><div className="halaqa flex justify-center py-20"><LoadingSpinner size="lg" /></div></PageLayout>);
  const customLessons = plan?.customLessons || [];
  const completedCount = customLessons.filter(l => l.status === 'completed').length;
  const progressPct = customLessons.length ? Math.round((completedCount / customLessons.length) * 100) : 0;

  return (
    <MotionConfig reducedMotion="user">
      <PageLayout>
        <div className="halaqa" style={{ maxWidth: 1040, margin: '0 auto' }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button type="button" onClick={() => navigate('/admin/groups')} aria-label="العودة للمجموعات" style={iconBtn}>
              <ArrowRight size={19} aria-hidden />
            </button>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: HQ.INK, margin: 0 }}>إدارة منهج المجموعة</h1>
              <p className="text-sm" style={{ color: HQ.MUTED, margin: 0 }}>{group?.name} — {getLevelLabel(group?.level)}</p>
            </div>
          </div>
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Stats */}
            <div className="lg:col-span-2 space-y-5">
              <div style={panel}>
                <h3 className="font-bold text-sm mb-3" style={{ color: HQ.INK, marginTop: 0 }}>إحصائيات الخطة</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm"><span style={{ color: HQ.MUTED }}>عدد الدروس</span><span className="font-extrabold" style={{ color: HQ.INK, fontVariantNumeric: 'tabular-nums' }}>{customLessons.length}</span></div>
                  <div className="flex justify-between items-center text-sm"><span style={{ color: HQ.MUTED }}>الطلاب</span><span className="font-extrabold" style={{ color: HQ.INK, fontVariantNumeric: 'tabular-nums' }}>{group?.students?.length || 0}</span></div>
                  <div className="flex justify-between items-center text-sm"><span style={{ color: HQ.MUTED }}>الامتحانات</span><span className="font-extrabold" style={{ color: HQ.INK, fontVariantNumeric: 'tabular-nums' }}>{Object.values(lessonExams).flat().length}</span></div>
                  <div className="flex justify-between items-center text-sm"><span style={{ color: HQ.MUTED }}>دروس مكتملة</span><span className="font-extrabold" style={{ color: HQ.MENTOR, fontVariantNumeric: 'tabular-nums' }}>{completedCount} / {customLessons.length}</span></div>
                </div>
                {customLessons.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold" style={{ color: HQ.MUTED }}>تقدم المنهج</span>
                      <span className="font-extrabold" style={{ color: HQ.MENTOR, fontVariantNumeric: 'tabular-nums' }}>{progressPct}%</span>
                    </div>
                    <div style={{ background: HQ.LINE, borderRadius: 9999, height: 8, overflow: 'hidden' }}
                      role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="تقدم المنهج">
                      <div style={{ background: HQ.MENTOR, borderRadius: 9999, height: '100%', width: `${progressPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Lessons */}
            <div className="lg:col-span-3 space-y-5">
              <div style={panel}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-extrabold text-base flex items-center gap-2" style={{ color: HQ.INK, margin: 0 }}>
                    <BookOpen size={17} color={HQ.MENTOR} aria-hidden />الدروس المخصصة
                    {customLessons.length > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5" style={{ background: '#E2EFE7', color: '#0F5940', borderRadius: 9999, fontVariantNumeric: 'tabular-nums' }}>
                        {customLessons.length}
                      </span>
                    )}
                  </h2>
                  <button type="button" onClick={openAddLesson} style={{ ...primaryBtn, minHeight: 44 }}>
                    <Plus size={15} aria-hidden />إضافة درس
                  </button>
                </div>
                {customLessons.length === 0 ? (
                  <div className="text-center py-10" style={{ color: HQ.MUTED }}>
                    <BookOpen size={44} color={HQ.LINE} style={{ margin: '0 auto 12px' }} aria-hidden />
                    <p className="text-sm" style={{ margin: 0 }}>لا توجد دروس مخصصة بعد</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customLessons.map((lesson) => {
                      const exams = lessonExams[lesson._id] || [];
                      const done = lesson.status === 'completed';
                      return (
                        <motion.div key={lesson._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                          style={{
                            borderRadius: 18, border: `1px solid ${done ? HQ.MENTOR : HQ.LINE}`,
                            background: done ? '#E2EFE7' : HQ.SURFACE, overflow: 'hidden',
                          }}>
                          <div className="flex items-center gap-3 p-4">
                            <span aria-hidden style={{
                              width: 36, height: 36, borderRadius: 12, flex: 'none',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: 14,
                              background: done ? HQ.MENTOR : HQ.SURFACE, color: done ? '#fff' : HQ.INK,
                              border: done ? 'none' : `1px solid ${HQ.LINE}`,
                            }}>
                              {done ? <CheckCircle size={19} /> : lesson.lessonNumber}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-sm" style={{ color: done ? '#0F5940' : HQ.INK, margin: 0 }}>{lesson.title}</p>
                                <span className="text-xs font-medium px-2 py-0.5"
                                  style={{ background: HQ.PAPER, color: HQ.MUTED, border: `1px solid ${HQ.LINE}`, borderRadius: 9999 }}>
                                  {LESSON_TYPES.find(t => t.value === lesson.type)?.label || lesson.type}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleComplete(lesson._id)}
                                  title="انقر لتبديل حالة الدرس (مكتمل / لم يبدأ)"
                                  className="font-bold px-2 py-0.5"
                                  style={{
                                    fontSize: '0.8125rem', borderRadius: 9999, cursor: 'pointer',
                                    border: `1px solid ${done ? HQ.MENTOR : HQ.LINE}`,
                                    background: done ? HQ.MENTOR : HQ.SURFACE,
                                    color: done ? '#fff' : HQ.MUTED, minHeight: 32,
                                  }}
                                >
                                  {done ? 'تم الشرح (انقر للإلغاء)' : 'لم يبدأ (انقر للإكمال)'}
                                </button>
                                {lesson.defaultHomework && (
                                  <span className="text-xs font-medium px-2 py-0.5 truncate" title={lesson.defaultHomework}
                                    style={{ background: HQ.PAPER, color: HQ.MUTED, border: `1px solid ${HQ.LINE}`, borderRadius: 9999, maxWidth: 200 }}>
                                    واجب: {lesson.defaultHomework}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: HQ.MUTED }}>
                                <Clock size={12} aria-hidden />{lesson.duration} دقيقة
                                {lesson.completedAt && (
                                  <span className="font-medium" style={{ color: HQ.MENTOR }}>• شُرح في {new Date(lesson.completedAt).toLocaleDateString('ar')}</span>
                                )}
                                {lesson.defaultQuranHomework?.surahName && (
                                  <span className="font-medium" style={{ color: HQ.MENTOR }}>• واجب قرآني: سورة {lesson.defaultQuranHomework.surahName} ({lesson.defaultQuranHomework.fromVerse}-{lesson.defaultQuranHomework.toVerse})</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-none">
                              <button type="button" onClick={() => openCreateExam(lesson)} title="إنشاء امتحان"
                                className="text-xs flex items-center gap-1" style={{ ...iconBtn, color: HQ.MENTOR }}>
                                <FileText size={15} aria-hidden />امتحان
                              </button>
                              {lesson.status !== 'completed' ? (
                                <button type="button" onClick={() => navigate('/admin/live', { state: { groupId, groupName: group?.name, lessonTitle: lesson.title, lessonId: lesson._id } })}
                                  style={{ ...iconBtn, color: '#C2410C' }} title="بدء بث مباشر لهذا الدرس" aria-label="بدء بث مباشر لهذا الدرس">
                                  <Radio size={15} aria-hidden />
                                </button>
                              ) : (
                                <button type="button" onClick={() => handleToggleComplete(lesson._id)} style={{ ...iconBtn, color: HQ.MENTOR }} title="انقر لتغيير الحالة إلى قيد الشرح" aria-label="إعادة الدرس لقيد الشرح">
                                  <CheckCircle size={15} aria-hidden />
                                </button>
                              )}
                              <button type="button" onClick={() => openEditLesson(lesson)} style={iconBtn} title="تعديل الدرس" aria-label="تعديل الدرس">
                                <Edit2 size={15} aria-hidden />
                              </button>
                              <button type="button" onClick={() => handleDeleteLesson(lesson._id)} style={iconBtn} className="hover:text-[#C2410C]" title="حذف الدرس" aria-label="حذف الدرس">
                                <Trash2 size={15} aria-hidden />
                              </button>
                            </div>
                          </div>
                          {exams.length > 0 && (
                            <div className="px-4 pb-3">
                              <div className="pt-3 space-y-1.5" style={{ borderTop: `1px solid ${HQ.LINE}` }}>
                                {exams.map(exam => (
                                  <div key={exam._id} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: HQ.PAPER }}>
                                    <FileText size={14} color={HQ.MENTOR} aria-hidden className="flex-none" />
                                    <span className="text-xs font-bold flex-1 truncate" style={{ color: HQ.INK }}>{exam.title}</span>
                                    <span className="text-xs" style={{ color: HQ.MUTED, fontVariantNumeric: 'tabular-nums' }}>{exam.questions?.length} سؤال</span>
                                    <button type="button" onClick={() => navigate(`/admin/exams/${exam._id}/results`)}
                                      style={{ ...iconBtn, minWidth: 36, minHeight: 36, color: HQ.MENTOR }} title="عرض النتائج" aria-label={`عرض نتائج ${exam.title}`}>
                                      <Eye size={14} aria-hidden />
                                    </button>
                                    <button type="button" onClick={() => handleDeleteExam(exam._id, lesson._id)}
                                      style={{ ...iconBtn, minWidth: 36, minHeight: 36, color: '#C2410C' }} title="حذف الامتحان" aria-label={`حذف ${exam.title}`}>
                                      <X size={14} aria-hidden />
                                    </button>
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(42,36,56,0.55)' }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  role="dialog" aria-modal="true" aria-label={editingLesson ? 'تعديل الدرس' : 'إضافة درس مخصص'}
                  className="w-full" style={{ ...panel, maxWidth: 560, maxHeight: '90dvh', overflowY: 'auto' }}>
                  <h2 className="font-extrabold mb-5" style={{ fontSize: '1.25rem', color: HQ.INK, marginTop: 0 }}>{editingLesson ? 'تعديل الدرس' : 'إضافة درس مخصص'}</h2>
                  <div className="space-y-4">
                    <div><label htmlFor="ag-title" style={lbl}>عنوان الدرس *</label><input id="ag-title" value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} className="focus:border-[#177B58] focus:outline-none" style={field} placeholder="مثال: أحكام النون الساكنة" /></div>
                    <div><label htmlFor="ag-desc" style={lbl}>وصف الدرس</label><textarea id="ag-desc" value={lessonForm.description} onChange={e => setLessonForm(p => ({ ...p, description: e.target.value }))} className="resize-none focus:border-[#177B58] focus:outline-none" style={{ ...field, minHeight: 80 }} placeholder="شرح مختصر للدرس..." /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label htmlFor="ag-type" style={lbl}>نوع الدرس</label><select id="ag-type" value={lessonForm.type} onChange={e => setLessonForm(p => ({ ...p, type: e.target.value }))} className="focus:border-[#177B58] focus:outline-none" style={field}>{LESSON_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                      <div><label htmlFor="ag-dur" style={lbl}>المدة (دقيقة)</label><input id="ag-dur" type="number" min={5} max={180} value={lessonForm.duration} onChange={e => setLessonForm(p => ({ ...p, duration: parseInt(e.target.value) || 45 }))} className="focus:border-[#177B58] focus:outline-none" style={{ ...field, fontVariantNumeric: 'tabular-nums' }} /></div>
                    </div>
                    <div><label htmlFor="ag-res" style={lbl}>رابط المصادر (اختياري)</label><input id="ag-res" value={lessonForm.resources} onChange={e => setLessonForm(p => ({ ...p, resources: e.target.value }))} className="focus:border-[#177B58] focus:outline-none" style={field} placeholder="رابط الفيديو أو الملف..." /></div>

                    {/* Default homework linking */}
                    <div className="p-3 space-y-2.5" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12 }}>
                      <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: HQ.INK }}>
                        الواجب الافتراضي للدرس (يرسل تلقائياً للطلاب بعد البث)
                      </label>
                      <input
                        value={lessonForm.defaultHomework || ''}
                        onChange={e => setLessonForm(p => ({ ...p, defaultHomework: e.target.value }))}
                        className="text-sm focus:border-[#177B58] focus:outline-none" style={field}
                        placeholder="مثال: حل تدريبات أحكام الميم الساكنة ص 15"
                        aria-label="نص الواجب الافتراضي"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          value={lessonForm.defaultQuranHomework?.surahName || ''}
                          onChange={e => setLessonForm(p => ({
                            ...p,
                            defaultQuranHomework: { ...(p.defaultQuranHomework || {}), surahName: e.target.value }
                          }))}
                          className="text-sm focus:border-[#177B58] focus:outline-none" style={field}
                          placeholder="سورة الواجب (اختياري)"
                          aria-label="سورة الواجب القرآني"
                        />
                        <input
                          type="number"
                          min={1}
                          value={lessonForm.defaultQuranHomework?.fromVerse || ''}
                          onChange={e => setLessonForm(p => ({
                            ...p,
                            defaultQuranHomework: { ...(p.defaultQuranHomework || {}), fromVerse: parseInt(e.target.value) || 1 }
                          }))}
                          className="text-sm focus:border-[#177B58] focus:outline-none" style={{ ...field, fontVariantNumeric: 'tabular-nums' }}
                          placeholder="من آية"
                          aria-label="من آية"
                        />
                        <input
                          type="number"
                          min={1}
                          value={lessonForm.defaultQuranHomework?.toVerse || ''}
                          onChange={e => setLessonForm(p => ({
                            ...p,
                            defaultQuranHomework: { ...(p.defaultQuranHomework || {}), toVerse: parseInt(e.target.value) || 1 }
                          }))}
                          className="text-sm focus:border-[#177B58] focus:outline-none" style={{ ...field, fontVariantNumeric: 'tabular-nums' }}
                          placeholder="إلى آية"
                          aria-label="إلى آية"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer p-3" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12 }}>
                      <input type="checkbox" checked={lessonForm.isLiveRequired} onChange={e => setLessonForm(p => ({ ...p, isLiveRequired: e.target.checked }))} style={{ width: 20, height: 20, accentColor: HQ.MENTOR, flex: 'none' }} />
                      <span><span className="text-sm font-bold block" style={{ color: HQ.INK }}>يتطلب حصة مباشرة</span><span className="text-xs" style={{ color: HQ.MUTED }}>سيظهر تنبيه للطالب</span></span>
                    </label>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setShowLessonModal(false)} style={{ ...ghostBtn, flex: 1 }}>إلغاء</button>
                    <button type="button" onClick={handleSaveLesson} disabled={savingLesson || !lessonForm.title.trim()} style={{ ...primaryBtn, flex: 1, opacity: (savingLesson || !lessonForm.title.trim()) ? 0.55 : 1 }}>{savingLesson ? <LoadingSpinner size="sm" color="white" /> : (editingLesson ? 'حفظ التعديل' : 'إضافة الدرس')}</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Exam Creation Modal */}
          <AnimatePresence>
            {showExamModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(42,36,56,0.55)' }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  role="dialog" aria-modal="true" aria-label="إنشاء امتحان"
                  className="w-full" style={{ ...panel, maxWidth: 640, maxHeight: '90dvh', overflowY: 'auto' }}>
                  <div className="flex items-center gap-3 mb-5">
                    <span aria-hidden style={{
                      width: 40, height: 40, borderRadius: 12, background: '#E2EFE7', color: HQ.MENTOR,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                    }}>
                      <FileText size={19} />
                    </span>
                    <div><h2 className="font-extrabold" style={{ fontSize: '1.25rem', color: HQ.INK, margin: 0 }}>إنشاء امتحان</h2>{examLesson && <p className="text-xs" style={{ color: HQ.MUTED, margin: 0 }}>للدرس: {examLesson.title}</p>}</div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-3 md:col-span-1"><label htmlFor="ae-title" style={lbl}>عنوان الامتحان *</label><input id="ae-title" value={examForm.title} onChange={e => setExamForm(p => ({ ...p, title: e.target.value }))} className="focus:border-[#177B58] focus:outline-none" style={field} /></div>
                      <div><label htmlFor="ae-dur" style={lbl}>المدة (دقيقة)</label><input id="ae-dur" type="number" min={5} value={examForm.duration} onChange={e => setExamForm(p => ({ ...p, duration: parseInt(e.target.value) || 30 }))} className="focus:border-[#177B58] focus:outline-none" style={{ ...field, fontVariantNumeric: 'tabular-nums' }} /></div>
                      <div><label htmlFor="ae-pass" style={lbl}>درجة النجاح %</label><input id="ae-pass" type="number" min={1} max={100} value={examForm.passingScore} onChange={e => setExamForm(p => ({ ...p, passingScore: parseInt(e.target.value) || 60 }))} className="focus:border-[#177B58] focus:outline-none" style={{ ...field, fontVariantNumeric: 'tabular-nums' }} /></div>
                    </div>

                    {/* Exam Target Section */}
                    <div className="p-4 space-y-3" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 14 }}>
                      <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: HQ.INK, margin: 0 }}>
                        توجيه الامتحان
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setExamForm(p => ({ ...p, targetType: 'group', targetStudent: '' }))}
                          className="flex items-center gap-2 px-4 text-xs font-bold flex-1"
                          style={{
                            minHeight: 48, borderRadius: 12, cursor: 'pointer',
                            border: `2px solid ${examForm.targetType === 'group' ? HQ.MENTOR : HQ.LINE}`,
                            background: examForm.targetType === 'group' ? '#E2EFE7' : HQ.SURFACE,
                            color: examForm.targetType === 'group' ? '#0F5940' : HQ.MUTED,
                            justifyContent: 'center',
                          }}
                        >
                          <Users size={15} aria-hidden />
                          جميع طلاب المجموعة
                        </button>
                        <button
                          type="button"
                          onClick={() => setExamForm(p => ({ ...p, targetType: 'individual' }))}
                          className="flex items-center gap-2 px-4 text-xs font-bold flex-1"
                          style={{
                            minHeight: 48, borderRadius: 12, cursor: 'pointer',
                            border: `2px solid ${examForm.targetType === 'individual' ? HQ.MENTOR : HQ.LINE}`,
                            background: examForm.targetType === 'individual' ? '#E2EFE7' : HQ.SURFACE,
                            color: examForm.targetType === 'individual' ? '#0F5940' : HQ.MUTED,
                            justifyContent: 'center',
                          }}
                        >
                          <User size={15} aria-hidden />
                          طالب محدد
                        </button>
                      </div>
                      {examForm.targetType === 'individual' && (
                        <div>
                          <select
                            value={examForm.targetStudent}
                            onChange={e => setExamForm(p => ({ ...p, targetStudent: e.target.value }))}
                            aria-label="اختر الطالب"
                            className="focus:border-[#177B58] focus:outline-none"
                            style={{ ...field, fontSize: 13 }}
                          >
                            <option value="">— اختر الطالب —</option>
                            {(group?.students || []).map(s => (
                              <option key={s._id} value={s._id}>
                                {s.firstName} {s.lastName}
                              </option>
                            ))}
                          </select>
                          {(group?.students || []).length === 0 && (
                            <p className="text-xs mt-1" style={{ color: '#C2410C', margin: '4px 0 0' }}>لا يوجد طلاب في هذه المجموعة</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="pt-4" style={{ borderTop: `1px solid ${HQ.LINE}` }}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-sm" style={{ color: HQ.INK, margin: 0 }}>الأسئلة ({examForm.questions.length})</h3>
                        <button type="button" onClick={addQuestion} className="text-xs font-bold flex items-center gap-1"
                          style={{ minHeight: 44, padding: '8px 14px', borderRadius: 12, cursor: 'pointer', background: '#E2EFE7', color: '#0F5940', border: 'none' }}>
                          <Plus size={14} aria-hidden />إضافة سؤال
                        </button>
                      </div>
                      <div className="space-y-4">
                        {examForm.questions.map((q, qi) => (
                          <div key={qi} className="rounded-2xl p-4" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold" style={{ color: HQ.MUTED }}>سؤال {qi + 1}</span>
                              <div className="flex items-center gap-2">
                                <select value={q.type} onChange={e => updateQ(qi, 'type', e.target.value)} aria-label={`نوع السؤال ${qi + 1}`}
                                  className="text-xs focus:border-[#177B58] focus:outline-none"
                                  style={{ border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px', background: HQ.SURFACE, color: HQ.INK, minHeight: 40 }}>
                                  <option value="mcq">اختياري</option><option value="true_false">صح/خطأ</option><option value="written">إكمال</option><option value="recitation">شفهي</option>
                                </select>
                                <input type="number" min={1} max={10} value={q.points} onChange={e => updateQ(qi, 'points', parseInt(e.target.value) || 1)} aria-label={`نقاط السؤال ${qi + 1}`}
                                  className="text-xs focus:border-[#177B58] focus:outline-none"
                                  style={{ border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px', width: 64, background: HQ.SURFACE, color: HQ.INK, minHeight: 40, fontVariantNumeric: 'tabular-nums' }} placeholder="نقاط" />
                                {examForm.questions.length > 1 && (
                                  <button type="button" onClick={() => removeQuestion(qi)} aria-label={`حذف السؤال ${qi + 1}`}
                                    style={{ ...iconBtn, minWidth: 40, minHeight: 40, color: '#C2410C' }}>
                                    <X size={15} aria-hidden />
                                  </button>
                                )}
                              </div>
                            </div>
                            <textarea value={q.text} onChange={e => updateQ(qi, 'text', e.target.value)} aria-label={`نص السؤال ${qi + 1}`}
                              className="resize-none text-sm mb-3 focus:border-[#177B58] focus:outline-none" style={{ ...field, minHeight: 64 }} placeholder="نص السؤال..." />
                            {q.type === 'mcq' && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium" style={{ color: HQ.MUTED, margin: 0 }}>الخيارات (انقر لتحديد الإجابة الصحيحة):</p>
                                {(q.options || ['', '', '', '']).map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2">
                                    <button type="button" onClick={() => updateQ(qi, 'correctAnswer', oi)}
                                      aria-label={`تحديد الخيار ${oi + 1} كإجابة صحيحة`} aria-pressed={q.correctAnswer === oi}
                                      style={{
                                        width: 30, height: 30, borderRadius: 9999, flex: 'none',
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                        border: `2px solid ${q.correctAnswer === oi ? HQ.MENTOR : HQ.LINE}`,
                                        background: q.correctAnswer === oi ? HQ.MENTOR : 'transparent', color: '#fff',
                                      }}>
                                      {q.correctAnswer === oi && <Check size={15} strokeWidth={3.5} aria-hidden />}
                                    </button>
                                    <input value={opt} onChange={e => updateOption(qi, oi, e.target.value)} aria-label={`نص الخيار ${oi + 1}`}
                                      className="text-sm flex-1 focus:border-[#177B58] focus:outline-none" style={field} placeholder={`الخيار ${oi + 1}`} />
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.type === 'true_false' && (
                              <div>
                                <p className="text-xs font-medium mb-2" style={{ color: HQ.MUTED, marginTop: 0 }}>الإجابة الصحيحة:</p>
                                <div className="flex gap-3">
                                  <button type="button" onClick={() => updateQ(qi, 'correctAnswerBool', true)}
                                    aria-pressed={q.correctAnswerBool !== false}
                                    className="px-4 text-xs font-bold"
                                    style={{
                                      minHeight: 48, borderRadius: 12, cursor: 'pointer',
                                      border: `2px solid ${q.correctAnswerBool !== false ? HQ.MENTOR : HQ.LINE}`,
                                      background: q.correctAnswerBool !== false ? '#E2EFE7' : HQ.SURFACE,
                                      color: q.correctAnswerBool !== false ? '#0F5940' : HQ.MUTED,
                                    }}>صحيح (صح)</button>
                                  <button type="button" onClick={() => updateQ(qi, 'correctAnswerBool', false)}
                                    aria-pressed={q.correctAnswerBool === false}
                                    className="px-4 text-xs font-bold"
                                    style={{
                                      minHeight: 48, borderRadius: 12, cursor: 'pointer',
                                      border: `2px solid ${q.correctAnswerBool === false ? HQ.MENTOR : HQ.LINE}`,
                                      background: q.correctAnswerBool === false ? '#E2EFE7' : HQ.SURFACE,
                                      color: q.correctAnswerBool === false ? '#0F5940' : HQ.MUTED,
                                    }}>خطأ</button>
                                </div>
                              </div>
                            )}
                            {q.type === 'written' && (
                              <div><label htmlFor={`ae-model-${qi}`} className="text-xs font-medium mb-1 block" style={{ color: HQ.MUTED }}>الإجابة الصحيحة:</label><input id={`ae-model-${qi}`} value={q.correctAnswerText} onChange={e => updateQ(qi, 'correctAnswerText', e.target.value)} className="text-sm focus:border-[#177B58] focus:outline-none" style={field} placeholder="أدخل الإجابة النموذجية..." /></div>
                            )}
                            {q.type === 'recitation' && (
                              <div><label htmlFor={`ae-inst-${qi}`} className="text-xs font-medium mb-1 block" style={{ color: HQ.MUTED }}>تعليمات للطالب:</label><textarea id={`ae-inst-${qi}`} value={q.instruction} onChange={e => updateQ(qi, 'instruction', e.target.value)} className="text-sm resize-none focus:border-[#177B58] focus:outline-none" style={{ ...field, minHeight: 64 }} placeholder="مثال: اقرأ سورة الفاتحة بصوت واضح..." /></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button type="button" onClick={() => setShowExamModal(false)} style={{ ...ghostBtn, flex: 1 }}>إلغاء</button>
                    <button type="button" onClick={handleSaveExam} disabled={savingExam || !examForm.title.trim() || examForm.questions.length === 0} style={{ ...primaryBtn, flex: 1, opacity: (savingExam || !examForm.title.trim() || examForm.questions.length === 0) ? 0.55 : 1 }}>{savingExam ? <LoadingSpinner size="sm" color="white" /> : 'إنشاء الامتحان'}</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageLayout>
    </MotionConfig>
  );
}
