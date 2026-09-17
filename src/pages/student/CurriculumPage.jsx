import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle, BookOpen, ExternalLink, Video,
  Lock, Award, PenTool, Users, Calendar,
} from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Sidebar from '../../components/shared/Sidebar';
import MobileBottomNav from '../../components/shared/MobileBottomNav';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import api from '../../services/api';
import VideoPlayer, { isVideoUrl } from '../../components/shared/VideoPlayer';
import useLessonProgress, { getRandomMotivation } from '../../hooks/useLessonProgress';
import { LESSON_TYPES_AR, DAYS_AR, SESSION_TYPES } from '../../utils/constants';
import { formatTime, getLevelLabel, NO_GROUP_TITLE, NO_GROUP_HINT } from '../../utils/helpers';
import toast from 'react-hot-toast';
import '../../components/halaqa/halaqa.css';
import { HQ, HqAvatar, HqBadge } from '../../components/halaqa/primitives';
import { HqActionLink } from '../../components/halaqa/JourneyNode';

/* المنهج — part of the student's journey, not a cold academic dashboard.
   Same endpoints and completion logic; only the hierarchy changed.
   List-first: lessons are rows; the current lesson is unmistakable. */

/* ── Step definitions per lesson (logic unchanged) ── */
const STEP_DEFS = {
  readMaterial:  { key: 'readMaterial',  label: 'قراءة المادة',      icon: BookOpen },
  watchedVideo:  { key: 'watchedVideo',  label: 'مشاهدة الفيديو',    icon: Video },
  exercises:     { key: 'exercises',     label: 'حل التمارين',       icon: PenTool },
  exam:          { key: 'exam',          label: 'اجتياز الاختبار',   icon: Award },
};

function getStepsForLesson(lesson) {
  const steps = [STEP_DEFS.readMaterial];
  if (isVideoUrl(lesson.resources)) steps.push(STEP_DEFS.watchedVideo);
  steps.push(STEP_DEFS.exercises, STEP_DEFS.exam);
  return steps;
}

