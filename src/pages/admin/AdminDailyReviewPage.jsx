import { useState, useEffect, useRef } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import {
  BookOpen, Check, Clock, AlertCircle, Star, Users, Filter,
  ChevronLeft, MessageSquare, RefreshCw, X, Shield, Mic, Square, Play, Pause, Volume2, Trash2, Search,
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useDailyRecordStore from '../../store/dailyRecordStore';
import { timeAgoAr, getInitials, getAvatarColor, getLevelLabel } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

/* Admin daily review — all groups' records and recitations.
   Same fetches, forms, audio and payloads as before; visual only. */

const STATUS_TONE = {
  pending: { label: 'قيد المراجعة', bg: '#FBF7EE', fg: '#B45309', border: '#B45309', dot: '#B45309' },
  approved: { label: 'تمت الموافقة', bg: '#E2EFE7', fg: '#0F5940', border: '#E2EFE7', dot: '#177B58' },
  needs_review: { label: 'يحتاج مراجعة', bg: '#FFFFFF', fg: '#C2410C', border: '#C2410C', dot: '#C2410C' },
};

const ACTIVITY_LABELS = { memorization: 'حفظ', review: 'مراجعة', tajweed: 'تجويد' };

const RECITATION_TONE = {
  pending: { label: 'تلاوات معلقة', bg: '#FBF7EE', fg: '#B45309', border: '#B45309', dot: '#B45309' },
  reviewed: { label: 'تم تقييمها', bg: '#E2EFE7', fg: '#0F5940', border: '#E2EFE7', dot: '#177B58' },
};

const LEVEL_TONE = {
  foundation: { wash: '#E2EFE7', fg: '#0F5940' },
  memorization: { wash: '#ECE9F4', fg: '#4A3F6B' },
  teacher_prep: { wash: '#ECE9F4', fg: '#4A3F6B' },
  senior: { wash: '#FBF7EE', fg: '#2A2438' },
};

const field = {
  width: '100%', minHeight: 48, background: HQ.SURFACE, color: HQ.INK,
  border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 16px',
  fontSize: 14, fontFamily: 'inherit',
};

export default function AdminDailyReviewPage() {
  const { user } = useAuthStore();
  const { groups, fetchAllGroups } = useGroupStore();
  const { groupRecords, pendingCount, isLoading, fetchGroupRecords, reviewRecord } = useDailyRecordStore();

  const [selectedGroup, setSelectedGroup] = useState(null);

  // Daily record state
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', teacherNotes: '', rating: 5 });
  const [searchQuery, setSearchQuery] = useState('');

  // Recitation review state
  const [activeReviewType, setActiveReviewType] = useState('daily_records'); // 'daily_records' | 'recitations'
  const [recitations, setRecitations] = useState([]);
  const [loadingRecitations, setLoadingRecitations] = useState(false);
  const [recitationStatusFilter, setRecitationStatusFilter] = useState('pending'); // 'pending' | 'reviewed' | 'all'
  const [reviewingRecitationId, setReviewingRecitationId] = useState(null);
  const [recitationForm, setRecitationForm] = useState({ rating: 5, teacherNotes: '' });

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

  // Admin sees ALL groups
  const filteredGroups = groups.filter(g =>
    !searchQuery || g.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupsPagination = usePagination(filteredGroups, 9);
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
      } else {
        fetchGroupRecitations(selectedGroup._id, recitationStatusFilter);
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

  // Feedback Audio Recording handlers
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
                <Shield size={22} color={HQ.MENTOR} aria-hidden /> مراجعة سجلات الحفظ
              </h1>
              <p className="text-sm" style={{ color: HQ.MUTED, margin: 0 }}>اختر مجموعة لمراجعة سجلات الحفظ اليومية والتقييم</p>
            </motion.div>

            <div className="mb-5">
              <div className="relative" style={{ maxWidth: 448 }}>
                <Search size={15} color={HQ.MUTED} aria-hidden className="absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="ابحث عن مجموعة..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} aria-label="بحث عن مجموعة"
                  className="pr-10 focus:border-[#177B58] focus:outline-none" style={field} />
              </div>
            </div>

            {filteredGroups.length === 0 ? (
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
                            <Users size={13} aria-hidden /> {group.students?.length || 0}/{group.maxStudents}
                          </span>
                        </div>
                        <h3 className="font-extrabold" style={{ color: HQ.INK, margin: '0 0 4px' }}>{group.name}</h3>
                        <p className="text-xs mb-3" style={{ color: HQ.MUTED, marginTop: 0 }}>
                          المعلم: {group.teacher?.firstName ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'غير معيّن'}
                        </p>
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
                  pageSizeOptions={[6, 9, 18, 36]}
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
                    : 'مراجعة وتقييم التسجيلات الصوتية المرسلة من الطلاب'}
                </p>
              </div>
            </div>

            {/* Toggle between Daily Records and Recitations */}
            <div className="hq-tabs" role="tablist" aria-label="نوع المراجعة"
              style={{ display: 'flex', width: '100%', marginBottom: 20, overflowX: 'auto' }}>
              {[
                { key: 'daily_records', label: 'نشاطات الحفظ اليومية' },
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
                    {tab.count > 0 && (
                      <span style={{
                        fontSize: '0.8125rem', padding: '2px 10px', borderRadius: 9999, fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums', minWidth: 20, textAlign: 'center',
                        background: statusFilter === tab.key ? '#fff' : '#E2EFE7', color: '#0F5940',
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
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
                                ملاحظة المعلم: {record.teacherNotes}
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

                            {/* Review form */}
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
          ) : (
            /* Recitations Review */
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

                            <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start mb-3">
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
                                    <strong>ملاحظات المقيم:</strong> {rec.teacherNotes}
                                  </p>
                                )}
                                {rec.teacherAudioUrl && (
                                  <div className="flex items-center gap-2 pt-1" style={{ borderTop: `1px solid ${HQ.LINE}` }}>
                                    <span style={{ fontSize: '0.8125rem', color: HQ.MUTED, flex: 'none' }}>الرد الصوتي:</span>
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
                                      <button type="button" onClick={togglePlayFeedback}
                                        aria-label={isPlayingFeedback ? 'إيقاف الاستماع' : 'استماع للتعليق'}
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
                                  <button type="button" onClick={() => {
                                    setReviewingRecitationId(null);
                                    setRecordedFeedbackUrl(null);
                                    setRecordedFeedbackBlob(null);
                                  }} style={ghostBtn}>
                                    <X size={15} aria-hidden /> إلغاء
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </div>

                          {rec.status === 'pending' && !isReviewing && (
                            <button type="button" onClick={() => {
                              setReviewingRecitationId(rec._id);
                              setRecitationForm({ rating: 5, teacherNotes: '' });
                              setRecordedFeedbackUrl(null);
                              setRecordedFeedbackBlob(null);
                            }}
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
          )}
        </div>
      </PageLayout>
    </MotionConfig>
  );
}
