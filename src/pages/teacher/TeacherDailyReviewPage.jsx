import { useState, useEffect, useRef } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import {
  BookOpen, Check, Clock, AlertCircle, Star, Users, Filter,
  ChevronLeft, MessageSquare, RefreshCw, X, Mic, Square, Play, Pause, Volume2, Trash2,
  Edit3, Save, Award,
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useDailyRecordStore from '../../store/dailyRecordStore';
import { timeAgoAr, getInitials, getAvatarColor, getLevelLabel } from '../../utils/helpers';
import QURAN_SURAHS from '../../utils/quranData';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

/* Daily review desk — approvals, recitations and individual wird.
   Same fetches, forms, audio and payloads as before; visual only. */

const STATUS_TONE = {
  pending: { label: 'قيد المراجعة', bg: '#FBF7EE', fg: '#B45309', border: '#B45309', dot: '#B45309' },
  approved: { label: 'تمت الموافقة', bg: '#E2EFE7', fg: '#0F5940', border: '#E2EFE7', dot: '#177B58' },
  needs_review: { label: 'يحتاج مراجعة', bg: '#FFFFFF', fg: '#C2410C', border: '#C2410C', dot: '#C2410C' },
};

const RECITATION_TONE = {
  pending: { label: 'تلاوات معلقة', bg: '#FBF7EE', fg: '#B45309', border: '#B45309', dot: '#B45309' },
  reviewed: { label: 'تم تقييمها', bg: '#E2EFE7', fg: '#0F5940', border: '#E2EFE7', dot: '#177B58' },
};

const TASK_TONE = {
  reviewed: { label: 'تم التقييم', bg: '#E2EFE7', fg: '#0F5940', border: '#E2EFE7' },
  completed: { label: 'أنجزه الطالب', bg: '#E2EFE7', fg: '#0F5940', border: '#E2EFE7' },
  pending: { label: 'قيد الحفظ', bg: '#FBF7EE', fg: '#B45309', border: '#B45309' },
};

const LEVEL_TONE = {
  foundation: { wash: '#E2EFE7', fg: '#0F5940' },
  memorization: { wash: '#ECE9F4', fg: '#4A3F6B' },
  teacher_prep: { wash: '#ECE9F4', fg: '#4A3F6B' },
  senior: { wash: '#FBF7EE', fg: '#2A2438' },
};

const ACTIVITY_LABELS = { memorization: 'حفظ', review: 'مراجعة', tajweed: 'تجويد' };

const field = {
  width: '100%', minHeight: 48, background: HQ.SURFACE, color: HQ.INK,
  border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 16px',
  fontSize: 14, fontFamily: 'inherit',
};

export default function TeacherDailyReviewPage() {
  const { user } = useAuthStore();
  const { groups, fetchAllGroups } = useGroupStore();
  const { groupRecords, pendingCount, isLoading, fetchGroupRecords, reviewRecord } = useDailyRecordStore();

  const [selectedGroup, setSelectedGroup] = useState(null);

  // Daily record state
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', teacherNotes: '', rating: 5 });

  // Recitation review state
  const [activeReviewType, setActiveReviewType] = useState('daily_records'); // 'daily_records' | 'recitations' | 'individual_tasks'
  const [recitations, setRecitations] = useState([]);
  const [loadingRecitations, setLoadingRecitations] = useState(false);
  const [recitationStatusFilter, setRecitationStatusFilter] = useState('pending'); // 'pending' | 'reviewed' | 'all'
  const [reviewingRecitationId, setReviewingRecitationId] = useState(null);
  const [recitationForm, setRecitationForm] = useState({ rating: 5, teacherNotes: '' });

  // Individual student daily tasks state
  const [groupDailyTasks, setGroupDailyTasks] = useState([]);
  const [loadingDailyTasks, setLoadingDailyTasks] = useState(false);
  const [editingStudentTask, setEditingStudentTask] = useState(null);
  const [assignForm, setAssignForm] = useState({
    surahNumber: 114,
    fromVerse: 1,
    toVerse: 6,
    nearSurahNumber: 113,
    nearFromVerse: 1,
    nearToVerse: 5,
    additionalExercise: '',
    teacherNotes: '',
  });
  const [savingAssign, setSavingAssign] = useState(false);

  // Recitation reference audio states
  const [playingRefId, setPlayingRefId] = useState(null);
  const [refAudioUrls, setRefAudioUrls] = useState([]);
  const [refCurrentIdx, setRefCurrentIdx] = useState(0);
  const [refLoadingId, setRefLoadingId] = useState(null);
  const refAudioPlayer = useRef(new Audio());

  // Teacher audio feedback recording state
  const [isRecordingFeedback, setIsRecordingFeedback] = useState(false);
  const [feedbackDuration, setFeedbackDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedFeedbackUrl, setRecordedFeedbackUrl] = useState(null);
  const [recordedFeedbackBlob, setRecordedFeedbackBlob] = useState(null);
  const [isPlayingFeedback, setIsPlayingFeedback] = useState(false);
  const feedbackAudioPlayer = useRef(new Audio());
  const timerRef = useRef(null);

  useEffect(() => { fetchAllGroups(); }, []);

  const myGroups = (user?.role === 'admin' || user?.role === 'teacher')
    ? groups
    : groups.filter(g => g.teacher?._id === user?._id || g.teacher === user?._id);

  // Pagination hooks
  const groupsPagination = usePagination(myGroups, 6);
  const recordsPagination = usePagination(groupRecords, 10);
  const recitationsPagination = usePagination(recitations, 10);

  // Cleanup audio players on unmount
  useEffect(() => {
    return () => {
      refAudioPlayer.current.pause();
      feedbackAudioPlayer.current.pause();
      clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      if (activeReviewType === 'daily_records') {
        fetchGroupRecords(selectedGroup._id, { status: statusFilter !== 'all' ? statusFilter : undefined });
      } else if (activeReviewType === 'recitations') {
        fetchGroupRecitations(selectedGroup._id, recitationStatusFilter);
      } else if (activeReviewType === 'individual_tasks') {
        fetchGroupDailyTasks(selectedGroup._id);
      }
    }
  }, [selectedGroup?._id, statusFilter, recitationStatusFilter, activeReviewType]);

  const handleReview = async (recordId) => {
    try {
      await reviewRecord(recordId, reviewForm);
      toast.success(reviewForm.status === 'approved' ? 'تمت الموافقة' : 'تم طلب المراجعة');
      setReviewingId(null);
      setReviewForm({ status: 'approved', teacherNotes: '', rating: 5 });
    } catch {
      toast.error('خطأ في المراجعة');
    }
  };

  /* ── Individual Student Daily Tasks Handlers ────────────── */
  const fetchGroupDailyTasks = async (groupId) => {
    setLoadingDailyTasks(true);
    try {
      const res = await api.get(`/daily-tasks/group/${groupId}/today`);
      setGroupDailyTasks(res.data.tasks || []);
    } catch {
      toast.error('خطأ في جلب الأوراد اليومية للطلاب');
    } finally {
      setLoadingDailyTasks(false);
    }
  };

  const handleOpenAssignModal = (student, currentTask) => {
    setEditingStudentTask({ student, task: currentTask });
    setAssignForm({
      surahNumber: currentTask?.newHifz?.surahNumber || 114,
      fromVerse: currentTask?.newHifz?.fromVerse || 1,
      toVerse: currentTask?.newHifz?.toVerse || 6,
      nearSurahNumber: currentTask?.nearRevision?.surahNumber || 113,
      nearFromVerse: currentTask?.nearRevision?.fromVerse || 1,
      nearToVerse: currentTask?.nearRevision?.toVerse || 5,
      additionalExercise: currentTask?.additionalExercise?.details || '',
      teacherNotes: currentTask?.teacherNotes || '',
    });
  };

  const handleSaveAssignedTask = async () => {
    if (!editingStudentTask?.student?._id) return;
    setSavingAssign(true);
    try {
      const selectedNewSurah = QURAN_SURAHS.find(s => s.number === Number(assignForm.surahNumber));
      const selectedNearSurah = QURAN_SURAHS.find(s => s.number === Number(assignForm.nearSurahNumber));

      if (assignForm.applyWeeklyPlan) {
        const versesPerDay = Math.max(1, Number(assignForm.toVerse) - Number(assignForm.fromVerse) + 1);
        await api.post(`/daily-tasks/student/${editingStudentTask.student._id}/weekly-plan`, {
          pacing: {
            surahNumber: Number(assignForm.surahNumber),
            surahName: selectedNewSurah?.name || `سورة ${assignForm.surahNumber}`,
            startVerse: Number(assignForm.fromVerse),
            versesPerDay,
            daysCount: 7,
            nearRevisionSurah: Number(assignForm.nearSurahNumber),
            cumulativeJuz: 30,
          }
        });
        toast.success('تم اعتماد خطة الورد الأسبوعية (7 أيام) بنجاح');
      } else {
        await api.put(`/daily-tasks/student/${editingStudentTask.student._id}/assign`, {
          newHifz: {
            surahNumber: Number(assignForm.surahNumber),
            surahName: selectedNewSurah?.name || `سورة ${assignForm.surahNumber}`,
            fromVerse: Number(assignForm.fromVerse),
            toVerse: Number(assignForm.toVerse),
          },
          nearRevision: {
            surahNumber: Number(assignForm.nearSurahNumber),
            surahName: selectedNearSurah?.name || `سورة ${assignForm.nearSurahNumber}`,
            fromVerse: Number(assignForm.nearFromVerse),
            toVerse: Number(assignForm.nearToVerse),
          },
          additionalExercise: assignForm.additionalExercise
            ? { title: 'تدريب مخصص', details: assignForm.additionalExercise, status: 'pending' }
            : undefined,
          teacherNotes: assignForm.teacherNotes || undefined,
        });
        toast.success('تم حفظ وتخصيص الورد اليومي للطالب بنجاح');
      }

      setEditingStudentTask(null);
      fetchGroupDailyTasks(selectedGroup._id);
    } catch {
      toast.error('خطأ في حفظ الورد');
    } finally {
      setSavingAssign(false);
    }
  };

  /* ── Recitations Review Handlers ────────────────────────── */
  const fetchGroupRecitations = async (groupId, status) => {
    setLoadingRecitations(true);
    try {
      const res = await api.get(`/student-recitations/group/${groupId}`, {
        params: { status: status !== 'all' ? status : undefined }
      });
      setRecitations(res.data.recitations || []);
    } catch {
      toast.error('خطأ في جلب تسجيلات التلاوة');
    } finally {
      setLoadingRecitations(false);
    }
  };

  const handleReviewRecitation = async (recitationId) => {
    const formData = new FormData();
    formData.append('rating', recitationForm.rating);
    formData.append('teacherNotes', recitationForm.teacherNotes);
    if (recordedFeedbackBlob) {
      formData.append('audio', recordedFeedbackBlob, 'feedback.webm');
    }

    try {
      await api.put(`/student-recitations/${recitationId}/review`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('تم إرسال التقييم بنجاح وإشعار الطالب!');
      setReviewingRecitationId(null);
      setRecitationForm({ rating: 5, teacherNotes: '' });
      setRecordedFeedbackUrl(null);
      setRecordedFeedbackBlob(null);
      fetchGroupRecitations(selectedGroup._id, recitationStatusFilter);
    } catch {
      toast.error('خطأ في إرسال التقييم');
    }
  };

  // Play reference Quran audios for comparison
  const playReferenceRecitation = async (rec) => {
    if (playingRefId === rec._id) {
      refAudioPlayer.current.pause();
      setPlayingRefId(null);
      return;
    }

    setRefLoadingId(rec._id);
    try {
      const urls = [];
      for (let v = rec.fromVerse; v <= rec.toVerse; v++) {
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${rec.surahNumber}:${v}/ar.alafasy`);
        const data = await res.json();
        if (data.code === 200 && data.data?.audio) {
          urls.push(data.data.audio);
        }
      }

      if (urls.length === 0) {
        toast.error('فشل تحميل الصوت المرجعي');
        setRefLoadingId(null);
        return;
      }

      setRefAudioUrls(urls);
      setRefCurrentIdx(0);
      setRefLoadingId(null);
      setPlayingRefId(rec._id);

      // Play Alafasy recitation sequence
      playRefAudioSequence(urls, 0, rec._id);

    } catch (e) {
      console.error(e);
      toast.error('خطأ في تحميل الصوت المرجعي');
      setRefLoadingId(null);
    }
  };

  const playRefAudioSequence = (urls, index, recId) => {
    if (index >= urls.length) {
      setPlayingRefId(null);
      setRefCurrentIdx(0);
      return;
    }

    setRefCurrentIdx(index);
    const audio = refAudioPlayer.current;
    audio.src = urls[index];
    audio.play();

    audio.onended = () => {
      playRefAudioSequence(urls, index + 1, recId);
    };
  };

  // Feedback Audio Recording handlers (Multer webm)
  const startFeedbackRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedFeedbackBlob(blob);
        setRecordedFeedbackUrl(url);
        feedbackAudioPlayer.current.src = url;
      };

      setRecordedFeedbackUrl(null);
      setRecordedFeedbackBlob(null);

      recorder.start();
      setIsRecordingFeedback(true);
      setFeedbackDuration(0);

      timerRef.current = setInterval(() => {
        setFeedbackDuration((d) => d + 1);
      }, 1000);

    } catch {
      toast.error('يرجى السماح بالوصول للميكروفون لتسجيل تعليق صوتي');
    }
  };

  const stopFeedbackRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      setIsRecordingFeedback(false);
      clearInterval(timerRef.current);
    }
  };

  const togglePlayFeedback = () => {
    if (!recordedFeedbackUrl) return;

    if (isPlayingFeedback) {
      feedbackAudioPlayer.current.pause();
      setIsPlayingFeedback(false);
    } else {
      feedbackAudioPlayer.current.play();
      setIsPlayingFeedback(true);
      feedbackAudioPlayer.current.onended = () => {
        setIsPlayingFeedback(false);
      };
    }
  };

  const panel = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 20,
  };
  const emptyBox = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18,
    padding: 48, textAlign: 'center',
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
  const outlineBtn = {
    minHeight: 48, padding: '12px 20px', borderRadius: 12, background: HQ.SURFACE,
    color: HQ.MENTOR, border: `1.5px solid ${HQ.MENTOR}`, fontWeight: 800, fontSize: 14, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
  const iconBtn = {
    minWidth: 44, minHeight: 44, borderRadius: 12, border: 'none', background: 'transparent',
    color: HQ.MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  const renderStars = (value, onPick) => (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="التقييم من 5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button"
          role="radio" aria-checked={s === value} aria-label={`${s} من 5`}
          onClick={() => onPick && onPick(s)}
          style={{ minWidth: 40, minHeight: 40, border: 'none', background: 'none', cursor: onPick ? 'pointer' : 'default', padding: 8 }}>
          <Star size={19} aria-hidden color={s <= value ? '#D9A441' : HQ.LINE}
            fill={s <= value ? '#D9A441' : 'none'} />
        </button>
      ))}
    </div>
  );

  const statusChip = (tone) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: '0.8125rem', fontWeight: 700, padding: '4px 12px', borderRadius: 9999,
    background: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`,
  });

  // Group selection
  if (!selectedGroup) {
    return (
      <PageLayout>
        <MotionConfig reducedMotion="user">
          <div className="halaqa" style={{ maxWidth: 960, margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mb-6">
              <h1 className="flex items-center gap-2" style={{ fontSize: '1.5rem', fontWeight: 800, color: HQ.INK, margin: '0 0 4px' }}>
                <BookOpen size={22} color={HQ.MENTOR} aria-hidden /> مراجعة سجلات الحفظ
              </h1>
              <p className="text-sm" style={{ color: HQ.MUTED, margin: 0 }}>اختر مجموعة لمراجعة سجلات الحفظ اليومية</p>
            </motion.div>
            {myGroups.length === 0 ? (
              <div style={emptyBox}>
                <Users size={52} color={HQ.LINE} style={{ margin: '0 auto 12px' }} aria-hidden />
                <p className="font-bold" style={{ color: HQ.MUTED, margin: 0 }}>لا توجد مجموعات</p>
              </div>
            ) : (
              <div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {groupsPagination.paginatedItems.map(group => {
                    const tone = LEVEL_TONE[group.level] || { wash: HQ.PAPER, fg: HQ.MUTED };
                    return (
                      <button key={group._id} type="button" onClick={() => setSelectedGroup(group)}
                        className="p-6 text-right w-full"
                        style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, cursor: 'pointer' }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold px-2.5 py-1" style={{ backgroundColor: tone.wash, color: tone.fg, borderRadius: 8 }}>
                            {getLevelLabel(group.level)}
                          </span>
                          <span className="text-xs flex items-center gap-1" style={{ color: HQ.MUTED, fontVariantNumeric: 'tabular-nums' }}>
                            <Users size={13} aria-hidden /> {group.students?.length || 0}
                          </span>
                        </div>
                        <h3 className="font-extrabold" style={{ color: HQ.INK, margin: '0 0 8px' }}>{group.name}</h3>
                        <div className="flex items-center gap-2 text-sm font-bold" style={{ color: HQ.MENTOR }}>
                          <BookOpen size={15} aria-hidden /> مراجعة السجلات
                          <ChevronLeft size={15} aria-hidden style={{ marginRight: 'auto' }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Pagination
                  currentPage={groupsPagination.currentPage}
                  totalPages={groupsPagination.totalPages}
                  totalItems={groupsPagination.totalItems}
                  pageSize={groupsPagination.pageSize}
                  onPageChange={groupsPagination.setCurrentPage}
                  onPageSizeChange={groupsPagination.setPageSize}
                  showPageSize={true}
                  pageSizeOptions={[6, 12, 24]}
                  itemName="مجموعة"
                  className="mt-6"
                />
              </div>
            )}
          </div>
        </MotionConfig>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <MotionConfig reducedMotion="user">
        <div className="halaqa" style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <button type="button" onClick={() => setSelectedGroup(null)} aria-label="العودة لاختيار المجموعة" style={iconBtn}>
                <ChevronLeft size={19} color={HQ.MUTED} aria-hidden style={{ transform: 'scaleX(-1)' }} />
              </button>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: HQ.INK, margin: '0 0 4px' }}>سجلات {selectedGroup.name}</h1>
                <p className="text-sm" style={{ color: HQ.MUTED, margin: 0 }}>
                  {activeReviewType === 'daily_records'
                    ? (pendingCount > 0 ? `${pendingCount} سجل بانتظار المراجعة` : 'لا توجد سجلات معلقة')
                    : activeReviewType === 'recitations'
                    ? 'مراجعة وتقييم التسجيلات الصوتية المرسلة من الطلاب'
                    : 'تخصيص ومتابعة الورد اليومي الفردي لكل طالب وفق مستواه وسرعته'}
                </p>
              </div>
            </div>

            {/* Toggle between Daily Records, Individual Tasks, and Recitations */}
            <div className="hq-tabs" role="tablist" aria-label="نوع المراجعة"
              style={{ display: 'flex', width: '100%', marginBottom: 20, overflowX: 'auto' }}>
              {[
                { key: 'daily_records', label: 'نشاطات الحفظ اليومية' },
                { key: 'individual_tasks', label: 'أوراد الطلاب الفردية' },
                { key: 'recitations', label: 'تسجيلات التلاوة الذاتية' },
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={activeReviewType === t.key}
                  onClick={() => setActiveReviewType(t.key)}
                  style={{ flex: '1 0 auto', whiteSpace: 'nowrap' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Status filter tabs */}
            {activeReviewType === 'daily_records' ? (
              <div className="flex gap-2 flex-wrap" role="group" aria-label="تصفية حسب الحالة">
                {[
                  { key: 'pending', label: 'معلقة', Icon: Clock, count: pendingCount },
                  { key: 'approved', label: 'موافق عليها', Icon: Check },
                  { key: 'needs_review', label: 'تحتاج مراجعة', Icon: AlertCircle },
                  { key: 'all', label: 'الكل', Icon: Filter },
                ].map(tab => (
                  <button key={tab.key} type="button" onClick={() => setStatusFilter(tab.key)}
                    aria-pressed={statusFilter === tab.key}
                    className="flex items-center gap-1.5 px-4 text-sm font-bold"
                    style={{
                      minHeight: 44, borderRadius: 12, cursor: 'pointer',
                      border: `1px solid ${statusFilter === tab.key ? HQ.MENTOR : HQ.LINE}`,
                      background: statusFilter === tab.key ? HQ.MENTOR : HQ.SURFACE,
                      color: statusFilter === tab.key ? '#fff' : HQ.MUTED,
                    }}>
                    <tab.Icon size={15} aria-hidden />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span style={{
                        fontSize: '0.8125rem', padding: '2px 10px', borderRadius: 9999, fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums',
                        background: statusFilter === tab.key ? '#fff' : '#E2EFE7', color: '#0F5940',
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : activeReviewType === 'recitations' ? (
              <div className="flex gap-2 flex-wrap" role="group" aria-label="تصفية التسجيلات">
                {[
                  { key: 'pending', label: 'بانتظار التقييم', Icon: Clock },
                  { key: 'reviewed', label: 'تم تقييمها', Icon: Check },
                  { key: 'all', label: 'الكل', Icon: Filter },
                ].map(tab => (
                  <button key={tab.key} type="button" onClick={() => setRecitationStatusFilter(tab.key)}
                    aria-pressed={recitationStatusFilter === tab.key}
                    className="flex items-center gap-1.5 px-4 text-sm font-bold"
                    style={{
                      minHeight: 44, borderRadius: 12, cursor: 'pointer',
                      border: `1px solid ${recitationStatusFilter === tab.key ? HQ.MENTOR : HQ.LINE}`,
                      background: recitationStatusFilter === tab.key ? HQ.MENTOR : HQ.SURFACE,
                      color: recitationStatusFilter === tab.key ? '#fff' : HQ.MUTED,
                    }}>
                    <tab.Icon size={15} aria-hidden />
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap p-3"
                style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12 }}>
                <p className="text-sm" style={{ color: HQ.INK, margin: 0 }}>
                  هنا يمكنك تحديد وتخصيص الورد اليومي الفردي لكل طالب دون التقيد بورد موحد للمجموعة
                </p>
                <button
                  type="button"
                  onClick={() => fetchGroupDailyTasks(selectedGroup._id)}
                  className="flex items-center gap-1 text-xs font-bold"
                  style={{
                    minHeight: 44, padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                    background: HQ.SURFACE, color: HQ.MENTOR, border: `1px solid ${HQ.LINE}`,
                  }}
                >
                  <RefreshCw size={14} aria-hidden className={loadingDailyTasks ? 'animate-spin' : ''} />
                  <span>تحديث الأوراد</span>
                </button>
              </div>
            )}
          </motion.div>

          {/* Content Rendering */}
          {activeReviewType === 'daily_records' ? (
            isLoading ? (
              <div style={emptyBox} aria-label="جارٍ تحميل السجلات">
                <RefreshCw size={30} color={HQ.MENTOR} className="animate-spin" style={{ margin: '0 auto' }} aria-hidden />
              </div>
            ) : groupRecords.length === 0 ? (
              <div style={emptyBox}>
                <BookOpen size={52} color={HQ.LINE} style={{ margin: '0 auto 12px' }} aria-hidden />
                <p className="font-bold" style={{ color: HQ.MUTED, margin: 0 }}>لا توجد سجلات {statusFilter !== 'all' ? STATUS_TONE[statusFilter]?.label || '' : ''}</p>
              </div>
            ) : (
              <div>
                <div className="space-y-3">
                  {recordsPagination.paginatedItems.map((record) => {
                    const tone = STATUS_TONE[record.status] || STATUS_TONE.pending;
                    const isReviewing = reviewingId === record._id;

                    return (
                      <div key={record._id} style={panel}>
                        <div className="flex items-start gap-3">
                          <span aria-hidden className="avatar-circle"
                            style={{
                              width: 40, height: 40, fontSize: 14, flex: 'none',
                              backgroundColor: getAvatarColor(`${record.student?.firstName}${record.student?.lastName}`),
                            }}>
                            {getInitials(record.student?.firstName, record.student?.lastName)}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold" style={{ color: HQ.INK }}>{record.student?.firstName} {record.student?.lastName}</span>
                              <span style={{ color: HQ.LINE }} aria-hidden>—</span>
                              <span className="font-bold" style={{ color: HQ.INK }}>سورة {record.surahName}</span>
                              <span className="text-xs px-2 py-0.5" style={{ background: HQ.PAPER, color: HQ.MUTED, borderRadius: 8, fontVariantNumeric: 'tabular-nums' }}>
                                آية {record.fromVerse}-{record.toVerse} ({record.versesCount} آية)
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <span style={statusChip(tone)}>
                                <span aria-hidden style={{ width: 7, height: 7, borderRadius: 9999, background: tone.dot }} />
                                {tone.label}
                              </span>
                              <span className="text-xs" style={{ color: HQ.MUTED }}>{timeAgoAr(record.date)}</span>
                              <span className="text-xs px-2 py-0.5" style={{ background: HQ.PAPER, color: HQ.MUTED, borderRadius: 8 }}>
                                {ACTIVITY_LABELS[record.activityType] || 'حفظ'}
                              </span>
                            </div>

                            {record.studentNotes && (
                              <p className="text-xs mt-2 rounded-lg px-3 py-1.5" style={{ color: HQ.MUTED, background: HQ.PAPER, marginBottom: 0 }}>
                                ملاحظة الطالب: {record.studentNotes}
                              </p>
                            )}

                            {record.teacherNotes && (
                              <p className="text-xs mt-1.5 rounded-lg px-3 py-1.5" style={{ color: '#0F5940', background: '#E2EFE7', marginBottom: 0 }}>
                                ملاحظتي: {record.teacherNotes}
                              </p>
                            )}

                            {record.rating && (
                              <div className="flex items-center gap-0.5 mt-1.5" role="img" aria-label={`تقييم الطالب ${record.rating} من 5`}>
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} size={14} aria-hidden color={s <= record.rating ? '#D9A441' : HQ.LINE}
                                    fill={s <= record.rating ? '#D9A441' : 'none'} />
                                ))}
                              </div>
                            )}

                            {/* Inline review form */}
                            {isReviewing && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}
                                className="mt-4 pt-4" style={{ borderTop: `1px solid ${HQ.LINE}` }}>
                                <div className="flex gap-2 mb-3" role="group" aria-label="قرار المراجعة">
                                  <button type="button" onClick={() => setReviewForm({ ...reviewForm, status: 'approved' })}
                                    aria-pressed={reviewForm.status === 'approved'}
                                    className="text-xs font-bold px-3 flex items-center gap-1"
                                    style={{
                                      minHeight: 44, borderRadius: 12, cursor: 'pointer',
                                      border: `2px solid ${reviewForm.status === 'approved' ? HQ.MENTOR : HQ.LINE}`,
                                      background: reviewForm.status === 'approved' ? HQ.MENTOR : HQ.SURFACE,
                                      color: reviewForm.status === 'approved' ? '#fff' : HQ.MUTED,
                                    }}>
                                    <Check size={14} aria-hidden /> موافقة
                                  </button>
                                  <button type="button" onClick={() => setReviewForm({ ...reviewForm, status: 'needs_review' })}
                                    aria-pressed={reviewForm.status === 'needs_review'}
                                    className="text-xs font-bold px-3 flex items-center gap-1"
                                    style={{
                                      minHeight: 44, borderRadius: 12, cursor: 'pointer',
                                      border: `2px solid ${reviewForm.status === 'needs_review' ? '#C2410C' : HQ.LINE}`,
                                      background: reviewForm.status === 'needs_review' ? '#C2410C' : HQ.SURFACE,
                                      color: reviewForm.status === 'needs_review' ? '#fff' : HQ.MUTED,
                                    }}>
                                    <AlertCircle size={14} aria-hidden /> يحتاج مراجعة
                                  </button>
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-xs font-bold" style={{ color: HQ.MUTED }}>التقييم:</span>
                                  {renderStars(reviewForm.rating, (s) => setReviewForm({ ...reviewForm, rating: s }))}
                                </div>

                                <textarea value={reviewForm.teacherNotes}
                                  onChange={(e) => setReviewForm({ ...reviewForm, teacherNotes: e.target.value })}
                                  aria-label="ملاحظات للطالب"
                                  className="text-sm mb-3 focus:border-[#177B58] focus:outline-none" rows={2} maxLength={500}
                                  style={field}
                                  placeholder="ملاحظات للطالب (اختياري)..." />

                                <div className="flex gap-2">
                                  <button type="button" onClick={() => handleReview(record._id)} style={{ ...primaryBtn, flex: 1 }}>
                                    <Check size={15} aria-hidden /> تأكيد المراجعة
                                  </button>
                                  <button type="button" onClick={() => setReviewingId(null)} style={ghostBtn}>
                                    <X size={15} aria-hidden /> إلغاء
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </div>

                          {record.status === 'pending' && !isReviewing && (
                            <button type="button" onClick={() => { setReviewingId(record._id); setReviewForm({ status: 'approved', teacherNotes: '', rating: 5 }); }}
                              style={{ ...outlineBtn, minHeight: 44, fontSize: '0.8125rem', flex: 'none' }}>
                              <MessageSquare size={14} aria-hidden /> مراجعة
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={recordsPagination.currentPage}
                  totalPages={recordsPagination.totalPages}
                  totalItems={recordsPagination.totalItems}
                  pageSize={recordsPagination.pageSize}
                  onPageChange={recordsPagination.setCurrentPage}
                  onPageSizeChange={recordsPagination.setPageSize}
                  showPageSize={true}
                  pageSizeOptions={[5, 10, 20, 50]}
                  itemName="سجل"
                  className="mt-6"
                />
              </div>
            )
          ) : activeReviewType === 'recitations' ? (
            /* Student Self-Recordings Review rendering */
            loadingRecitations ? (
              <div style={emptyBox} aria-label="جارٍ تحميل التسجيلات">
                <RefreshCw size={30} color={HQ.MENTOR} className="animate-spin" style={{ margin: '0 auto' }} aria-hidden />
              </div>
            ) : recitations.length === 0 ? (
              <div style={emptyBox}>
                <Mic size={52} color={HQ.LINE} style={{ margin: '0 auto 12px' }} aria-hidden />
                <p className="font-bold" style={{ color: HQ.MUTED, margin: 0 }}>لا توجد تسجيلات تلاوة {recitationStatusFilter !== 'all' ? RECITATION_TONE[recitationStatusFilter]?.label || '' : ''}</p>
              </div>
            ) : (
              <div>
                <div className="space-y-3">
                  {recitationsPagination.paginatedItems.map((rec) => {
                    const tone = RECITATION_TONE[rec.status] || RECITATION_TONE.pending;
                    const isReviewing = reviewingRecitationId === rec._id;

                    return (
                      <div key={rec._id} style={panel}>
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          <span aria-hidden className="avatar-circle"
                            style={{
                              width: 40, height: 40, fontSize: 14, flex: 'none', margin: '0 auto',
                              backgroundColor: getAvatarColor(`${rec.student?.firstName}${rec.student?.lastName}`),
                            }}>
                            {getInitials(rec.student?.firstName, rec.student?.lastName)}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1 justify-center md:justify-start">
                              <span className="font-bold" style={{ color: HQ.INK }}>{rec.student?.firstName} {rec.student?.lastName}</span>
                              <span style={{ color: HQ.LINE }} aria-hidden>—</span>
                              <span className="font-bold" style={{ color: HQ.INK }}>سورة {rec.surahName}</span>
                              <span className="text-xs px-2 py-0.5" style={{ background: HQ.PAPER, color: HQ.MUTED, borderRadius: 8, fontVariantNumeric: 'tabular-nums' }}>
                                آية {rec.fromVerse}-{rec.toVerse} ({rec.toVerse - rec.fromVerse + 1} آية)
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap mb-3 justify-center md:justify-start">
                              <span style={statusChip(tone)}>
                                <span aria-hidden style={{ width: 7, height: 7, borderRadius: 9999, background: tone.dot }} />
                                {tone.label}
                              </span>
                              <span className="text-xs" style={{ color: HQ.MUTED }}>{timeAgoAr(rec.createdAt)}</span>
                            </div>

                            <div className="flex items-center gap-3 rounded-2xl p-3 mb-3" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                              <Volume2 size={15} color={HQ.MENTOR} aria-hidden className="flex-none" />
                              <audio src={rec.audioUrl} controls className="flex-1" style={{ height: 28 }} />
                            </div>

                            {rec.status === 'reviewed' && (
                              <div className="rounded-2xl p-3 space-y-1.5" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                                {rec.rating && (
                                  <div className="flex items-center gap-0.5" role="img" aria-label={`تقييم الطالب ${rec.rating} من 5`}>
                                    <span className="text-xs ml-1" style={{ color: HQ.MUTED }}>التقييم:</span>
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <Star key={s} size={14} aria-hidden color={s <= rec.rating ? '#D9A441' : HQ.LINE}
                                        fill={s <= rec.rating ? '#D9A441' : 'none'} />
                                    ))}
                                  </div>
                                )}
                                {rec.teacherNotes && (
                                  <p className="text-xs" style={{ color: HQ.INK, margin: 0 }}>
                                    <strong>ملاحظاتي:</strong> {rec.teacherNotes}
                                  </p>
                                )}
                                {rec.teacherAudioUrl && (
                                  <div className="flex items-center gap-2 pt-1" style={{ borderTop: `1px solid ${HQ.LINE}` }}>
                                    <span style={{ fontSize: '0.8125rem', color: HQ.MUTED, flex: 'none' }}>ردي الصوتي:</span>
                                    <audio src={rec.teacherAudioUrl} controls className="flex-1" style={{ height: 24 }} />
                                  </div>
                                )}
                              </div>
                            )}

                            {isReviewing && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}
                                className="mt-4 rounded-2xl p-4 space-y-4" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>

                                <div className="p-3 rounded-xl flex items-center justify-between flex-wrap gap-2"
                                  style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
                                  <div>
                                    <span className="text-xs font-bold block" style={{ color: HQ.INK }}>المقارنة بالتلاوة المرجعية</span>
                                    <span className="block mt-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>استمع لتلاوة الشيخ العفاسي للآيات المحددة</span>
                                  </div>
                                  <button type="button"
                                    onClick={() => playReferenceRecitation(rec)}
                                    className="px-3 text-xs font-bold flex items-center gap-1.5"
                                    style={{
                                      minHeight: 44, borderRadius: 12, cursor: 'pointer',
                                      border: `1px solid ${playingRefId === rec._id ? HQ.MENTOR : HQ.LINE}`,
                                      background: playingRefId === rec._id ? HQ.MENTOR : HQ.SURFACE,
                                      color: playingRefId === rec._id ? '#fff' : HQ.MENTOR,
                                    }}>
                                    {refLoadingId === rec._id ? <RefreshCw size={14} className="animate-spin" aria-hidden />
                                      : playingRefId === rec._id
                                      ? <><Pause size={14} aria-hidden /><span>إيقاف (آية {rec.fromVerse + refCurrentIdx})</span></>
                                      : <><Play size={14} aria-hidden /><span>تشغيل المرجع</span></>}
                                  </button>
                                </div>

                                <div className="p-3 rounded-xl" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
                                  <span className="text-xs font-bold block mb-2" style={{ color: HQ.INK }}>تسجيل رد صوتي أو توجيه</span>
                                  {!recordedFeedbackUrl && !isRecordingFeedback ? (
                                    <button type="button" onClick={startFeedbackRecording}
                                      className="px-4 text-xs font-bold flex items-center gap-1.5"
                                      style={{
                                        minHeight: 44, borderRadius: 12, cursor: 'pointer',
                                        background: HQ.SURFACE, color: '#C2410C', border: '1px solid #C2410C',
                                      }}>
                                      <Mic size={14} aria-hidden /> تسجيل ملاحظة شفهية
                                    </button>
                                  ) : isRecordingFeedback ? (
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-bold animate-pulse" style={{ color: '#C2410C', fontVariantNumeric: 'tabular-nums' }}>
                                        جاري التسجيل... ({feedbackDuration} ث)
                                      </span>
                                      <button type="button" onClick={stopFeedbackRecording}
                                        className="px-3 text-xs font-bold flex items-center gap-1"
                                        style={{ minHeight: 44, borderRadius: 12, cursor: 'pointer', background: HQ.INK, color: '#fff', border: 'none' }}>
                                        <Square size={13} aria-hidden /> إيقاف
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-3 p-2 rounded-lg" style={{ background: HQ.PAPER }}>
                                      <button type="button" onClick={togglePlayFeedback} aria-label={isPlayingFeedback ? 'إيقاف الاستماع' : 'استماع للتعليق'}
                                        style={{ ...iconBtn, background: '#E2EFE7', color: HQ.MENTOR }}>
                                        {isPlayingFeedback ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
                                      </button>
                                      <span style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>تم تسجيل التعليق الصوتي — جاهز للإرسال</span>
                                      <button type="button" onClick={() => { setRecordedFeedbackUrl(null); setRecordedFeedbackBlob(null); }}
                                        aria-label="إعادة التسجيل"
                                        style={{ ...iconBtn, background: HQ.SURFACE, color: '#C2410C', border: '1px solid #C2410C' }}>
                                        <Trash2 size={15} aria-hidden />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold" style={{ color: HQ.MUTED }}>تقييم الأداء:</span>
                                  {renderStars(recitationForm.rating, (s) => setRecitationForm({ ...recitationForm, rating: s }))}
                                </div>

                                <textarea value={recitationForm.teacherNotes}
                                  onChange={(e) => setRecitationForm({ ...recitationForm, teacherNotes: e.target.value })}
                                  aria-label="ملاحظات التجويد أو التوجيهات"
                                  className="text-sm focus:border-[#177B58] focus:outline-none" rows={2} maxLength={1000}
                                  style={field}
                                  placeholder="اكتب ملاحظات التجويد أو التوجيهات هنا..." />

                                <div className="flex gap-2">
                                  <button type="button" onClick={() => handleReviewRecitation(rec._id)} style={{ ...primaryBtn, flex: 1 }}>
                                    <Check size={15} aria-hidden /> حفظ وإرسال التقييم
                                  </button>
                                  <button type="button" onClick={() => { setReviewingRecitationId(null); setRecordedFeedbackUrl(null); setRecordedFeedbackBlob(null); }} style={ghostBtn}>
                                    <X size={15} aria-hidden /> إلغاء
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </div>

                          {rec.status === 'pending' && !isReviewing && (
                            <button type="button" onClick={() => { setReviewingRecitationId(rec._id); setRecitationForm({ rating: 5, teacherNotes: '' }); setRecordedFeedbackUrl(null); setRecordedFeedbackBlob(null); }}
                              style={{ ...outlineBtn, minHeight: 44, fontSize: '0.8125rem', flex: 'none', alignSelf: 'center' }}>
                              <MessageSquare size={14} aria-hidden /> تقييم
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={recitationsPagination.currentPage}
                  totalPages={recitationsPagination.totalPages}
                  totalItems={recitationsPagination.totalItems}
                  pageSize={recitationsPagination.pageSize}
                  onPageChange={recitationsPagination.setCurrentPage}
                  onPageSizeChange={recitationsPagination.setPageSize}
                  showPageSize={true}
                  pageSizeOptions={[5, 10, 20, 50]}
                  itemName="تلاوة"
                  className="mt-6"
                />
              </div>
            )
          ) : (
            /* Individual Student Tasks Tab */
            loadingDailyTasks ? (
              <div style={emptyBox} aria-label="جارٍ تحميل الأوراد">
                <RefreshCw size={30} color={HQ.MENTOR} className="animate-spin" style={{ margin: '0 auto 8px' }} aria-hidden />
                <p className="text-sm" style={{ color: HQ.MUTED, margin: 0 }}>جارٍ تحميل أوراد الطلاب الفردية...</p>
              </div>
            ) : groupDailyTasks.length === 0 ? (
              <div style={emptyBox}>
                <BookOpen size={52} color={HQ.LINE} style={{ margin: '0 auto 12px' }} aria-hidden />
                <p className="font-bold" style={{ color: HQ.MUTED, margin: '0 0 16px' }}>لا توجد أوراد مسجلة اليوم لطلاب هذه المجموعة</p>
                <button
                  type="button"
                  onClick={() => fetchGroupDailyTasks(selectedGroup._id)}
                  className="mt-4 px-4 text-xs font-bold inline-flex items-center gap-1.5"
                  style={{ minHeight: 44, borderRadius: 12, cursor: 'pointer', background: '#E2EFE7', color: '#0F5940', border: 'none' }}
                >
                  <RefreshCw size={14} aria-hidden />
                  <span>تحديث القائمة</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupDailyTasks.map((task) => {
                    const student = task.student;
                    if (!student) return null;
                    const taskTone = task.overallStatus === 'reviewed' ? TASK_TONE.reviewed
                      : task.overallStatus === 'completed' ? TASK_TONE.completed
                      : TASK_TONE.pending;

                    return (
                      <div
                        key={task._id || student._id}
                        className="flex flex-col justify-between gap-3"
                        style={{ ...panel }}
                      >
                        <div>
                          {/* Student info header */}
                          <div className="flex items-center justify-between gap-3 pb-3" style={{ borderBottom: `1px solid ${HQ.LINE}` }}>
                            <div className="flex items-center gap-3 min-w-0">
                              <span aria-hidden className="avatar-circle"
                                style={{
                                  width: 40, height: 40, fontSize: 14, flex: 'none',
                                  backgroundColor: getAvatarColor(`${student.firstName}${student.lastName}`),
                                }}>
                                {getInitials(student.firstName, student.lastName)}
                              </span>
                              <div className="min-w-0">
                                <h3 className="font-bold text-sm" style={{ color: HQ.INK, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {student.firstName} {student.lastName}
                                </h3>
                                <p className="text-xs truncate" style={{ color: HQ.MUTED, margin: 0 }}>{student.email}</p>
                              </div>
                            </div>

                            <span style={statusChip(taskTone)}>
                              {task.overallStatus === 'reviewed'
                                ? 'تم التقييم'
                                : task.overallStatus === 'completed'
                                ? 'أنجزه الطالب'
                                : 'قيد الحفظ'}
                            </span>
                          </div>

                          {/* 3 Pillars Summary */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-3">
                            <div className="p-2.5" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12 }}>
                              <span className="font-bold block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.INK }}>
                                الحفظ الجديد:
                              </span>
                              {task.newHifz?.surahName ? (
                                <div className="font-bold text-xs" style={{ color: HQ.INK }}>
                                  سورة {task.newHifz.surahName}
                                  <p className="font-normal" style={{ fontSize: '0.8125rem', color: HQ.MUTED, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                                    الآيات ({task.newHifz.fromVerse}-{task.newHifz.toVerse})
                                  </p>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>غير محدد</span>
                              )}
                            </div>

                            <div className="p-2.5" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12 }}>
                              <span className="font-bold block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.INK }}>
                                الماضي القريب:
                              </span>
                              {task.nearRevision?.surahName ? (
                                <div className="font-bold text-xs" style={{ color: HQ.INK }}>
                                  سورة {task.nearRevision.surahName}
                                  <p className="font-normal" style={{ fontSize: '0.8125rem', color: HQ.MUTED, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                                    الآيات ({task.nearRevision.fromVerse}-{task.nearRevision.toVerse})
                                  </p>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>مراجعة سابقة</span>
                              )}
                            </div>

                            <div className="p-2.5" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12 }}>
                              <span className="font-bold block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.INK }}>
                                الماضي البعيد:
                              </span>
                              <div className="font-bold text-xs" style={{ color: HQ.INK }}>
                                {task.cumulativeRevision?.surahName || 'الورد الدوري'}
                              </div>
                            </div>
                          </div>

                          {/* Additional exercise */}
                          {task.additionalExercise?.details && (
                            <div className="mt-2 text-xs p-2" style={{ background: HQ.PAPER, color: HQ.INK, borderRadius: 12, border: `1px solid ${HQ.LINE}` }}>
                              <span className="font-bold">تدريب:</span> {task.additionalExercise.details}
                            </div>
                          )}

                          {/* Evaluation info if reviewed */}
                          {task.overallStatus === 'reviewed' && (
                            <div className="mt-2 text-xs p-2 rounded-xl flex items-center justify-between"
                              style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                              <span style={{ color: HQ.MUTED }}>
                                درجة التسميع: <strong style={{ color: HQ.MENTOR, fontVariantNumeric: 'tabular-nums' }}>{task.newHifz?.score ?? 100}%</strong>
                              </span>
                              {task.teacherNotes && (
                                <span className="truncate" style={{ color: HQ.MUTED, maxWidth: 200 }} title={task.teacherNotes}>
                                  &quot;{task.teacherNotes}&quot;
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action button */}
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(student, task)}
                            className="px-3 text-xs font-bold flex items-center gap-1.5"
                            style={{
                              minHeight: 44, borderRadius: 12, cursor: 'pointer',
                              background: '#E2EFE7', color: '#0F5940', border: 'none',
                            }}
                          >
                            <Edit3 size={14} aria-hidden />
                            <span>تخصيص / تعديل الورد لهذا الطالب</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {/* Assign / Edit Student Wird Modal */}
          {editingStudentTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(42,36,56,0.55)' }}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full"
                role="dialog" aria-modal="true" aria-label={`تخصيص الورد اليومي للطالب ${editingStudentTask.student.firstName} ${editingStudentTask.student.lastName}`}
                dir="rtl"
                style={{ ...panel, maxWidth: 560, maxHeight: '90dvh', overflowY: 'auto' }}
              >
                <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: `1px solid ${HQ.LINE}` }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span aria-hidden style={{
                      width: 36, height: 36, borderRadius: 12, background: '#E2EFE7', color: HQ.MENTOR,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                    }}>
                      <Edit3 size={19} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold" style={{ color: HQ.INK, margin: 0 }}>
                        تخصيص الورد اليومي للطالب: {editingStudentTask.student.firstName} {editingStudentTask.student.lastName}
                      </h3>
                      <p className="text-xs" style={{ color: HQ.MUTED, margin: 0 }}>حدد مقدار الحفظ الجديد والمراجعة والتدريب لهذا الطالب</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingStudentTask(null)}
                    aria-label="إغلاق"
                    style={{ ...iconBtn, background: HQ.PAPER }}
                  >
                    <X size={15} aria-hidden />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Pillar 1: New Hifz */}
                  <div className="p-3 space-y-2" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12 }}>
                    <span className="font-bold block text-xs" style={{ color: HQ.INK }}>
                      1. الحفظ الجديد (السبق)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label htmlFor="as-surah" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>السورة</label>
                        <select
                          id="as-surah"
                          value={assignForm.surahNumber}
                          onChange={e => setAssignForm({ ...assignForm, surahNumber: e.target.value })}
                          className="text-sm focus:border-[#177B58] focus:outline-none" style={field}
                        >
                          {QURAN_SURAHS.map(s => (
                            <option key={s.number} value={s.number}>
                              {s.number}. {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="as-from" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>من آية</label>
                        <input
                          id="as-from"
                          type="number"
                          value={assignForm.fromVerse}
                          onChange={e => setAssignForm({ ...assignForm, fromVerse: e.target.value })}
                          min="1"
                          className="text-sm text-center focus:border-[#177B58] focus:outline-none"
                          style={{ ...field, fontVariantNumeric: 'tabular-nums' }}
                        />
                      </div>
                      <div>
                        <label htmlFor="as-to" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>إلى آية</label>
                        <input
                          id="as-to"
                          type="number"
                          value={assignForm.toVerse}
                          onChange={e => setAssignForm({ ...assignForm, toVerse: e.target.value })}
                          min="1"
                          className="text-sm text-center focus:border-[#177B58] focus:outline-none"
                          style={{ ...field, fontVariantNumeric: 'tabular-nums' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pillar 2: Near Revision */}
                  <div className="p-3 space-y-2" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12 }}>
                    <span className="font-bold block text-xs" style={{ color: HQ.INK }}>
                      2. الماضي القريب (الربط والسبقي)
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label htmlFor="as-near-surah" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>السورة</label>
                        <select
                          id="as-near-surah"
                          value={assignForm.nearSurahNumber}
                          onChange={e => setAssignForm({ ...assignForm, nearSurahNumber: e.target.value })}
                          className="text-sm focus:border-[#177B58] focus:outline-none" style={field}
                        >
                          {QURAN_SURAHS.map(s => (
                            <option key={s.number} value={s.number}>
                              {s.number}. {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="as-near-from" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>من آية</label>
                        <input
                          id="as-near-from"
                          type="number"
                          value={assignForm.nearFromVerse}
                          onChange={e => setAssignForm({ ...assignForm, nearFromVerse: e.target.value })}
                          min="1"
                          className="text-sm text-center focus:border-[#177B58] focus:outline-none"
                          style={{ ...field, fontVariantNumeric: 'tabular-nums' }}
                        />
                      </div>
                      <div>
                        <label htmlFor="as-near-to" className="block mb-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>إلى آية</label>
                        <input
                          id="as-near-to"
                          type="number"
                          value={assignForm.nearToVerse}
                          onChange={e => setAssignForm({ ...assignForm, nearToVerse: e.target.value })}
                          min="1"
                          className="text-sm text-center focus:border-[#177B58] focus:outline-none"
                          style={{ ...field, fontVariantNumeric: 'tabular-nums' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Exercise */}
                  <div>
                    <label htmlFor="as-extra" className="text-xs font-bold block mb-1" style={{ color: HQ.INK }}>
                      تدريب إضافي (تجويد أو استماع)
                    </label>
                    <input
                      id="as-extra"
                      type="text"
                      value={assignForm.additionalExercise}
                      onChange={e => setAssignForm({ ...assignForm, additionalExercise: e.target.value })}
                      placeholder="مثال: الاستماع لسورة مريم بصوت الشيخ الحصري"
                      className="text-sm focus:border-[#177B58] focus:outline-none" style={field}
                    />
                  </div>

                  {/* Weekly Plan Checkbox */}
                  <div className="p-3" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12 }}>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignForm.applyWeeklyPlan || false}
                        onChange={e => setAssignForm({ ...assignForm, applyWeeklyPlan: e.target.checked })}
                        style={{ width: 20, height: 20, accentColor: HQ.MENTOR, flex: 'none' }}
                      />
                      <span>
                        <span className="text-xs font-bold block" style={{ color: HQ.INK }}>
                          تعميم كخطة أسبوعية متتابعة (لـ 7 أيام قادمة)
                        </span>
                        <span className="block" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>
                          توزيع حفظ السورة تلقائياً بمعدل {Math.max(1, Number(assignForm.toVerse) - Number(assignForm.fromVerse) + 1)} آيات يومياً للأيام المقبلة
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* Teacher Notes */}
                  <div>
                    <label htmlFor="as-notes" className="text-xs font-bold block mb-1" style={{ color: HQ.INK }}>
                      توجيهات وملاحظات خاصة للطالب
                    </label>
                    <textarea
                      id="as-notes"
                      value={assignForm.teacherNotes}
                      onChange={e => setAssignForm({ ...assignForm, teacherNotes: e.target.value })}
                      placeholder="ملاحظات لتشجيع الطالب أو توجيهه..."
                      className="text-sm resize-none focus:border-[#177B58] focus:outline-none" style={{ ...field, minHeight: 64 }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setEditingStudentTask(null)}
                    style={{ ...ghostBtn, flex: 1 }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAssignedTask}
                    disabled={savingAssign}
                    style={{ ...primaryBtn, flex: 1, opacity: savingAssign ? 0.6 : 1 }}
                  >
                    <Save size={15} aria-hidden />
                    <span>{savingAssign ? 'جارٍ الحفظ...' : 'حفظ الورد الفردي'}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </MotionConfig>
    </PageLayout>
  );
}
