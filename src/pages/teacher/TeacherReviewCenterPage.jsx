import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, CheckCircle, Users, ChevronDown, ChevronLeft, MessageSquare, Clock, Plus, X, Send, Star, Volume2, FileText, Download, Video, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import api from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDateAr, getInitials, getAvatarColor } from '../../utils/helpers';
import QURAN_SURAHS from '../../utils/quranData';

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
      toast.success('تم تسجيل المراجعة ✅');
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
      toast.success('✅ تم إضافة الواجب وإرساله للطلاب!');
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

  return (
    <PageLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="section-title">مركز التصحيح والمراجعة 📝</h1>
              <p className="section-subtitle">إدارة ومراجعة الواجبات، التلاوات الشفهية، وتدقيق التسجيلات في مكان واحد</p>
            </div>
            {activeTab === 'homework' && (
              <button onClick={() => setShowAddHomeworkModal(true)} className="btn-primary flex-shrink-0">
                <Plus className="w-4 h-4" /> إضافة واجب جديد
              </button>
            )}
            {activeTab === 'recordings' && (
              <button onClick={() => setShowAddRecordingModal(true)} className="btn-primary flex-shrink-0">
                <Plus className="w-4 h-4" /> إضافة تسجيل فيديو
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 mb-6 bg-white rounded-2xl p-1 shadow-sm overflow-x-auto">
            <button
              onClick={() => setActiveTab('homework')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'homework' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              تسليمات الواجبات ({sessions.length})
            </button>

            <button
              onClick={() => setActiveTab('oral_exams')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'oral_exams' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              الاختبارات الشفهية ({pendingExams.length})
              {pendingExams.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('recordings')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'recordings' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Video className="w-4 h-4" />
              تسجيلات الجلسات ({recordings.length})
            </button>
          </div>

          {/* ─── TAB 1: Homework ─── */}
          {activeTab === 'homework' && (
            isLoadingHomework ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : sessions.length === 0 ? (
              <div className="card-base p-14 text-center">
                <ClipboardList className="w-14 h-14 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">لا توجد جلسات بها واجبات حالياً</p>
                <button onClick={() => setShowAddHomeworkModal(true)} className="btn-primary mt-4 mx-auto">
                  <Plus className="w-4 h-4" /> إضافة واجب جديد
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const submittedCount = session.homeworkSubmissions?.length || 0;
                  const isExpanded = selectedSession === session._id;

                  return (
                    <div key={session._id} className="card-base overflow-hidden">
                      <button
                        onClick={() => viewSubmissions(session)}
                        className="w-full flex items-center gap-4 p-5 text-right hover:bg-gray-50 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          submittedCount > 0 ? 'bg-primary-50' : 'bg-gray-100'
                        }`}>
                          <ClipboardList className={`w-5 h-5 ${submittedCount > 0 ? 'text-primary-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="font-bold text-gray-900 text-sm">{session.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{session.groupName}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-primary-500 font-semibold flex items-center gap-1">
                              <Users className="w-3 h-3" /> {submittedCount} سلّموا
                            </span>
                            {session.homeworkDeadline && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatDateAr(session.homeworkDeadline)}
                              </span>
                            )}
                          </div>
                        </div>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          : <ChevronLeft className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        }
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                            className="overflow-hidden border-t border-gray-100"
                          >
                            <div className="p-5 space-y-4">
                              <div className="bg-amber-50 rounded-xl p-3">
                                <p className="text-xs font-bold text-amber-600 mb-1">نص الواجب</p>
                                <p className="text-sm text-gray-800">{session.homework}</p>
                              </div>
                              {session.quranHomework?.surahName && (
                                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex flex-col gap-1">
                                  <p className="text-xs font-bold text-emerald-600 mb-1">📖 تلاوة قرآنية مطلوبة:</p>
                                  <p className="text-sm text-gray-800">
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
                                      <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" /> تسليمات الطلاب ({submissions.submissions.length})
                                      </p>
                                      {submissions.submissions.map(sub => (
                                        <div key={sub._id} className={`p-3 rounded-xl border ${sub.isChecked ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                                          <div className="flex items-center gap-2 mb-2">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                              style={{ backgroundColor: getAvatarColor(`${sub.student?.firstName} ${sub.student?.lastName}`) }}>
                                              {getInitials(sub.student?.firstName, sub.student?.lastName)}
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900">
                                              {sub.student?.firstName} {sub.student?.lastName}
                                            </span>
                                            {sub.isChecked && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">تمت المراجعة ✓</span>}
                                            <span className="text-xs text-gray-400 mr-auto">{formatDateAr(sub.submittedAt)}</span>
                                          </div>

                                          {sub.notes && <p className="text-xs text-gray-600 bg-white rounded-lg p-2 mb-2">ملاحظة الطالب: {sub.notes}</p>}

                                          {sub.audioUrl && (
                                            <div className="my-2 p-2 bg-white rounded-xl border border-gray-100 flex flex-col gap-1.5">
                                              <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                                                <Volume2 className="w-3.5 h-3.5 text-primary-500" /> تسجيل صوتي مرفق:
                                              </span>
                                              <audio src={sub.audioUrl} controls className="w-full h-8" />
                                            </div>
                                          )}

                                          {sub.files && sub.files.length > 0 && (
                                            <div className="my-2 p-2 bg-white rounded-xl border border-gray-100 flex flex-col gap-1.5">
                                              <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                                                <FileText className="w-3.5 h-3.5 text-primary-500" /> الملفات المرفقة:
                                              </span>
                                              <div className="flex flex-wrap gap-1.5">
                                                {sub.files.map((file, fIdx) => (
                                                  <a key={fIdx} href={file.url} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs bg-gray-50 text-primary-600 px-2.5 py-1.5 rounded-lg border border-gray-200 flex items-center gap-1 hover:bg-gray-100 transition-colors">
                                                    <Download className="w-3 h-3 text-gray-400" /> {file.name}
                                                  </a>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          <div className="flex items-center gap-2 my-2.5 p-1">
                                            <span className="text-xs font-bold text-gray-600">التقييم:</span>
                                            <div className="flex items-center gap-1">
                                              {[1, 2, 3, 4, 5].map((star) => (
                                                <button key={star} type="button" disabled={sub.isChecked}
                                                  onClick={() => setRatings(p => ({ ...p, [sub._id]: star }))} className="hover:scale-110 transition-transform">
                                                  <Star className={`w-5 h-5 ${star <= (sub.isChecked ? sub.rating || 5 : ratings[sub._id] || 5) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                                                </button>
                                              ))}
                                            </div>
                                          </div>

                                          {!sub.isChecked && (
                                            <div className="flex gap-2 mt-2">
                                              <input value={feedback[sub._id] || ''} onChange={e => setFeedback(p => ({ ...p, [sub._id]: e.target.value }))}
                                                className="input-base text-xs py-1.5 flex-1" placeholder="أضف تعليقاً للمعلم (اختياري)..." />
                                              <button onClick={() => handleCheckHomework(session._id, sub._id)} disabled={checkingId === sub._id}
                                                className="btn-primary py-1.5 px-3 text-xs disabled:opacity-50">
                                                {checkingId === sub._id ? <LoadingSpinner size="sm" color="white" /> : 'تسجيل التقييم ✓'}
                                              </button>
                                            </div>
                                          )}
                                          {sub.teacherFeedback && (
                                            <p className="text-xs text-primary-600 mt-1 flex items-center gap-1 bg-white p-2 rounded-lg border border-gray-100">
                                              <MessageSquare className="w-3.5 h-3.5" /> {sub.teacherFeedback}
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
            )
          )}

          {/* ─── TAB 2: Oral Exam Reviews ─── */}
          {activeTab === 'oral_exams' && (
            isLoadingExams ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : pendingExams.length === 0 ? (
              <div className="card-base p-14 text-center">
                <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">لا توجد اختبارات شفهية بانتظار التصحيح حالياً</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingExams.map((result) => (
                  <div key={result._id} className="card-base overflow-hidden p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: getAvatarColor(`${result.student?.firstName}${result.student?.lastName}`) }}>
                          {getInitials(result.student?.firstName, result.student?.lastName)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{result.student?.firstName} {result.student?.lastName}</h3>
                          <p className="text-xs text-gray-400">التحريري: {result.writtenPercentage || 0}% · {formatDateAr(result.createdAt)}</p>
                        </div>
                      </div>
                      <button onClick={() => setReviewingExamId(reviewingExamId === result._id ? null : result._id)} className="btn-primary text-xs py-2">
                        <Star className="w-4 h-4" /> {reviewingExamId === result._id ? 'إخفاء' : 'تصحيح شفهي'}
                      </button>
                    </div>

                    {result.oralExamRecordings?.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                        <p className="text-xs font-semibold text-gray-500">التسجيلات الصوتية للاختبار:</p>
                        {result.oralExamRecordings.map((url, j) => (
                          <div key={j} className="flex items-center gap-3 bg-primary-50 rounded-xl p-2.5">
                            <Volume2 className="w-4 h-4 text-primary-400 flex-shrink-0" />
                            <audio src={url} controls className="flex-1 h-7" />
                          </div>
                        ))}
                      </div>
                    )}

                    {reviewingExamId === result._id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 p-4 rounded-2xl space-y-4">
                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-1 block">الدرجة الشفهية (من 100)</label>
                          <input type="number" min={0} max={100} value={examScores[result._id] || ''}
                            onChange={e => setExamScores(p => ({ ...p, [result._id]: e.target.value }))} className="input-base text-sm w-36" placeholder="0-100" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 mb-1 block">توجيهات وملاحظات للمعلم للطالب</label>
                          <textarea value={examNotes[result._id] || ''} onChange={e => setExamNotes(p => ({ ...p, [result._id]: e.target.value }))}
                            className="input-base text-xs resize-none h-20" placeholder="أدخل الملاحظات والتصويبات..." />
                        </div>

                        {/* Weak Point Flagging Box */}
                        <div className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-3">
                          <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                            📌 إضافة إلى بنك نقاط الضعف والمراجعة لدى الطالب (اختياري):
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-gray-600 font-semibold mb-1 block">السورة</label>
                              <select
                                value={flaggedVerseForms[result._id]?.surahNumber || ''}
                                onChange={e => setFlaggedVerseForms(p => ({ ...p, [result._id]: { ...p[result._id], surahNumber: e.target.value } }))}
                                className="input-base text-xs py-1.5">
                                <option value="">اختر السورة...</option>
                                {QURAN_SURAHS.map(s => (
                                  <option key={s.number} value={s.number}>{s.number}. {s.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-gray-600 font-semibold mb-1 block">رقم الآية</label>
                              <input
                                type="number"
                                min={1}
                                value={flaggedVerseForms[result._id]?.verseNumber || ''}
                                onChange={e => setFlaggedVerseForms(p => ({ ...p, [result._id]: { ...p[result._id], verseNumber: e.target.value } }))}
                                className="input-base text-xs py-1.5"
                                placeholder="رقم الآية"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-gray-600 font-semibold mb-1 block">نوع الخطأ</label>
                              <select
                                value={flaggedVerseForms[result._id]?.errorType || 'hifz'}
                                onChange={e => setFlaggedVerseForms(p => ({ ...p, [result._id]: { ...p[result._id], errorType: e.target.value } }))}
                                className="input-base text-xs py-1.5">
                                <option value="hifz">خطأ في الحفظ والنسيان</option>
                                <option value="tajweed">ملاحظة تجويدية</option>
                                <option value="tashkeel">خطأ في التشكيل والضبط</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-gray-600 font-semibold mb-1 block">تنبيه خاص بالآية</label>
                              <input
                                type="text"
                                value={flaggedVerseForms[result._id]?.notes || ''}
                                onChange={e => setFlaggedVerseForms(p => ({ ...p, [result._id]: { ...p[result._id], notes: e.target.value } }))}
                                className="input-base text-xs py-1.5"
                                placeholder="مثل: إظهار الإخفاء هنا"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => handleReviewExam(result._id)} disabled={submittingExam} className="btn-primary text-xs py-2 flex-1">
                            {submittingExam ? <LoadingSpinner size="sm" color="white" /> : 'حفظ التقييم الشفهي وإرسال التنبيهات ✓'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* ─── TAB 3: Recordings ─── */}
          {activeTab === 'recordings' && (
            isLoadingRecordings ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-right">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500">الجلسة</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500">التاريخ</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500">الرابط</th>
                      <th className="py-4 px-6 text-xs font-bold text-gray-500 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recordings.length === 0 ? (
                      <tr><td colSpan="4" className="py-8 text-center text-gray-400">لا توجد تسجيلات مرفوعة بعد</td></tr>
                    ) : recordings.map((rec) => (
                      <tr key={rec._id} className="hover:bg-gray-50/50">
                        <td className="py-4 px-6 font-bold text-gray-900">{rec.session?.title || 'جلسة مباشرة'}</td>
                        <td className="py-4 px-6 text-sm text-gray-600">{rec.session?.scheduledAt ? formatDateAr(rec.session.scheduledAt, 'dd MMMM yyyy') : '--'}</td>
                        <td className="py-4 px-6 text-sm">
                          <a href={rec.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 font-semibold hover:underline flex items-center gap-1">
                            <LinkIcon className="w-4 h-4" /> مشاهدة التسجيل
                          </a>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-xs bg-green-50 text-green-600 border border-green-100 px-2.5 py-1 rounded-lg font-bold flex items-center justify-center gap-1 w-fit mx-auto">
                            <ShieldCheck className="w-3.5 h-3.5" /> منشور للطلاب
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

      {/* ─── Modals ─── */}
      <AnimatePresence>
        {showAddHomeworkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-gray-900">إضافة واجب لجلسة</h2>
                <button onClick={() => setShowAddHomeworkModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">الجلسة *</label>
                  <select value={addHomeworkForm.sessionId} onChange={e => setAddHomeworkForm(p => ({ ...p, sessionId: e.target.value }))} className="input-base text-sm">
                    <option value="">— اختر جلسة —</option>
                    {allSessions.map(s => <option key={s._id} value={s._id}>{s.title} ({s.groupName})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">نص الواجب *</label>
                  <textarea value={addHomeworkForm.homework} onChange={e => setAddHomeworkForm(p => ({ ...p, homework: e.target.value }))} className="input-base text-xs resize-none h-24" placeholder="تفاصيل الواجب المطلوب..." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">تاريخ التسليم</label>
                  <input type="date" value={addHomeworkForm.deadline || ''} onChange={e => setAddHomeworkForm(p => ({ ...p, deadline: e.target.value }))} className="input-base text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowAddHomeworkModal(false)} className="btn-ghost flex-1">إلغاء</button>
                <button onClick={handleSaveHomework} disabled={savingHomework || !addHomeworkForm.sessionId || !addHomeworkForm.homework.trim()} className="btn-primary flex-1">
                  {savingHomework ? <LoadingSpinner size="sm" color="white" /> : 'حفظ وإرسال'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {showAddRecordingModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-gray-900">إضافة تسجيل جلسة</h2>
                <button onClick={() => setShowAddRecordingModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">الجلسة المنتهية *</label>
                  <select value={addRecordingForm.sessionId} onChange={e => setAddRecordingForm(p => ({ ...p, sessionId: e.target.value }))} className="input-base text-sm">
                    <option value="">— اختر الجلسة —</option>
                    {sessionsWithoutRecording.map(s => <option key={s._id} value={s._id}>{s.title} ({s.groupName})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">رابط التسجيل (Youtube, Drive, Zoom) *</label>
                  <input type="url" value={addRecordingForm.url} onChange={e => setAddRecordingForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." className="input-base text-sm text-left" dir="ltr" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setShowAddRecordingModal(false)} className="btn-ghost flex-1">إلغاء</button>
                <button onClick={handleSaveRecording} disabled={savingRecording || !addRecordingForm.sessionId || !addRecordingForm.url} className="btn-primary flex-1">
                  {savingRecording ? <LoadingSpinner size="sm" color="white" /> : 'نشر الفيديو'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
