import { useState, useCallback } from 'react';

const STORAGE_KEY = 'lesson_step_progress';

function load()  { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
function save(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }

/* ── Badge definitions ────────────────────────────────────── */
export const BADGES = [
  { id: 'starter',    emoji: '🌱', name: 'البداية',  desc: 'أكملت أول درس',       threshold: 1  },
  { id: 'persistent', emoji: '⭐', name: 'مثابر',    desc: 'أكملت 3 دروس',        threshold: 3  },
  { id: 'excellent',  emoji: '🌟', name: 'متميز',    desc: 'أكملت 5 دروس',        threshold: 5  },
  { id: 'champion',   emoji: '🏆', name: 'بطل',      desc: 'أكملت 10 دروس',       threshold: 10 },
  { id: 'expert',     emoji: '💎', name: 'خبير',     desc: 'أكملت جميع الدروس',   threshold: Infinity },
];

/* ── Motivational messages ────────────────────────────────── */
export const MOTIVATIONAL = [
  'أحسنت! استمر في التقدم 💪',
  'ممتاز! أنت تبلي بلاءً حسناً 🌟',
  'رائع! كل خطوة تقربك من الهدف 🎯',
  'بارك الله فيك! واصل المسيرة 📖',
  'ما شاء الله! أداء متميز ✨',
];

export function getRandomMotivation() {
  return MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)];
}

/* ── Hook ─────────────────────────────────────────────────── */
export default function useLessonProgress() {
  const [progressMap, setProgressMap] = useState(load);

  const persist = useCallback((next) => {
    setProgressMap(next);
    save(next);
  }, []);

  /* Toggle a step for a lesson */
  const toggleStep = useCallback((lessonId, stepKey) => {
    setProgressMap(prev => {
      const next  = { ...prev };
      const entry = { ...(next[lessonId] || {}) };
      entry[stepKey] = !entry[stepKey];
      next[lessonId] = entry;
      save(next);
      return next;
    });
  }, []);

  /* Check if a single step is done */
  const isStepDone = useCallback((lessonId, stepKey) => {
    return !!progressMap[lessonId]?.[stepKey];
  }, [progressMap]);

  /* Count completed steps for a lesson */
  const completedCount = useCallback((lessonId, steps) => {
    const p = progressMap[lessonId] || {};
    return steps.filter(s => p[s.key]).length;
  }, [progressMap]);

  /* Percentage of steps completed */
  const completionPct = useCallback((lessonId, steps) => {
    if (!steps.length) return 0;
    const p = progressMap[lessonId] || {};
    return Math.round((steps.filter(s => p[s.key]).length / steps.length) * 100);
  }, [progressMap]);

  /* Are ALL applicable steps done? */
  const allDone = useCallback((lessonId, steps) => {
    const p = progressMap[lessonId] || {};
    return steps.length > 0 && steps.every(s => p[s.key]);
  }, [progressMap]);

  /* Count total lessons fully completed (for badges) */
  const totalFullyCompleted = useCallback((lessons, getStepsForLesson) => {
    return lessons.filter(l =>
      allDone(l._id, getStepsForLesson(l)),
    ).length;
  }, [allDone]);

  /* Get earned badges */
  const earnedBadges = useCallback((completedTotal, totalLessons) => {
    return BADGES.map(b => ({
      ...b,
      earned: b.threshold === Infinity
        ? completedTotal >= totalLessons && totalLessons > 0
        : completedTotal >= b.threshold,
    }));
  }, []);

  return {
    progressMap, toggleStep, isStepDone,
    completedCount, completionPct, allDone,
    totalFullyCompleted, earnedBadges,
  };
}
