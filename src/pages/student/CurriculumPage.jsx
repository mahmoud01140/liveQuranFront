import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import {
  CheckCircle, BookOpen, Clock, Star, ExternalLink, Play, Video,
  ChevronDown, ChevronUp, Lock, Unlock, Award, PenTool,
  Trophy, Sparkles, PartyPopper,
} from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Sidebar from '../../components/shared/Sidebar';
import MobileBottomNav from '../../components/shared/MobileBottomNav';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import VideoPlayer, { isVideoUrl } from '../../components/shared/VideoPlayer';
import useLessonProgress, { BADGES, getRandomMotivation } from '../../hooks/useLessonProgress';
import { LESSON_TYPES_AR } from '../../utils/constants';
import toast from 'react-hot-toast';

/* ── Lesson type colors ──────────────────────────────────── */
const LESSON_TYPE_COLORS = {
  reading: 'bg-blue-50 text-blue-700', writing: 'bg-purple-50 text-purple-700',
  dictation: 'bg-yellow-50 text-yellow-700', memorization: 'bg-green-50 text-green-700',
  tajweed: 'bg-indigo-50 text-indigo-700', recitation: 'bg-teal-50 text-teal-700',
  live_class: 'bg-red-50 text-red-700', review: 'bg-orange-50 text-orange-700',
  exam: 'bg-gray-100 text-gray-700',
};

/* ── Step definitions per lesson ─────────────────────────── */
const STEP_DEFS = {
  readMaterial:  { key: 'readMaterial',  label: 'قراءة المادة',      icon: BookOpen, color: 'blue'   },
  watchedVideo:  { key: 'watchedVideo',  label: 'مشاهدة الفيديو',    icon: Video,    color: 'purple' },
  exercises:     { key: 'exercises',     label: 'حل التمارين',       icon: PenTool,  color: 'amber'  },
  exam:          { key: 'exam',          label: 'اجتياز الاختبار',   icon: Award,    color: 'green'  },
};

function getStepsForLesson(lesson) {
  const steps = [STEP_DEFS.readMaterial];
  if (isVideoUrl(lesson.resources)) steps.push(STEP_DEFS.watchedVideo);
  steps.push(STEP_DEFS.exercises, STEP_DEFS.exam);
  return steps;
}

