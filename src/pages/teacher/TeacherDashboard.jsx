import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Video, TrendingUp, Bell, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useNotifications from '../../hooks/useNotifications';
import { getLevelLabel, getLevelColor } from '../../utils/helpers';
import { DAYS_AR } from '../../utils/constants';
import api from '../../services/api';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const { groups, fetchAllGroups } = useGroupStore();
  const [todayStats, setTodayStats] = useState({ students: 0, sessions: 0, pendingReviews: 0, attendanceRate: '—' });
  useNotifications();

  useEffect(() => {
    fetchAllGroups({ teacher: user?._id });
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [pendingRes, reportsRes] = await Promise.all([
        api.get(`/exams/results/pending-review?teacherId=${user._id}`),
        api.get('/reports/analytics').catch(() => null),
      ]);
      const attendanceRate = reportsRes?.data?.summary?.attendanceRate;
      setTodayStats(s => ({
        ...s,
        pendingReviews: pendingRes.data.results?.length || 0,
        attendanceRate: attendanceRate || '100%',
      }));
    } catch {}
  };

  const myGroups = groups.filter(g => g.teacher?._id === user?._id || g.teacher === user?._id);
  const totalStudents = myGroups.reduce((sum, g) => sum + (g.students?.length || 0), 0);

  return (
    <PageLayout>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-4 sm:mb-6">
        <div className="card-gradient p-4 sm:p-6 rounded-2xl sm:rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-10 -translate-y-10" />
          <div className="relative z-10">
            <h1 className="text-xl sm:text-2xl font-black text-white mb-1">مرحباً {user?.firstName}! 👨‍🏫</h1>
            <p className="text-primary-100 text-xs sm:text-sm">لوحة تحكم المعلم — إدارة مجموعاتك وطلابك</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6 stagger-children">
        {[
          { icon: Users, label: 'طلابي', value: totalStudents, bg: 'bg-primary-50', color: 'text-primary-400' },
          { icon: Calendar, label: 'مجموعاتي', value: myGroups.length, bg: 'bg-blue-50', color: 'text-blue-500' },
          { icon: Bell, label: 'بانتظار المراجعة', value: todayStats.pendingReviews, bg: 'bg-amber-50', color: 'text-amber-500' },
          { icon: TrendingUp, label: 'معدل الحضور', value: todayStats.attendanceRate, bg: 'bg-purple-50', color: 'text-purple-500' },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ y: -2 }} className="card-base p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 cursor-default">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${s.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-black text-gray-900 leading-tight">{s.value}</p>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Link to="/teacher/broadcast" className="card-gradient p-4 sm:p-5 flex items-center gap-3 sm:gap-4 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <p className="font-black text-white text-sm sm:text-base">بدء بث جديد</p>
            <p className="text-primary-100 text-xs">بث مباشر لمجموعتك</p>
          </div>
        </Link>
        <Link to="/teacher/review" className="card-base p-4 sm:p-5 flex items-center gap-3 sm:gap-4 rounded-2xl hover:shadow-md transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm sm:text-base">مراجعة الطلاب</p>
            <p className="text-gray-400 text-xs">التسجيلات الشفهية</p>
          </div>
        </Link>
        <Link to="/teacher/create-exam" className="card-base p-4 sm:p-5 flex items-center gap-3 sm:gap-4 rounded-2xl hover:shadow-md transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
          </div>
          <div>
            <p className="font-black text-gray-900 text-sm sm:text-base">نشاط / تقييم الدرس</p>
            <p className="text-gray-400 text-xs">تقييم تفاعلي للمجموعة</p>
          </div>
        </Link>
      </div>

      {/* My groups */}
      <div className="card-base p-4 sm:p-6">
        <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">مجموعاتي ({myGroups.length})</h2>
        {myGroups.length === 0 ? (
          <p className="text-gray-400 text-xs sm:text-sm py-8 text-center">لا توجد مجموعات مخصصة بعد</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {myGroups.map((group) => {
              const lc = getLevelColor(group.level);
              return (
                <motion.div key={group._id}
                  whileHover={{ y: -2 }}
                  className="bg-gray-50 rounded-2xl p-4 border border-gray-100 hover:border-primary-200 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg"
                      style={{ backgroundColor: lc.bg, color: lc.text }}>
                      {getLevelLabel(group.level)}
                    </span>
                    <span className="text-xs text-gray-400">{group.students?.length || 0}/{group.maxStudents} طالب</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-3">{group.name}</h3>
                  <div className="progress-bar mb-2">
                    <div className="progress-fill" style={{ width: `${Math.round(((group.students?.length || 0) / group.maxStudents) * 100)}%` }} />
                  </div>
                  {group.schedule?.slice(0, 2).map((s, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <Calendar className="w-3 h-3" />
                      {DAYS_AR[s.dayOfWeek]} {s.startTime}
                    </div>
                  ))}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
