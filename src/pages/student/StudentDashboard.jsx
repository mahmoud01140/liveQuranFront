import { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Video, Clock, Check, AlertTriangle, Lock, CreditCard,
  Play, ChevronLeft, ChevronDown, ChevronUp, RotateCcw, Sparkles,
  Mic, Square, Trash2, Send, CheckCircle, FileText, CheckCircle2,
  Volume2, Award, CalendarCheck, HelpCircle, Layers,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useLiveStore from '../../store/liveStore';
import useExamStore from '../../store/examStore';
import useDailyRecordStore from '../../store/dailyRecordStore';
import {
  getLevelLabel, formatDateAr, getSmartDateLabel,
  NO_GROUP_TITLE, NO_GROUP_HINT,
} from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../components/halaqa/halaqa.css';
import { HQ, HqBadge } from '../../components/halaqa/primitives';
import { HqActionLink } from '../../components/halaqa/JourneyNode';

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = Math.floor((new Date(targetDate) - new Date()) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);
  return timeLeft;
}

const PORTIONS = [
  { key: 'newHifz', label: 'الحفظ الجديد' },
  { key: 'nearRevision', label: 'الماضي القريب' },
  { key: 'cumulativeRevision', label: 'الماضي البعيد' },
];

function portionName(p) {
  if (!p) return '';
  if (p.surahName) return `سورة ${p.surahName}${p.fromVerse ? ` — الآيات ${p.fromVerse} إلى ${p.toVerse}` : ''}`;
  return '';
}