/* ═══════════════════════════════════════════════════════════
   CurriculumPage
═══════════════════════════════════════════════════════════ */
export default function CurriculumPage() {
  const { user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [customLessons, setCustomLessons]   = useState([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);

  /* ── Progress hook ─────────────────────────────────────── */
  const {
    toggleStep, isStepDone, completedCount,
    completionPct, allDone, totalFullyCompleted, earnedBadges,
  } = useLessonProgress();

  /* ── Data fetching ─────────────────────────────────────── */
  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const groupId = user?.group?._id || user?.group;
        if (groupId) {
          const planRes = await api.get(`/study-plans/group/${groupId}/full`).catch(() => null);
          if (planRes?.data?.plan?.customLessons?.length) {
            setCustomLessons(planRes.data.plan.customLessons);
            setCompletedLessons(new Set(user.completedLessons || []));
            return;
          }
        }
        setCompletedLessons(new Set(user.completedLessons || []));
      } catch {} finally { setIsLoading(false); }
    };
    fetch();
  }, [user]);

  /* ── Derived state ─────────────────────────────────────── */
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

  /* ── Is lesson unlocked? ───────────────────────────────── */
  const isUnlocked = (index) => {
    if (index === 0) return true;
    const prev  = customLessons[index - 1];
    const prevId = prev._id;
    return completedLessons.has(prevId) || allDone(prevId, getStepsForLesson(prev));
  };

  /* ── Step toggle handler ───────────────────────────────── */
  const handleToggleStep = (lessonId, step, lessonIndex) => {
    const wasDone = isStepDone(lessonId, step.key);
    toggleStep(lessonId, step.key);

    if (!wasDone) {
      toast.success(`✅ ${step.label}`, { icon: '📗', duration: 2000 });

      // Check if this completes the lesson
      const lesson = customLessons[lessonIndex];
      const steps  = getStepsForLesson(lesson);
      const doneAfter = steps.filter(s =>
        s.key === step.key ? true : isStepDone(lessonId, s.key),
      ).length;

      if (doneAfter === steps.length) {
        // Lesson fully completed!
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
        toast.success(`🎉 أكملت الدرس ${lesson.lessonNumber}: ${lesson.title}!`, { duration: 4000 });
        toast(getRandomMotivation(), { icon: '💬', duration: 3000 });

        // Auto mark complete in backend if not already
        if (!completedLessons.has(lessonId)) {
          markComplete(lessonId);
        }
      }
    }
  };

  /* ── Mark complete in backend ──────────────────────────── */
  const markComplete = async (lessonId) => {
    try {
      await api.put(`/curriculum/complete-lesson/${lessonId}`);
      setCompletedLessons(prev => new Set([...prev, lessonId]));
    } catch {}
  };

  /* ── Loading ───────────────────────────────────────────── */
  if (isLoading) return (
    <div className="min-h-screen bg-gray-50"><Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="pt-16 flex justify-center py-20"><LoadingSpinner size="lg" /></div>
    </div>
  );

  const hasContent = customLessons.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.6 }}
              className="text-8xl"
            >
              🎉
            </motion.div>
            {/* Confetti particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 1,
                  x: 0, y: 0,
                  scale: 1,
                }}
                animate={{
                  opacity: 0,
                  x: (Math.random() - 0.5) * 400,
                  y: (Math.random() - 0.5) * 400,
                  scale: 0,
                  rotate: Math.random() * 720,
                }}
                transition={{ duration: 1.5 + Math.random(), delay: 0.2 }}
                className="absolute text-2xl"
              >
                {['⭐', '🌟', '✨', '🎊', '💫', '🏆'][i % 6]}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="lg:mr-64 pt-16 pb-20 lg:pb-8">
        <div className="page-container">

          {/* ── Header ──────────────────────────────────── */}
          <div className="mb-6">
            <h1 className="section-title flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary-400" /> المنهج الدراسي
            </h1>
            <p className="section-subtitle">تابع تقدمك خطوة بخطوة — أكمل كل مرحلة للانتقال إلى التالية</p>
          </div>

          {!hasContent ? (
            <div className="card-base p-12 text-center max-w-md mx-auto">
              <BookOpen className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <h2 className="font-black text-gray-900 text-lg mb-2">لم يُعيَّن منهج بعد</h2>
              <p className="text-gray-500 text-sm">سيقوم المعلم أو الإدارة بتعيين منهجك الدراسي قريباً</p>
            </div>
          ) : (
            <>
              {/* ── Overall progress + badges ──────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

                {/* Progress card */}
                <div className="lg:col-span-2 card-base p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-emerald-500 flex items-center justify-center text-white">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-gray-900">تقدمك في المنهج</span>
                        <p className="text-xs text-gray-400">{totalCompleted} من {totalLessons} درس مكتمل</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-2xl font-black text-primary-500">{progressPct}%</span>
                    </div>
                  </div>
                  <div className="progress-bar mb-2 h-3 rounded-full">
                    <motion.div
                      className="progress-fill h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>البداية</span>
                    <span>{progressPct >= 100 ? '🎉 مكتمل!' : `متبقي ${totalLessons - totalCompleted} دروس`}</span>
                    <span>الإتمام</span>
                  </div>
                </div>

                {/* Badges card */}
                <div className="card-base p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-gray-900 text-sm">شارات الإنجاز</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((b) => (
                      <motion.div
                        key={b.id}
                        whileHover={{ scale: 1.1 }}
                        className={`flex flex-col items-center p-2 rounded-xl min-w-[60px] transition-all ${
                          b.earned
                            ? 'bg-gradient-to-b from-amber-50 to-yellow-50 border border-amber-200 shadow-sm'
                            : 'bg-gray-50 border border-gray-100 opacity-40'
                        }`}
                        title={b.desc}
                      >
                        <span className="text-xl mb-0.5">{b.emoji}</span>
                        <span className={`text-[10px] font-bold ${b.earned ? 'text-amber-700' : 'text-gray-400'}`}>
                          {b.name}
                        </span>
                        {b.earned && (
                          <span className="text-[9px] text-green-500 font-bold">✓</span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Lesson cards ───────────────────────────── */}
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-400" />
                <h2 className="font-bold text-gray-900 text-sm">الدروس المخصصة لمجموعتك</h2>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                  {customLessons.length} درس
                </span>
              </div>

              <div className="space-y-3">
                {customLessons.map((lesson, i) => {
                  const lid         = lesson._id;
                  const steps       = getStepsForLesson(lesson);
                  const isDone      = completedLessons.has(lid) || allDone(lid, steps);
                  const unlocked    = isUnlocked(i);
                  const isExpanded  = expandedLesson === lid;
                  const hasVideo    = isVideoUrl(lesson.resources);
                  const pct         = completionPct(lid, steps);
                  const doneSteps   = completedCount(lid, steps);

                  return (
                    <motion.div
                      key={lid || i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`card-base overflow-hidden transition-all ${
                        !unlocked ? 'opacity-60' : ''
                      } ${isDone ? 'ring-1 ring-primary-200' : ''}`}
                    >
                      {/* ── Lesson header ──────────────────── */}
                      <div
                        className={`p-4 cursor-pointer transition-colors ${
                          isDone ? 'bg-gradient-to-l from-primary-50/60 to-emerald-50/60' :
                          unlocked ? 'hover:bg-gray-50' : 'bg-gray-50/50'
                        }`}
                        onClick={() => unlocked && setExpandedLesson(isExpanded ? null : lid)}
                      >
                        <div className="flex items-center gap-3">
                          {/* Number / status icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${
                            isDone
                              ? 'bg-gradient-to-br from-primary-400 to-emerald-500 text-white shadow-md'
                              : unlocked
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-200 text-gray-400'
                          }`}>
                            {isDone ? <CheckCircle className="w-5 h-5" /> :
                             unlocked ? lesson.lessonNumber :
                             <Lock className="w-4 h-4" />}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className={`text-sm font-bold ${
                                isDone ? 'text-primary-700' :
                                unlocked ? 'text-gray-900' : 'text-gray-400'
                              }`}>
                                {lesson.title}
                              </p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                LESSON_TYPE_COLORS[lesson.type] || 'bg-gray-100 text-gray-600'
                              }`}>
                                {LESSON_TYPES_AR?.[lesson.type] || lesson.type}
                              </span>
                              {hasVideo && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center gap-0.5">
                                  <Video className="w-2.5 h-2.5" /> فيديو
                                </span>
                              )}
                              {isDone && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-bold">
                                  ✓ مكتمل
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {lesson.duration} دقيقة</span>
                              {lesson.isLiveRequired && <span className="text-red-400 font-medium">· مباشر</span>}
                              {unlocked && <span className="text-primary-400 font-medium">{doneSteps}/{steps.length} مراحل</span>}
                            </div>
                          </div>

                          {/* Progress circle + expand */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {unlocked && (
                              <Link
                                to={`/student/lessons/${lid}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 py-1.5 px-3.5 bg-primary-400 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0"
                              >
                                {isDone ? 'مراجعة الدرس' : 'ابدأ الدرس ➔'}
                              </Link>
                            )}
                            {unlocked && (
                              <div className="relative w-10 h-10 flex-shrink-0">
                                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                  <circle
                                    cx="18" cy="18" r="15.5" fill="none"
                                    stroke={isDone ? '#1D9E75' : '#fbbf24'}
                                    strokeWidth="3"
                                    strokeDasharray={`${pct} ${100 - pct}`}
                                    strokeLinecap="round"
                                    className="transition-all duration-500"
                                  />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-600">
                                  {pct}%
                                </span>
                              </div>
                            )}
                            {unlocked && (
                              <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                          </div>

                        </div>

                        {/* Locked message */}
                        {!unlocked && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-2">
                            <Lock className="w-3.5 h-3.5" />
                            <span>أكمل الدرس السابق لفتح هذا الدرس</span>
                          </div>
                        )}
                      </div>

                      {/* ── Expanded content ───────────────── */}
                      <AnimatePresence>
                        {isExpanded && unlocked && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-4">

                              {/* Description */}
                              {lesson.description && (
                                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">
                                  {lesson.description}
                                </p>
                              )}

                              {/* ── Progress stepper ─────────── */}
                              <div>
                                <h4 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> مراحل إكمال الدرس
                                </h4>
                                <div className="flex items-start gap-0">
                                  {steps.map((step, si) => {
                                    const done   = isStepDone(lid, step.key);
                                    const Icon   = step.icon;
                                    const isLast = si === steps.length - 1;

                                    return (
                                      <div key={step.key} className="flex items-start flex-1">
                                        {/* Step card */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleStep(lid, step, i);
                                          }}
                                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl
                                                      transition-all w-full min-w-0 group ${
                                            done
                                              ? 'bg-gradient-to-b from-primary-50 to-emerald-50 border border-primary-200 shadow-sm'
                                              : 'bg-gray-50 border border-gray-200 hover:border-primary-300 hover:bg-primary-50/30'
                                          }`}
                                        >
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                            done
                                              ? 'bg-primary-400 text-white shadow-md'
                                              : 'bg-white text-gray-400 group-hover:text-primary-400 border border-gray-200'
                                          }`}>
                                            {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                                          </div>
                                          <span className={`text-[10px] font-bold text-center leading-tight ${
                                            done ? 'text-primary-700' : 'text-gray-500'
                                          }`}>
                                            {step.label}
                                          </span>
                                        </button>

                                        {/* Connector line */}
                                        {!isLast && (
                                          <div className="flex items-center h-8 mt-3 px-0.5 flex-shrink-0">
                                            <div className={`w-3 h-0.5 ${done ? 'bg-primary-300' : 'bg-gray-200'}`} />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* ── Video player ─────────────── */}
                              {hasVideo && (
                                <div>
                                  <VideoPlayer
                                    url={lesson.resources}
                                    title={lesson.title}
                                  />
                                </div>
                              )}

                              {/* Non-video resources */}
                              {lesson.resources && !hasVideo && (
                                <a
                                  href={lesson.resources}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600
                                             bg-primary-50 rounded-xl px-4 py-2.5 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" /> فتح مصادر الدرس
                                </a>
                              )}

                              {/* Action bar */}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                {isDone ? (
                                  <div className="flex items-center gap-2 text-sm text-primary-600 font-bold">
                                    <CheckCircle className="w-4 h-4" /> تم إكمال جميع المراحل
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400">
                                    اضغط على كل مرحلة عند إكمالها
                                  </p>
                                )}

                                {!isDone && allDone(lid, steps) && !completedLessons.has(lid) && (
                                  <button
                                    onClick={() => markComplete(lid)}
                                    className="text-xs bg-primary-400 text-white px-4 py-2 rounded-xl
                                               hover:bg-primary-500 transition-colors font-bold"
                                  >
                                    ✓ تأكيد الإكمال
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* ── Completion message ──────────────────────── */}
              {progressPct >= 100 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card-base p-8 text-center mt-6 bg-gradient-to-br from-primary-50 via-emerald-50 to-teal-50
                             border border-primary-200"
                >
                  <div className="text-5xl mb-3">🎊</div>
                  <h2 className="text-xl font-black text-primary-700 mb-2">تهانينا! أكملت جميع الدروس!</h2>
                  <p className="text-sm text-gray-500">ما شاء الله — بارك الله فيك وزادك علماً وحفظاً</p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
