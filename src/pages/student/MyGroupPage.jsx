import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Clock, AlertTriangle, Lock, CreditCard, Gift, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useSocket from '../../hooks/useSocket';
import { joinGroupRoom } from '../../services/socket';
import { DAYS_AR, SESSION_TYPES } from '../../utils/constants';
import { getInitials, getAvatarColor, formatTime } from '../../utils/helpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../services/api';

export default function MyGroupPage() {
  const { user } = useAuthStore();
  const { group, students, fetchMyGroup, fetchGroupStudents, isLoading } = useGroupStore();
  const [subscription, setSubscription] = useState(null);

  const groupId = user?.group?._id || user?.group;

  // Listen for real-time group updates (days / schedule)
  useSocket({
    'group-updated': ({ type }) => {
      if (groupId) fetchMyGroup(groupId);
      const label = type === 'days' ? 'أيام الدراسة' : 'الجدول الأسبوعي';
      toast(`📅 تم تحديث ${label} من قِبَل الإدارة`, { duration: 4000 });
    },
    'subscription-updated': () => {
      fetchSubscriptionStatus();
    }
  });

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await api.get('/payments/my-history');
      if (res.data?.subscription) {
        setSubscription(res.data.subscription);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (groupId) {
      joinGroupRoom(groupId);
      fetchMyGroup(groupId);
      fetchGroupStudents(groupId);
    }
    fetchSubscriptionStatus();
  }, [user?.group]);

  if (isLoading) return (
    <PageLayout>
      <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
    </PageLayout>
  );

  if (!group) return (
    <PageLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card-base p-8 sm:p-12 text-center max-w-md mx-4">
          <Users className="w-14 h-14 sm:w-16 sm:h-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-2">لم تُعيَّن في مجموعة بعد</h2>
          <p className="text-gray-500 text-xs sm:text-sm">سيتم تعيينك في مجموعة من قِبَل الإدارة قريباً</p>
        </div>
      </div>
    </PageLayout>
  );

  const isExpired = subscription?.isExpired;
  const isExpiringSoon = subscription?.isExpiringSoon;
  const isTrial = subscription?.isTrial;
  const trialUsed = (subscription?.trialSessionsAttended || 0) >= (subscription?.trialSessionsAllowed || 1);

  return (
    <PageLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="section-title">مجموعتي الدراسية</h1>
        <p className="section-subtitle">{group.name}</p>
      </div>

      {/* ─── Subscription Status Alerts ─────────────────────────────── */}
      {isExpiringSoon && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="font-bold text-amber-950 text-sm">تنبيه باقتراب موعد سداد الاشتراك الشهري ⚠️</p>
              <p className="text-xs text-amber-800">
                يتبقى <span className="font-black underline">{subscription?.daysRemaining} أيام</span> على انتهاء اشتراكك في المجموعة. سارع بالتجديد لضمان عدم تعليق الحضور.
              </p>
            </div>
          </div>
          <Link
            to="/student/subscription"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            تجديد الاشتراك الآن
          </Link>
        </motion.div>
      )}

      {isExpired && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-red-50 border-2 border-red-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-red-950 text-sm">تم تعليق الصلاحيات مؤقتاً لانتهاء الاشتراك 🔒</p>
              <p className="text-xs text-red-800">
                انتهت فترة اشتراكك الشهري. يرجى سداد الاشتراك لاستئناف حضور الحلقات المباشرة والتفاعل مع زملائك.
              </p>
            </div>
          </div>
          <Link
            to="/student/subscription"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <CreditCard className="w-3.5 h-3.5" />
            سداد الاشتراك واستعادة الوصول
          </Link>
        </motion.div>
      )}

      {isTrial && !trialUsed && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-emerald-950 text-xs sm:text-sm">أهلاً بك! متاح لك حضور أول محاضرة مباشرة مجاناً 🎁</p>
              <p className="text-[11px] sm:text-xs text-emerald-700">جرب الجلسة التفاعلية الأولى مع المعلم، وبعدها يمكنك تفعيل الاشتراك الشهري.</p>
            </div>
          </div>
          <Link
            to="/student/live"
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex-shrink-0"
          >
            الانتقال للبث
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Group info */}
        <div className="card-base p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">معلومات المجموعة</h2>
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-gray-500">عدد الطلاب</p>
                <p className="font-bold text-gray-900">{group.students?.length || 0} / {group.maxStudents}</p>
              </div>
            </div>
            {group.teacher && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(`${group.teacher.firstName}${group.teacher.lastName}`) }}>
                  {getInitials(group.teacher.firstName, group.teacher.lastName)}
                </div>
                <div>
                  <p className="text-gray-500">المعلم</p>
                  <p className="font-bold text-gray-900">أ. {group.teacher.firstName} {group.teacher.lastName}</p>
                </div>
              </div>
            )}
            {group.description && (
              <p className="text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed text-xs">{group.description}</p>
            )}
          </div>
        </div>

        {/* Days of study */}
        <div className="card-base p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Calendar className="w-4 h-4 text-primary-400" />
            أيام الدراسة
          </h2>
          {group.days?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {group.days.map((day, i) => (
                <span key={i} className="badge-green text-xs font-semibold px-3 py-1 rounded-xl">
                  {DAYS_AR[day] || day}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-xs">لم تُحدد أيام الدراسة بعد</p>
          )}
        </div>

        {/* Schedule */}
        <div className="card-base p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Clock className="w-4 h-4 text-primary-400" />
            الجدول الأسبوعي
          </h2>
          {group.schedule?.length > 0 ? (
            <div className="space-y-2">
              {group.schedule.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-xl p-2.5">
                  <span className="font-bold text-gray-700">{DAYS_AR[s.dayOfWeek]}</span>
                  <span className="text-gray-500 font-mono">{formatTime(s.startTime)} — {formatTime(s.endTime)}</span>
                  <span className="badge-green text-[10px]">{SESSION_TYPES[s.sessionType] || s.sessionType}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-xs">لم يُحدد الجدول بعد</p>
          )}
        </div>
      </div>

      {/* Students list */}
      <div className="card-base p-4 sm:p-6 mt-4 sm:mt-6">
        <h2 className="font-bold text-gray-900 mb-4 text-sm sm:text-base">زملاء المجموعة ({students.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((student) => (
            <div key={student._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ backgroundColor: getAvatarColor(`${student.firstName}${student.lastName}`) }}>
                {getInitials(student.firstName, student.lastName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                  {student.firstName} {student.lastName}
                  {student._id === user?._id && <span className="text-primary-600 mr-1 text-xs">(أنت)</span>}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {student.memorizedVerses || 0} آية محفوظة
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
