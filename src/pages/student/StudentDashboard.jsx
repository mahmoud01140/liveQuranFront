import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Video, Calendar, TrendingUp, Clock, Users, Star, Bell, ChevronLeft, Zap, Flame, Check, AlertTriangle, Lock, CreditCard, Gift, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useLiveStore from '../../store/liveStore';
import { getLevelLabel, getLevelColor, formatDateAr, getCirclePath, formatCountdown } from '../../utils/helpers';
import { DAYS_AR } from '../../utils/constants';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Add this simple custom hook for countdown ticking
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      const diff = Math.floor((new Date(targetDate) - new Date()) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);
  return timeLeft;
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { group, studyPlan, fetchMyGroup, fetchStudyPlan } = useGroupStore();
  const { sessions, fetchSessions } = useLiveStore();

  useEffect(() => {
    // user.group may be a populated object OR a plain string ID
    const groupId = user?.group?._id || user?.group;
    if (groupId) {
      fetchMyGroup(groupId);
      fetchStudyPlan(groupId);
      fetchSessions(groupId);
    }
  }, [user?.group]);

  const levelColor = getLevelColor(user?.assignedLevel);
  const juzCompleted = studyPlan?.quranCompletionPlan?.completedJuz?.length || 0;
  const juzPct = Math.round((juzCompleted / 30) * 100);
  const { circumference, strokeDashoffset } = getCirclePath(juzPct);

  const upcomingSession = sessions.find(s => s.status === 'scheduled' || s.status === 'live');
  const recentSessions = sessions.slice(0, 3);

  // Real stats calculation
  const attendedCount = sessions.filter(s =>
    s.attendees?.some(a => (a.student?._id || a.student)?.toString() === user?._id?.toString())
  ).length;

  const curriculumProgress = group?.customLessons?.length
    ? Math.round(((user?.completedLessons?.length || 0) / group.customLessons.length) * 100)
    : 0;

  const timeLeft = useCountdown(upcomingSession?.status === 'scheduled' ? upcomingSession.scheduledAt : null);

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور';

  // ── Daily Triple Quran Task ──
  const [dailyTask, setDailyTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(false);

  useEffect(() => {
    api.get('/daily-tasks/today')
      .then(res => setDailyTask(res.data.task))
      .catch(() => {});
  }, []);

  const handleTogglePortion = async (portion) => {
    if (!dailyTask?._id) return;
    const currentStatus = dailyTask[portion]?.status;
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    try {
      const res = await api.put(`/daily-tasks/${dailyTask._id}/portion`, {
        portion,
        status: newStatus
      });
      setDailyTask(res.data.task);
      if (newStatus === 'completed') {
        toast.success('🎉 بارك الله فيك! تم إنجاز هذا الجزء من الورد');
      }
    } catch {
      toast.error('حدث خطأ في تحديث حالة الورد');
    }
  };

  // Subscription status
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    api.get('/payments/my-history')
      .then(res => setSubscription(res.data?.subscription || null))
      .catch(() => {});
  }, []);

  return (
    <PageLayout>
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-4 sm:mb-6">
        <div className="card-gradient p-4 sm:p-6 rounded-2xl sm:rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-5 translate-y-5" />
          <div className="absolute top-4 left-4 opacity-20">
            <Zap className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
          </div>
          <div className="relative z-10">
            <div className="font-quran text-lg sm:text-xl mb-1 sm:mb-2 opacity-90">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <h1 className="text-xl sm:text-2xl font-black mb-1">
              {greeting} {user?.firstName}! 👋
            </h1>
            <p className="text-primary-100 text-xs sm:text-sm">
              مستواك: <strong>{getLevelLabel(user?.assignedLevel)}</strong>
              {group && ` | مجموعتك: ${group.name}`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Subscription Alerts on Dashboard */}
      {subscription?.isExpiringSoon && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="font-bold text-amber-950 text-sm">تنبيه باقتراب موعد سداد الاشتراك الشهري ⚠️</p>
              <p className="text-xs text-amber-800">
                يتبقى <span className="font-black underline">{subscription.daysRemaining} أيام</span> على انتهاء اشتراكك في الحلقات. سارع بالسداد عبر فودافون كاش أو انستاباي.
              </p>
            </div>
          </div>
          <Link
            to="/student/subscription"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            تجديد الاشتراك
          </Link>
        </motion.div>
      )}

      {subscription?.isExpired && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 bg-red-50 border-2 border-red-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-red-950 text-sm">تم تعليق حضور الجلسات لانتهاء الاشتراك 🔒</p>
              <p className="text-xs text-red-800">
                انتهت فترة اشتراكك الشهري. يرجى سداد الاشتراك لاستئناف حضور الحلقات والتفاعل مع المعلم فوراً.
              </p>
            </div>
          </div>
          <Link
            to="/student/subscription"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <CreditCard className="w-3.5 h-3.5" />
            سداد وتفعيل الاشتراك
          </Link>
        </motion.div>
      )}

      {/* Daily Triple Quran Task Section */}
      {dailyTask && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-primary-200/80 bg-gradient-to-br from-primary-50/30 to-white"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-black shadow-md shadow-primary-500/20">
                📜
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                  وردك القرآني اليومي (المنهج الثلاثي المتقن)
                  <span className="text-[10px] bg-primary-100 text-primary-800 font-black px-2.5 py-0.5 rounded-full">
                    {dailyTask.overallStatus === 'completed' ? 'مكتمل اليوم ✅' : 'قيد الإنجاز ⏳'}
                  </span>
                </h2>
                <p className="text-xs text-gray-500">
                  الحفظ الجديد + الماضي القريب (الربط) + الماضي البعيد (التمكين الدوري)
                </p>
              </div>
            </div>

            <Link
              to="/student/quran"
              className="hidden sm:flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-white px-3 py-1.5 rounded-xl border border-primary-200 shadow-sm transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>المصحف المكرر</span>
            </Link>
          </div>

          {/* 3 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Pillar 1: New Hifz */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
              dailyTask.newHifz?.status === 'completed'
                ? 'bg-emerald-50/80 border-emerald-300'
                : 'bg-white border-emerald-200/60 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                  🟢 1. الحفظ الجديد (السبق)
                </span>
                {dailyTask.newHifz?.score !== undefined && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    درجة: {dailyTask.newHifz.score}%
                  </span>
                )}
              </div>
              <p className="font-black text-gray-900 text-sm mb-1">
                سورة {dailyTask.newHifz?.surahName || '—'}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                الآيات من {dailyTask.newHifz?.fromVerse || 1} إلى {dailyTask.newHifz?.toVerse || '...'} ({dailyTask.newHifz?.versesCount || 0} آية)
              </p>
              <button
                type="button"
                onClick={() => handleTogglePortion('newHifz')}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  dailyTask.newHifz?.status === 'completed'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                }`}
              >
                <Check className="w-4 h-4" />
                {dailyTask.newHifz?.status === 'completed' ? 'تم الحفظ والمراجعة ✅' : 'تحديد كـ تم الحفظ'}
              </button>
            </div>

            {/* Pillar 2: Near Revision */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
              dailyTask.nearRevision?.status === 'completed'
                ? 'bg-amber-50/80 border-amber-300'
                : 'bg-white border-amber-200/60 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-amber-900 flex items-center gap-1">
                  🟡 2. الماضي القريب (الربط)
                </span>
                {dailyTask.nearRevision?.score !== undefined && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    درجة: {dailyTask.nearRevision.score}%
                  </span>
                )}
              </div>
              <p className="font-black text-gray-900 text-sm mb-1">
                سورة {dailyTask.nearRevision?.surahName || '—'}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                ربط آخر 5 إلى 10 أوجه سابقة من المحفوظ الحديث
              </p>
              <button
                type="button"
                onClick={() => handleTogglePortion('nearRevision')}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  dailyTask.nearRevision?.status === 'completed'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900'
                }`}
              >
                <Check className="w-4 h-4" />
                {dailyTask.nearRevision?.status === 'completed' ? 'تم الربط والإتقان ✅' : 'تحديد كـ تم الربط'}
              </button>
            </div>

            {/* Pillar 3: Cumulative Revision */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
              dailyTask.cumulativeRevision?.status === 'completed'
                ? 'bg-blue-50/80 border-blue-300'
                : 'bg-white border-blue-200/60 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-blue-900 flex items-center gap-1">
                  🔵 3. الماضي البعيد (التمكين)
                </span>
                {dailyTask.cumulativeRevision?.score !== undefined && (
                  <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                    درجة: {dailyTask.cumulativeRevision.score}%
                  </span>
                )}
              </div>
              <p className="font-black text-gray-900 text-sm mb-1">
                ورد {dailyTask.cumulativeRevision?.surahName || 'الدوري'}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                مراجعة الأجزاء القديمة لضمان عدم تفلتها
              </p>
              <button
                type="button"
                onClick={() => handleTogglePortion('cumulativeRevision')}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  dailyTask.cumulativeRevision?.status === 'completed'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-900'
                }`}
              >
                <Check className="w-4 h-4" />
                {dailyTask.cumulativeRevision?.status === 'completed' ? 'تم تمكين الورد ✅' : 'تحديد كـ تم التمكين'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6 stagger-children">
        {[
          { icon: Flame, label: 'السلسلة اليومية', value: `${user?.streak || 0} أيام`, bg: 'bg-orange-50', color: 'text-orange-500', iconBg: 'bg-orange-100' },
          { icon: Star, label: 'نقاط الـ XP', value: `${user?.points || 0} XP`, bg: 'bg-yellow-50', color: 'text-yellow-500', iconBg: 'bg-yellow-100' },
          { icon: BookOpen, label: 'أجزاء محفوظة', value: `${juzCompleted}/30`, bg: 'bg-primary-50', color: 'text-primary-400', iconBg: 'bg-primary-100' },
          { icon: TrendingUp, label: 'تقدم المنهج', value: `${curriculumProgress}%`, bg: 'bg-purple-50', color: 'text-purple-500', iconBg: 'bg-purple-100' },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ y: -2, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300 }} className="card-base p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 cursor-default">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${s.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${s.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-base sm:text-xl font-black text-gray-900 leading-tight truncate">{s.value}</p>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate mt-0.5">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Quran progress ring */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-base p-4 sm:p-6 flex flex-col items-center"
        >
          <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 self-start flex items-center gap-2 text-sm sm:text-base">
            <BookOpen className="w-4 h-4 text-primary-400" />
            تقدم الختم
          </h2>
          <div className="relative mb-3 sm:mb-4">
            <svg className="w-28 h-28 sm:w-32 sm:h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#E1F5EE" strokeWidth="10" />
              <circle cx="60" cy="60" r="54" fill="none" stroke="#1D9E75" strokeWidth="10"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl sm:text-2xl font-black text-primary-500">{juzPct}%</span>
              <span className="text-[10px] sm:text-xs text-gray-400">مكتمل</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm font-bold text-gray-700">{juzCompleted} جزء من 30</p>
          {studyPlan?.quranCompletionPlan?.dailyPages && (
            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">هدفك اليومي: {studyPlan.quranCompletionPlan.dailyPages} صفحات</p>
          )}
          <Link to="/student/progress" className="btn-outline w-full mt-3 sm:mt-4 text-xs sm:text-sm py-2">
            عرض التقدم التفصيلي
          </Link>
        </motion.div>

        {/* Next session */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-base p-4 sm:p-6"
        >
          <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Video className="w-4 h-4 text-primary-400" />
            الجلسة القادمة
          </h2>
          {upcomingSession ? (
            <div>
              {upcomingSession.status === 'live' ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 sm:p-4 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 text-red-600 font-bold mb-1.5 sm:mb-2 text-sm sm:text-base">
                    <div className="live-dot" />
                    الجلسة مباشرة الآن!
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 font-semibold">{upcomingSession.title}</p>
                </div>
              ) : (
                <div className="bg-primary-50 rounded-2xl p-3.5 sm:p-4 mb-3 sm:mb-4">
                  <p className="font-bold text-gray-900 text-sm sm:text-base">{upcomingSession.title}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    📅 {formatDateAr(upcomingSession.scheduledAt, 'EEEE dd MMMM yyyy')}
                  </p>
                  {timeLeft > 0 && (
                    <div className="mt-2.5 sm:mt-3 bg-white/70 rounded-xl px-3 py-2 border border-primary-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">تبدأ خلال:</span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-primary-600" dir="ltr">
                        {formatCountdown(timeLeft)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <Link to="/student/live" className="btn-primary w-full text-xs sm:text-sm py-2.5">
                {upcomingSession.status === 'live' ? '🔴 انضم الآن' : 'عرض التفاصيل'}
              </Link>
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-400">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-xs sm:text-sm">لا توجد جلسات مجدولة</p>
            </div>
          )}
        </motion.div>

        {/* Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-base p-4 sm:p-6"
        >
          <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Calendar className="w-4 h-4 text-primary-400" />
            جدول مجموعتي
          </h2>
          {group?.schedule?.length > 0 ? (
            <div className="space-y-2">
              {group.schedule.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-2.5 sm:gap-3 bg-gray-50 hover:bg-primary-50/40 rounded-xl px-3 py-2 transition-colors duration-200"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {Object.keys(DAYS_AR).indexOf(s.dayOfWeek) + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">{DAYS_AR[s.dayOfWeek]}</p>
                    <p className="text-[11px] sm:text-xs text-gray-400">{s.startTime} - {s.endTime}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-400">
              <Clock className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-xs sm:text-sm">لم يحدد جدول بعد</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3"
      >
        {[
          { to: '/student/curriculum', icon: BookOpen, label: 'المنهج والدروس', color: 'bg-primary-50 text-primary-600 hover:bg-primary-100' },
          { to: '/student/live', icon: Video, label: 'الحصة المباشرة', color: 'bg-rose-50 text-rose-600 hover:bg-rose-100' },
          { to: '/student/exams', icon: Star, label: 'الاختبارات والتقييمات', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
          { to: '/student/progress', icon: TrendingUp, label: 'تقدمي وبنك المراجعة', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
        ].map((action, i) => (
          <Link
            key={i}
            to={action.to}
            className={`flex items-center gap-2 sm:gap-3 p-3 sm:px-4 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${action.color}`}
          >
            <action.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="truncate">{action.label}</span>
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-auto opacity-40 flex-shrink-0" />
          </Link>
        ))}
      </motion.div>
    </PageLayout>
  );
}
