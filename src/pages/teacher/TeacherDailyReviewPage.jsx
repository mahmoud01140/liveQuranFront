import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Check, Clock, AlertCircle, Star, Users, Filter,
  ChevronLeft, MessageSquare, RefreshCw, X, Mic, Square, Play, Pause, Volume2, Trash2,
  Edit3, Save, Sparkles, Award
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useDailyRecordStore from '../../store/dailyRecordStore';
import { timeAgoAr, getInitials, getAvatarColor, getLevelLabel, getLevelColor } from '../../utils/helpers';
import QURAN_SURAHS from '../../utils/quranData';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  pending: { label: 'قيد المراجعة', color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  approved: { label: 'تمت الموافقة', color: 'bg-green-50 text-green-600', dot: 'bg-green-400' },
  needs_review: { label: 'يحتاج مراجعة', color: 'bg-red-50 text-red-600', dot: 'bg-red-400' },
};

const RECITATION_STATUS_MAP = {
  pending: { label: 'تلاوات معلقة', color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  reviewed: { label: 'تم تقييمها', color: 'bg-green-50 text-green-600', dot: 'bg-green-400' },
};

const ACTIVITY_LABELS = { memorization: 'حفظ', review: 'مراجعة', tajweed: 'تجويد' };

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
      toast.success(reviewForm.status === 'approved' ? 'تمت الموافقة ✅' : 'تم طلب المراجعة');
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

      toast.success('تم حفظ وتخصيص الورد اليومي للطالب بنجاح ✨');
      setEditingStudentTask(null);
      fetchGroupDailyTasks(selectedGroup._id);
    } catch {
      toast.error('خطأ في حفظ الورد اليومي');
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
      toast.success('تم إرسال التقييم بنجاح وإشعار الطالب! ✅');
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


  // Group selection
  if (!selectedGroup) {
    return (
      <PageLayout>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="section-title flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary-400" /> مراجعة سجلات الحفظ
          </h1>
          <p className="section-subtitle">اختر مجموعة لمراجعة سجلات الحفظ اليومية</p>
        </motion.div>
        {myGroups.length === 0 ? (
          <div className="empty-state"><Users className="empty-state-icon" /><p>لا توجد مجموعات</p></div>
        ) : (
          <div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
              {groupsPagination.paginatedItems.map(group => {
                const lc = getLevelColor(group.level);
                return (
                  <motion.button key={group._id} whileHover={{ y: -3 }} onClick={() => setSelectedGroup(group)}
                    className="card-base p-6 text-right hover:shadow-md transition-all w-full">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: lc.bg, color: lc.text }}>
                        {getLevelLabel(group.level)}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {group.students?.length || 0}
                      </span>
                    </div>
                    <h3 className="font-black text-gray-900 mb-2">{group.name}</h3>
                    <div className="flex items-center gap-2 text-primary-400 text-sm font-semibold mt-2">
                      <BookOpen className="w-4 h-4" /> مراجعة السجلات
                      <ChevronLeft className="w-4 h-4 mr-auto" />
                    </div>
                  </motion.button>
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
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-400" style={{ transform: 'scaleX(-1)' }} />
          </button>
          <div>
            <h1 className="section-title">سجلات {selectedGroup.name}</h1>
            <p className="section-subtitle">
              {activeReviewType === 'daily_records'
                ? (pendingCount > 0 ? `${pendingCount} سجل بانتظار المراجعة` : 'لا توجد سجلات معلقة')
                : activeReviewType === 'recitations'
                ? 'مراجعة وتقييم التسجيلات الصوتية المرسلة من الطلاب'
                : 'تخصيص ومتابعة الورد اليومي الفردي لكل طالب وفق مستواه وسرعته'}
            </p>
          </div>
        </div>

        {/* Toggle between Daily Records, Individual Tasks, and Recitations */}
        <div className="flex gap-4 border-b border-gray-200 pb-2.5 mb-5 flex-shrink-0 flex-wrap">
          <button
            onClick={() => setActiveReviewType('daily_records')}
            className={`pb-1 text-sm font-black transition-all ${
              activeReviewType === 'daily_records'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            📋 نشاطات الحفظ اليومية
          </button>
          <button
            onClick={() => setActiveReviewType('individual_tasks')}
            className={`pb-1 text-sm font-black transition-all flex items-center gap-1.5 ${
              activeReviewType === 'individual_tasks'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📖 أوراد الطلاب الفردية (ورد اليوم)</span>
          </button>
          <button
            onClick={() => setActiveReviewType('recitations')}
            className={`pb-1 text-sm font-black transition-all ${
              activeReviewType === 'recitations'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            🎙️ تسجيلات التلاوة الذاتية
          </button>
        </div>

        {/* Status filter tabs (Daily Records vs Recitations vs Individual Tasks) */}
        {activeReviewType === 'daily_records' ? (
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'pending', label: 'معلقة', icon: Clock, count: pendingCount },
              { key: 'approved', label: 'موافق عليها', icon: Check },
              { key: 'needs_review', label: 'تحتاج مراجعة', icon: AlertCircle },
              { key: 'all', label: 'الكل', icon: Filter },
            ].map(tab => (
              <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  statusFilter === tab.key
                    ? 'bg-primary-400 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    statusFilter === tab.key ? 'bg-white text-primary-500' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : activeReviewType === 'recitations' ? (
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'pending', label: 'بانتظار التقييم', icon: Clock },
              { key: 'reviewed', label: 'تم تقييمها', icon: Check },
              { key: 'all', label: 'الكل', icon: Filter },
            ].map(tab => (
              <button key={tab.key} onClick={() => setRecitationStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  recitationStatusFilter === tab.key
                    ? 'bg-primary-400 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap bg-primary-50/50 p-3 rounded-2xl border border-primary-100">
            <div className="flex items-center gap-2 text-xs text-primary-800">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span>هنا يمكنك تحديد وتخصيص الورد اليومي الفردي لكل طالب دون التقيد بورد موحد للمجموعة</span>
            </div>
            <button
              onClick={() => fetchGroupDailyTasks(selectedGroup._id)}
              className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-white px-3 py-1.5 rounded-xl border border-primary-200 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDailyTasks ? 'animate-spin' : ''}`} />
              <span>تحديث الأوراد</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Content Rendering */}
      {activeReviewType === 'daily_records' ? (
        isLoading ? (
          <div className="card-base p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-300" />
          </div>
        ) : groupRecords.length === 0 ? (
          <div className="card-base p-12 text-center text-gray-400">
            <BookOpen className="w-14 h-14 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold">لا توجد سجلات {statusFilter !== 'all' ? STATUS_MAP[statusFilter]?.label || '' : ''}</p>
          </div>
        ) : (
          <div>
            <div className="space-y-3 stagger-children">
              {recordsPagination.paginatedItems.map((record) => {
                const si = STATUS_MAP[record.status];
                const isReviewing = reviewingId === record._id;

                return (
                  <motion.div key={record._id} whileHover={{ y: -1 }} className="card-base p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: getAvatarColor(`${record.student?.firstName}${record.student?.lastName}`) }}>
                        {getInitials(record.student?.firstName, record.student?.lastName)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-gray-900">{record.student?.firstName} {record.student?.lastName}</span>
                          <span className="text-gray-300">—</span>
                          <span className="font-semibold text-gray-700">سورة {record.surahName}</span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
                            آية {record.fromVerse}-{record.toVerse} ({record.versesCount} آية)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${si.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                            {si.label}
                          </span>
                          <span className="text-xs text-gray-400">{timeAgoAr(record.date)}</span>
                          <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-lg">
                            {ACTIVITY_LABELS[record.activityType] || 'حفظ'}
                          </span>
                        </div>

                        {record.studentNotes && (
                          <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-1.5">📝 {record.studentNotes}</p>
                        )}

                        {record.teacherNotes && (
                          <p className="text-xs text-primary-700 mt-1.5 bg-primary-50 rounded-lg px-3 py-1.5">👨‍🏫 {record.teacherNotes}</p>
                        )}

                        {record.rating && (
                          <div className="flex items-center gap-0.5 mt-1.5">
                            {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= record.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
                          </div>
                        )}

                        {/* Inline review form */}
                        {isReviewing && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex gap-2 mb-3">
                              <button onClick={() => setReviewForm({ ...reviewForm, status: 'approved' })}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                                  reviewForm.status === 'approved' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
                                }`}>
                                <Check className="w-3.5 h-3.5" /> موافقة
                              </button>
                              <button onClick={() => setReviewForm({ ...reviewForm, status: 'needs_review' })}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                                  reviewForm.status === 'needs_review' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
                                }`}>
                                <AlertCircle className="w-3.5 h-3.5" /> يحتاج مراجعة
                              </button>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs font-semibold text-gray-600">التقييم:</span>
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(s => (
                                  <button key={s} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
                                    <Star className={`w-5 h-5 transition-colors ${s <= reviewForm.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 hover:text-amber-200'}`} />
                                  </button>
                                ))}
                              </div>
                            </div>

                            <textarea value={reviewForm.teacherNotes}
                              onChange={(e) => setReviewForm({ ...reviewForm, teacherNotes: e.target.value })}
                              className="input-base text-sm mb-3" rows={2} maxLength={500}
                              placeholder="ملاحظات للطالب (اختياري)..." />

                            <div className="flex gap-2">
                              <button onClick={() => handleReview(record._id)} className="btn-primary text-sm py-2 flex-1">
                                <Check className="w-4 h-4" /> تأكيد المراجعة
                              </button>
                              <button onClick={() => setReviewingId(null)} className="btn-ghost text-sm py-2">
                                <X className="w-4 h-4" /> إلغاء
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {record.status === 'pending' && !isReviewing && (
                        <button onClick={() => { setReviewingId(record._id); setReviewForm({ status: 'approved', teacherNotes: '', rating: 5 }); }}
                          className="btn-outline text-xs py-2 px-3 flex-shrink-0">
                          <MessageSquare className="w-3.5 h-3.5" /> مراجعة
                        </button>
                      )}
                    </div>
                  </motion.div>
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
          <div className="card-base p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-300" />
          </div>
        ) : recitations.length === 0 ? (
          <div className="card-base p-12 text-center text-gray-400">
            <Mic className="w-14 h-14 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold">لا توجد تسجيلات تلاوة {recitationStatusFilter !== 'all' ? RECITATION_STATUS_MAP[recitationStatusFilter]?.label || '' : ''}</p>
          </div>
        ) : (
          <div>
            <div className="space-y-3 stagger-children">
              {recitationsPagination.paginatedItems.map((rec) => {
                const rsi = RECITATION_STATUS_MAP[rec.status] || { label: rec.status, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
                const isReviewing = reviewingRecitationId === rec._id;

                return (
                  <motion.div key={rec._id} whileHover={{ y: -1 }} className="card-base p-5">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mx-auto md:mx-0"
                        style={{ backgroundColor: getAvatarColor(`${rec.student?.firstName}${rec.student?.lastName}`) }}>
                        {getInitials(rec.student?.firstName, rec.student?.lastName)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1 justify-center md:justify-start">
                          <span className="font-bold text-gray-900">{rec.student?.firstName} {rec.student?.lastName}</span>
                          <span className="text-gray-300">—</span>
                          <span className="font-semibold text-gray-700">سورة {rec.surahName}</span>
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
                            آية {rec.fromVerse}-{rec.toVerse} ({rec.toVerse - rec.fromVerse + 1} آية)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mb-3 justify-center md:justify-start">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${rsi.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${rsi.dot}`} />
                            {rsi.label}
                          </span>
                          <span className="text-xs text-gray-400">{timeAgoAr(rec.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-3 bg-primary-50 border border-primary-100 rounded-2xl p-3 mb-3">
                          <Volume2 className="w-4 h-4 text-primary-400 flex-shrink-0" />
                          <audio src={rec.audioUrl} controls className="flex-1 h-7" />
                        </div>

                        {rec.status === 'reviewed' && (
                          <div className="bg-slate-50 rounded-2xl p-3 border border-gray-100 space-y-1.5">
                            {rec.rating && (
                              <div className="flex items-center gap-0.5">
                                <span className="text-xs text-gray-400 ml-1">التقييم:</span>
                                {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= rec.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
                              </div>
                            )}
                            {rec.teacherNotes && (
                              <p className="text-xs text-primary-700 leading-relaxed">👨‍🏫 <strong>ملاحظاتي:</strong> {rec.teacherNotes}</p>
                            )}
                            {rec.teacherAudioUrl && (
                              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50 mt-1">
                                <span className="text-[10px] text-gray-400 flex-shrink-0">🎙️ ردي الصوتي:</span>
                                <audio src={rec.teacherAudioUrl} controls className="flex-1 h-6" />
                              </div>
                            )}
                          </div>
                        )}

                        {isReviewing && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-4">

                            <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <span className="text-xs font-bold text-gray-700 block">🎧 المقارنة بالتلاوة المرجعية</span>
                                <span className="text-[10px] text-gray-400 block mt-0.5">استمع لتلاوة الشيخ العفاسي للآيات المحددة</span>
                              </div>
                              <button type="button"
                                onClick={() => playReferenceVerses(rec.surahNumber, rec.fromVerse, rec.toVerse, rec._id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                  playingRefId === rec._id ? 'bg-slate-800 text-white border-slate-700' : 'bg-primary-50 text-primary-600 border-primary-100 hover:bg-primary-100'
                                }`}>
                                {refLoadingId === rec._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  : playingRefId === rec._id ? <><Pause className="w-3.5 h-3.5" /><span>إيقاف (آية {rec.fromVerse + refCurrentIdx})</span></>
                                  : <><Play className="w-3.5 h-3.5 mr-0.5" /><span>تشغيل المرجع</span></>}
                              </button>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-gray-100">
                              <span className="text-xs font-bold text-gray-700 block mb-2">🎙️ تسجيل رد صوتي أو توجيه</span>
                              {!recordedFeedbackUrl && !isRecordingFeedback ? (
                                <button type="button" onClick={startFeedbackRecording}
                                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-rose-100 shadow-sm">
                                  <Mic className="w-3.5 h-3.5" /> تسجيل ملاحظة شفهية
                                </button>
                              ) : isRecordingFeedback ? (
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono font-bold text-red-500 animate-pulse">جاري التسجيل... ({feedbackDuration} ث)</span>
                                  <button type="button" onClick={stopFeedbackRecording}
                                    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                                    <Square className="w-3.5 h-3.5" /> إيقاف
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-3 bg-gray-50 p-2 rounded-lg">
                                  <button type="button" onClick={togglePlayFeedback}
                                    className="p-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors">
                                    {isPlayingFeedback ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-0.5" />}
                                  </button>
                                  <span className="text-[10px] text-gray-500">تم تسجيل التعليق الصوتي جاهز للإرسال 🎙️</span>
                                  <button type="button" onClick={() => { setRecordedFeedbackUrl(null); setRecordedFeedbackBlob(null); }}
                                    className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors" title="إعادة التسجيل">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-600">تقييم الأداء:</span>
                              <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(s => (
                                  <button key={s} type="button" onClick={() => setRecitationForm({ ...recitationForm, rating: s })}>
                                    <Star className={`w-5 h-5 transition-colors ${s <= recitationForm.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 hover:text-amber-200'}`} />
                                  </button>
                                ))}
                              </div>
                            </div>

                            <textarea value={recitationForm.teacherNotes}
                              onChange={(e) => setRecitationForm({ ...recitationForm, teacherNotes: e.target.value })}
                              className="input-base text-sm" rows={2} maxLength={1000}
                              placeholder="اكتب ملاحظات التجويد أو التوجيهات هنا..." />

                            <div className="flex gap-2">
                              <button onClick={() => handleReviewRecitation(rec._id)} className="btn-primary text-sm py-2 flex-1 shadow-sm">
                                <Check className="w-4 h-4" /> حفظ وإرسال التقييم
                              </button>
                              <button onClick={() => { setReviewingRecitationId(null); setRecordedFeedbackUrl(null); setRecordedFeedbackBlob(null); }} className="btn-ghost text-sm py-2">
                                <X className="w-4 h-4" /> إلغاء
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {rec.status === 'pending' && !isReviewing && (
                        <button onClick={() => { setReviewingRecitationId(rec._id); setRecitationForm({ rating: 5, teacherNotes: '' }); setRecordedFeedbackUrl(null); setRecordedFeedbackBlob(null); }}
                          className="btn-outline text-xs py-2 px-3 flex-shrink-0 self-center md:self-start">
                          <MessageSquare className="w-3.5 h-3.5" /> تقييم
                        </button>
                      )}
                    </div>
                  </motion.div>
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
        )) : (
          /* Individual Student Tasks Tab */
          loadingDailyTasks ? (
            <div className="card-base p-12 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-300" />
              <p className="text-sm text-gray-500">جارٍ تحميل أوراد الطلاب الفردية...</p>
            </div>
          ) : groupDailyTasks.length === 0 ? (
            <div className="card-base p-12 text-center text-gray-400">
              <BookOpen className="w-14 h-14 mx-auto mb-3 text-gray-200" />
              <p className="font-semibold">لا توجد أوراد مسجلة اليوم لطلاب هذه المجموعة</p>
              <button
                onClick={() => fetchGroupDailyTasks(selectedGroup._id)}
                className="mt-4 px-4 py-2 rounded-xl bg-primary-50 text-primary-600 text-xs font-bold hover:bg-primary-100 transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث القائمة</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupDailyTasks.map((task) => {
                  const student = task.student;
                  if (!student) return null;

                  return (
                    <motion.div
                      key={task._id || student._id}
                      whileHover={{ y: -2 }}
                      className="card-base p-5 border border-gray-100 shadow-sm flex flex-col justify-between gap-3"
                    >
                      <div>
                        {/* Student info header */}
                        <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                              style={{ backgroundColor: getAvatarColor(`${student.firstName}${student.lastName}`) }}
                            >
                              {getInitials(student.firstName, student.lastName)}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-sm">
                                {student.firstName} {student.lastName}
                              </h3>
                              <p className="text-xs text-gray-400">{student.email}</p>
                            </div>
                          </div>

                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                              task.overallStatus === 'reviewed'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : task.overallStatus === 'completed'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {task.overallStatus === 'reviewed'
                              ? 'تم التقييم ⭐'
                              : task.overallStatus === 'completed'
                              ? 'أنجزه الطالب ✅'
                              : 'قيد الحفظ ⏳'}
                          </span>
                        </div>

                        {/* 3 Pillars Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-3">
                          {/* New Hifz */}
                          <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-800 block mb-0.5">
                              📖 الحفظ الجديد:
                            </span>
                            {task.newHifz?.surahName ? (
                              <div className="font-bold text-gray-900 text-xs">
                                سورة {task.newHifz.surahName}
                                <p className="text-[11px] text-gray-500 font-normal">
                                  الآيات ({task.newHifz.fromVerse}-{task.newHifz.toVerse})
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">غير محدد</span>
                            )}
                          </div>

                          {/* Near Revision */}
                          <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100">
                            <span className="text-[10px] font-bold text-blue-800 block mb-0.5">
                              🔄 الماضي القريب:
                            </span>
                            {task.nearRevision?.surahName ? (
                              <div className="font-bold text-gray-900 text-xs">
                                سورة {task.nearRevision.surahName}
                                <p className="text-[11px] text-gray-500 font-normal">
                                  الآيات ({task.nearRevision.fromVerse}-{task.nearRevision.toVerse})
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">مراجعة سابقة</span>
                            )}
                          </div>

                          {/* Cumulative Revision */}
                          <div className="bg-purple-50/70 p-2.5 rounded-xl border border-purple-100">
                            <span className="text-[10px] font-bold text-purple-800 block mb-0.5">
                              🏛️ الماضي البعيد:
                            </span>
                            <div className="font-bold text-gray-900 text-xs">
                              {task.cumulativeRevision?.surahName || 'الورد الدوري'}
                            </div>
                          </div>
                        </div>

                        {/* Additional exercise */}
                        {task.additionalExercise?.details && (
                          <div className="mt-2 text-xs bg-amber-50 text-amber-900 p-2 rounded-xl border border-amber-200/60">
                            🎯 <span className="font-bold">تدريب:</span> {task.additionalExercise.details}
                          </div>
                        )}

                        {/* Evaluation info if reviewed */}
                        {task.overallStatus === 'reviewed' && (
                          <div className="mt-2 text-xs bg-gray-50 p-2 rounded-xl border border-gray-200 flex items-center justify-between">
                            <span className="text-gray-600">
                              درجة التسميع: <strong className="text-emerald-600 font-bold">{task.newHifz?.score ?? 100}%</strong>
                            </span>
                            {task.teacherNotes && (
                              <span className="text-gray-500 truncate max-w-[200px]" title={task.teacherNotes}>
                                "{task.teacherNotes}"
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action button */}
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => handleOpenAssignModal(student, task)}
                          className="px-3 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-primary-200/60"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تخصيص / تعديل الورد لهذا الطالب</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )
        )}

      {/* Assign / Edit Student Wird Modal */}
      {editingStudentTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl border border-gray-100 text-right"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    تخصيص الورد اليومي للطالب: {editingStudentTask.student.firstName} {editingStudentTask.student.lastName}
                  </h3>
                  <p className="text-xs text-gray-400">حدد مقدار الحفظ الجديد والمراجعة والتدريب لهذا الطالب</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStudentTask(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Pillar 1: New Hifz */}
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2">
                <span className="font-bold text-emerald-900 block text-xs">
                  📖 1. الحفظ الجديد (السبق)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">السورة</label>
                    <select
                      value={assignForm.surahNumber}
                      onChange={e => setAssignForm({ ...assignForm, surahNumber: e.target.value })}
                      className="input-base text-xs py-1.5"
                    >
                      {QURAN_SURAHS.map(s => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">من آية</label>
                    <input
                      type="number"
                      value={assignForm.fromVerse}
                      onChange={e => setAssignForm({ ...assignForm, fromVerse: e.target.value })}
                      min="1"
                      className="input-base text-xs py-1.5 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">إلى آية</label>
                    <input
                      type="number"
                      value={assignForm.toVerse}
                      onChange={e => setAssignForm({ ...assignForm, toVerse: e.target.value })}
                      min="1"
                      className="input-base text-xs py-1.5 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Pillar 2: Near Revision */}
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-2">
                <span className="font-bold text-blue-900 block text-xs">
                  🔄 2. الماضي القريب (الربط والسبقي)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">السورة</label>
                    <select
                      value={assignForm.nearSurahNumber}
                      onChange={e => setAssignForm({ ...assignForm, nearSurahNumber: e.target.value })}
                      className="input-base text-xs py-1.5"
                    >
                      {QURAN_SURAHS.map(s => (
                        <option key={s.number} value={s.number}>
                          {s.number}. {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">من آية</label>
                    <input
                      type="number"
                      value={assignForm.nearFromVerse}
                      onChange={e => setAssignForm({ ...assignForm, nearFromVerse: e.target.value })}
                      min="1"
                      className="input-base text-xs py-1.5 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">إلى آية</label>
                    <input
                      type="number"
                      value={assignForm.nearToVerse}
                      onChange={e => setAssignForm({ ...assignForm, nearToVerse: e.target.value })}
                      min="1"
                      className="input-base text-xs py-1.5 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Exercise */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  🎯 تدريب إضافي (تجويد أو استماع)
                </label>
                <input
                  type="text"
                  value={assignForm.additionalExercise}
                  onChange={e => setAssignForm({ ...assignForm, additionalExercise: e.target.value })}
                  placeholder="مثال: الاستماع لسورة مريم بصوت الشيخ الحصري"
                  className="input-base text-xs py-2"
                />
              </div>

              {/* Teacher Notes */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  توجيهات وملاحظات خاصة للطالب
                </label>
                <textarea
                  value={assignForm.teacherNotes}
                  onChange={e => setAssignForm({ ...assignForm, teacherNotes: e.target.value })}
                  placeholder="ملاحظات لتشجيع الطالب أو توجيهه..."
                  className="input-base text-xs py-2 resize-none h-16"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditingStudentTask(null)}
                className="btn-ghost flex-1 py-2.5 text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveAssignedTask}
                disabled={savingAssign}
                className="btn-primary flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingAssign ? 'جارٍ الحفظ...' : 'حفظ الورد الفردي'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </PageLayout>
  );
}

