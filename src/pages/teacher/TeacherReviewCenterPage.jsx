import { useState, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { ClipboardList, CheckCircle, Users, ChevronDown, ChevronLeft, MessageSquare, Clock, Plus, X, Star, Volume2, FileText, Download, Video, Link as LinkIcon, ShieldCheck, Check, Pin } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import api from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDateAr, getInitials, getAvatarColor } from '../../utils/helpers';
import QURAN_SURAHS from '../../utils/quranData';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

/* Review center — the teacher's operational desk. Same tabs, fetches,
   ratings, reviews and modals as before; only the visual layer changed. */

const field = {
  width: '100%', minHeight: 48, background: HQ.SURFACE, color: HQ.INK,
  border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 16px',
  fontSize: 14, fontFamily: 'inherit',
};

export default function TeacherReviewCenterPage() {
  const { user } = useAuthStore();
  const { groups, fetchAllGroups } = useGroupStore();
  const [activeTab, setActiveTab] = useState('homework'); // 'homework' | 'oral_exams' | 'recordings'

  // State for Homework
  const [sessions, setSessions] = useState([]);
  const [allSessions, setAllSessionsRaw] = useState([]);
  const [isLoadingHomework, setIsLoadingHomework] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [ratings, setRatings] = useState({});
  const [checkingId, setCheckingId] = useState(null);

  // Homework Add Modal
  const [showAddHomeworkModal, setShowAddHomeworkModal] = useState(false);
  const [addHomeworkForm, setAddHomeworkForm] = useState({ sessionId: '', homework: '', deadline: '', isQuranHomework: false, surahNumber: '', surahName: '', fromVerse: '', toVerse: '' });
  const [savingHomework, setSavingHomework] = useState(false);

  // State for Oral Exams
  const [pendingExams, setPendingExams] = useState([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [reviewingExamId, setReviewingExamId] = useState(null);
  const [examScores, setExamScores] = useState({});
  const [examNotes, setExamNotes] = useState({});
  const [submittingExam, setSubmittingExam] = useState(false);

  // State for Recordings
  const [recordings, setRecordings] = useState([]);
  const [sessionsWithoutRecording, setSessionsWithoutRecording] = useState([]);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(true);
  const [showAddRecordingModal, setShowAddRecordingModal] = useState(false);
  const [addRecordingForm, setAddRecordingForm] = useState({ sessionId: '', url: '' });
  const [savingRecording, setSavingRecording] = useState(false);

  const sessionsPagination = usePagination(sessions, 5);
  const pendingExamsPagination = usePagination(pendingExams, 5);
  const recordingsPagination = usePagination(recordings, 8);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAllGroups();
    } else {
      fetchAllGroups({ teacher: user?._id });
    }
  }, []);

  const myGroups = user?.role === 'admin'
    ? groups
    : groups.filter(g => g.teacher?._id === user?._id || g.teacher === user?._id);

  // 1. Fetch Homework & Recordings Data when groups load
  useEffect(() => {
    if (!myGroups.length) {
      setIsLoadingHomework(false);
      setIsLoadingRecordings(false);
      return;
    }

    const fetchHomeworkAndRecordings = async () => {
      try {
        const homeworkSessions = await Promise.all(
          myGroups.map(g =>
            api.get(`/live/group/${g._id}/homework`)
              .then(r => (r.data.sessions || []).map(s => ({ ...s, groupName: g.name, groupId: g._id })))
              .catch(() => [])
          )
        );

        const rawSessions = await Promise.all(
          myGroups.map(g =>
            api.get(`/live/group/${g._id}`)
              .then(r => (r.data.sessions || []).map(s => ({ ...s, groupName: g.name })))
              .catch(() => [])
          )
        );

        const allRecordingsPromises = myGroups.map(g =>
          api.get(`/recordings/group/${g._id}`).then(r => r.data.recordings || []).catch(() => [])
        );

        const allRecordings = (await Promise.all(allRecordingsPromises)).flat();
        const allSessionsList = rawSessions.flat();

        setSessions(homeworkSessions.flat().sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)));
        setAllSessionsRaw(allSessionsList.filter(s => !s.homework));

        const recordedSessionIds = new Set(allRecordings.map(r => r.session?._id));
        setRecordings(allRecordings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setSessionsWithoutRecording(allSessionsList.filter(s => s.status === 'ended' && !recordedSessionIds.has(s._id)));
      } catch (_) {
      } finally {
        setIsLoadingHomework(false);
        setIsLoadingRecordings(false);
      }
    };

    fetchHomeworkAndRecordings();
  }, [groups]);

  // 2. Fetch Pending Oral Exams
  useEffect(() => {
    const fetchPendingExams = async () => {
      try {
        const res = await api.get('/exams/results/pending-review');
        setPendingExams(res.data.results || []);
      } catch (_) {
      } finally {
        setIsLoadingExams(false);
      }
    };
    fetchPendingExams();
  }, []);

  // Handlers for Homework
  const viewSubmissions = async (session) => {
    if (selectedSession === session._id) { setSelectedSession(null); setSubmissions(null); return; }
    setSelectedSession(session._id);
    setLoadingSubmissions(true);
    try {
      const r = await api.get(`/live/${session._id}/homework/submissions`);
      setSubmissions(r.data);
    } catch { toast.error('خطأ في تحميل التسليمات'); }
    finally { setLoadingSubmissions(false); }
  };

  const handleCheckHomework = async (sessionId, submissionId) => {
    setCheckingId(submissionId);
    const ratingVal = ratings[submissionId] || 5;
    try {
      await api.put(`/live/${sessionId}/homework/submissions/${submissionId}/check`, {
        feedback: feedback[submissionId] || '',
        rating: ratingVal,
      });
      setSubmissions(prev => ({
        ...prev,
        submissions: prev.submissions.map(s =>
          s._id === submissionId
            ? { ...s, isChecked: true, teacherFeedback: feedback[submissionId] || '', rating: ratingVal }
            : s
        ),
      }));
      toast.success('تم تسجيل المراجعة');
    } catch { toast.error('خطأ'); }
    finally { setCheckingId(null); }
  };

  const handleSaveHomework = async () => {
    if (!addHomeworkForm.sessionId) { toast.error('اختر الجلسة أولاً'); return; }
    if (!addHomeworkForm.homework.trim()) { toast.error('اكتب نص الواجب'); return; }
    setSavingHomework(true);
    try {
      const payload = {
        homework: addHomeworkForm.homework,
        homeworkDeadline: addHomeworkForm.deadline || null,
        quranHomework: addHomeworkForm.isQuranHomework ? {
          surahNumber: parseInt(addHomeworkForm.surahNumber),
          surahName: addHomeworkForm.surahName,
          fromVerse: parseInt(addHomeworkForm.fromVerse),
          toVerse: parseInt(addHomeworkForm.toVerse),
        } : null,
      };

      const r = await api.put(`/live/${addHomeworkForm.sessionId}/homework`, payload);
      const session = allSessions.find(s => s._id === addHomeworkForm.sessionId);
      if (session) {
        setSessions(prev => [{ ...session, ...r.data.session, homeworkSubmissions: [] }, ...prev]);
        setAllSessionsRaw(prev => prev.filter(s => s._id !== addHomeworkForm.sessionId));
      }
      setShowAddHomeworkModal(false);
      setAddHomeworkForm({ sessionId: '', homework: '', deadline: '', isQuranHomework: false, surahNumber: '', surahName: '', fromVerse: '', toVerse: '' });
      toast.success('تم إضافة الواجب وإرساله للطلاب!');
    } catch { toast.error('خطأ في حفظ الواجب'); }
    finally { setSavingHomework(false); }
  };

  // Handlers for Oral Exams
  const [flaggedVerseForms, setFlaggedVerseForms] = useState({}); // { [resultId]: { surahNumber: 1, verseNumber: 1, errorType: 'hifz', notes: '' } }

  const handleReviewExam = async (resultId) => {
    const oralScore = examScores[resultId];
    if (oralScore === undefined) { toast.error('أدخل درجة التقييم الشفهي'); return; }
    setSubmittingExam(true);
    try {
      const flaggedItem = flaggedVerseForms[resultId];
      const flaggedVerses = (flaggedItem && flaggedItem.surahNumber && flaggedItem.verseNumber)
        ? [{
            surahNumber: parseInt(flaggedItem.surahNumber),
            surahName: QURAN_SURAHS.find(s => s.number === parseInt(flaggedItem.surahNumber))?.name || `سورة ${flaggedItem.surahNumber}`,
            verseNumber: parseInt(flaggedItem.verseNumber),
            errorType: flaggedItem.errorType || 'hifz',
            notes: flaggedItem.notes || '',
          }]
        : [];

      await api.put(`/exams/results/${resultId}/review`, {
        oralScore: parseInt(oralScore),
        teacherNotes: examNotes[resultId] || '',
        flaggedVerses,
      });
      toast.success('تم الحفظ، وإضافة نقاط الضعف لبنك مراجعة الطالب، وإرسال الإشعار!');
      setReviewingExamId(null);
      setPendingExams(prev => prev.filter(r => r._id !== resultId));
    } catch { toast.error('خطأ في التقييم'); }
    finally { setSubmittingExam(false); }
  };

  // Handlers for Recordings
  const handleSaveRecording = async () => {
    if (!addRecordingForm.sessionId) { toast.error('اختر الجلسة'); return; }
    if (!addRecordingForm.url) { toast.error('أدخل رابط التسجيل'); return; }

    setSavingRecording(true);
    try {
      const res = await api.post('/recordings', addRecordingForm);
      setRecordings([res.data.recording, ...recordings]);
      setSessionsWithoutRecording(prev => prev.filter(s => s._id !== addRecordingForm.sessionId));
      setShowAddRecordingModal(false);
      setAddRecordingForm({ sessionId: '', url: '' });
      toast.success('تمت إضافة التسجيل بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء حفظ التسجيل');
    } finally {
      setSavingRecording(false);
    }
  };

  const panel = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 20,
  };
  const emptyBox = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18,
    padding: 48, textAlign: 'center',
  };
  const iconBtn = {
    minWidth: 44, minHeight: 44, borderRadius: 12, border: 'none', background: 'transparent',
    color: HQ.MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
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

  const renderStars = (value, onPick, disabled) => (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="التقييم من 5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" disabled={disabled}
          role="radio" aria-checked={star === value} aria-label={`${star} من 5`}
          onClick={() => onPick && onPick(star)}
          style={{ minWidth: 40, minHeight: 40, border: 'none', background: 'none', cursor: disabled ? 'default' : 'pointer', padding: 8 }}>
          <Star size={19} aria-hidden color={star <= value ? '#D9A441' : HQ.LINE}
            fill={star <= value ? '#D9A441' : 'none'} />
        </button>
      ))}
    </div>
  );

  return (
    <MotionConfig reducedMotion="user">
      <PageLayout>
        <div className="halaqa" style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: HQ.INK, margin: '0 0 4px' }}>مركز التصحيح والمراجعة</h1>
              <p className="text-sm" style={{ color: HQ.MUTED, margin: 0 }}>إدارة ومراجعة الواجبات، التلاوات الشفهية، وتدقيق التسجيلات في مكان واحد</p>
            </div>
            {activeTab === 'homework' && (
              <button type="button" onClick={() => setShowAddHomeworkModal(true)} style={{ ...primaryBtn, flex: 'none' }}>
                <Plus size={16} aria-hidden /> إضافة واجب جديد
              </button>
            )}
            {activeTab === 'recordings' && (
              <button type="button" onClick={() => setShowAddRecordingModal(true)} style={{ ...primaryBtn, flex: 'none' }}>
                <Plus size={16} aria-hidden /> إضافة تسجيل فيديو
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="hq-tabs" role="tablist" aria-label="أقسام المراجعة"
            style={{ display: 'flex', width: '100%', marginBottom: 24, overflowX: 'auto' }}>
            {[
              { key: 'homework', label: `تسليمات الواجبات (${sessions.length})`, Icon: ClipboardList },
              { key: 'oral_exams', label: `الاختبارات الشفهية (${pendingExams.length})`, Icon: Volume2, alert: pendingExams.length > 0 },
              { key: 'recordings', label: `تسجيلات الجلسات (${recordings.length})`, Icon: Video },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                style={{ flex: '1 0 auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                <t.Icon size={16} aria-hidden />
                {t.label}
                {t.alert && (
                  <span aria-label={`${pendingExams.length} بانتظار التصحيح`} style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 9999,
                    background: '#E2EFE7', color: '#0F5940', fontSize: '0.8125rem', fontWeight: 800,
                  }}>
                    {pendingExams.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ─── TAB 1: Homework ─── */}
          {activeTab === 'homework' && (
            isLoadingHomework ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : sessions.length === 0 ? (
              <div style={emptyBox}>
                <ClipboardList size={52} color={HQ.LINE} style={{ margin: '0 auto 12px' }} aria-hidden />
                <p className="font-bold" style={{ color: HQ.MUTED, margin: '0 0 16px' }}>لا توجد جلسات بها واجبات حالياً</p>
                <button type="button" onClick={() => setShowAddHomeworkModal(true)} style={{ ...primaryBtn, margin: '0 auto' }}>
                  <Plus size={16} aria-hidden /> إضافة واجب جديد
                </button>
              </div>
            ) : (
              <div>
                <div className="space-y-3">
                  {sessionsPagination.paginatedItems.map((session) => {
                  const submittedCount = session.homeworkSubmissions?.length || 0;
                  const isExpanded = selectedSession === session._id;

                  return (
                    <div key={session._id} style={panel} className="overflow-hidden">
                      <button
                        type="button"
                        onClick={() => viewSubmissions(session)}
                        aria-expanded={isExpanded}
                        className="w-full flex items-center gap-4 text-right"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 60 }}>
                        <span aria-hidden style={{
                          width: 40, height: 40, borderRadius: 12, flex: 'none',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: submittedCount > 0 ? '#E2EFE7' : HQ.PAPER, color: submittedCount > 0 ? HQ.MENTOR : HQ.MUTED,
                        }}>
                          <ClipboardList size={19} />
                        </span>
                        <span className="flex-1 min-w-0 text-right">
                          <span className="font-bold text-sm" style={{ color: HQ.INK, display: 'block' }}>{session.title}</span>
                          <span className="text-xs mt-0.5 truncate" style={{ color: HQ.MUTED, display: 'block' }}>{session.groupName}</span>
                          <span className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-bold flex items-center gap-1" style={{ color: HQ.MENTOR }}>
                              <Users size={12} aria-hidden /> {submittedCount} سلّموا
                            </span>
                            {session.homeworkDeadline && (
                              <span className="text-xs flex items-center gap-1" style={{ color: HQ.MUTED }}>
                                <Clock size={12} aria-hidden /> {formatDateAr(session.homeworkDeadline)}
                              </span>
                            )}
                          </span>
                        </span>
                        {isExpanded
                          ? <ChevronDown size={17} color={HQ.MUTED} aria-hidden className="flex-none" />
                          : <ChevronLeft size={17} color={HQ.MUTED} aria-hidden className="flex-none" />
                        }
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 mt-4 space-y-4" style={{ borderTop: `1px solid ${HQ.LINE}` }}>
                              <div className="rounded-xl p-3" style={{ background: HQ.PAPER }}>
                                <p className="text-xs font-bold mb-1" style={{ color: HQ.MUTED }}>نص الواجب</p>
                                <p className="text-sm" style={{ color: HQ.INK, margin: 0 }}>{session.homework}</p>
                              </div>
                              {session.quranHomework?.surahName && (
                                <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: '#E2EFE7' }}>
                                  <p className="text-xs font-bold mb-1" style={{ color: '#0F5940' }}>تلاوة قرآنية مطلوبة:</p>
                                  <p className="text-sm" style={{ color: HQ.INK, margin: 0 }}>
                                    سورة {session.quranHomework.surahName} (الآيات {session.quranHomework.fromVerse} إلى {session.quranHomework.toVerse})
                                  </p>
                                </div>
                              )}

                              {loadingSubmissions ? (
                                <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
                              ) : submissions && (
                                <>
                                  {submissions.submissions?.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: HQ.INK }}>
                                        <CheckCircle size={15} color={HQ.MENTOR} aria-hidden /> تسليمات الطلاب ({submissions.submissions.length})
                                      </p>
                                      {submissions.submissions.map(sub => (
                                        <div key={sub._id} className="p-3 rounded-xl"
                                          style={{ background: sub.isChecked ? '#E2EFE7' : HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                                          <div className="flex items-center gap-2 mb-2">
                                            <span aria-hidden className="avatar-circle"
                                              style={{
                                                width: 28, height: 28, fontSize: 11, flex: 'none',
                                                backgroundColor: getAvatarColor(`${sub.student?.firstName} ${sub.student?.lastName}`),
                                              }}>
                                              {getInitials(sub.student?.firstName, sub.student?.lastName)}
                                            </span>
                                            <span className="text-sm font-bold" style={{ color: HQ.INK }}>
                                              {sub.student?.firstName} {sub.student?.lastName}
                                            </span>
                                            {sub.isChecked && (
                                              <span className="text-xs font-bold px-2 py-0.5 flex items-center gap-1"
                                                style={{ background: '#E2EFE7', color: '#0F5940', borderRadius: 9999 }}>
                                                <Check size={12} aria-hidden /> تمت المراجعة
                                              </span>
                                            )}
                                            <span className="text-xs mr-auto" style={{ color: HQ.MUTED }}>{formatDateAr(sub.submittedAt)}</span>
                                          </div>

                                          {sub.notes && <p className="text-xs rounded-lg p-2 mb-2" style={{ color: HQ.MUTED, background: HQ.SURFACE }}>ملاحظة الطالب: {sub.notes}</p>}

                                          {sub.audioUrl && (
                                            <div className="my-2 p-2 rounded-xl flex flex-col gap-1.5" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
                                              <span className="font-bold flex items-center gap-1" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>
                                                <Volume2 size={14} color={HQ.MENTOR} aria-hidden /> تسجيل صوتي مرفق:
                                              </span>
                                              <audio src={sub.audioUrl} controls className="w-full" style={{ height: 32 }} />
                                            </div>
                                          )}

                                          {sub.files && sub.files.length > 0 && (
                                            <div className="my-2 p-2 rounded-xl flex flex-col gap-1.5" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
                                              <span className="font-bold flex items-center gap-1" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>
                                                <FileText size={14} color={HQ.MENTOR} aria-hidden /> الملفات المرفقة:
                                              </span>
                                              <div className="flex flex-wrap gap-1.5">
                                                {sub.files.map((file, fIdx) => (
                                                  <a key={fIdx} href={file.url} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                                                    style={{ background: HQ.PAPER, color: HQ.MENTOR, border: `1px solid ${HQ.LINE}` }}>
                                                    <Download size={12} color={HQ.MUTED} aria-hidden /> {file.name}
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          <div className="flex items-center gap-2 my-2.5">
                                            <span className="text-xs font-bold" style={{ color: HQ.MUTED }}>التقييم:</span>
                                            {renderStars(
                                              sub.isChecked ? (sub.rating || 5) : (ratings[sub._id] || 5),
                                              sub.isChecked ? null : (v) => setRatings(p => ({ ...p, [sub._id]: v })),
                                              sub.isChecked,
                                            )}
                                          </div>

                                          {!sub.isChecked && (
                                            <div className="flex gap-2 mt-2">
                                              <input value={feedback[sub._id] || ''} onChange={e => setFeedback(p => ({ ...p, [sub._id]: e.target.value }))}
                                                aria-label="تعليق للطالب"
                                                className="flex-1 focus:border-[#177B58] focus:outline-none" style={{ ...field, minHeight: 48 }}
                                                placeholder="أضف تعليقاً للطالب (اختياري)..." />
                                              <button type="button" onClick={() => handleCheckHomework(session._id, sub._id)} disabled={checkingId === sub._id}
                                                style={{ ...primaryBtn, opacity: checkingId === sub._id ? 0.6 : 1 }}>
                                                {checkingId === sub._id ? <LoadingSpinner size="sm" color="white" /> : 'تسجيل التقييم'}
                                              </button>
                                            </div>
                                          )}
                                          {sub.teacherFeedback && (
                                            <p className="text-xs mt-1 flex items-center gap-1 p-2 rounded-lg"
                                              style={{ color: HQ.MENTOR, background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
                                              <MessageSquare size={13} aria-hidden /> {sub.teacherFeedback}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <Pagination
                currentPage={sessionsPagination.currentPage}
                totalPages={sessionsPagination.totalPages}
                totalItems={sessionsPagination.totalItems}
                pageSize={sessionsPagination.pageSize}
                onPageChange={sessionsPagination.setCurrentPage}
                onPageSizeChange={sessionsPagination.setPageSize}
                showPageSize={true}
                pageSizeOptions={[3, 5, 10, 20]}
                itemName="جلسة واجب"
                className="mt-6"
              />
            </div>
          )
        )}

          {/* ─── TAB 2: Oral Exam Reviews ─── */}
          {activeTab === 'oral_exams' && (
            isLoadingExams ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : pendingExams.length === 0 ? (
              <div style={emptyBox}>
                <CheckCircle size={52} color={HQ.MENTOR} style={{ margin: '0 auto 12px' }} aria-hidden />
                <p className="font-bold" style={{ color: HQ.MUTED, margin: 0 }}>لا توجد اختبارات شفهية بانتظار التصحيح حالياً</p>
              </div>
            ) : (
              <div>
                <div className="space-y-4">
                  {pendingExamsPagination.paginatedItems.map((result) => (
                  <div key={result._id} className="overflow-hidden p-5" style={panel}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span aria-hidden className="avatar-circle"
                          style={{
                            width: 40, height: 40, fontSize: 14, flex: 'none',
                            backgroundColor: getAvatarColor(`${result.student?.firstName}${result.student?.lastName}`),
                          }}>
                          {getInitials(result.student?.firstName, result.student?.lastName)}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold" style={{ color: HQ.INK, margin: 0 }}>{result.student?.firstName} {result.student?.lastName}</h3>
                          <p className="text-xs" style={{ color: HQ.MUTED, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                            التحريري: {result.writtenPercentage || 0}% · {formatDateAr(result.createdAt)}
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setReviewingExamId(reviewingExamId === result._id ? null : result._id)}
                        style={{ ...primaryBtn, minHeight: 44, fontSize: '0.8125rem', flex: 'none' }}>
                        <Star size={15} aria-hidden /> {reviewingExamId === result._id ? 'إخفاء' : 'تصحيح شفهي'}
                      </button>
                    </div>

                    {result.oralExamRecordings?.length > 0 && (
                      <div className="mt-4 pt-3 space-y-2" style={{ borderTop: `1px solid ${HQ.LINE}` }}>
                        <p className="text-xs font-bold" style={{ color: HQ.MUTED }}>التسجيلات الصوتية للاختبار:</p>
                        {result.oralExamRecordings.map((url, j) => (
                          <div key={j} className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: HQ.PAPER }}>
                            <Volume2 size={15} color={HQ.MENTOR} aria-hidden className="flex-none" />
                            <audio src={url} controls className="flex-1" style={{ height: 28 }} />
                          </div>
                        ))}
                      </div>
                    )}

                    {reviewingExamId === result._id && (
                      <div className="mt-4 pt-4 space-y-4 rounded-2xl p-4" style={{ borderTop: `1px solid ${HQ.LINE}`, background: HQ.PAPER }}>
                        <div>
                          <label htmlFor={`oral-score-${result._id}`} className="text-xs font-bold mb-1 block" style={{ color: HQ.INK }}>الدرجة الشفهية (من 100)</label>
                          <input id={`oral-score-${result._id}`} type="number" min={0} max={100} value={examScores[result._id] || ''}
                            onChange={e => setExamScores(p => ({ ...p, [result._id]: e.target.value }))}
                            className="text-sm w-36 focus:border-[#177B58] focus:outline-none"
                            style={{ ...field, fontVariantNumeric: 'tabular-nums' }} placeholder="0-100" />
                        </div>
                        <div>
                          <label htmlFor={`oral-notes-${result._id}`} className="text-xs font-bold mb-1 block" style={{ color: HQ.INK }}>توجيهات وملاحظات للطالب</label>
                          <textarea id={`oral-notes-${result._id}`} value={examNotes[result._id] || ''} onChange={e => setExamNotes(p => ({ ...p, [result._id]: e.target.value }))}
                            className="text-sm resize-none focus:border-[#177B58] focus:outline-none" style={{ ...field, minHeight: 80 }}
                            placeholder="أدخل الملاحظات والتصويبات..." />
                        </div>

                        {/* Weak Point Flagging Box */}
                        <div className="p-3.5 rounded-xl space-y-3" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
                          <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: HQ.INK, margin: 0 }}>
                            <Pin size={14} color={HQ.MENTOR} aria-hidden />
                            إضافة إلى بنك نقاط الضعف والمراجعة لدى الطالب (اختياري):
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label htmlFor={`flag-surah-${result._id}`} className="font-bold mb-1 block" style={{ color: HQ.MUTED }}>السورة</label>
                              <select
                                id={`flag-surah-${result._id}`}
                                value={flaggedVerseForms[result._id]?.surahNumber || ''}
                                onChange={e => setFlaggedVerseForms(p => ({ ...p, [result._id]: { ...p[result._id], surahNumber: e.target.value } }))}
                                className="text-sm focus:border-[#177B58] focus:outline-none" style={{ ...field, minHeight: 44 }}>
                                <option value="">اختر السورة...</option>
                                {QURAN_SURAHS.map(s => (
                                  <option key={s.number} value={s.number}>{s.number}. {s.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`flag-verse-${result._id}`} className="font-bold mb-1 block" style={{ color: HQ.MUTED }}>رقم الآية</label>
                              <input
                                id={`flag-verse-${result._id}`}
                                type="number"
                                min={1}
                                value={flaggedVerseForms[result._id]?.verseNumber || ''}
                                onChange={e => setFlaggedVerseForms(p => ({ ...p, [result._id]: { ...p[result._id], verseNumber: e.target.value } }))}
                                className="text-sm focus:border-[#177B58] focus:outline-none"
                                style={{ ...field, minHeight: 44, fontVariantNumeric: 'tabular-nums' }}
                                placeholder="رقم الآية"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label htmlFor={`flag-type-${result._id}`} className="font-bold mb-1 block" style={{ color: HQ.MUTED }}>نوع الخطأ</label>
                              <select
                                id={`flag-type-${result._id}`}
                                value={flaggedVerseForms[result._id]?.errorType || 'hifz'}
                                onChange={e => setFlaggedVerseForms(p => ({ ...p, [result._id]: { ...p[result._id], errorType: e.target.value } }))}
                                className="text-sm focus:border-[#177B58] focus:outline-none" style={{ ...field, minHeight: 44 }}>
                                <option value="hifz">خطأ في الحفظ والنسيان</option>
                                <option value="tajweed">ملاحظة تجويدية</option>
                                <option value="tashkeel">خطأ في التشكيل والضبط</option>
                              </select>
                            </div>
                            <div>
                              <label htmlFor={`flag-note-${result._id}`} className="font-bold mb-1 block" style={{ color: HQ.MUTED }}>تنبيه خاص بالآية</label>
                              <input
                                id={`flag-note-${result._id}`}
                                type="text"
                                value={flaggedVerseForms[result._id]?.notes || ''}
                                onChange={e => setFlaggedVerseForms(p => ({ ...p, [result._id]: { ...p[result._id], notes: e.target.value } }))}
                                className="text-sm focus:border-[#177B58] focus:outline-none" style={{ ...field, minHeight: 44 }}
                                placeholder="مثل: إظهار الإخفاء هنا"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleReviewExam(result._id)} disabled={submittingExam}
                            style={{ ...primaryBtn, flex: 1, opacity: submittingExam ? 0.6 : 1 }}>
                            {submittingExam ? <LoadingSpinner size="sm" color="white" /> : 'حفظ التقييم الشفهي وإرسال التنبيهات'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={pendingExamsPagination.currentPage}
                totalPages={pendingExamsPagination.totalPages}
                totalItems={pendingExamsPagination.totalItems}
                pageSize={pendingExamsPagination.pageSize}
                onPageChange={pendingExamsPagination.setCurrentPage}
                onPageSizeChange={pendingExamsPagination.setPageSize}
                showPageSize={true}
                pageSizeOptions={[3, 5, 10, 20]}
                itemName="اختبار شفهي"
                className="mt-6"
              />
            </div>
          )
        )}

          {/* ─── TAB 3: Recordings ─── */}
          {activeTab === 'recordings' && (
            isLoadingRecordings ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : (
              <div style={panel} className="overflow-hidden">
                {recordings.length === 0 ? (
                  <p className="py-8 text-center font-bold" style={{ color: HQ.MUTED, margin: 0 }}>لا توجد تسجيلات مرفوعة بعد</p>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {recordingsPagination.paginatedItems.map((rec, i) => (
                      <li key={rec._id} style={{ padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${HQ.LINE}` }}>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <p className="font-bold" style={{ color: HQ.INK, margin: 0 }}>{rec.session?.title || 'جلسة مباشرة'}</p>
                            <p className="text-sm" style={{ color: HQ.MUTED, margin: 0 }}>
                              {rec.session?.scheduledAt ? formatDateAr(rec.session.scheduledAt, 'dd MMMM yyyy') : '--'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-none">
                            <a href={rec.url} target="_blank" rel="noopener noreferrer"
                              className="font-bold flex items-center gap-1"
                              style={{ color: HQ.MENTOR, fontSize: 14, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
                              <LinkIcon size={15} aria-hidden /> مشاهدة التسجيل
                            </a>
                            <span className="text-xs font-bold px-2.5 py-1 flex items-center gap-1"
                              style={{ background: '#E2EFE7', color: '#0F5940', borderRadius: 8 }}>
                              <ShieldCheck size={13} aria-hidden /> منشور للطلاب
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="pt-4 mt-4" style={{ borderTop: `1px solid ${HQ.LINE}` }}>
                  <Pagination
                    currentPage={recordingsPagination.currentPage}
                    totalPages={recordingsPagination.totalPages}
                    totalItems={recordingsPagination.totalItems}
                    pageSize={recordingsPagination.pageSize}
                    onPageChange={recordingsPagination.setCurrentPage}
                    onPageSizeChange={recordingsPagination.setPageSize}
                    showPageSize={true}
                    pageSizeOptions={[4, 8, 16, 32]}
                    itemName="تسجيل"
                  />
                </div>
              </div>
            )
          )}

        {/* ─── Modals ─── */}
        <AnimatePresence>
          {showAddHomeworkModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(42,36,56,0.55)' }}>
              <div className="w-full" role="dialog" aria-modal="true" aria-label="إضافة واجب لجلسة"
                style={{ ...panel, maxWidth: 560, maxHeight: '90dvh', overflowY: 'auto' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-extrabold" style={{ fontSize: '1.25rem', color: HQ.INK, margin: 0 }}>إضافة واجب لجلسة</h2>
                  <button type="button" onClick={() => setShowAddHomeworkModal(false)} aria-label="إغلاق" style={iconBtn}>
                    <X size={19} aria-hidden />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="hw-session" className="text-xs font-bold mb-1 block" style={{ color: HQ.INK }}>الجلسة *</label>
                    <select id="hw-session" value={addHomeworkForm.sessionId} onChange={e => setAddHomeworkForm(p => ({ ...p, sessionId: e.target.value }))}
                      className="text-sm focus:border-[#177B58] focus:outline-none" style={field}>
                      <option value="">— اختر جلسة —</option>
                      {allSessions.map(s => <option key={s._id} value={s._id}>{s.title} ({s.groupName})</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="hw-text" className="text-xs font-bold mb-1 block" style={{ color: HQ.INK }}>نص الواجب *</label>
                    <textarea id="hw-text" value={addHomeworkForm.homework} onChange={e => setAddHomeworkForm(p => ({ ...p, homework: e.target.value }))}
                      className="text-sm resize-none focus:border-[#177B58] focus:outline-none" style={{ ...field, minHeight: 96 }}
                      placeholder="تفاصيل الواجب المطلوب..." />
                  </div>
                  <div>
                    <label htmlFor="hw-deadline" className="text-xs font-bold mb-1 block" style={{ color: HQ.INK }}>تاريخ التسليم</label>
                    <input id="hw-deadline" type="date" value={addHomeworkForm.deadline || ''} onChange={e => setAddHomeworkForm(p => ({ ...p, deadline: e.target.value }))}
                      className="text-sm focus:border-[#177B58] focus:outline-none" style={field} />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={() => setShowAddHomeworkModal(false)} style={{ ...ghostBtn, flex: 1 }}>إلغاء</button>
                  <button type="button" onClick={handleSaveHomework} disabled={savingHomework || !addHomeworkForm.sessionId || !addHomeworkForm.homework.trim()}
                    style={{ ...primaryBtn, flex: 1, opacity: (savingHomework || !addHomeworkForm.sessionId || !addHomeworkForm.homework.trim()) ? 0.55 : 1 }}>
                    {savingHomework ? <LoadingSpinner size="sm" color="white" /> : 'حفظ وإرسال'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {showAddRecordingModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(42,36,56,0.55)' }}>
              <div className="w-full" role="dialog" aria-modal="true" aria-label="إضافة تسجيل جلسة"
                style={{ ...panel, maxWidth: 560, maxHeight: '90dvh', overflowY: 'auto' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-extrabold" style={{ fontSize: '1.25rem', color: HQ.INK, margin: 0 }}>إضافة تسجيل جلسة</h2>
                  <button type="button" onClick={() => setShowAddRecordingModal(false)} aria-label="إغلاق" style={iconBtn}>
                    <X size={19} aria-hidden />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="rec-session" className="text-xs font-bold mb-1 block" style={{ color: HQ.INK }}>الجلسة المنتهية *</label>
                    <select id="rec-session" value={addRecordingForm.sessionId} onChange={e => setAddRecordingForm(p => ({ ...p, sessionId: e.target.value }))}
                      className="text-sm focus:border-[#177B58] focus:outline-none" style={field}>
                      <option value="">— اختر الجلسة —</option>
                      {sessionsWithoutRecording.map(s => <option key={s._id} value={s._id}>{s.title} ({s.groupName})</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rec-url" className="text-xs font-bold mb-1 block" style={{ color: HQ.INK }}>رابط التسجيل (Youtube, Drive, Zoom) *</label>
                    <input id="rec-url" type="url" value={addRecordingForm.url} onChange={e => setAddRecordingForm(p => ({ ...p, url: e.target.value }))}
                      placeholder="https://..." className="text-sm focus:border-[#177B58] focus:outline-none"
                      style={{ ...field, direction: 'ltr', textAlign: 'left' }} dir="ltr" />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button type="button" onClick={() => setShowAddRecordingModal(false)} style={{ ...ghostBtn, flex: 1 }}>إلغاء</button>
                  <button type="button" onClick={handleSaveRecording} disabled={savingRecording || !addRecordingForm.sessionId || !addRecordingForm.url}
                    style={{ ...primaryBtn, flex: 1, opacity: (savingRecording || !addRecordingForm.sessionId || !addRecordingForm.url) ? 0.55 : 1 }}>
                    {savingRecording ? <LoadingSpinner size="sm" color="white" /> : 'نشر الفيديو'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </PageLayout>
    </MotionConfig>
  );
}
