import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Award, RotateCcw,
  AlertCircle, CheckCircle2,
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import IjazahCertificateModal from '../../components/shared/IjazahCertificateModal';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useSessionFeedbackStore from '../../store/sessionFeedbackStore';
import { getJuzPercentage, getLevelLabel, formatDateAr, timeAgoAr, getSmartDateLabel } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../components/halaqa/halaqa.css';
import { KhatmRing, RingSkeleton, NodeSkeleton, HqBadge, HQ } from '../../components/halaqa/primitives';
import JourneyNode, { HqActionLink } from '../../components/halaqa/JourneyNode';

const JUZ = Array.from({ length: 30 }, (_, i) => i + 1);

export default function ProgressPage() {
  const { user } = useAuthStore();
  const { studyPlan, fetchStudyPlan } = useGroupStore();
  const { myFeedbacks, avgRatings, fetchMyFeedbacks } = useSessionFeedbackStore();

  const [lessons, setLessons] = useState([]);
  const [weakPoints, setWeakPoints] = useState([]);
  const [ijazah, setIjazah] = useState(null);
  const [nextSession, setNextSession] = useState(null);
  const [liveNow, setLiveNow] = useState(false);
  const [hasAttendedLive, setHasAttendedLive] = useState(false);
  const [pendingHomework, setPendingHomework] = useState(null);
  const [pendingExams, setPendingExams] = useState(null);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [juzOpen, setJuzOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const groupId = user?.group?._id || user?.group;
  const myId = user?._id?.toString();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    let ok = 0;
    const settle = async (fn) => {
      try { await fn(); ok++; } catch (_) {}
    };
    await Promise.all([
      settle(async () => { if (groupId) await fetchStudyPlan(groupId); }),
      settle(() => fetchMyFeedbacks()),
      settle(async () => {
        const res = await api.get('/exams/weak-points/my');
        setWeakPoints(res.data.weakPoints || []);
      }),
      settle(async () => {
        const res = await api.get('/ijazah/my');
        setIjazah(res.data.ijazah || null);
      }),
      settle(async () => {
        if (!groupId) return;
        const res = await api.get(`/study-plans/group/${groupId}/full`);
        setLessons(res.data.plan?.customLessons || []);
      }),
      settle(async () => {
        if (!groupId) return;
        const res = await api.get(`/live/group/${groupId}`);
        const sessions = res.data.sessions || [];
        const live = sessions.find(s => s.status === 'live');
        setLiveNow(Boolean(live));
        if (!live) {
          const upcoming = sessions
            .filter(s => s.status === 'scheduled' && s.scheduledAt)
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0];
          setNextSession(upcoming || null);
        } else setNextSession(live);
        // Real attendance: my id in attendees or in present/late records
        if (myId) {
          const attended = sessions.some(s => {
            const inAttendees = (s.attendees || []).some(a => ((a.student?._id || a.student)?.toString()) === myId);
            const inRecords = (s.attendanceRecords || []).some(r =>
              ((r.student?._id || r.student)?.toString()) === myId && (r.status === 'present' || r.status === 'late'));
            return inAttendees || inRecords;
          });
          setHasAttendedLive(attended);
        }
      }),
      settle(async () => {
        const res = await api.get('/exams/student/assigned');
        const list = res.data.exams || res.data.assignedExams || res.data || [];
        const arr = Array.isArray(list) ? list : [];
        setPendingExams(arr.filter(e => !e.isCompleted).length);
      }),
      settle(async () => {
        if (!groupId || !myId) return;
        const res = await api.get(`/live/group/${groupId}/homework`);
        const sessions = res.data.sessions || [];
        const pending = sessions.filter(s => {
          if (!s.homework && !s.quranHomework) return false;
          const subs = s.homeworkSubmissions || [];
          return !subs.some(sub => ((sub.student?._id || sub.student)?.toString()) === myId);
        }).length;
        setPendingHomework(pending);
      }),
    ]);
    if (ok === 0) setLoadFailed(true);
    setLoading(false);
  }, [groupId, myId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleMarkMastered = async (id) => {
    try {
      await api.put(`/exams/weak-points/${id}`, { status: 'mastered' });
      setWeakPoints(prev => prev.map(w => (w._id === id ? { ...w, status: 'mastered' } : w)));
      toast.success('أحسنت! سُجّلت الآية كمراجَعة بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const completedJuz = studyPlan?.quranCompletionPlan?.completedJuz || [];
  const juzPct = getJuzPercentage(completedJuz);
  const completedLessons = user?.completedLessons?.length || 0;
  const totalLessons = lessons.length;
  const curriculumPct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const openWeak = weakPoints.filter(w => w.status !== 'mastered');
  const latestFeedback = myFeedbacks?.[0];
  const groupName = typeof user?.group === 'object' ? (user.group?.name || '') : '';
  const awarded = ijazah?.status === 'awarded';
  // Tasks counts are only trustworthy once BOTH fetches resolved —
  // a 0 from a failed request must never read as "done".
  const tasksKnown = pendingHomework !== null && pendingExams !== null;

  /* Sequential status: the first non-completed node is current */
  const done = {
    registration: true,
    placement: Boolean(user?.placementExamTaken),
    level: Boolean(user?.assignedLevel),
    group: Boolean(groupId),
    curriculum: totalLessons > 0 && completedLessons >= totalLessons,
    live: hasAttendedLive,
    tasks: Boolean(groupId) && tasksKnown && pendingHomework === 0 && pendingExams === 0,
    khatm: juzPct >= 100,
    ijazah: awarded,
  };
  const order = ['placement', 'level', 'group', 'curriculum', 'live', 'tasks', 'khatm', 'ijazah'];
  const currentKey = order.find(k => !done[k]);
  const st = (key) => {
    if (done[key]) return 'completed';
    if (key === currentKey) return 'current';
    if (key === 'level' || key === 'group') return 'locked';
    return 'upcoming';
  };

  const sheet = {
    background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 18,
    padding: 'clamp(16px, 3vw, 32px)',
  };

  return (
    <PageLayout>
      <div className="halaqa" style={{ ...sheet, maxWidth: 820, margin: '0 auto' }}>
        {loading ? (
          <div aria-label="جارٍ تحميل رحلتك">
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
              <RingSkeleton size={150} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="hq-skeleton" style={{ height: 24, width: '55%', marginBottom: 10 }} />
                <div className="hq-skeleton" style={{ height: 14, width: '80%' }} />
              </div>
            </div>
            <NodeSkeleton /><NodeSkeleton /><NodeSkeleton /><NodeSkeleton />
          </div>
        ) : loadFailed ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }} role="alert">
            <AlertCircle size={40} color={HQ.MUTED} style={{ margin: '0 auto 12px' }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: HQ.INK, margin: '0 0 8px' }}>تعذّر تحميل رحلتك</h1>
            <p style={{ color: HQ.MUTED, fontSize: 15, margin: '0 0 20px' }}>تحقق من الاتصال ثم حاول مرة أخرى — بياناتك محفوظة.</p>
            <button type="button" onClick={loadAll} className="hq-action"
              style={{ background: HQ.MENTOR, color: '#fff', padding: '0 24px', fontSize: 15 }}>
              <RotateCcw size={17} /> إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {/* ── Journey head: greeting + the single living ring ── */}
            <header style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
              <KhatmRing pct={juzPct} done={completedJuz.length} total={30} size={168} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <p style={{ margin: 0, fontSize: 14, color: HQ.MUTED }}>أين أنا في رحلتي؟</p>
                <h1 style={{ margin: '4px 0 8px', fontSize: 32, fontWeight: 800, color: HQ.INK }}>
                  أهلًا {user?.firstName || 'بك'}
                </h1>
                <HqBadge tone={user?.assignedLevel ? 'mentor' : 'neutral'}>
                  {user?.assignedLevel ? `مستواك: ${getLevelLabel(user.assignedLevel)}` : 'بانتظار تحديد المستوى'}
                </HqBadge>
              </div>
            </header>

            <div className="hq-thread" style={{ marginTop: 16 }}>
              {/* 1. Registration */}
              <JourneyNode index={1} title="التسجيل" status="completed"
                proof={user?.createdAt ? `أُنشئ حسابك في ${formatDateAr(user.createdAt)}` : 'حسابك منشأ ومفعّل'} />

              {/* 2. Placement */}
              <JourneyNode index={2} title="تحديد المستوى" status={st('placement')}
                proof={user?.placementExamTaken ? `نتيجتك: ${user?.placementExamScore ?? '—'}%` : 'امتحان قصير يحدد مستواك الحقيقي'}
                action={!done.placement && (
                  <HqActionLink to="/onboarding/type">ابدأ تحديد المستوى</HqActionLink>
                )} />

              {/* 3. Level */}
              <JourneyNode index={3} title="المستوى" status={st('level')}
                proof={user?.assignedLevel ? getLevelLabel(user.assignedLevel) : 'ستتاح بعد اعتماد نتيجة تحديد المستوى'} />

              {/* 4. Group + embedded teacher note */}
              <JourneyNode index={4} title="المجموعة" status={st('group')}
                proof={groupName || 'ستتاح بعد تعيينك في مجموعة تناسب مستواك'}
                action={done.group && (
                  <HqActionLink to="/student/curriculum?tab=group" primary={false}>عرض مجموعتي</HqActionLink>
                )}>
                {latestFeedback && (
                  <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: 12 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: HQ.MUTED }}>
                      آخر كلمة من معلمك — {latestFeedback.teacher?.firstName} {latestFeedback.teacher?.lastName} · {timeAgoAr(latestFeedback.sessionDate)}
                    </p>
                    <p style={{ margin: 0, fontSize: 15, color: HQ.INK, lineHeight: 1.8 }}>
                      {latestFeedback.generalNotes || latestFeedback.strengths || 'واصل التقدم — معلمك يتابعك.'}
                    </p>
                  </div>
                )}
              </JourneyNode>

              {/* 5. Curriculum + embedded skills & flagged review */}
              <JourneyNode index={5} title="المنهج" status={st('curriculum')}
                proof={totalLessons ? `${completedLessons} من ${totalLessons} درسًا (${curriculumPct}%)` : 'ستتاح بعد تعيين منهج مجموعتك'}
                action={done.group && (
                  <HqActionLink to="/student/curriculum" primary={st('curriculum') === 'current'}>تابع دروسك</HqActionLink>
                )}>
                {avgRatings && (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: openWeak.length ? 12 : 0 }}>
                    {[
                      { label: 'التلاوة', v: avgRatings.recitation },
                      { label: 'الحفظ', v: avgRatings.memorization },
                      { label: 'الانتباه', v: avgRatings.attention },
                    ].map(s => (
                      <div key={s.label} style={{ flex: '1 1 120px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: HQ.MUTED, marginBottom: 4 }}>
                          <span>{s.label}</span><span>{s.v ?? '—'}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 9999, background: HQ.LINE, overflow: 'hidden' }} role="img" aria-label={`${s.label}: ${s.v} من 5`}>
                          <div style={{ height: '100%', width: `${Math.min(100, ((s.v || 0) / 5) * 100)}%`, background: HQ.MENTOR, borderRadius: 9999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {openWeak.length > 0 && (
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: HQ.MUTED, margin: '0 0 8px' }}>
                      آيات علّمها معلمك للمراجعة ({openWeak.length})
                    </p>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {openWeak.slice(0, 3).map(wp => (
                        <li key={wp._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: `1px solid ${HQ.LINE}`, fontSize: 14 }}>
                          <span style={{ color: HQ.INK, fontWeight: 700 }}>{wp.surahName} — الآية {wp.fromVerse}</span>
                          <button type="button" onClick={() => handleMarkMastered(wp._id)}
                            style={{ minHeight: 44, padding: '0 16px', borderRadius: 12, border: 'none', background: HQ.MENTOR, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                            راجعتها
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </JourneyNode>

              {/* 6. Live */}
              <JourneyNode index={6} title="الحصة المباشرة" status={liveNow ? 'current' : st('live')}
                proof={hasAttendedLive
                  ? 'حضرت حصصاً مباشرة — واصل الحضور'
                  : liveNow ? 'حلقة جارية الآن — معلمك بانتظارك' : nextSession?.scheduledAt ? `الحصة القادمة: ${getSmartDateLabel(nextSession.scheduledAt)}` : 'تُعلن الحصة القادمة في مجموعتك — تُحتسب بعد أول حضور لك'}
                action={(liveNow || nextSession) && (
                  <HqActionLink to="/student/live" primary={liveNow}>
                    {liveNow ? 'انضم الآن' : 'صفحة الحصة'}
                  </HqActionLink>
                )} />

              {/* 7. Homework / Exams */}
              <JourneyNode index={7} title="الواجبات والاختبارات" status={tasksKnown ? st('tasks') : 'upcoming'}
                proof={!tasksKnown
                  ? 'جارٍ تحميل مهامك...'
                  : ((pendingHomework || 0) + (pendingExams || 0)) > 0
                  ? `${pendingHomework} واجبًا معلقًا · ${pendingExams} اختبارًا بانتظارك`
                  : 'لا معلّق عليك الآن — أحسنت'}
                action={tasksKnown && ((pendingHomework || 0) + (pendingExams || 0)) > 0 && (
                  <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(pendingHomework || 0) > 0 && <HqActionLink to="/student/homework">الواجبات</HqActionLink>}
                    {(pendingExams || 0) > 0 && <HqActionLink to="/student/exams" primary={pendingHomework === 0}>الاختبارات</HqActionLink>}
                  </span>
                )} />

              {/* 8. Khatm — JuzMap lives ONLY here */}
              <JourneyNode index={8} title="الختمة" status={st('khatm')}
                proof={`${completedJuz.length} من 30 جزءًا`}>
                <button type="button" onClick={() => setJuzOpen(o => !o)} aria-expanded={juzOpen}
                  style={{ minHeight: 48, padding: '0 20px', borderRadius: 12, border: `1px solid ${HQ.LINE}`, background: HQ.SURFACE, color: HQ.INK, fontWeight: 800, fontSize: 14, cursor: 'pointer', width: '100%' }}>
                  {juzOpen ? 'إخفاء خريطة الأجزاء' : 'عرض خريطة الأجزاء الثلاثين'}
                </button>
                {juzOpen && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }} role="list" aria-label="خريطة الأجزاء">
                      {JUZ.map(j => {
                        const isDone = completedJuz.includes(j);
                        return (
                          <span key={j} role="listitem"
                            aria-label={`الجزء ${j}: ${isDone ? 'مكتمل' : 'لم يبدأ'}`}
                            style={{
                              aspectRatio: '1', borderRadius: 12, display: 'inline-flex',
                              alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: 14,
                              background: isDone ? HQ.MENTOR : HQ.SURFACE,
                              color: isDone ? '#fff' : HQ.MUTED,
                              border: `1px solid ${isDone ? HQ.MENTOR : HQ.LINE}`,
                            }}>
                            {isDone ? <CheckCircle2 size={16} /> : j}
                          </span>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 13, color: HQ.MUTED, margin: '8px 0 0' }}>
                      <BookOpen size={13} style={{ verticalAlign: -2 }} /> اللون حالة فقط: الأخضر مكتمل، والباقي بانتظار دورك.
                    </p>
                  </div>
                )}
              </JourneyNode>

              {/* 9. Ijazah */}
              <JourneyNode index={9} title="الإجازة" status={st('ijazah')}
                proof={awarded
                  ? 'مُنحت الإجازة بالسند — مبارك'
                  : ijazah
                    ? `أجزاء معتمدة للإجازة: ${(ijazah.completedJuz || []).length}/30 — تُمنح بعد إتمام 30 جزءاً والعرض على الشيخ`
                    : 'تُمنح بعد إتمام الختمة (30/30) والعرض على الشيخ'}
                action={awarded && (
                  <button type="button" onClick={() => setIsCertificateOpen(true)} className="hq-action"
                    style={{ background: HQ.GOLD, color: HQ.INK, padding: '0 24px', fontSize: 15, fontWeight: 800 }}>
                    <Award size={17} /> عرض شهادة الإجازة
                  </button>
                )} />
            </div>
          </>
        )}
      </div>

      <IjazahCertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        ijazah={ijazah}
      />
    </PageLayout>
  );
}
