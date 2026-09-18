import { useState, useEffect } from 'react';
import { BookOpen, Video, Clock, Check, AlertTriangle, Lock, CreditCard, Play, ChevronLeft, RotateCcw, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useLiveStore from '../../store/liveStore';
import { getLevelLabel, formatDateAr, formatCountdown, getSmartDateLabel, NO_GROUP_TITLE, NO_GROUP_HINT } from '../../utils/helpers';
import { DAYS_AR } from '../../utils/constants';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';
import { HqActionLink } from '../../components/halaqa/JourneyNode';

/* «اليوم» — what do I do now, and what is next?
   Same endpoints and logic as before; only the hierarchy changed.
   Journey details live at /student/progress — never duplicated here. */

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

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { group, studyPlan, fetchMyGroup, fetchStudyPlan } = useGroupStore();
  const { sessions, fetchSessions } = useLiveStore();

  const [dailyTask, setDailyTask] = useState(null);
  const [assignedExams, setAssignedExams] = useState([]);
  const [pendingHomework, setPendingHomework] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const groupId = user?.group?._id || user?.group;
  const myId = user?._id?.toString();

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
        const res = await api.get('/exams/student/assigned');
        setAssignedExams((res.data.exams || []).filter(e => !e.isCompleted));
      }),
      settle(async () => {
        if (!groupId || !myId) { setPendingHomework(0); return; }
        const res = await api.get(`/live/group/${groupId}/homework`);
        const sessions = res.data.sessions || [];
        const pending = sessions.filter(s => {
          if (!s.homework && !s.quranHomework) return false;
          const subs = s.homeworkSubmissions || [];
          return !subs.some(sub => ((sub.student?._id || sub.student)?.toString()) === myId);
        }).length;
        setPendingHomework(pending);
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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور';

  const liveSession = sessions.find(s => s.status === 'live');
  const upcomingSession = liveSession || sessions.find(s => s.status === 'scheduled');
  const timeLeft = useCountdown(upcomingSession?.status === 'scheduled' ? upcomingSession.scheduledAt : null);

  const pendingPortions = PORTIONS.filter(p => dailyTask?.[p.key] && dailyTask[p.key].status !== 'completed');
  const juzCompleted = studyPlan?.quranCompletionPlan?.completedJuz?.length || 0;
  const juzPct = Math.round((juzCompleted / 30) * 100);

  /* Ordered candidates from real data — first is «my step now», second is «next» */
  const candidates = [];
  if (!groupId) {
    candidates.push({ kind: 'quran', label: 'تصفح المصحف المكرر', hint: 'بانتظار تسكينك في مجموعتك', to: '/student/quran' });
  } else {
    if (liveSession) candidates.push({ kind: 'live', label: 'انضم للحصة الآن', hint: liveSession.title, to: '/student/live', live: true });
    if (assignedExams[0]) candidates.push({ kind: 'exam', label: `ابدأ: ${assignedExams[0].title}`, hint: `${assignedExams[0].questions?.length || 0} أسئلة`, examId: assignedExams[0]._id });
    if (pendingHomework > 0) candidates.push({ kind: 'homework', label: `سلّم واجبك (${pendingHomework} معلق)`, hint: 'واجب من معلمك بانتظار التسليم', to: '/student/homework' });
    if (pendingPortions.length) candidates.push({ kind: 'wird', label: `أكمل وردك (${pendingPortions.length} متبقٍ)`, hint: portionName(dailyTask[pendingPortions[0].key]), scroll: true });
    if (upcomingSession && upcomingSession.status === 'scheduled') candidates.push({ kind: 'upcoming', label: 'الحصة القادمة', hint: getSmartDateLabel(upcomingSession.scheduledAt), to: '/student/live' });
    candidates.push({ kind: 'curriculum', label: 'تابع منهجك', hint: 'دروسك ومواد مجموعتك', to: '/student/curriculum' });
  }
  const [primary, next] = candidates;

  const scrollToTasks = () => {
    document.getElementById('today-tasks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const primaryAction = primary?.examId
    ? <button type="button" onClick={() => navigate(`/student/exams/${primary.examId}/take`)} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 32px', fontSize: 16, width: '100%' }}><Play size={18} /> {primary.label}</button>
    : primary?.scroll
    ? <button type="button" onClick={scrollToTasks} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 32px', fontSize: 16, width: '100%' }}><BookOpen size={18} /> {primary.label}</button>
    : primary ? <HqActionLink to={primary.to}>{primary.label}</HqActionLink> : null;

  const sheet = { background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 'clamp(16px, 3vw, 28px)' };
  const h2 = { margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: HQ.INK };

  return (
    <PageLayout>
      <div className="halaqa" style={{ ...sheet, maxWidth: 760, margin: '0 auto' }}>
        {!ready ? (
          <div aria-label="جارٍ تحميل يومك">
            <div className="hq-skeleton" style={{ height: 22, width: '45%', marginBottom: 16 }} />
            <div className="hq-skeleton" style={{ height: 56, width: '100%', marginBottom: 16 }} />
            <div className="hq-skeleton" style={{ height: 14, width: '30%', marginBottom: 8 }} />
            <div className="hq-skeleton" style={{ height: 52, width: '100%', marginBottom: 8 }} />
            <div className="hq-skeleton" style={{ height: 52, width: '100%', marginBottom: 8 }} />
            <div className="hq-skeleton" style={{ height: 52, width: '100%' }} />
          </div>
        ) : loadFailed ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }} role="alert">
            <h1 style={{ fontSize: 24, fontWeight: 800, color: HQ.INK, margin: '0 0 8px' }}>تعذّر تحميل يومك</h1>
            <p style={{ color: HQ.MUTED, fontSize: 15, margin: '0 0 20px' }}>تحقق من الاتصال ثم حاول مرة أخرى.</p>
            <button type="button" onClick={loadLocal} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 24px', fontSize: 15 }}>
              <RotateCcw size={17} /> إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {/* A. Greeting — small, never a hero */}
            <p style={{ margin: 0, fontSize: 14, color: HQ.MUTED }}>{greeting}،</p>
            <h1 style={{ margin: '2px 0 20px', fontSize: 32, fontWeight: 800, color: HQ.INK }}>
              {user?.firstName || 'طالبنا'}، هذا يومك
            </h1>

            {/* Slim subscription alerts (functional, kept) */}
            {groupId && subscription?.isExpiringSoon && (
              <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: HQ.PAPER, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <AlertTriangle size={17} color="#B45309" />
                </span>
                <span style={{ flex: 1, fontSize: 14, color: HQ.INK }}>يتبقى <strong>{subscription.daysRemaining} أيام</strong> على اشتراكك.</span>
                <Link to="/student/subscription" style={{ fontSize: 14, fontWeight: 800, color: '#B45309', whiteSpace: 'nowrap' }}>التجديد</Link>
              </div>
            )}
            {groupId && subscription?.isExpired && (
              <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 12, background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: HQ.PAPER, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <Lock size={17} color="#C2410C" />
                </span>
                <span style={{ flex: 1, fontSize: 14, color: HQ.INK }}>انتهى اشتراكك — المحتوى محجوب بالكامل حتى السداد.</span>
                <Link to="/student/subscription" style={{ fontSize: 14, fontWeight: 800, color: '#C2410C', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CreditCard size={15} /> السداد</Link>
              </div>
            )}
            {!groupId && (
              <div style={{ background: HQ.SURFACE, border: `1.5px solid ${HQ.LINE}`, borderRadius: 16, padding: '16px 18px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
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

            {/* B. My step now — exactly one primary action */}
            {primary && (
              <section aria-label="خطوتي الآن" style={{ marginBottom: 24 }}>
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

            {/* C. Next — one quiet line */}
            {next && (
              <section aria-label="التالي" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: HQ.MUTED, marginBottom: 24 }}>
                <span style={{ fontWeight: 800, color: HQ.INK, flex: 'none' }}>التالي:</span>
                <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{next.label}</span>
                {next.to && <Link to={next.to} aria-label={`انتقال: ${next.label}`} style={{ color: HQ.MENTOR, display: 'inline-flex', flex: 'none' }}><ChevronLeft size={18} /></Link>}
              </section>
            )}

            {/* D. Today's tasks — list first, never cards */}
            <section id="today-tasks" aria-label="مهمتي اليوم" style={{ marginBottom: 24 }}>
              <h2 style={h2}>مهمتي اليوم</h2>
              <p style={{ fontSize: 13, color: HQ.MUTED, margin: '4px 0 0' }}>
                وردك تعلّمه بنفسك هنا · واجبك يسلَّم للمعلم في صفحة الواجبات · وسجلك يعتمده المعلم بعد التسميع في سجل إنجازي.
              </p>
              {(!dailyTask && assignedExams.length === 0) ? (
                <p style={{ fontSize: 15, color: HQ.MUTED, margin: '8px 0 0' }}>
                  يومك خفيف — لا مهام معلّقة. {groupId ? 'معلمك يحدد وردك أثناء الحصة.' : 'تصفح المصحف ريثما تُسكَّن في مجموعة.'}
                </p>
              ) : (
                <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                  {PORTIONS.filter(p => dailyTask?.[p.key]).map(p => {
                    const portion = dailyTask[p.key];
                    const donePortion = portion.status === 'completed';
                    return (
                      <li key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, padding: '10px 4px', borderBottom: `1px solid ${HQ.LINE}` }}>
                        <button type="button" onClick={() => handleTogglePortion(p.key)}
                          aria-pressed={donePortion} aria-label={`${p.label}: ${donePortion ? 'مكتمل، اضغط للإلغاء' : 'تحديد كمكتمل'}`}
                          style={{
                            flex: 'none', width: 44, height: 44, padding: 7, borderRadius: 9999, cursor: 'pointer',
                            background: 'transparent', border: 'none',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                          <span aria-hidden style={{
                            width: 30, height: 30, borderRadius: 9999,
                            border: `2px solid ${donePortion ? HQ.MENTOR : HQ.LINE}`,
                            background: donePortion ? HQ.MENTOR : 'transparent', color: '#fff',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {donePortion && <Check size={16} strokeWidth={3.5} />}
                          </span>
                        </button>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontWeight: 800, fontSize: 15, color: HQ.INK }}>{p.label}</span>
                          <span style={{ display: 'block', fontSize: 13, color: HQ.MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {portionName(portion)}{portion.score !== undefined ? ` · الدرجة ${portion.score}%` : ''}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                  {assignedExams.map(exam => (
                    <li key={exam._id} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 60, padding: '10px 4px', borderBottom: `1px solid ${HQ.LINE}` }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 800, fontSize: 15, color: HQ.INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exam.title}</span>
                        <span style={{ display: 'block', fontSize: 13, color: HQ.MUTED }}>
                          اختبار · {exam.questions?.length || 0} أسئلة{exam.duration ? ` · ${exam.duration} دقيقة` : ''}
                        </span>
                      </span>
                      <button type="button" onClick={() => navigate(`/student/exams/${exam._id}/take`)}
                        style={{ flex: 'none', minHeight: 48, padding: '0 20px', borderRadius: 12, border: 'none', background: HQ.MENTOR, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Play size={15} /> ابدأ
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* E. Journey mini-summary — snapshot only, details live at /student/progress */}
            <section aria-label="ملخص رحلتي" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14, marginBottom: 12 }}>
                <span><strong style={{ color: HQ.INK }}>{getLevelLabel(user?.assignedLevel) || '—'}</strong> <span style={{ color: HQ.MUTED }}>المستوى</span></span>
                <span><strong style={{ color: HQ.INK }}>{juzPct}%</strong> <span style={{ color: HQ.MUTED }}>الختمة</span></span>
                <span><strong style={{ color: HQ.INK }}>{juzCompleted}/30</strong> <span style={{ color: HQ.MUTED }}>جزءًا</span></span>
                {group?.name && <span><strong style={{ color: HQ.INK }}>{group.name}</strong> <span style={{ color: HQ.MUTED }}>المجموعة</span></span>}
              </div>
              <Link to="/student/progress" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 15, color: HQ.MENTOR, textDecoration: 'none' }}>
                عرض رحلتي كاملة <ChevronLeft size={17} />
              </Link>
            </section>

            {/* F. Next majlis */}
            <section aria-label="المجلس القادم">
              <h2 style={h2}>المجلس القادم</h2>
              {upcomingSession ? (
                <div style={{ marginTop: 8 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: HQ.INK }}>
                    {upcomingSession.status === 'live' && <span className="hq-live-dot" aria-hidden style={{ display: 'inline-block', marginLeft: 8 }} />}
                    {upcomingSession.title}
                  </p>
                  <p style={{ margin: '0 0 4px', fontSize: 14, color: HQ.MUTED }}>
                    {group?.name || upcomingSession.group?.name || ''}
                    {upcomingSession.status === 'scheduled' && upcomingSession.scheduledAt
                      ? ` · ${formatDateAr(upcomingSession.scheduledAt, 'EEEE dd MMMM')}`
                      : ''}
                  </p>
                  {upcomingSession.status === 'scheduled' && timeLeft > 0 && (
                    <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: HQ.MENTOR }}>
                      <Clock size={14} style={{ verticalAlign: -2 }} /> تبدأ خلال {formatCountdown(timeLeft)}
                    </p>
                  )}
                  <HqActionLink to="/student/live" primary={upcomingSession.status === 'live'}>
                    {upcomingSession.status === 'live' ? 'انضم الآن' : 'صفحة الحصة'}
                  </HqActionLink>
                  {group?.schedule?.length > 0 && (
                    <p style={{ margin: '12px 0 0', fontSize: 13, color: HQ.MUTED }}>
                      أيام حلقتك المعتادة: {group.schedule.map(s => DAYS_AR[s.dayOfWeek]).filter(Boolean).join('، ')}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 15, color: HQ.MUTED, margin: '8px 0 0' }}>
                  لا حصة مجدولة حاليًا — سيعلن معلمك الموعد في المجموعة.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </PageLayout>
  );
}
