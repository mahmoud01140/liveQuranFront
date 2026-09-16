import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Users, CheckCircle2, Clock, Hand, SkipForward, RotateCcw,
  Star, AlertCircle, X, Search, BookOpen, Edit3,
  Check, ChevronLeft, Volume2, Award, ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getAvatarColor, getInitials } from '../../utils/helpers';
import QURAN_SURAHS from '../../utils/quranData';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

const QUICK_TAGS = [
  'ما شاء الله تلاوة متقنة ومثبتة',
  'انتبه لمخارج الحروف وأحكام الراء',
  'احرص على أزمنة الغنن والمدود',
  'حفظ جيد مع وجود بعض التردد',
  'يحتاج إلى إعادة وتثبيت الماضي أولاً',
];

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'hands', label: 'طلب دور' },
  { key: 'waiting', label: 'لم يُسمّع' },
  { key: 'completed', label: 'تم التسميع' },
];

export default function LiveRecitationDrawer({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  groupName,
  jitsiApi,
}) {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [tasksMap, setTasksMap] = useState({});
  const [attendees, setAttendees] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'hands' | 'waiting' | 'completed'
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Evaluation Form State
  const [score, setScore] = useState(100);
  const [rating, setRating] = useState(5);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [portionType, setPortionType] = useState('newHifz');
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  // Quick edit student wird modal
  const [showWirdEditor, setShowWirdEditor] = useState(false);
  const [editWirdForm, setEditWirdForm] = useState({
    surahNumber: 1,
    fromVerse: 1,
    toVerse: 10,
    nearSurahNumber: 1,
    nearFromVerse: 1,
    nearToVerse: 10,
    additionalExercise: '',
  });
  const [savingWird, setSavingWird] = useState(false);

  const pollingRef = useRef(null);

  // Fetch Queue & Tasks via REST
  const fetchQueueData = useCallback(async ({ silent = false } = {}) => {
    if (!sessionId) return;
    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/live/${sessionId}/queue`);
      const { queue: q = [], currentSpeaker: speaker, tasks = {}, attendees: att = [] } = res.data;
      setQueue(q);
      setCurrentSpeaker(speaker);
      setTasksMap(tasks);
      setAttendees(att);

      // Auto-select current speaker if none selected
      if (speaker?._id) {
        setSelectedStudent(prev => prev || speaker);
      }
    } catch {
      if (!silent) toast.error('خطأ في تحميل طابور التسميع');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sessionId]);

  // Polling setup: polls every 3.5s while drawer is open
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    fetchQueueData({ silent: false });

    pollingRef.current = setInterval(() => {
      fetchQueueData({ silent: true });
    }, 3500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen, sessionId, fetchQueueData]);

  // Sync selected student's evaluation form when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      const turn = queue.find(q => (q.student?._id || q.student) === selectedStudent._id);
      if (turn?.evaluation) {
        setScore(turn.evaluation.score ?? 100);
        setRating(turn.evaluation.rating ?? 5);
        setMistakesCount(turn.evaluation.mistakesCount ?? 0);
        setNotes(turn.evaluation.notes || '');
        setPortionType(turn.evaluation.portionType || 'newHifz');
      } else {
        setScore(100);
        setRating(5);
        setMistakesCount(0);
        setNotes('');
        setPortionType('newHifz');
      }

      // Populate quick wird edit form
      const task = tasksMap[selectedStudent._id];
      setEditWirdForm({
        surahNumber: task?.newHifz?.surahNumber || 114,
        fromVerse: task?.newHifz?.fromVerse || 1,
        toVerse: task?.newHifz?.toVerse || 6,
        nearSurahNumber: task?.nearRevision?.surahNumber || 113,
        nearFromVerse: task?.nearRevision?.fromVerse || 1,
        nearToVerse: task?.nearRevision?.toVerse || 5,
        additionalExercise: task?.additionalExercise?.title || task?.additionalExercise?.details || '',
      });
    }
  }, [selectedStudent, queue, tasksMap]);

  // Handlers
  const handleStartTurn = async (student) => {
    const sId = student._id || student;
    setSelectedStudent(student);
    try {
      await api.post(`/live/${sessionId}/queue/start-turn`, { studentId: sId });
      toast.success(`بدأ دور التسميع للطالب ${student.firstName || ''}`);
      setQueue(prev => prev.map(q => {
        const id = q.student?._id || q.student;
        if (id === sId) return { ...q, status: 'reciting' };
        if (q.status === 'reciting') return { ...q, status: 'waiting' };
        return q;
      }));
      setCurrentSpeaker(student);

      if (jitsiApi?.pinParticipantByName) {
        const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
        const pinned = jitsiApi.pinParticipantByName(studentName);
        if (pinned) {
          toast.success(`تم تثبيت ${student.firstName} في الشاشة الرئيسية`);
        }
      }
    } catch {
      toast.error('فشل في بدء دور التسميع');
    }
  };

  const handleSkipTurn = async (student) => {
    const sId = student._id || student;
    try {
      await api.post(`/live/${sessionId}/queue/skip-turn`, { studentId: sId });
      toast('تم تخطي الطالب وتأجيل دوره');
      setQueue(prev => prev.map(q => ((q.student?._id || q.student) === sId ? { ...q, status: 'skipped' } : q)));
      if (currentSpeaker?._id === sId) setCurrentSpeaker(null);
    } catch {
      toast.error('فشل في تخطي الطالب');
    }
  };

  const handleResetTurn = async (student) => {
    const sId = student._id || student;
    try {
      await api.post(`/live/${sessionId}/queue/reset-turn`, { studentId: sId });
      toast.success('تمت إعادة الطالب لقائمة الانتظار');
      setQueue(prev => prev.map(q => ((q.student?._id || q.student) === sId ? { ...q, status: 'waiting' } : q)));
    } catch {
      toast.error('فشل في إعادة الطالب');
    }
  };

  const handleSaveEvaluation = async (moveToNext = false) => {
    if (!selectedStudent?._id) return;
    setSavingEvaluation(true);
    try {
      await api.post(`/live/${sessionId}/queue/evaluate-turn`, {
        studentId: selectedStudent._id,
        score,
        rating,
        mistakesCount,
        notes,
        portionType,
        updateDailyTask: true,
      });

      toast.success(`تم رصد التقييم للطالب ${selectedStudent.firstName} بنجاح!`);

      // Optimistic update
      setQueue(prev => prev.map(q => {
        if ((q.student?._id || q.student) === selectedStudent._id) {
          return {
            ...q,
            status: 'completed',
            evaluation: { score, rating, mistakesCount, notes, portionType },
          };
        }
        return q;
      }));

      if (currentSpeaker?._id === selectedStudent._id) {
        setCurrentSpeaker(null);
      }

      if (moveToNext) {
        // Find next hand-raised or waiting student
        const next = queue.find(q =>
          (q.student?._id || q.student) !== selectedStudent._id &&
          (q.status === 'hand_raised' || q.status === 'waiting')
        );
        if (next?.student) {
          handleStartTurn(next.student);
        } else {
          setSelectedStudent(null);
        }
      }
    } catch {
      toast.error('خطأ في حفظ التقييم');
    } finally {
      setSavingEvaluation(false);
    }
  };

  const handleSaveWird = async () => {
    if (!selectedStudent?._id) return;
    setSavingWird(true);
    try {
      const selectedNewSurah = QURAN_SURAHS.find(s => s.number === Number(editWirdForm.surahNumber));
      const selectedNearSurah = QURAN_SURAHS.find(s => s.number === Number(editWirdForm.nearSurahNumber));

      await api.put(`/daily-tasks/student/${selectedStudent._id}/assign`, {
        newHifz: {
          surahNumber: Number(editWirdForm.surahNumber),
          surahName: selectedNewSurah?.name || `سورة ${editWirdForm.surahNumber}`,
          fromVerse: Number(editWirdForm.fromVerse),
          toVerse: Number(editWirdForm.toVerse),
        },
        nearRevision: {
          surahNumber: Number(editWirdForm.nearSurahNumber),
          surahName: selectedNearSurah?.name || `سورة ${editWirdForm.nearSurahNumber}`,
          fromVerse: Number(editWirdForm.nearFromVerse),
          toVerse: Number(editWirdForm.nearToVerse),
        },
        additionalExercise: editWirdForm.additionalExercise
          ? { title: 'تدريب مخصص', details: editWirdForm.additionalExercise, status: 'pending' }
          : undefined,
      });

      toast.success('تم تحديث وتخصيص الورد اليومي للطالب');
      setShowWirdEditor(false);
      fetchQueueData({ silent: true });
    } catch {
      toast.error('خطأ في حفظ الورد اليومي');
    } finally {
      setSavingWird(false);
    }
  };

  // Filtered Queue
  const filteredQueue = queue.filter(q => {
    const s = q.student;
    if (!s) return false;
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (filter === 'hands') return q.status === 'hand_raised';
    if (filter === 'waiting') return q.status === 'waiting' || q.status === 'hand_raised';
    if (filter === 'completed') return q.status === 'completed';
    return true;
  });

  const handsCount = queue.filter(q => q.status === 'hand_raised').length;
  const completedCount = queue.filter(q => q.status === 'completed').length;
  const activeTask = selectedStudent ? tasksMap[selectedStudent._id] : null;

  if (!isOpen) return null;

  const field = {
    width: '100%', minHeight: 44, background: HQ.SURFACE, color: HQ.INK,
    border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px 12px',
    fontSize: '0.8125rem', fontFamily: 'inherit',
  };
  const iconBtn = {
    minWidth: 44, minHeight: 44, borderRadius: 12, border: 'none', background: 'transparent',
    color: HQ.MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  const filterCount = (key) => key === 'all' ? queue.length : key === 'hands' ? handsCount : key === 'completed' ? completedCount : null;

  return (
    <AnimatePresence>
      <div className="halaqa fixed inset-0 z-50 overflow-hidden flex justify-end" dir="rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0"
          style={{ background: 'rgba(42,36,56,0.55)' }}
        />

        {/* Drawer panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full h-full flex flex-col"
          style={{ maxWidth: 1024, background: HQ.PAPER }}
          role="dialog" aria-modal="true" aria-label="إدارة طابور التسميع"
        >
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between flex-none"
            style={{ background: HQ.SURFACE, borderBottom: `1px solid ${HQ.LINE}` }}>
            <div className="flex items-center gap-3 min-w-0">
              <span aria-hidden style={{
                width: 40, height: 40, borderRadius: 14, background: HQ.MENTOR, color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
              }}>
                <Mic size={19} />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold" style={{ color: HQ.INK, margin: 0 }}>إدارة طابور التسميع والأوراد الفردية</h2>
                <p className="text-xs" style={{ color: HQ.MUTED, margin: 0 }}>
                  {groupName} • {sessionTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-none">
              <span className="text-xs hidden sm:inline" style={{ color: HQ.MUTED, fontVariantNumeric: 'tabular-nums' }}>
                المجموع: {queue.length} | المسمّعون: {completedCount} | طلب دور: {handsCount}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق طابور التسميع"
                style={iconBtn}
              >
                <X size={19} aria-hidden />
              </button>
            </div>
          </div>

          {/* Body: Split View (Queue List + Active Recitation/Wird Panel) */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
            {/* Queue side */}
            <div className="lg:col-span-5 flex flex-col h-full overflow-hidden"
              style={{ borderBottom: `1px solid ${HQ.LINE}`, background: HQ.SURFACE }}>
              {/* Filter & Search */}
              <div className="p-3 space-y-2 flex-none" style={{ borderBottom: `1px solid ${HQ.LINE}` }}>
                <div className="relative">
                  <Search size={15} color={HQ.MUTED} aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    aria-label="بحث باسم الطالب"
                    placeholder="بحث باسم الطالب..."
                    className="w-full text-xs pr-10 focus:border-[#177B58] focus:outline-none"
                    style={{
                      minHeight: 44, background: HQ.SURFACE, color: HQ.INK,
                      border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '8px 40px 8px 12px',
                    }}
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs" role="group" aria-label="تصفية الطابور">
                  {FILTERS.map(f => {
                    const on = filter === f.key;
                    const c = filterCount(f.key);
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFilter(f.key)}
                        aria-pressed={on}
                        className="whitespace-nowrap font-bold"
                        style={{
                          minHeight: 40, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${on ? HQ.MENTOR : HQ.LINE}`,
                          background: on ? HQ.MENTOR : HQ.SURFACE,
                          color: on ? '#fff' : HQ.MUTED, fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {f.key === 'hands' ? <Hand size={12} aria-hidden className="inline ml-1" /> : null}
                        {f.label}{c !== null ? ` (${c})` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Queue List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                  <div className="py-12 text-center text-xs" style={{ color: HQ.MUTED }}>
                    <RefreshCw size={22} color={HQ.MENTOR} className="animate-spin" style={{ margin: '0 auto 8px' }} aria-hidden />
                    <p style={{ margin: 0 }}>جارٍ تحميل بيانات الطابور...</p>
                  </div>
                ) : filteredQueue.length === 0 ? (
                  <div className="py-12 text-center text-xs" style={{ color: HQ.MUTED }}>
                    لا يوجد طلاب في هذا التبويب
                  </div>
                ) : (
                  filteredQueue.map((item, idx) => {
                    const student = item.student;
                    if (!student) return null;
                    const isSelected = selectedStudent?._id === student._id;
                    const isCurrentReciter = currentSpeaker?._id === student._id || item.status === 'reciting';
                    const hasHandRaised = item.status === 'hand_raised';
                    const isCompleted = item.status === 'completed';
                    const isSkipped = item.status === 'skipped';

                    return (
                      <div
                        key={student._id || idx}
                        onClick={() => setSelectedStudent(student)}
                        role="button" tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedStudent(student); } }}
                        aria-label={`${student.firstName} ${student.lastName} — ${isCurrentReciter ? 'يُسمّع الآن' : hasHandRaised ? 'طلب دور' : isCompleted ? 'أتم التسميع' : isSkipped ? 'تم التخطي' : 'في الانتظار'}`}
                        className="p-3 rounded-xl cursor-pointer flex flex-col gap-2"
                        style={{
                          border: `1.5px solid ${isCurrentReciter ? HQ.MENTOR : isSelected ? HQ.MENTOR : hasHandRaised ? '#B45309' : HQ.LINE}`,
                          background: isCurrentReciter ? '#E2EFE7' : HQ.SURFACE,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span aria-hidden className="avatar-circle"
                              style={{
                                width: 32, height: 32, fontSize: 12, flex: 'none',
                                backgroundColor: getAvatarColor(student.firstName),
                              }}>
                              {getInitials(student.firstName, student.lastName)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate" style={{ color: HQ.INK, margin: 0 }}>
                                {student.firstName} {student.lastName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {isCurrentReciter && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 9999,
                                    background: HQ.MENTOR, color: '#fff',
                                  }}>
                                    <span aria-hidden style={{ width: 6, height: 6, borderRadius: 9999, background: '#fff' }} />
                                    يُسمّع الآن
                                  </span>
                                )}
                                {hasHandRaised && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 9999,
                                    background: HQ.PAPER, color: '#B45309', border: '1px solid #B45309',
                                  }}>
                                    <Hand size={10} aria-hidden />
                                    طلب دور
                                  </span>
                                )}
                                {isCompleted && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 9999,
                                    background: '#E2EFE7', color: '#0F5940', fontVariantNumeric: 'tabular-nums',
                                  }}>
                                    <CheckCircle2 size={10} aria-hidden />
                                    تم ({item.evaluation?.score || 100}%)
                                  </span>
                                )}
                                {isSkipped && (
                                  <span style={{ fontSize: 10, color: HQ.MUTED, background: HQ.PAPER, padding: '2px 8px', borderRadius: 9999 }}>
                                    تم التخطي
                                  </span>
                                )}
                                {item.status === 'waiting' && !hasHandRaised && (
                                  <span style={{ fontSize: 10, color: HQ.MUTED }}>في الانتظار</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1 flex-none" onClick={e => e.stopPropagation()}>
                            {!isCurrentReciter && !isCompleted && (
                              <button
                                type="button"
                                onClick={() => handleStartTurn(student)}
                                className="font-bold"
                                style={{
                                  minHeight: 40, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                  background: HQ.MENTOR, color: '#fff', border: 'none', fontSize: 11,
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                }}
                                title="بدء دور التسميع لهذا الطالب"
                              >
                                <Mic size={12} aria-hidden />
                                <span>ابدأ</span>
                              </button>
                            )}
                            {isCurrentReciter && (
                              <button
                                type="button"
                                onClick={() => handleSkipTurn(student)}
                                aria-label="تخطي"
                                style={{ ...iconBtn, minWidth: 40, minHeight: 40 }}
                                title="تخطي"
                              >
                                <SkipForward size={13} aria-hidden />
                              </button>
                            )}
                            {(isCompleted || isSkipped) && (
                              <button
                                type="button"
                                onClick={() => handleResetTurn(student)}
                                aria-label="إعادة للطابور"
                                style={{ ...iconBtn, minWidth: 40, minHeight: 40 }}
                                title="إعادة للطابور"
                              >
                                <RotateCcw size={13} aria-hidden />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Active Student Panel */}
            <div className="lg:col-span-7 flex flex-col h-full overflow-y-auto p-5 space-y-4" style={{ background: HQ.PAPER }}>
              {selectedStudent ? (
                <>
                  {/* Selected Student Banner */}
                  <div className="rounded-2xl p-4 flex items-center justify-between"
                    style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span aria-hidden className="avatar-circle"
                        style={{
                          width: 48, height: 48, fontSize: 15, flex: 'none',
                          backgroundColor: getAvatarColor(selectedStudent.firstName),
                        }}>
                        {getInitials(selectedStudent.firstName, selectedStudent.lastName)}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black truncate" style={{ color: HQ.INK, margin: 0 }}>
                          {selectedStudent.firstName} {selectedStudent.lastName}
                        </h3>
                        <p className="text-xs truncate" style={{ color: HQ.MUTED, margin: 0 }}>{selectedStudent.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-none">
                      {currentSpeaker?._id === selectedStudent._id ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#E2EFE7', color: '#0F5940', padding: '8px 14px', borderRadius: 12,
                          fontSize: '0.8125rem', fontWeight: 800,
                        }}>
                          <Mic size={14} aria-hidden />
                          المتحدث النشط
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartTurn(selectedStudent)}
                          className="font-bold"
                          style={{
                            minHeight: 44, padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                            background: HQ.MENTOR, color: '#fff', border: 'none', fontSize: '0.8125rem',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          <Mic size={14} aria-hidden />
                          تفعيل دور التسميع
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Individual Daily Wird Card */}
                  <div className="rounded-2xl p-4 space-y-3" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
                    <div className="flex items-center justify-between pb-2" style={{ borderBottom: `1px solid ${HQ.LINE}` }}>
                      <div className="flex items-center gap-2">
                        <BookOpen size={15} color={HQ.MENTOR} aria-hidden />
                        <span className="text-xs font-bold" style={{ color: HQ.INK }}>
                          الورد اليومي المخصص لهذا الطالب
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowWirdEditor(!showWirdEditor)}
                        aria-expanded={showWirdEditor}
                        className="font-bold"
                        style={{
                          minHeight: 40, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                          background: 'none', border: 'none', color: HQ.MENTOR, fontSize: 11,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <Edit3 size={12} aria-hidden />
                        <span>تعديل ورد اليوم</span>
                      </button>
                    </div>

                    {/* Wird Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                        <span className="font-bold block mb-1" style={{ fontSize: '0.8125rem', color: HQ.INK }}>
                          الحفظ الجديد (السبق)
                        </span>
                        {activeTask?.newHifz?.surahName ? (
                          <div className="font-bold text-xs" style={{ color: HQ.INK }}>
                            سورة {activeTask.newHifz.surahName}
                            <p className="font-normal" style={{ fontSize: '0.8125rem', color: HQ.MUTED, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                              الآيات ({activeTask.newHifz.fromVerse} إلى {activeTask.newHifz.toVerse})
                            </p>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>لم يُحدد بعد</span>
                        )}
                      </div>

                      <div className="p-3 rounded-xl" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                        <span className="font-bold block mb-1" style={{ fontSize: '0.8125rem', color: HQ.INK }}>
                          الماضي القريب (السبقي)
                        </span>
                        {activeTask?.nearRevision?.surahName ? (
                          <div className="font-bold text-xs" style={{ color: HQ.INK }}>
                            سورة {activeTask.nearRevision.surahName}
                            <p className="font-normal" style={{ fontSize: '0.8125rem', color: HQ.MUTED, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                              الآيات ({activeTask.nearRevision.fromVerse} إلى {activeTask.nearRevision.toVerse})
                            </p>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>مراجعة الأوجه السابقة</span>
                        )}
                      </div>

                      <div className="p-3 rounded-xl" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                        <span className="font-bold block mb-1" style={{ fontSize: '0.8125rem', color: HQ.INK }}>
                          الماضي البعيد (التمكين)
                        </span>
                        {activeTask?.cumulativeRevision?.surahName ? (
                          <div className="font-bold text-xs" style={{ color: HQ.INK }}>
                            {activeTask.cumulativeRevision.surahName}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>الورد القرآني الثابت</span>
                        )}
                      </div>
                    </div>

                    {/* Additional Exercise */}
                    {activeTask?.additionalExercise?.details && (
                      <div className="p-2.5 rounded-xl text-xs" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, color: HQ.INK }}>
                        <span className="font-bold">تدريب إضافي:</span> {activeTask.additionalExercise.details}
                      </div>
                    )}

                    {/* Inline Quick Wird Editor */}
                    {showWirdEditor && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.2 }}
                        className="p-3 rounded-xl space-y-3 mt-2"
                        style={{ background: HQ.PAPER, border: `1px solid ${HQ.MENTOR}` }}
                      >
                        <h4 className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#0F5940', margin: 0 }}>
                          <Edit3 size={13} aria-hidden /> تخصيص ورد الحفظ الآن
                        </h4>
                        <div className="pb-2.5" style={{ borderBottom: `1px solid ${HQ.LINE}` }}>
                          <span className="font-bold block mb-1" style={{ fontSize: '0.8125rem', color: HQ.INK }}>الحفظ الجديد (السبق):</span>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label htmlFor="w-surah" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>السورة</label>
                              <select
                                id="w-surah"
                                value={editWirdForm.surahNumber}
                                onChange={e => setEditWirdForm({ ...editWirdForm, surahNumber: e.target.value })}
                                className="w-full text-xs focus:border-[#177B58] focus:outline-none"
                                style={{ minHeight: 44, background: HQ.SURFACE, color: HQ.INK, border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px' }}
                              >
                                {QURAN_SURAHS.map(s => (
                                  <option key={s.number} value={s.number}>
                                    {s.number}. {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor="w-from" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>من آية</label>
                              <input
                                id="w-from"
                                type="number"
                                value={editWirdForm.fromVerse}
                                onChange={e => setEditWirdForm({ ...editWirdForm, fromVerse: e.target.value })}
                                className="w-full text-xs focus:border-[#177B58] focus:outline-none"
                                style={{ minHeight: 44, background: HQ.SURFACE, color: HQ.INK, border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px', fontVariantNumeric: 'tabular-nums' }}
                                min="1"
                              />
                            </div>
                            <div>
                              <label htmlFor="w-to" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>إلى آية</label>
                              <input
                                id="w-to"
                                type="number"
                                value={editWirdForm.toVerse}
                                onChange={e => setEditWirdForm({ ...editWirdForm, toVerse: e.target.value })}
                                className="w-full text-xs focus:border-[#177B58] focus:outline-none"
                                style={{ minHeight: 44, background: HQ.SURFACE, color: HQ.INK, border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px', fontVariantNumeric: 'tabular-nums' }}
                                min="1"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pb-2.5" style={{ borderBottom: `1px solid ${HQ.LINE}` }}>
                          <span className="font-bold block mb-1" style={{ fontSize: '0.8125rem', color: HQ.INK }}>الماضي القريب (السبقي):</span>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label htmlFor="w-near-surah" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>السورة</label>
                              <select
                                id="w-near-surah"
                                value={editWirdForm.nearSurahNumber}
                                onChange={e => setEditWirdForm({ ...editWirdForm, nearSurahNumber: e.target.value })}
                                className="w-full text-xs focus:border-[#177B58] focus:outline-none"
                                style={{ minHeight: 44, background: HQ.SURFACE, color: HQ.INK, border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px' }}
                              >
                                {QURAN_SURAHS.map(s => (
                                  <option key={s.number} value={s.number}>
                                    {s.number}. {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor="w-near-from" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>من آية</label>
                              <input
                                id="w-near-from"
                                type="number"
                                value={editWirdForm.nearFromVerse}
                                onChange={e => setEditWirdForm({ ...editWirdForm, nearFromVerse: e.target.value })}
                                className="w-full text-xs focus:border-[#177B58] focus:outline-none"
                                style={{ minHeight: 44, background: HQ.SURFACE, color: HQ.INK, border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px', fontVariantNumeric: 'tabular-nums' }}
                                min="1"
                              />
                            </div>
                            <div>
                              <label htmlFor="w-near-to" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>إلى آية</label>
                              <input
                                id="w-near-to"
                                type="number"
                                value={editWirdForm.nearToVerse}
                                onChange={e => setEditWirdForm({ ...editWirdForm, nearToVerse: e.target.value })}
                                className="w-full text-xs focus:border-[#177B58] focus:outline-none"
                                style={{ minHeight: 44, background: HQ.SURFACE, color: HQ.INK, border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px', fontVariantNumeric: 'tabular-nums' }}
                                min="1"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label htmlFor="w-extra" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>تدريب أو ملاحظة إضافية</label>
                          <input
                            id="w-extra"
                            type="text"
                            value={editWirdForm.additionalExercise}
                            onChange={e => setEditWirdForm({ ...editWirdForm, additionalExercise: e.target.value })}
                            placeholder="مثال: تطبيق أحكام الميم الساكنة"
                            className="w-full text-xs focus:border-[#177B58] focus:outline-none"
                            style={{ minHeight: 44, background: HQ.SURFACE, color: HQ.INK, border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px 12px' }}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowWirdEditor(false)}
                            className="text-xs"
                            style={{ minHeight: 44, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: 'none', border: 'none', color: HQ.MUTED, fontWeight: 700 }}
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveWird}
                            disabled={savingWird}
                            className="text-xs font-bold"
                            style={{
                              minHeight: 44, padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                              background: HQ.MENTOR, color: '#fff', border: 'none', opacity: savingWird ? 0.6 : 1,
                            }}
                          >
                            {savingWird ? 'جارٍ الحفظ...' : 'حفظ الورد'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Live Evaluation Panel */}
                  <div className="rounded-2xl p-4 space-y-4" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
                    <div className="flex items-center justify-between pb-2" style={{ borderBottom: `1px solid ${HQ.LINE}` }}>
                      <div className="flex items-center gap-2">
                        <Award size={15} color="#B45309" aria-hidden />
                        <span className="text-xs font-bold" style={{ color: HQ.INK }}>تقييم تلاوة الطالب في الحصة</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span style={{ color: HQ.MUTED }}>النوع المُسمّع:</span>
                        <select
                          value={portionType}
                          onChange={e => setPortionType(e.target.value)}
                          aria-label="النوع المُسمّع"
                          className="text-xs font-bold focus:border-[#177B58] focus:outline-none"
                          style={{ background: HQ.PAPER, color: HQ.INK, border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px', minHeight: 40 }}
                        >
                          <option value="newHifz">الحفظ الجديد</option>
                          <option value="nearRevision">الماضي القريب</option>
                          <option value="cumulativeRevision">الماضي البعيد</option>
                          <option value="all">كل الأركان</option>
                        </select>
                      </div>
                    </div>

                    {/* Mistakes Counter & Score */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Mistakes counter */}
                      <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                        <div>
                          <span className="text-xs font-bold block" style={{ color: HQ.INK }}>عداد الأخطاء والتنبيهات</span>
                          <span style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>لحن جلي أو خفي</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(0, mistakesCount - 1);
                              setMistakesCount(next);
                              setScore(Math.min(100, 100 - next * 5));
                            }}
                            aria-label="إنقاص الأخطاء"
                            style={{ width: 40, height: 40, borderRadius: 8, background: HQ.SURFACE, color: HQ.INK, border: `1px solid ${HQ.LINE}`, cursor: 'pointer', fontWeight: 800, fontSize: 16 }}
                          >
                            -
                          </button>
                          <span className="text-base font-black w-6 text-center" style={{ color: '#B45309', fontVariantNumeric: 'tabular-nums' }}>
                            {mistakesCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = mistakesCount + 1;
                              setMistakesCount(next);
                              setScore(Math.max(0, 100 - next * 5));
                            }}
                            aria-label="زيادة الأخطاء"
                            style={{ width: 40, height: 40, borderRadius: 8, background: HQ.SURFACE, color: '#C2410C', border: '1px solid #C2410C', cursor: 'pointer', fontWeight: 800, fontSize: 16 }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Score Input */}
                      <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                        <div>
                          <span className="text-xs font-bold block" style={{ color: HQ.INK }}>الدرجة المئوية</span>
                          <span style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>تُحسب تلقائياً ويمكن تعديلها</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={score}
                            aria-label="الدرجة المئوية"
                            onChange={e => setScore(Number(e.target.value))}
                            className="text-center font-black text-sm focus:border-[#177B58] focus:outline-none"
                            style={{
                              width: 64, minHeight: 44, background: HQ.SURFACE, color: HQ.MENTOR,
                              border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px', fontVariantNumeric: 'tabular-nums',
                            }}
                          />
                          <span className="text-xs font-bold" style={{ color: HQ.MUTED }}>%</span>
                        </div>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center justify-between rounded-xl p-3" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                      <span className="text-xs font-bold" style={{ color: HQ.INK }}>التقييم العام:</span>
                      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="التقييم العام من 5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            role="radio" aria-checked={star === rating} aria-label={`${star} من 5`}
                            onClick={() => setRating(star)}
                            style={{ minWidth: 40, minHeight: 40, border: 'none', background: 'none', cursor: 'pointer', padding: 6 }}
                          >
                            <Star
                              size={22}
                              aria-hidden
                              color={star <= rating ? '#D9A441' : HQ.LINE}
                              fill={star <= rating ? '#D9A441' : 'none'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Feedback Tags */}
                    <div>
                      <span className="block mb-1" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>عبارات توجيهية سريعة:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_TAGS.map((tag, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setNotes(prev => (prev ? `${prev} • ${tag}` : tag))}
                            style={{
                              fontSize: '0.8125rem', background: HQ.PAPER, color: HQ.INK,
                              border: `1px solid ${HQ.LINE}`, padding: '8px 12px', borderRadius: 8,
                              cursor: 'pointer', minHeight: 40,
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes Textarea */}
                    <div>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        aria-label="ملاحظات المعلم وتوجيهات التجويد"
                        placeholder="ملاحظات المعلم وتوجيهات التجويد للطالب..."
                        className="w-full text-xs focus:border-[#177B58] focus:outline-none"
                        style={{
                          minHeight: 64, background: HQ.SURFACE, color: HQ.INK,
                          border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: 12,
                        }}
                      />
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSaveEvaluation(false)}
                        disabled={savingEvaluation}
                        className="font-bold"
                        style={{
                          flex: 1, minHeight: 48, borderRadius: 12, cursor: 'pointer',
                          background: HQ.SURFACE, color: HQ.INK, border: `1.5px solid ${HQ.MENTOR}`,
                          fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          opacity: savingEvaluation ? 0.6 : 1,
                        }}
                      >
                        <Check size={15} color={HQ.MENTOR} aria-hidden />
                        <span>اعتماد التقييم لهذا الطالب</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveEvaluation(true)}
                        disabled={savingEvaluation}
                        className="font-bold"
                        style={{
                          flex: 1, minHeight: 48, borderRadius: 12, cursor: 'pointer',
                          background: HQ.MENTOR, color: '#fff', border: 'none',
                          fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          opacity: savingEvaluation ? 0.6 : 1,
                        }}
                      >
                        <CheckCircle2 size={15} aria-hidden />
                        <span>اعتماد والانتقال للتالي</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <span aria-hidden style={{
                    width: 64, height: 64, borderRadius: 18, background: HQ.SURFACE,
                    border: `1px solid ${HQ.LINE}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Mic size={30} color={HQ.MUTED} />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold" style={{ color: HQ.INK, margin: '0 0 4px' }}>لم يتم اختيار أي طالب</h4>
                    <p className="text-xs mt-1 max-w-sm" style={{ color: HQ.MUTED, margin: 0 }}>
                      اختر طالباً من قائمة الطابور لبدء دور التسميع، مراجعة ورده اليومي المخصص، ورصد التقييم المباشر له.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
