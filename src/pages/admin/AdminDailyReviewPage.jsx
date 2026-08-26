import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Check, Clock, AlertCircle, Star, Users, Filter,
  ChevronLeft, MessageSquare, RefreshCw, X, Shield, Mic, Square, Play, Pause, Volume2, Trash2
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useDailyRecordStore from '../../store/dailyRecordStore';
import { timeAgoAr, getInitials, getAvatarColor, getLevelLabel, getLevelColor } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  pending: { label: 'قيد المراجعة', color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  approved: { label: 'تمت الموافقة', color: 'bg-green-50 text-green-600', dot: 'bg-green-400' },
  needs_review: { label: 'يحتاج مراجعة', color: 'bg-red-50 text-red-600', dot: 'bg-red-400' },
};

const ACTIVITY_LABELS = { memorization: 'حفظ', review: 'مراجعة', tajweed: 'تجويد' };

const RECITATION_STATUS_MAP = {
  pending: { label: 'تلاوات معلقة', color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  reviewed: { label: 'تم تقييمها', color: 'bg-green-50 text-green-600', dot: 'bg-green-400' },
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
      toast.success(reviewForm.status === 'approved' ? 'تمت الموافقة ✅' : 'تم طلب المراجعة');
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


  // Group selection
  if (!selectedGroup) {
    return (
      <PageLayout>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="section-title flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" /> مراجعة سجلات الحفظ
          </h1>
          <p className="section-subtitle">اختر مجموعة لمراجعة سجلات الحفظ اليومية والتقييم</p>
        </motion.div>

        <div className="mb-5">
          <input type="text" placeholder="ابحث عن مجموعة..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="input-base max-w-md" />
        </div>

        {filteredGroups.length === 0 ? (
          <div className="empty-state"><Users className="empty-state-icon" /><p>لا توجد مجموعات</p></div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
            {filteredGroups.map(group => {
              const lc = getLevelColor(group.level);
              return (
                <motion.button key={group._id} whileHover={{ y: -3 }} onClick={() => setSelectedGroup(group)}
                  className="card-base p-6 text-right hover:shadow-md transition-all w-full">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: lc.bg, color: lc.text }}>
                      {getLevelLabel(group.level)}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {group.students?.length || 0}/{group.maxStudents}
                    </span>
                  </div>
                  <h3 className="font-black text-gray-900 mb-1">{group.name}</h3>
                  <p className="text-xs text-gray-400 mb-3">
                    المعلم: {group.teacher?.firstName ? `${group.teacher.firstName} ${group.teacher.lastName}` : 'غير معيّن'}
                  </p>
                  <div className="flex items-center gap-2 text-amber-500 text-sm font-semibold mt-2">
                    <BookOpen className="w-4 h-4" /> مراجعة السجلات
                    <ChevronLeft className="w-4 h-4 mr-auto" />
                  </div>
                </motion.button>
              );
            })}
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
                : 'مراجعة وتقييم التسجيلات الصوتية المرسلة من الطلاب'}
            </p>
          </div>
        </div>

        {/* Toggle between Daily Records and Recitations */}
        <div className="flex gap-4 border-b border-gray-200 pb-2.5 mb-5 flex-shrink-0">
          <button
            onClick={() => setActiveReviewType('daily_records')}
            className={`pb-1 text-sm font-black transition-all ${
              activeReviewType === 'daily_records'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            📋 نشاطات الحفظ اليومية
          </button>
          <button
            onClick={() => setActiveReviewType('recitations')}
            className={`pb-1 text-sm font-black transition-all ${
              activeReviewType === 'recitations'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            🎙️ تسجيلات التلاوة الذاتية
          </button>
        </div>

        {/* Status filter tabs */}
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
                    ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'pending', label: 'بانتظار التقييم', icon: Clock },
              { key: 'reviewed', label: 'تم تقييمها', icon: Check },
              { key: 'all', label: 'الكل', icon: Filter },
            ].map(tab => (
              <button key={tab.key} onClick={() => setRecitationStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  recitationStatusFilter === tab.key
                    ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Content Rendering */}
      {activeReviewType === 'daily_records' ? (
        isLoading ? (
          <div className="card-base p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-amber-300" />
          </div>
        ) : groupRecords.length === 0 ? (
          <div className="card-base p-12 text-center text-gray-400">
            <BookOpen className="w-14 h-14 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold">لا توجد سجلات {statusFilter !== 'all' ? STATUS_MAP[statusFilter]?.label || '' : ''}</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {groupRecords.map((record) => {
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
                        <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 rounded-lg px-3 py-1.5">👨‍🏫 {record.teacherNotes}</p>
                      )}

                      {record.rating && (
                        <div className="flex items-center gap-0.5 mt-1.5">
                          {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= record.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
                        </div>
                      )}

                      {/* Review form */}
                      {isReviewing && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex gap-2 mb-3">
                            <button onClick={() => setReviewForm({ ...reviewForm, status: 'approved' })}
                              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                                reviewForm.status === 'approved' ? 'bg-green-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'
                              }`}>
                              <Check className="w-4 h-4 inline ml-1" /> موافقة
                            </button>
                            <button onClick={() => setReviewForm({ ...reviewForm, status: 'needs_review' })}
                              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                                reviewForm.status === 'needs_review' ? 'bg-red-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'
                              }`}>
                              <AlertCircle className="w-4 h-4 inline ml-1" /> يحتاج مراجعة
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
                            <button onClick={() => handleReview(record._id)} className="btn-primary text-sm py-2 flex-1 shadow-sm"
                              style={{ backgroundColor: '#D97706' }}>
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
                        className="btn-outline text-xs py-2 px-3 flex-shrink-0" style={{ borderColor: '#D97706', color: '#D97706' }}>
                        <MessageSquare className="w-3.5 h-3.5" /> مراجعة
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        /* Recitations Review for Admin */
        loadingRecitations ? (
          <div className="card-base p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-amber-300" />
          </div>
        ) : recitations.length === 0 ? (
          <div className="card-base p-12 text-center text-gray-400">
            <Mic className="w-14 h-14 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold">لا توجد تسجيلات تلاوة {recitationStatusFilter !== 'all' ? RECITATION_STATUS_MAP[recitationStatusFilter]?.label || '' : ''}</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {recitations.map((rec) => {
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

                      <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start mb-3">
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
                            <p className="text-xs text-primary-700 leading-relaxed">👨‍🏫 <strong>ملاحظات المقيم:</strong> {rec.teacherNotes}</p>
                          )}
                          {rec.teacherAudioUrl && (
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50 mt-1">
                              <span className="text-[10px] text-gray-400 flex-shrink-0">🎙️ الرد الصوتي:</span>
                              <audio src={rec.teacherAudioUrl} controls className="flex-1 h-6" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recitation Review Form for Admin */}
                      {isReviewing && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-4">
                          
                          <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <span className="text-xs font-bold text-gray-700 block">🎧 المقارنة بالتلاوة المرجعية</span>
                              <span className="text-[10px] text-gray-400 block mt-0.5">استمع لتلاوة الشيخ العفاسي للآيات المحددة</span>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => playReferenceRecitation(rec)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                playingRefId === rec._id
                                  ? 'bg-slate-800 text-white border-slate-700'
                                  : 'bg-primary-50 text-primary-600 border-primary-100 hover:bg-primary-100'
                              }`}
                            >
                              {refLoadingId === rec._id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : playingRefId === rec._id ? (
                                <>
                                  <Pause className="w-3.5 h-3.5" />
                                  <span>إيقاف (آية {rec.fromVerse + refCurrentIdx})</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 mr-0.5" />
                                  <span>تشغيل المرجع</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-gray-100">
                            <span className="text-xs font-bold text-gray-700 block mb-2">🎙️ تسجيل رد صوتي أو توجيه</span>
                            
                            {!recordedFeedbackUrl && !isRecordingFeedback ? (
                              <button
                                type="button"
                                onClick={startFeedbackRecording}
                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-rose-100 shadow-sm"
                              >
                                <Mic className="w-3.5 h-3.5" /> تسجيل ملاحظة شفهية
                              </button>
                            ) : isRecordingFeedback ? (
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono font-bold text-red-500 animate-pulse">
                                  جاري التسجيل... ({feedbackDuration} ث)
                                </span>
                                <button
                                  type="button"
                                  onClick={stopFeedbackRecording}
                                  className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                                >
                                  <Square className="w-3.5 h-3.5" /> إيقاف
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3 bg-gray-50 p-2 rounded-lg">
                                <button
                                  type="button"
                                  onClick={togglePlayFeedback}
                                  className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                                >
                                  {isPlayingFeedback ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-0.5" />}
                                </button>
                                <span className="text-[10px] text-gray-500">تم تسجيل التعليق الصوتي جاهز للإرسال 🎙️</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecordedFeedbackUrl(null);
                                    setRecordedFeedbackBlob(null);
                                  }}
                                  className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors"
                                  title="إعادة التسجيل"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Rating selector */}
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

                          {/* Text Notes */}
                          <textarea value={recitationForm.teacherNotes}
                            onChange={(e) => setRecitationForm({ ...recitationForm, teacherNotes: e.target.value })}
                            className="input-base text-sm" rows={2} maxLength={1000}
                            placeholder="اكتب ملاحظات التجويد أو التوجيهات هنا..." />

                          <div className="flex gap-2">
                            <button onClick={() => handleReviewRecitation(rec._id)} className="btn-primary text-sm py-2 flex-1 shadow-sm"
                              style={{ backgroundColor: '#D97706' }}>
                              <Check className="w-4 h-4" /> حفظ وإرسال التقييم
                            </button>
                            <button onClick={() => {
                              setReviewingRecitationId(null);
                              setRecordedFeedbackUrl(null);
                              setRecordedFeedbackBlob(null);
                            }} className="btn-ghost text-sm py-2">
                              <X className="w-4 h-4" /> إلغاء
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Review button trigger */}
                    {rec.status === 'pending' && !isReviewing && (
                      <button onClick={() => {
                        setReviewingRecitationId(rec._id);
                        setRecitationForm({ rating: 5, teacherNotes: '' });
                        setRecordedFeedbackUrl(null);
                        setRecordedFeedbackBlob(null);
                      }}
                        className="btn-outline text-xs py-2 px-3 flex-shrink-0 self-center md:self-start"
                        style={{ borderColor: '#D97706', color: '#D97706' }}>
                        <MessageSquare className="w-3.5 h-3.5" /> تقييم
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </PageLayout>
  );
}