function examKind(exam) {
  if (exam.questions?.some(q => q.type === 'recitation')) return 'امتحان شفهي وتسميع';
  if (exam.questions?.some(q => q.type === 'written')) return 'امتحان تحريري';
  return 'تقييم شامل';
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all';

  const { user } = useAuthStore();
  const { group, studyPlan, fetchMyGroup, fetchStudyPlan } = useGroupStore();
  const { sessions, fetchSessions } = useLiveStore();
  const { availableExams, results, fetchAvailableExams, fetchMyResults } = useExamStore();
  const { records: weeklyRecords, fetchMyRecords } = useDailyRecordStore();

  const [dailyTask, setDailyTask] = useState(null);
  const [homeworkSessions, setHomeworkSessions] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Homework submission & audio recorder states
  const [expandedHomework, setExpandedHomework] = useState(null);
  const [homeworkNotes, setHomeworkNotes] = useState({});
  const [isSubmittingHw, setIsSubmittingHw] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef(null);

  // Quran verses preview for homework
  const [quranVerses, setQuranVerses] = useState({});
  const [loadingVerses, setLoadingVerses] = useState({});

  const groupId = user?.group?._id || user?.group;
  const myId = user?._id?.toString();

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (groupId) {
      fetchMyGroup(groupId);
      fetchStudyPlan(groupId);
      fetchSessions(groupId);
    }
  }, [user?.group]);

  const loadLocal = () => {
    setReady(false);
    setLoadFailed(false);
    let ok = 0;
    const settle = async (fn) => { try { await fn(); ok++; } catch (_) {} };
    Promise.all([
      settle(async () => {
        const res = await api.get('/daily-tasks/today');
        setDailyTask(res.data.task || null);
      }),
      settle(async () => {
        await fetchAvailableExams(groupId, myId);
        await fetchMyResults(myId);
      }),
      settle(async () => {
        await fetchMyRecords({ week: 'current' });
      }),
      settle(async () => {
        if (!groupId || !myId) { setHomeworkSessions([]); return; }
        const res = await api.get(`/live/group/${groupId}/homework`);
        setHomeworkSessions(res.data.sessions || []);
      }),
      settle(async () => {
        const res = await api.get('/payments/my-history');
        setSubscription(res.data?.subscription || null);
      }),
    ]).then(() => {
      if (ok === 0) setLoadFailed(true);
      setReady(true);
    });
  };

  useEffect(() => { loadLocal(); }, [groupId, myId]);

  const handleTabChange = (key) => {
    setSearchParams(key === 'all' ? {} : { tab: key });
  };

  const handleTogglePortion = async (portion) => {
    if (!dailyTask?._id) return;
    const currentStatus = dailyTask[portion]?.status;
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const res = await api.put(`/daily-tasks/${dailyTask._id}/portion`, { portion, status: newStatus });
      setDailyTask(res.data.task);
      if (newStatus === 'completed') toast.success('بارك الله فيك! تم إنجاز هذا الجزء من الورد');
    } catch {
      toast.error('حدث خطأ في تحديث حالة الورد');
    }
  };

  // Fetch Quran verses for homework recitation preview
  const fetchVerses = async (sessionId, surahNum, from, to) => {
    if (quranVerses[sessionId] || !surahNum) return;
    setLoadingVerses(p => ({ ...p, [sessionId]: true }));
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`);
      const data = await res.json();
      if (data.code === 200 && data.data?.ayahs) {
        const filtered = data.data.ayahs.filter(
          a => a.numberInSurah >= from && a.numberInSurah <= to
        );
        setQuranVerses(p => ({ ...p, [sessionId]: filtered }));
      }
    } catch (_) {}
    finally {
      setLoadingVerses(p => ({ ...p, [sessionId]: false }));
    }
  };

  const toggleExpandHomework = (sess) => {
    if (expandedHomework === sess._id) {
      setExpandedHomework(null);
    } else {
      setExpandedHomework(sess._id);
      if (sess.quranHomework?.surahNumber) {
        fetchVerses(
          sess._id,
          sess.quranHomework.surahNumber,
          sess.quranHomework.fromVerse,
          sess.quranHomework.toVerse
        );
      }
    }
  };

  const startHwRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch {
      toast.error('يرجى السماح بصلاحية الميكروفون لتسجيل التلاوة');
    }
  };

  const stopHwRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const deleteHwRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
  };

  const handleSubmitHomework = async (sessionId) => {
    if (!audioBlob && !homeworkNotes[sessionId]?.trim()) {
      toast.error('يرجى تسجيل التلاوة الصوتية أو كتابة ملاحظات الواجب قبل التسليم');
      return;
    }
    setIsSubmittingHw(true);
    try {
      const formData = new FormData();
      formData.append('notes', homeworkNotes[sessionId] || '');
      if (audioBlob) {
        formData.append('audio', audioBlob, 'recitation.webm');
      }
      await api.post(`/live/${sessionId}/homework/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('تم تسليم الواجب بنجاح! سيراجعه معلمك.');
      deleteHwRecording();
      setExpandedHomework(null);
      // Refresh homework list
      const res = await api.get(`/live/group/${groupId}/homework`);
      setHomeworkSessions(res.data.sessions || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ في تسليم الواجب');
    } finally {
      setIsSubmittingHw(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور';

  const liveSession = sessions.find(s => s.status === 'live');
  const upcomingSession = liveSession || sessions.find(s => s.status === 'scheduled');
  const timeLeft = useCountdown(upcomingSession?.status === 'scheduled' ? upcomingSession.scheduledAt : null);

  const pendingPortions = PORTIONS.filter(p => dailyTask?.[p.key] && dailyTask[p.key].status !== 'completed');

  // Pending homework sessions
  const pendingHwList = homeworkSessions.filter(s => {
    if (!s.homework && !s.quranHomework) return false;
    const subs = s.homeworkSubmissions || [];
    return !subs.some(sub => ((sub.student?._id || sub.student)?.toString()) === myId);
  });

  // Pending exams
  const pendingExams = (availableExams || []).filter(e => !e.isCompleted);

  // Total pending tasks count for badges
  const totalPendingCount = pendingPortions.length + pendingHwList.length + pendingExams.length;

  const getMySubmission = (sess) => {
    return sess.homeworkSubmissions?.find(
      sub => ((sub.student?._id || sub.student)?.toString()) === myId
    );
  };

  // Format seconds as mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  /* Ordered primary candidate */
  const candidates = [];
  if (!groupId) {
    candidates.push({ kind: 'quran', label: 'تصفح المصحف المكرر', hint: 'بانتظار تسكينك في مجموعتك', to: '/student/quran' });
  } else {
    if (liveSession) candidates.push({ kind: 'live', label: 'انضم للحصة المباشرة الآن', hint: liveSession.title, to: '/student/live', live: true });
    if (pendingExams[0]) candidates.push({ kind: 'exam', label: `ابدأ: ${pendingExams[0].title}`, hint: `${pendingExams[0].questions?.length || 0} أسئلة`, examId: pendingExams[0]._id });
    if (pendingHwList.length > 0) candidates.push({ kind: 'homework', label: `سلّم واجبك (${pendingHwList.length} معلق)`, hint: 'واجب تلاوة بانتظار تسليمك', tab: 'homework' });
    if (pendingPortions.length) candidates.push({ kind: 'wird', label: `أكمل وردك اليومي (${pendingPortions.length} متبقٍ)`, hint: portionName(dailyTask[pendingPortions[0].key]), tab: 'wird' });
    if (upcomingSession && upcomingSession.status === 'scheduled') candidates.push({ kind: 'upcoming', label: 'الحصة القادمة', hint: getSmartDateLabel(upcomingSession.scheduledAt), to: '/student/live' });
    candidates.push({ kind: 'curriculum', label: 'تابع منهجك', hint: 'دروسك ومواد مجموعتك', to: '/student/curriculum' });
  }
  const [primary, next] = candidates;

  const primaryAction = primary?.examId ? (
    <button type="button" onClick={() => navigate(`/student/exams/${primary.examId}/take`)} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 32px', fontSize: 16, width: '100%' }}>
      <Play size={18} /> {primary.label}
    </button>
  ) : primary?.tab ? (
    <button type="button" onClick={() => handleTabChange(primary.tab)} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 32px', fontSize: 16, width: '100%' }}>
      <BookOpen size={18} /> {primary.label}
    </button>
  ) : primary ? (
    <HqActionLink to={primary.to}>{primary.label}</HqActionLink>
  ) : null;

  const sheet = { background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 'clamp(16px, 3vw, 28px)' };
  const h2 = { margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: HQ.INK };

  const tabsConfig = [
    { key: 'all', label: 'الكل', count: totalPendingCount },
    { key: 'wird', label: 'الورد اليومي', count: pendingPortions.length },
    { key: 'homework', label: 'الواجبات الصوتية', count: pendingHwList.length },
    { key: 'exams', label: 'الاختبارات والتقييمات', count: pendingExams.length },
  ];

  return (
    <PageLayout>
      <div className="halaqa" style={{ ...sheet, maxWidth: 780, margin: '0 auto' }}>
        {!ready ? (
          <div aria-label="جارٍ تحميل مهامك اليومية">
            <div className="hq-skeleton" style={{ height: 24, width: '40%', marginBottom: 16 }} />
            <div className="hq-skeleton" style={{ height: 56, width: '100%', marginBottom: 16 }} />
            <div className="hq-skeleton" style={{ height: 48, width: '100%', marginBottom: 16 }} />
            <div className="hq-skeleton" style={{ height: 120, width: '100%', marginBottom: 12 }} />
            <div className="hq-skeleton" style={{ height: 120, width: '100%' }} />
          </div>
        ) : loadFailed ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }} role="alert">
            <h1 style={{ fontSize: 24, fontWeight: 800, color: HQ.INK, margin: '0 0 8px' }}>تعذّر تحميل المطلوب منك</h1>
            <p style={{ color: HQ.MUTED, fontSize: 15, margin: '0 0 20px' }}>تحقق من الاتصال بالإنترنت ثم حاول مرة أخرى.</p>
            <button type="button" onClick={loadLocal} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 24px', fontSize: 15 }}>
              <RotateCcw size={17} /> إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {/* Header Greeting */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, color: HQ.MUTED }}>{greeting}،</p>
                <h1 style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 900, color: HQ.INK }}>
                  {user?.firstName || 'طالبنا'}، المطلوب منك اليوم
                </h1>
              </div>
              <button
                type="button"
                onClick={loadLocal}
                title="تحديث المهام"
                className="hq-action"
                style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, color: HQ.INK, padding: '0 14px', fontSize: 13, flex: 'none' }}
              >
                <RotateCcw size={15} /> تحديث
              </button>
            </div>

            {/* Unplaced Student Reassurance Card */}
            {!groupId && (
              <div style={{ background: HQ.SURFACE, border: `1.5px solid ${HQ.LINE}`, borderRadius: 16, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ width: 42, height: 42, borderRadius: 12, background: '#E2EFE7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <Sparkles size={20} color={HQ.MENTOR} />
                  </span>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <strong style={{ fontSize: 16, color: HQ.INK }}>
                        مستواك المعتمد: {user?.assignedLevel ? getLevelLabel(user.assignedLevel) : 'بانتظار الاعتماد'}
                      </strong>
                      <span style={{ fontSize: 12, fontWeight: 700, background: '#E2EFE7', color: '#0F5940', padding: '2px 10px', borderRadius: 20 }}>
                        المرحلة 4: جارٍ تسكينك في حلقتك
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: HQ.MUTED, lineHeight: 1.6 }}>
                      فريق الإشراف يختار لك حالياً أفضل حلقة ومعلم تناسب مواعيدك. ستصلك رسالة فور إضافتك للجدول، وريثما يتم ذلك ننصحك بتصفح المصحف المكرر والبدء في تهيئة وردك.
                    </p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                      <Link to="/waiting-approval" style={{ fontSize: 13, fontWeight: 800, color: HQ.MENTOR, textDecoration: 'underline' }}>
                        متابعة مسار التسكين اللحظي ←
                      </Link>
                      <span style={{ color: HQ.LINE }}>|</span>
                      <Link to="/student/quran" style={{ fontSize: 13, fontWeight: 700, color: HQ.INK }}>
                        تصفح المصحف المكرر
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Primary Urgent Action (e.g. Live now or urgent exam/homework) */}
            {primary && (
              <section aria-label="خطوتي الآن" style={{ marginBottom: 20 }}>
                {primary.live && (
                  <p style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: HQ.MENTOR }}>
                    <span className="hq-live-dot" aria-hidden /> {primary.hint}
                  </p>
                )}
                {!primary.live && primary.hint && (
                  <p style={{ margin: '0 0 8px', fontSize: 14, color: HQ.MUTED }}>{primary.hint}</p>
                )}
                {primaryAction}
              </section>
            )}

            {/* Next step hint */}
            {next && (
              <section aria-label="التالي" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: HQ.MUTED, marginBottom: 20 }}>
                <span style={{ fontWeight: 800, color: HQ.INK, flex: 'none' }}>التالي:</span>
                <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{next.label}</span>
                {next.to && <Link to={next.to} aria-label={`انتقال: ${next.label}`} style={{ color: HQ.MENTOR, display: 'inline-flex', flex: 'none' }}><ChevronLeft size={18} /></Link>}
                {next.tab && <button type="button" onClick={() => handleTabChange(next.tab)} style={{ background: 'none', border: 'none', color: HQ.MENTOR, cursor: 'pointer', padding: 0 }}><ChevronLeft size={18} /></button>}
              </section>
            )}

            {/* ═══════════════════════════════════════════════════
                UNIFIED TASKS HUB — Tabs System
                ═══════════════════════════════════════════════════ */}
            <section id="today-tasks" aria-label="مركز المهام اليومية" style={{ marginBottom: 28 }}>
              {/* Tabs Bar */}
              <div
                role="tablist"
                aria-label="أقسام المهام المطلوبة"
                style={{
                  display: 'flex',
                  gap: 6,
                  background: HQ.SURFACE,
                  border: `1px solid ${HQ.LINE}`,
                  borderRadius: 14,
                  padding: 4,
                  marginBottom: 16,
                  overflowX: 'auto',
                }}
              >
                {tabsConfig.map(t => {
                  const isActive = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleTabChange(t.key)}
                      style={{
                        border: 'none',
                        cursor: 'pointer',
                        minHeight: 44,
                        padding: '0 16px',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        background: isActive ? HQ.MENTOR : 'transparent',
                        color: isActive ? '#fff' : HQ.MUTED,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {t.label}
                      {t.count > 0 && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 900,
                          borderRadius: 9999,
                          padding: '1px 7px',
                          background: isActive ? 'rgba(255,255,255,0.25)' : '#E2EFE7',
                          color: isActive ? '#fff' : '#0F5940',
                        }}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── TAB 1: ALL PENDING (نظرة شاملة لكافة المهام) ── */}
              {activeTab === 'all' && (
                <div>
                  {totalPendingCount === 0 ? (
                    <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 16, padding: 36, textAlign: 'center' }}>
                      <CheckCircle size={44} color={HQ.MENTOR} style={{ margin: '0 auto 10px' }} />
                      <h3 style={{ fontSize: 18, fontWeight: 900, color: HQ.INK, margin: '0 0 6px' }}>
                        أحسنت! أتممت جميع المهام المطلوبة منك اليوم
                      </h3>
                      <p style={{ fontSize: 14, color: HQ.MUTED, margin: 0 }}>
                        لا توجد واجبات أو اختبارات أو أوراد معلقة. يمكنك تصفح المصحف أو مراجعة محفوظاتك.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Daily portions */}
                      {PORTIONS.filter(p => dailyTask?.[p.key]).map(p => {
                        const portion = dailyTask[p.key];
                        const isDone = portion.status === 'completed';
                        return (
                          <div
                            key={p.key}
                            style={{
                              background: HQ.SURFACE,
                              border: `1px solid ${isDone ? HQ.MENTOR : HQ.LINE}`,
                              borderRadius: 14,
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleTogglePortion(p.key)}
                              aria-label={`تحديد ${p.label}`}
                              style={{
                                width: 32, height: 32, borderRadius: 9999,
                                border: `2px solid ${isDone ? HQ.MENTOR : HQ.LINE}`,
                                background: isDone ? HQ.MENTOR : 'transparent',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flex: 'none',
                              }}
                            >
                              {isDone && <Check size={16} strokeWidth={3.5} />}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: 15, color: HQ.INK }}>{p.label}</strong>
                                <span style={{ fontSize: 12, color: HQ.MUTED, background: HQ.PAPER, padding: '2px 8px', borderRadius: 6 }}>
                                  الورد اليومي
                                </span>
                              </div>
                              <span style={{ fontSize: 13, color: HQ.MUTED }}>
                                {portionName(portion) || 'ورد مخصص من المعلم'}
                              </span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: isDone ? HQ.MENTOR : '#B45309' }}>
                              {isDone ? 'منجز ✓' : 'متبقٍ'}
                            </span>
                          </div>
                        );
                      })}

                      {/* Pending homework */}
                      {pendingHwList.map(hw => (
                        <div
                          key={hw._id}
                          style={{
                            background: HQ.SURFACE,
                            border: `1px solid #B45309`,
                            borderRadius: 14,
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <span style={{ width: 34, height: 34, borderRadius: 10, background: '#FEF3C7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                            <Mic size={18} color="#B45309" />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ display: 'block', fontSize: 15, color: HQ.INK }}>
                              واجب تلاوة: {hw.quranHomework?.surahName ? `سورة ${hw.quranHomework.surahName} (${hw.quranHomework.fromVerse}-${hw.quranHomework.toVerse})` : hw.title}
                            </strong>
                            <span style={{ fontSize: 12, color: HQ.MUTED }}>
                              مطلوب تسجيل صوتي للتلاوة وإرساله للمعلم
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleTabChange('homework');
                              setExpandedHomework(hw._id);
                            }}
                            className="hq-action"
                            style={{ background: '#B45309', color: '#fff', padding: '0 16px', fontSize: 13, flex: 'none' }}
                          >
                            تسجيل الواجب
                          </button>
                        </div>
                      ))}

                      {/* Pending exams */}
                      {pendingExams.map(ex => (
                        <div
                          key={ex._id}
                          style={{
                            background: HQ.SURFACE,
                            border: `1px solid ${HQ.LINE}`,
                            borderRadius: 14,
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                          }}
                        >
                          <span style={{ width: 34, height: 34, borderRadius: 10, background: '#E2EFE7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                            <FileText size={18} color={HQ.MENTOR} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ display: 'block', fontSize: 15, color: HQ.INK }}>
                              {ex.title}
                            </strong>
                            <span style={{ fontSize: 12, color: HQ.MUTED }}>
                              {examKind(ex)} · {ex.questions?.length || 0} أسئلة{ex.duration ? ` · ${ex.duration} دقيقة` : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/student/exams/${ex._id}/take`)}
                            className="hq-action"
                            style={{ background: HQ.MENTOR, color: '#fff', padding: '0 18px', fontSize: 13, flex: 'none' }}
                          >
                            <Play size={14} /> ابدأ
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: DAILY WIRD (الورد اليومي وسجل التسميع) ── */}
              {activeTab === 'wird' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: HQ.INK }}>وردك القرآني لليوم</h3>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: HQ.MUTED }}>
                        علّم الأجزاء التي أتممت قراءتها وحفظها اليوم بنفسك
                      </p>
                    </div>
                  </div>

                  {!dailyTask ? (
                    <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 16, padding: 32, textAlign: 'center', marginBottom: 20 }}>
                      <BookOpen size={36} color={HQ.LINE} style={{ margin: '0 auto 8px' }} />
                      <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: HQ.INK }}>لا ورد محدد لليوم بعد</p>
                      <p style={{ margin: 0, fontSize: 13, color: HQ.MUTED }}>يحدد معلمك وردك ومقدار الحفظ في الحلقة القادمة.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                      {PORTIONS.filter(p => dailyTask[p.key]).map(p => {
                        const portion = dailyTask[p.key];
                        const isDone = portion.status === 'completed';
                        return (
                          <div
                            key={p.key}
                            style={{
                              background: HQ.SURFACE,
                              border: `1.5px solid ${isDone ? HQ.MENTOR : HQ.LINE}`,
                              borderRadius: 14,
                              padding: 16,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleTogglePortion(p.key)}
                              aria-pressed={isDone}
                              style={{
                                width: 36, height: 36, borderRadius: 9999,
                                border: `2px solid ${isDone ? HQ.MENTOR : HQ.LINE}`,
                                background: isDone ? HQ.MENTOR : 'transparent',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flex: 'none',
                              }}
                            >
                              {isDone && <Check size={18} strokeWidth={3.5} />}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <strong style={{ fontSize: 16, color: HQ.INK }}>{p.label}</strong>
                                {isDone && <HqBadge tone="mentor">مكتمل</HqBadge>}
                              </div>
                              <p style={{ margin: 0, fontSize: 14, color: HQ.MUTED }}>
                                {portionName(portion) || 'المحدد من معلمك'}
                              </p>
                            </div>
                            <Link
                              to="/student/quran"
                              style={{ fontSize: 13, fontWeight: 800, color: HQ.MENTOR, textDecoration: 'none', background: HQ.PAPER, padding: '6px 12px', borderRadius: 8, border: `1px solid ${HQ.LINE}` }}
                            >
                              افتح المصحف
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Teacher Approved Recitations (سجل إنجازات التسميع لهذا الأسبوع) */}
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${HQ.LINE}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: HQ.INK }}>
                        سجل التسميع المعتمد من المعلم ({weeklyRecords.length})
                      </h3>
                      <span style={{ fontSize: 12, color: HQ.MUTED }}>هذا الأسبوع</span>
                    </div>

                    {weeklyRecords.length === 0 ? (
                      <p style={{ fontSize: 13, color: HQ.MUTED, margin: 0 }}>
                        لا توجد جلسات تسميع معتمدة لهذا الأسبوع بعد — يعتمد المعلم إنجازك في سجلك بعد كل حصة.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {weeklyRecords.slice(0, 5).map(rec => (
                          <div
                            key={rec._id}
                            style={{
                              background: HQ.SURFACE,
                              border: `1px solid ${HQ.LINE}`,
                              borderRadius: 12,
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                            }}
                          >
                            <div>
                              <strong style={{ display: 'block', fontSize: 14, color: HQ.INK }}>
                                سورة {rec.surahName} · الآيات {rec.fromVerse} إلى {rec.toVerse}
                              </strong>
                              <span style={{ fontSize: 12, color: HQ.MUTED }}>
                                {formatDateAr(rec.createdAt)} · {rec.activityType === 'memorization' ? 'حفظ جديد' : 'مراجعة'}
                              </span>
                            </div>
                            <HqBadge tone={rec.status === 'approved' ? 'mentor' : 'neutral'}>
                              {rec.status === 'approved' ? 'معتمد ✓' : 'قيد المراجعة'}
                            </HqBadge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 3: HOMEWORK (الواجبات الصوتية والتسجيل) ── */}
              {activeTab === 'homework' && (
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: HQ.INK }}>
                      الواجبات والتسجيلات الصوتية المطلوبة ({homeworkSessions.length})
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: HQ.MUTED }}>
                      استمع للآيات، وسجل تلاوتك بصوتك، وأرسلها للمعلم للتقييم والتصويب
                    </p>
                  </div>

                  {homeworkSessions.length === 0 ? (
                    <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 16, padding: 36, textAlign: 'center' }}>
                      <Mic size={36} color={HQ.LINE} style={{ margin: '0 auto 8px' }} />
                      <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: HQ.INK }}>لا توجد واجبات مطلوبة حالياً</p>
                      <p style={{ margin: 0, fontSize: 13, color: HQ.MUTED }}>معلمك يضيف الواجبات والتكليفات الصوتية بعد نهاية كل حصة مباشرة.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {homeworkSessions.map(sess => {
                        const isExpanded = expandedHomework === sess._id;
                        const mySub = getMySubmission(sess);
                        const isDone = Boolean(mySub);

                        return (
                          <div
                            key={sess._id}
                            style={{
                              background: HQ.SURFACE,
                              border: `1.5px solid ${isDone ? HQ.LINE : '#B45309'}`,
                              borderRadius: 16,
                              overflow: 'hidden',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                            }}
                          >
                            {/* Homework Card Header */}
                            <div
                              style={{
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                background: isDone ? HQ.SURFACE : '#FFFDF7',
                                cursor: 'pointer',
                              }}
                              onClick={() => toggleExpandHomework(sess)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ width: 34, height: 34, borderRadius: 10, background: isDone ? '#E2EFE7' : '#FEF3C7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                                  <Mic size={17} color={isDone ? HQ.MENTOR : '#B45309'} />
                                </span>
                                <div>
                                  <strong style={{ display: 'block', fontSize: 15, color: HQ.INK }}>
                                    {sess.quranHomework?.surahName
                                      ? `واجب سورة ${sess.quranHomework.surahName} (الآيات ${sess.quranHomework.fromVerse} إلى ${sess.quranHomework.toVerse})`
                                      : sess.title}
                                  </strong>
                                  <span style={{ fontSize: 12, color: HQ.MUTED }}>
                                    حصة: {sess.title} · {formatDateAr(sess.scheduledAt || sess.createdAt)}
                                  </span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <HqBadge tone={isDone ? (mySub.grade ? 'mentor' : 'neutral') : 'gold'}>
                                  {isDone ? (mySub.grade ? `تم التصحيح (${mySub.grade}%)` : 'تم التسليم ✓') : 'بانتظار التسليم'}
                                </HqBadge>
                                {isExpanded ? <ChevronUp size={18} color={HQ.MUTED} /> : <ChevronDown size={18} color={HQ.MUTED} />}
                              </div>
                            </div>

                            {/* Expanded Submission & Recitation Details */}
                            {isExpanded && (
                              <div style={{ padding: '16px', borderTop: `1px solid ${HQ.LINE}`, background: HQ.PAPER }}>
                                {sess.homework && (
                                  <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: HQ.MUTED }}>ملاحظات المعلم للواجب:</span>
                                    <p style={{ margin: '4px 0 0', fontSize: 14, color: HQ.INK }}>{sess.homework}</p>
                                  </div>
                                )}

                                {/* Quran Verses Preview */}
                                {sess.quranHomework?.surahNumber && (
                                  <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: HQ.MENTOR, display: 'block', marginBottom: 6 }}>
                                      نص الآيات المقررة للتلاوة:
                                    </span>
                                    {loadingVerses[sess._id] ? (
                                      <p style={{ fontSize: 13, color: HQ.MUTED, margin: 0 }}>جارٍ تحميل الآيات من المصحف...</p>
                                    ) : quranVerses[sess._id]?.length ? (
                                      <div style={{ fontFamily: 'Amiri, serif', fontSize: 17, lineHeight: 2.2, color: HQ.INK, textAlign: 'justify' }}>
                                        {quranVerses[sess._id].map(v => (
                                          <span key={v.number}>
                                            {v.text} <span style={{ color: HQ.MENTOR, fontSize: 14 }}>﴿{v.numberInSurah}﴾</span>{' '}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p style={{ fontSize: 13, color: HQ.MUTED, margin: 0 }}>
                                        سورة رقم {sess.quranHomework.surahNumber} من الآية {sess.quranHomework.fromVerse} إلى {sess.quranHomework.toVerse}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Past submission review if submitted */}
                                {isDone && mySub ? (
                                  <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                      <span style={{ fontSize: 13, fontWeight: 800, color: HQ.INK }}>تسليمك المسجل:</span>
                                      <span style={{ fontSize: 12, color: HQ.MUTED }}>{formatDateAr(mySub.submittedAt)}</span>
                                    </div>
                                    {mySub.audioUrl && (
                                      <div style={{ marginBottom: 10 }}>
                                        <audio controls src={mySub.audioUrl} style={{ width: '100%', height: 36 }} />
                                      </div>
                                    )}
                                    {mySub.feedback && (
                                      <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 10, marginTop: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: '#B45309', display: 'block', marginBottom: 2 }}>
                                          ملاحظات وتقييم المعلم:
                                        </span>
                                        <p style={{ margin: 0, fontSize: 13, color: HQ.INK }}>{mySub.feedback}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  /* New Submission: In-place Audio Recorder & Notes */
                                  <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: 16 }}>
                                    <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: HQ.INK }}>
                                      سجل تلاوتك الآن وسلم الواجب
                                    </h4>

                                    {/* Audio Recorder Controls */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                                      {!isRecording && !audioBlob && (
                                        <button
                                          type="button"
                                          onClick={startHwRecording}
                                          className="hq-action"
                                          style={{ background: '#B45309', color: '#fff', padding: '0 20px', fontSize: 14 }}
                                        >
                                          <Mic size={16} /> ابدأ تسجيل التلاوة
                                        </button>
                                      )}
                                      {isRecording && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#C2410C', fontWeight: 800, fontSize: 14 }}>
                                            <span className="hq-live-dot" style={{ background: '#C2410C' }} aria-hidden />
                                            جارٍ التسجيل: {formatTime(recordingSeconds)}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={stopHwRecording}
                                            className="hq-action"
                                            style={{ background: '#C2410C', color: '#fff', padding: '0 16px', fontSize: 13 }}
                                          >
                                            <Square size={14} /> إيقاف وحفظ
                                          </button>
                                        </div>
                                      )}
                                      {audioBlob && !isRecording && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: '100%' }}>
                                          <audio controls src={audioUrl} style={{ height: 36, flex: 1, minWidth: 200 }} />
                                          <button
                                            type="button"
                                            onClick={deleteHwRecording}
                                            className="hq-action"
                                            style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, color: '#C2410C', padding: '0 12px', fontSize: 13 }}
                                          >
                                            <Trash2 size={15} /> إعادة التسجيل
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Optional Notes */}
                                    <div style={{ marginBottom: 14 }}>
                                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: HQ.MUTED, marginBottom: 4 }}>
                                        ملاحظة لمعلمك (اختياري):
                                      </label>
                                      <input
                                        type="text"
                                        value={homeworkNotes[sess._id] || ''}
                                        onChange={(e) => setHomeworkNotes({ ...homeworkNotes, [sess._id]: e.target.value })}
                                        placeholder="اكتب أي ملاحظة أو استفسار بخصوص التلاوة..."
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${HQ.LINE}`, background: HQ.PAPER, fontSize: 13, color: HQ.INK, fontFamily: 'inherit' }}
                                      />
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleSubmitHomework(sess._id)}
                                      disabled={isSubmittingHw || (!audioBlob && !homeworkNotes[sess._id])}
                                      className="hq-action"
                                      style={{ width: '100%', background: HQ.MENTOR, color: '#fff', fontSize: 15, opacity: (isSubmittingHw || (!audioBlob && !homeworkNotes[sess._id])) ? 0.5 : 1 }}
                                    >
                                      <Send size={16} /> {isSubmittingHw ? 'جارٍ تسليم الواجب...' : 'تسليم الواجب للمعلم'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: EXAMS & ORAL RECITATIONS (الاختبارات الشفهية والتحريرية) ── */}
              {activeTab === 'exams' && (
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: HQ.INK }}>
                      الاختبارات والامتحانات الشفهية ({pendingExams.length} متاحة)
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: HQ.MUTED }}>
                      امتحانات التجويد والحفظ الشفهية والتحريرية لقياس مستوى إتقانك للقرآن
                    </p>
                  </div>

                  {pendingExams.length === 0 ? (
                    <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 16, padding: 36, textAlign: 'center', marginBottom: 24 }}>
                      <Award size={36} color={HQ.MENTOR} style={{ margin: '0 auto 8px' }} />
                      <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: HQ.INK }}>لا توجد اختبارات معلقة عليك الآن</p>
                      <p style={{ margin: 0, fontSize: 13, color: HQ.MUTED }}>ستظهر هنا الاختبارات المرحلية وامتحانات الأجزاء التي يحددها معلمك.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                      {pendingExams.map((exam, i) => {
                        const required = i === 0;
                        return (
                          <div
                            key={exam._id}
                            style={{
                              background: required ? '#E2EFE7' : HQ.SURFACE,
                              border: `1.5px solid ${required ? HQ.MENTOR : HQ.LINE}`,
                              borderRadius: 16,
                              padding: 16,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 14,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                                <strong style={{ fontSize: 16, color: required ? HQ.MENTOR : HQ.INK }}>
                                  {exam.title}
                                </strong>
                                {required && <HqBadge tone="mentor">مطلوب الآن</HqBadge>}
                              </div>
                              <p style={{ margin: 0, fontSize: 13, color: HQ.MUTED }}>
                                {examKind(exam)} · {exam.questions?.length || 0} أسئلة{exam.duration ? ` · ${exam.duration} دقيقة` : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/student/exams/${exam._id}/take`)}
                              className="hq-action"
                              style={{ background: HQ.MENTOR, color: '#fff', padding: '0 24px', fontSize: 14, flex: 'none' }}
                            >
                              <Play size={16} /> ابدأ الاختبار الآن
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Previous Results Section */}
                  {results?.length > 0 && (
                    <div style={{ paddingTop: 20, borderTop: `1px solid ${HQ.LINE}` }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 900, color: HQ.INK }}>
                        نتائج ودرجات اختباراتي السابقة ({results.length})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {results.map(res => (
                          <div
                            key={res._id}
                            style={{
                              background: HQ.SURFACE,
                              border: `1px solid ${HQ.LINE}`,
                              borderRadius: 12,
                              padding: '12px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                            }}
                          >
                            <div>
                              <strong style={{ display: 'block', fontSize: 14, color: HQ.INK }}>
                                {res.exam?.title || 'اختبار تقييم'}
                              </strong>
                              <span style={{ fontSize: 12, color: HQ.MUTED }}>
                                {formatDateAr(res.createdAt)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 15, fontWeight: 900, color: HQ.MENTOR }}>
                                {res.score !== undefined ? `${res.score}%` : 'تم التدقيق'}
                              </span>
                              <HqBadge tone={res.status === 'passed' || res.score >= 60 ? 'mentor' : 'gold'}>
                                {res.status === 'passed' || res.score >= 60 ? 'ناجح' : 'مكتمل'}
                              </HqBadge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Next Majlis / Class Info */}
            <section aria-label="المجلس القادم" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 16, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: HQ.MENTOR, display: 'block', marginBottom: 2 }}>
                    الحلقة المباشرة القادمة
                  </span>
                  <strong style={{ fontSize: 16, color: HQ.INK, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {upcomingSession ? upcomingSession.title : 'لا توجد جلسة مجدولة قريباً'}
                    {upcomingSession?.status === 'live' && <span className="hq-live-dot" aria-hidden />}
                  </strong>
                  {upcomingSession && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: HQ.MUTED }}>
                      {group?.name || upcomingSession.group?.name || 'مجموعتك'}
                      {upcomingSession.status === 'scheduled' && upcomingSession.scheduledAt ? ` · ${getSmartDateLabel(upcomingSession.scheduledAt)}` : ''}
                    </p>
                  )}
                </div>
                {upcomingSession && (
                  <HqActionLink to="/student/live" primary={upcomingSession.status === 'live'}>
                    {upcomingSession.status === 'live' ? 'دخول الحلقة الآن 🔴' : 'غرفة الحلقة'}
                  </HqActionLink>
                )}
              </div>
            </section>

            {/* Curriculum link */}
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <Link to="/student/curriculum" style={{ fontSize: 14, fontWeight: 800, color: HQ.MENTOR, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                الانتقال إلى المنهج ومحتوى المجموعة <ChevronLeft size={16} />
              </Link>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