export default function CurriculumPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams]     = useSearchParams();
  const currentTab                          = searchParams.get('tab') === 'group' ? 'group' : 'curriculum';
  const { group, students, fetchMyGroup, fetchGroupStudents } = useGroupStore();
  const [activeSession, setActiveSession]   = useState(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [customLessons, setCustomLessons]   = useState([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [expandedLesson, setExpandedLesson] = useState(null);

  /* ── Progress hook (logic unchanged) ── */
  const {
    toggleStep, isStepDone, completedCount,
    completionPct, allDone, totalFullyCompleted, earnedBadges,
  } = useLessonProgress();

  /* ── Data fetching (endpoints unchanged) ── */
  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const groupId = user?.group?._id || user?.group;
        if (groupId) {
          fetchMyGroup(groupId);
          fetchGroupStudents(groupId);
          const planRes = await api.get(`/study-plans/group/${groupId}/full`).catch(() => null);
          if (planRes?.data?.plan?.customLessons?.length) {
            const lessons = planRes.data.plan.customLessons;
            setCustomLessons(lessons);
            const userDone = new Set((user.completedLessons || []).map(id => id.toString()));
            lessons.forEach(l => {
              if (l.status === 'completed') userDone.add(l._id.toString());
            });
            setCompletedLessons(userDone);
            return;
          }
        }
        setCompletedLessons(new Set((user.completedLessons || []).map(id => id.toString())));
      } catch {} finally { setIsLoading(false); }
    };
    fetch();

    api.get('/live/active/me').then(res => {
      if (res.data?.session) setActiveSession(res.data.session);
    }).catch(() => {});
  }, [user]);

  /* ── Derived state (logic unchanged) ── */
  const totalLessons   = customLessons.length;
  const backendCompleted = completedLessons.size;

  const localFullyCompleted = useMemo(() =>
    totalFullyCompleted(customLessons, getStepsForLesson),
  [customLessons, totalFullyCompleted]);

  const totalCompleted = Math.max(backendCompleted, localFullyCompleted);
  const progressPct    = totalLessons ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  const badges = useMemo(() =>
    earnedBadges(totalCompleted, totalLessons),
  [earnedBadges, totalCompleted, totalLessons]);
  const earnedOnly = (badges || []).filter(b => b.earned);

  const isUnlocked = (index) => {
    if (index === 0) return true;
    const prev  = customLessons[index - 1];
    const prevId = prev._id?.toString();
    return prev.status === 'completed' || completedLessons.has(prevId) || allDone(prevId, getStepsForLesson(prev));
  };

  const lessonDone = (lesson, lid) =>
    lesson.status === 'completed' || completedLessons.has(lid) || completedLessons.has(lid?.toString());

  /* Current lesson: first unlocked, incomplete — the clearest element */
  const currentIndex = customLessons.findIndex((l, i) => {
    const lid = l._id?.toString();
    return isUnlocked(i) && !lessonDone(l, lid) && !(allDone(lid, getStepsForLesson(l)));
  });

  /* ── Step toggle handler: the exam step is quiz-gated (see LessonPage) ── */
  const handleToggleStep = (lessonId, step, lessonIndex) => {
    if (step.key === 'exam' && !isStepDone(lessonId, 'exam')) {
      toast.error('خطوة الاختبار تُفتح فقط باجتياز اختبار الدرس (4 من 5) داخل صفحة الدرس');
      return;
    }
    const wasDone = isStepDone(lessonId, step.key);
    toggleStep(lessonId, step.key);

    if (!wasDone) {
      toast.success(step.label);
      const lesson = customLessons[lessonIndex];
      const steps  = getStepsForLesson(lesson);
      const doneAfter = steps.filter(s =>
        s.key === step.key ? true : isStepDone(lessonId, s.key),
      ).length;

      if (doneAfter === steps.length) {
        toast.success(`أكملت الدرس ${lesson.lessonNumber}: ${lesson.title}`, { duration: 4000 });
        toast(getRandomMotivation(), { duration: 3000 });
        if (!completedLessons.has(lessonId)) markComplete(lessonId);
      }
    }
  };

  /* ── Mark complete in backend (unchanged) ── */
  const markComplete = async (lessonId) => {
    try {
      await api.put(`/curriculum/complete-lesson/${lessonId}`);
      setCompletedLessons(prev => new Set([...prev, lessonId]));
    } catch {}
  };

  const h2 = { margin: 0, fontSize: 18, fontWeight: 800, color: HQ.INK };

  /* ── Loading: skeleton of the known structure ── */
  if (isLoading) return (
    <div className="halaqa" style={{ minHeight: '100vh', background: HQ.PAPER }}>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <main style={{ paddingTop: 64, paddingBottom: 80 }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px' }} aria-label="جارٍ تحميل المنهج">
          <div className="hq-skeleton" style={{ height: 26, width: '40%', marginBottom: 8 }} />
          <div className="hq-skeleton" style={{ height: 14, width: '65%', marginBottom: 20 }} />
          <div className="hq-skeleton" style={{ height: 64, width: '100%', marginBottom: 12 }} />
          <div className="hq-skeleton" style={{ height: 64, width: '100%', marginBottom: 12 }} />
          <div className="hq-skeleton" style={{ height: 64, width: '100%' }} />
        </div>
      </main>
    </div>
  );

  const hasContent = customLessons.length > 0;

  return (
    <div className="halaqa" style={{ minHeight: '100vh', background: HQ.PAPER }}>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:mr-64" style={{ paddingTop: 64, paddingBottom: 88 }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px' }}>

          {/* ── Header: where am I ── */}
          <p style={{ margin: 0, fontSize: 14, color: HQ.MUTED }}>
            {user?.assignedLevel ? getLevelLabel(user.assignedLevel) : ''}{group?.name ? ` · ${group.name}` : ''}
          </p>
          <h1 style={{ margin: '2px 0 4px', fontSize: 26, fontWeight: 900, color: HQ.INK }}>منهجي</h1>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: HQ.MUTED }}>
            {hasContent ? `${totalCompleted} من ${totalLessons} درسًا مكتملًا (${progressPct}%)` : 'خطة دروس مجموعتك'}
          </p>

          {/* ── Quiet progress (no second living element) ── */}
          {hasContent && currentTab === 'curriculum' && (
            <div style={{ marginBottom: 20 }} role="img" aria-label={`تقدم المنهج ${progressPct} بالمئة`}>
              <div style={{ height: 8, borderRadius: 9999, background: HQ.LINE, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: HQ.MENTOR, borderRadius: 9999 }} />
              </div>
              {earnedOnly.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {earnedOnly.map(b => (
                    <span key={b.id} title={b.desc}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F8EDD3', color: HQ.INK, borderRadius: 9999, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>
                      {b.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tabs: segmented, quiet ── */}
          <div role="tablist" aria-label="أقسام المنهج"
            style={{ display: 'inline-flex', gap: 4, background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 14, padding: 4, marginBottom: 20 }}>
            {[
              { key: 'curriculum', label: 'الدروس' },
              { key: 'group', label: `المجموعة${group?.name ? ` · ${group.name}` : ''}` },
            ].map(t => (
              <button key={t.key} role="tab" aria-selected={currentTab === t.key}
                onClick={() => setSearchParams({ tab: t.key })}
                style={{
                  border: 'none', cursor: 'pointer', minHeight: 44, padding: '0 20px',
                  borderRadius: 10, fontSize: 14, fontWeight: 800,
                  background: currentTab === t.key ? HQ.MENTOR : 'transparent',
                  color: currentTab === t.key ? '#fff' : HQ.MUTED,
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Live banner (functional, flat) ── */}
          {activeSession && activeSession.status === 'live' && (
            <div role="status" style={{ marginBottom: 20, background: '#C2410C', color: '#fff', borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="hq-live-dot" aria-hidden style={{ background: '#fff', animation: 'none', opacity: 1 }} />
              <span style={{ flex: 1, minWidth: 180 }}>
                <strong style={{ display: 'block', fontSize: 15 }}>الحصة منعقدة الآن{activeSession.title ? `: ${activeSession.title}` : ''}</strong>
                <span style={{ fontSize: 13, opacity: 0.9 }}>انضم للتسميع والمشاركة في الحلقة</span>
              </span>
              <Link to="/student/live" className="hq-action" style={{ background: '#fff', color: '#C2410C', padding: '0 20px', fontSize: 14, textDecoration: 'none' }}>
                <Video size={16} /> انضم الآن
              </Link>
            </div>
          )}

          {currentTab === 'group' ? (
            /* ── Group tab (same data, halaqa surfaces) ── */
            !group ? (
              <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 48, textAlign: 'center' }}>
                <Users size={44} color={HQ.LINE} style={{ margin: '0 auto 12px' }} />
                <h2 style={h2}>{NO_GROUP_TITLE}</h2>
                <p style={{ color: HQ.MUTED, fontSize: 14, margin: '0 0 20px' }}>{NO_GROUP_HINT}</p>
                <HqActionLink to="/student/quran">افتح المصحف ريثما يتم تعيينك</HqActionLink>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <section aria-label="معلومات المجموعة" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 16 }}>
                  <h2 style={{ ...h2, marginBottom: 12 }}>مجموعتي</h2>
                  <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: HQ.INK }}>{group.name}</p>
                  <p style={{ margin: '0 0 12px', fontSize: 14, color: HQ.MUTED }}>{group.students?.length || 0} من {group.maxStudents || 15} طالبًا</p>
                  {group.teacher && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: `1px solid ${HQ.LINE}` }}>
                      <HqAvatar firstName={group.teacher.firstName} lastName={group.teacher.lastName} size={40} />
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: HQ.INK }}>الشيخ / {group.teacher.firstName} {group.teacher.lastName}</p>
                        <HqBadge tone="guide">معلم المجموعة</HqBadge>
                      </div>
                    </div>
                  )}
                  {group.description && <p style={{ margin: '12px 0 0', fontSize: 14, color: HQ.MUTED, lineHeight: 1.8 }}>{group.description}</p>}
                </section>

                <section aria-label="أيام الدراسة والجدول" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 16 }}>
                  <h2 style={{ ...h2, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={18} /> المواعيد</h2>
                  {group.days?.length > 0 ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: group.schedule?.length ? 12 : 0 }}>
                      {group.days.map((day, i) => (
                        <HqBadge key={i} tone="mentor">{DAYS_AR[day] || day}</HqBadge>
                      ))}
                    </div>
                  ) : null}
                  {group.schedule?.length > 0 ? (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {group.schedule.map((s, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 4px', borderTop: i ? `1px solid ${HQ.LINE}` : 'none', fontSize: 14 }}>
                          <strong style={{ color: HQ.INK }}>{DAYS_AR[s.dayOfWeek]}</strong>
                          <span style={{ color: HQ.MUTED }}>{formatTime(s.startTime)} — {formatTime(s.endTime)}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: HQ.MUTED }}>{SESSION_TYPES[s.sessionType] || s.sessionType}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (!group.days?.length && <p style={{ color: HQ.MUTED, fontSize: 14, margin: 0 }}>لم يُحدد الجدول بعد</p>)}
                </section>

                <section aria-label="زملاء المجموعة" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 16 }}>
                  <h2 style={{ ...h2, marginBottom: 8 }}>زملائي ({students?.length || 0})</h2>
                  {students?.length > 0 ? (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {students.map((student) => (
                        <li key={student._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderTop: `1px solid ${HQ.LINE}` }}>
                          <HqAvatar firstName={student.firstName} lastName={student.lastName} size={36} />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontWeight: 800, fontSize: 15, color: HQ.INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {student.firstName} {student.lastName}
                              {student._id === user?._id && <span style={{ color: HQ.MENTOR, fontSize: 13 }}> (أنت)</span>}
                            </span>
                            <span style={{ display: 'block', fontSize: 13, color: HQ.MUTED }}>{student.memorizedVerses || 0} آية محفوظة</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: HQ.MUTED, fontSize: 14, margin: 0 }}>لا يوجد طلاب مسجلون في المجموعة بعد</p>
                  )}
                </section>
              </div>
            )
          ) : (
            /* ── Curriculum tab ── */
            <>
              {!hasContent ? (
                <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 48, textAlign: 'center' }}>
                  <BookOpen size={44} color={HQ.LINE} style={{ margin: '0 auto 12px' }} />
                  <h2 style={h2}>{!group ? NO_GROUP_TITLE : 'لم يُعيَّن منهج بعد'}</h2>
                  <p style={{ color: HQ.MUTED, fontSize: 14, margin: '0 0 20px' }}>{!group ? NO_GROUP_HINT : 'سيقوم المعلم أو الإدارة بتعيين منهجك الدراسي قريبًا'}</p>
                  {!group && <HqActionLink to="/student/quran">افتح المصحف ريثما يتم تعيينك</HqActionLink>}
                </div>
              ) : (
                <>
                  {/* Graduation — gold only at a real milestone */}
                  {progressPct >= 100 && (
                    <div role="status" style={{ marginBottom: 20, background: '#F8EDD3', border: '1px solid #D9A441', borderRadius: 18, padding: 20, textAlign: 'center' }}>
                      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: HQ.INK }}>مبارك! أتممت جميع دروس المنهج</h2>
                      <p style={{ margin: '0 0 12px', fontSize: 14, color: HQ.MUTED }}>أكملت الدروس المخصصة لمجموعتك بنجاح</p>
                      <HqActionLink to="/student/exams">الامتحانات والترقية للمستوى التالي</HqActionLink>
                    </div>
                  )}

                  {/* ── Lesson list: rows, current unmistakable ── */}
                  <h2 style={{ ...h2, marginBottom: 4 }}>الدروس ({totalLessons})</h2>
                  <ol style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                    {customLessons.map((lesson, i) => {
                      const lid         = lesson._id;
                      const lidStr      = lid?.toString();
                      const steps       = getStepsForLesson(lesson);
                      const isDone      = lessonDone(lesson, lid) || lessonDone(lesson, lidStr) || allDone(lid, steps);
                      const unlocked    = isUnlocked(i);
                      const isExpanded  = expandedLesson === lid;
                      const hasVideo    = isVideoUrl(lesson.resources);
                      const pct         = isDone ? 100 : completionPct(lid, steps);
                      const doneSteps   = isDone ? steps.length : completedCount(lid, steps);
                      const isCurrent   = i === currentIndex;
                      const isLiveForThis = activeSession && activeSession.status === 'live' && (activeSession.lessonCovered?.toString() === lidStr || (!activeSession.lessonCovered && i === 0));

                      return (
                        <li key={lid || i}
                          style={{
                            background: isCurrent ? '#E2EFE7' : HQ.SURFACE,
                            border: `1px solid ${isCurrent ? HQ.MENTOR : HQ.LINE}`,
                            borderRadius: 18, marginBottom: 12, overflow: 'hidden',
                            opacity: !unlocked ? 0.65 : 1,
                          }}>
                          {/* Row header */}
                          <div
                            role="button" tabIndex={unlocked ? 0 : -1} aria-disabled={!unlocked}
                            aria-expanded={isExpanded}
                            onClick={() => unlocked && setExpandedLesson(isExpanded ? null : lid)}
                            onKeyDown={(e) => { if (unlocked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setExpandedLesson(isExpanded ? null : lid); } }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, cursor: unlocked ? 'pointer' : 'default', minHeight: 64 }}
                          >
                            <span aria-hidden
                              className={isCurrent ? 'hq-now-pulse' : ''}
                              style={{
                                width: 30, height: 30, borderRadius: 9999, flex: 'none',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 13, fontWeight: 800,
                                background: isDone ? HQ.MENTOR : isCurrent ? HQ.SURFACE : 'transparent',
                                color: isDone ? '#fff' : isCurrent ? HQ.MENTOR : HQ.MUTED,
                                border: `2px solid ${isDone || isCurrent ? HQ.MENTOR : HQ.LINE}`,
                              }}>
                              {isDone ? <CheckCircle size={15} /> : !unlocked ? <Lock size={13} /> : (lesson.lessonNumber || i + 1)}
                            </span>

                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: 16, color: isDone ? HQ.MENTOR : HQ.INK }}>
                                  {lesson.title}
                                </strong>
                                {isCurrent && <HqBadge tone="mentor">درسك الحالي</HqBadge>}
                                {isLiveForThis && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: '#C2410C' }}>
                                    <span className="hq-live-dot" aria-hidden /> الحصة الآن
                                  </span>
                                )}
                              </span>
                              <span style={{ display: 'block', fontSize: 13, color: HQ.MUTED, marginTop: 2 }}>
                                {LESSON_TYPES_AR?.[lesson.type] || lesson.type}
                                {lesson.duration ? ` · ${lesson.duration} دقيقة` : ''}
                                {lesson.isLiveRequired ? ' · يتطلب حضورًا مباشرًا' : ''}
                                {unlocked && !isDone ? ` · ${doneSteps}/${steps.length} مراحل` : ''}
                                {hasVideo ? ' · فيديو' : ''}
                              </span>
                              {!unlocked && (
                                <span style={{ display: 'block', fontSize: 13, color: HQ.MUTED, marginTop: 2 }}>
                                  ستتاح بعد إتمام الدرس السابق
                                </span>
                              )}
                            </span>

                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                              {isLiveForThis && (
                                <Link to="/student/live" className="hq-action" style={{ background: '#C2410C', color: '#fff', padding: '0 16px', fontSize: 13, textDecoration: 'none' }}>
                                  <Video size={15} /> انضم
                                </Link>
                              )}
                              {unlocked && (
                                <Link to={`/student/lessons/${lid}`} className="hq-action"
                                  style={{
                                    background: isCurrent ? HQ.MENTOR : HQ.PAPER, color: isCurrent ? '#fff' : HQ.MENTOR,
                                    border: isCurrent ? 'none' : `1.5px solid ${HQ.MENTOR}`,
                                    padding: '0 16px', fontSize: 13, textDecoration: 'none',
                                  }}>
                                  {isDone ? 'مراجعة' : 'ابدأ'}
                                </Link>
                              )}
                            </span>
                          </div>

                          {/* Expanded: steps + video + resources + confirm */}
                          {isExpanded && unlocked && (
                            <div style={{ borderTop: `1px solid ${HQ.LINE}`, padding: 14 }}>
                              {lesson.description && (
                                <p style={{ margin: '0 0 12px', fontSize: 14, color: HQ.MUTED, lineHeight: 1.8 }}>{lesson.description}</p>
                              )}

                              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800, color: HQ.MUTED }}>مراحل إكمال الدرس</p>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }} role="group" aria-label="مراحل الدرس">
                                {steps.map((step) => {
                                  const sDone = isStepDone(lid, step.key);
                                  const Icon = step.icon;
                                  const quizGated = step.key === 'exam' && !sDone;
                                  return (
                                    <button key={step.key} type="button" aria-pressed={sDone}
                                      title={quizGated ? 'تُفتح باجتياز اختبار الدرس داخل صفحة الدرس' : step.label}
                                      onClick={() => handleToggleStep(lid, step, i)}
                                      style={{
                                        flex: 1, minWidth: 0, minHeight: 64, cursor: 'pointer',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                                        background: sDone ? '#E2EFE7' : HQ.PAPER,
                                        border: `1px solid ${sDone ? HQ.MENTOR : HQ.LINE}`,
                                        borderRadius: 12, padding: 8,
                                      }}>
                                      <span style={{
                                        width: 30, height: 30, borderRadius: 9999,
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        background: sDone ? HQ.MENTOR : HQ.SURFACE, color: sDone ? '#fff' : HQ.MUTED,
                                        border: `1px solid ${sDone ? HQ.MENTOR : HQ.LINE}`,
                                      }}>
                                        {sDone ? <CheckCircle size={15} /> : <Icon size={15} />}
                                      </span>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: sDone ? HQ.MENTOR : HQ.MUTED, textAlign: 'center', lineHeight: 1.5 }}>
                                        {step.label}{quizGated ? ' (بالاختبار)' : ''}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {hasVideo && (
                                <div style={{ marginBottom: 12 }}>
                                  <VideoPlayer url={lesson.resources} title={lesson.title} />
                                </div>
                              )}

                              {lesson.resources && !hasVideo && (
                                <a href={lesson.resources} target="_blank" rel="noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: HQ.MENTOR, background: '#E2EFE7', borderRadius: 12, padding: '12px 16px', textDecoration: 'none', minHeight: 48 }}>
                                  <ExternalLink size={16} /> فتح مصادر الدرس
                                </a>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${HQ.LINE}` }}>
                                {isDone ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: HQ.MENTOR, fontWeight: 800 }}>
                                    <CheckCircle size={16} /> تم إكمال جميع المراحل
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 13, color: HQ.MUTED }}>اضغط على كل مرحلة عند إكمالها</span>
                                )}
                                {!isDone && allDone(lid, steps) && !completedLessons.has(lid) && (
                                  <button type="button" onClick={() => markComplete(lid)} className="hq-action"
                                    style={{ background: HQ.MENTOR, color: '#fff', padding: '0 20px', fontSize: 14 }}>
                                    تأكيد الإكمال
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>

                  {progressPct >= 100 && (
                    <div role="status" style={{ marginTop: 8, background: '#F8EDD3', border: '1px solid #D9A441', borderRadius: 18, padding: 24, textAlign: 'center' }}>
                      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: HQ.INK }}>تهانينا! أكملت جميع الدروس</h2>
                      <p style={{ margin: 0, fontSize: 14, color: HQ.MUTED }}>بارك الله فيك وزادك علمًا وحفظًا</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
