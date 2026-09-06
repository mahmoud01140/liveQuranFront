import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Users, CheckCircle2, Clock, Hand, SkipForward, RotateCcw,
  Star, AlertCircle, X, Search, Sparkles, BookOpen, Edit3,
  Check, ChevronLeft, Volume2, Award, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getAvatarColor, getInitials } from '../../utils/helpers';
import QURAN_SURAHS from '../../utils/quranData';

const QUICK_TAGS = [
  'ما شاء الله تلاوة متقنة ومثبتة 🌟',
  'انتبه لمخارج الحروف وأحكام الراء 👍',
  'احرص على أزمنة الغنن والمدود 🎯',
  'حفظ جيد مع وجود بعض التردد ⏳',
  'يحتاج إلى إعادة وتثبيت الماضي أولاً ⚠️',
];

export default function LiveRecitationDrawer({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  groupName,
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
      toast.success(`🎙️ بدأ دور التسميع للطالب ${student.firstName || ''}`);
      setQueue(prev => prev.map(q => {
        const id = q.student?._id || q.student;
        if (id === sId) return { ...q, status: 'reciting' };
        if (q.status === 'reciting') return { ...q, status: 'waiting' };
        return q;
      }));
      setCurrentSpeaker(student);
    } catch {
      toast.error('فشل في بدء دور التسميع');
    }
  };

  const handleSkipTurn = async (student) => {
    const sId = student._id || student;
    try {
      await api.post(`/live/${sessionId}/queue/skip-turn`, { studentId: sId });
      toast('تم تخطي الطالب وتأجيل دوره', { icon: '⏭️' });
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

      toast.success(`⭐ تم رصد التقييم للطالب ${selectedStudent.firstName} بنجاح!`);

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

      toast.success('تم تحديث وتخصيص الورد اليومي للطالب ✨');
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Drawer panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          className="relative w-full max-w-4xl bg-gray-900 text-gray-100 h-full flex flex-col shadow-2xl z-10 border-r border-gray-800"
          dir="rtl"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gray-800/90 border-b border-gray-700/80 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">إدارة طابور التسميع والأوراد الفردية</h2>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    Vercel Polling ⚡
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {groupName} • {sessionTitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:inline">
                المجموع: {queue.length} | المسمّعون: {completedCount} | طلب دور: {handsCount}
              </span>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-gray-700/50 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body: Split View (Queue List + Active Recitation/Wird Panel) */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* Left side on desktop (cols 5): Recitation Queue */}
            <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-l border-gray-800 flex flex-col h-full bg-gray-900/95 overflow-hidden">
              {/* Filter & Search */}
              <div className="p-3 border-b border-gray-800 space-y-2 flex-shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="بحث باسم الطالب..."
                    className="w-full bg-gray-800/90 border border-gray-700 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                      filter === 'all' ? 'bg-emerald-600 text-white font-bold' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    الكل ({queue.length})
                  </button>
                  <button
                    onClick={() => setFilter('hands')}
                    className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap ${
                      filter === 'hands' ? 'bg-amber-600 text-white font-bold' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <Hand className="w-3 h-3 text-amber-300" />
                    <span>طلب دور ({handsCount})</span>
                  </button>
                  <button
                    onClick={() => setFilter('waiting')}
                    className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                      filter === 'waiting' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    لم يُسمّع
                  </button>
                  <button
                    onClick={() => setFilter('completed')}
                    className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                      filter === 'completed' ? 'bg-green-600 text-white font-bold' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    تم التسميع ({completedCount})
                  </button>
                </div>
              </div>

              {/* Queue List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                  <div className="py-12 text-center text-gray-400 text-xs">
                    <span className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin inline-block mb-2" />
                    <p>جارٍ تحميل بيانات الطابور...</p>
                  </div>
                ) : filteredQueue.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-xs">
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
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                          isCurrentReciter
                            ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-950'
                            : isSelected
                            ? 'bg-gray-800/90 border-gray-600 ring-1 ring-emerald-500/40'
                            : hasHandRaised
                            ? 'bg-amber-950/30 border-amber-500/40 animate-pulse'
                            : 'bg-gray-800/40 border-gray-800 hover:bg-gray-800/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${getAvatarColor(
                                student.firstName
                              )}`}
                            >
                              {getInitials(student.firstName, student.lastName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {student.firstName} {student.lastName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isCurrentReciter && (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    يُسمّع الآن 🎙️
                                  </span>
                                )}
                                {hasHandRaised && (
                                  <span className="flex items-center gap-1 text-[10px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">
                                    <Hand className="w-2.5 h-2.5" />
                                    طلب دور
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="flex items-center gap-1 text-[10px] text-green-400 font-bold bg-green-500/20 px-1.5 py-0.5 rounded">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    تم ({item.evaluation?.score || 100}%)
                                  </span>
                                )}
                                {isSkipped && (
                                  <span className="text-[10px] text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded">
                                    تم التخطي
                                  </span>
                                )}
                                {item.status === 'waiting' && !hasHandRaised && (
                                  <span className="text-[10px] text-gray-400">في الانتظار ⏳</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {!isCurrentReciter && !isCompleted && (
                              <button
                                onClick={() => handleStartTurn(student)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors flex items-center gap-1 shadow-sm"
                                title="بدء دور التسميع لهذا الطالب"
                              >
                                <Mic className="w-3 h-3" />
                                <span>ابدأ</span>
                              </button>
                            )}
                            {isCurrentReciter && (
                              <button
                                onClick={() => handleSkipTurn(student)}
                                className="px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-[11px] transition-colors"
                                title="تخطي"
                              >
                                <SkipForward className="w-3 h-3" />
                              </button>
                            )}
                            {(isCompleted || isSkipped) && (
                              <button
                                onClick={() => handleResetTurn(student)}
                                className="px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-[11px] transition-colors"
                                title="إعادة للطابور"
                              >
                                <RotateCcw className="w-3 h-3" />
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

            {/* Right side on desktop (cols 7): Active Student Recitation & Wird Panel */}
            <div className="lg:col-span-7 flex flex-col h-full bg-gray-900 overflow-y-auto p-5 space-y-4">
              {selectedStudent ? (
                <>
                  {/* Selected Student Banner */}
                  <div className="bg-gray-800/80 rounded-2xl p-4 border border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold text-white shadow-md ${getAvatarColor(
                          selectedStudent.firstName
                        )}`}
                      >
                        {getInitials(selectedStudent.firstName, selectedStudent.lastName)}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">
                          {selectedStudent.firstName} {selectedStudent.lastName}
                        </h3>
                        <p className="text-xs text-gray-400">{selectedStudent.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentSpeaker?._id === selectedStudent._id ? (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-pulse">
                          <Mic className="w-3.5 h-3.5" />
                          المتحدث النشط
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartTurn(selectedStudent)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-700/20 transition-colors"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          تفعيل دور التسميع
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Individual Daily Wird Card (الورد اليومي الفردي) */}
                  <div className="bg-gradient-to-br from-gray-800/90 to-gray-800/40 rounded-2xl p-4 border border-gray-700/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-700/60 pb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white">
                          الورد اليومي المخصص لهذا الطالب
                        </span>
                      </div>
                      <button
                        onClick={() => setShowWirdEditor(!showWirdEditor)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>تعديل ورد اليوم</span>
                      </button>
                    </div>

                    {/* Wird Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* New Hifz */}
                      <div className="bg-gray-900/70 p-3 rounded-xl border border-emerald-500/20">
                        <span className="text-[10px] font-bold text-emerald-400 block mb-1">
                          📖 الحفظ الجديد (السبق)
                        </span>
                        {activeTask?.newHifz?.surahName ? (
                          <div className="font-bold text-white text-xs">
                            سورة {activeTask.newHifz.surahName}
                            <p className="text-[11px] text-gray-300 font-normal">
                              الآيات ({activeTask.newHifz.fromVerse} إلى {activeTask.newHifz.toVerse})
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">لم يُحدد بعد</span>
                        )}
                      </div>

                      {/* Near Revision */}
                      <div className="bg-gray-900/70 p-3 rounded-xl border border-blue-500/20">
                        <span className="text-[10px] font-bold text-blue-400 block mb-1">
                          🔄 الماضي القريب (السبقي)
                        </span>
                        {activeTask?.nearRevision?.surahName ? (
                          <div className="font-bold text-white text-xs">
                            سورة {activeTask.nearRevision.surahName}
                            <p className="text-[11px] text-gray-300 font-normal">
                              الآيات ({activeTask.nearRevision.fromVerse} إلى {activeTask.nearRevision.toVerse})
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">مراجعة الأوجه السابقة</span>
                        )}
                      </div>

                      {/* Cumulative Revision */}
                      <div className="bg-gray-900/70 p-3 rounded-xl border border-purple-500/20">
                        <span className="text-[10px] font-bold text-purple-400 block mb-1">
                          🏛️ الماضي البعيد (التمكين)
                        </span>
                        {activeTask?.cumulativeRevision?.surahName ? (
                          <div className="font-bold text-white text-xs">
                            {activeTask.cumulativeRevision.surahName}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">الورد القرآني الثابت</span>
                        )}
                      </div>
                    </div>

                    {/* Additional Exercise */}
                    {activeTask?.additionalExercise?.details && (
                      <div className="bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-xl text-xs text-amber-200">
                        🎯 <span className="font-bold">تدريب إضافي:</span> {activeTask.additionalExercise.details}
                      </div>
                    )}

                    {/* Inline Quick Wird Editor */}
                    {showWirdEditor && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-gray-900 rounded-xl border border-emerald-600/40 space-y-3 mt-2"
                      >
                        <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5" /> تخصيص ورد الحفظ الآن
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-400 block mb-0.5">سورة الحفظ الجديد</label>
                            <select
                              value={editWirdForm.surahNumber}
                              onChange={e => setEditWirdForm({ ...editWirdForm, surahNumber: e.target.value })}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white"
                            >
                              {QURAN_SURAHS.map(s => (
                                <option key={s.number} value={s.number}>
                                  {s.number}. {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block mb-0.5">من آية</label>
                            <input
                              type="number"
                              value={editWirdForm.fromVerse}
                              onChange={e => setEditWirdForm({ ...editWirdForm, fromVerse: e.target.value })}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white"
                              min="1"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block mb-0.5">إلى آية</label>
                            <input
                              type="number"
                              value={editWirdForm.toVerse}
                              onChange={e => setEditWirdForm({ ...editWirdForm, toVerse: e.target.value })}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white"
                              min="1"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">تدريب أو ملاحظة إضافية</label>
                          <input
                            type="text"
                            value={editWirdForm.additionalExercise}
                            onChange={e => setEditWirdForm({ ...editWirdForm, additionalExercise: e.target.value })}
                            placeholder="مثال: تطبيق أحكام الميم الساكنة"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-xs text-white placeholder-gray-500"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setShowWirdEditor(false)}
                            className="px-3 py-1 rounded-lg text-xs text-gray-400 hover:text-white"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={handleSaveWird}
                            disabled={savingWird}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            {savingWird ? 'جارٍ الحفظ...' : 'حفظ الورد'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Live Evaluation Panel (رصد الدرجة اللحظية) */}
                  <div className="bg-gray-800/90 rounded-2xl p-4 border border-gray-700/80 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">تقييم تلاوة الطالب في الحصة</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-400">النوع المُسمّع:</span>
                        <select
                          value={portionType}
                          onChange={e => setPortionType(e.target.value)}
                          className="bg-gray-700 text-white border border-gray-600 rounded-lg px-2 py-0.5 text-xs font-semibold"
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
                      <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-700/60 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-300 block">عداد الأخطاء والتنبيهات</span>
                          <span className="text-[10px] text-gray-500">لحن جلي أو خفي</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const next = Math.max(0, mistakesCount - 1);
                              setMistakesCount(next);
                              setScore(Math.min(100, 100 - next * 5));
                            }}
                            className="w-7 h-7 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 flex items-center justify-center font-bold text-sm"
                          >
                            -
                          </button>
                          <span className="text-base font-black text-amber-400 w-6 text-center">
                            {mistakesCount}
                          </span>
                          <button
                            onClick={() => {
                              const next = mistakesCount + 1;
                              setMistakesCount(next);
                              setScore(Math.max(0, 100 - next * 5));
                            }}
                            className="w-7 h-7 rounded-lg bg-red-900/50 text-red-300 hover:bg-red-800 flex items-center justify-center font-bold text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Score Input */}
                      <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-700/60 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-300 block">الدرجة المئوية</span>
                          <span className="text-[10px] text-gray-500">تُحسب تلقائياً ويمكن تعديلها</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={score}
                            onChange={e => setScore(Number(e.target.value))}
                            className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-center font-black text-emerald-400 text-sm focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-gray-400 text-xs font-bold">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center justify-between bg-gray-900/60 rounded-xl p-3 border border-gray-700/60">
                      <span className="text-xs font-bold text-gray-300">التقييم العام:</span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="p-1 text-amber-400 hover:scale-125 transition-transform"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Feedback Tags */}
                    <div>
                      <span className="text-[11px] text-gray-400 block mb-1">عبارات توجيهية سريعة:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_TAGS.map((tag, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setNotes(prev => (prev ? `${prev} • ${tag}` : tag))}
                            className="text-[10px] bg-gray-700/60 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded-lg transition-colors border border-gray-600/50"
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
                        placeholder="ملاحظات المعلم وتوجيهات التجويد للطالب..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-white placeholder-gray-500 resize-none h-16 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleSaveEvaluation(false)}
                        disabled={savingEvaluation}
                        className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>اعتماد التقييم لهذا الطالب</span>
                      </button>

                      <button
                        onClick={() => handleSaveEvaluation(true)}
                        disabled={savingEvaluation}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs transition-all shadow-md shadow-emerald-900/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>اعتماد والانتقال للتالي ⏭️</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-800/80 flex items-center justify-center text-gray-400 border border-gray-700">
                    <Mic className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-300">لم يتم اختيار أي طالب</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">
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
