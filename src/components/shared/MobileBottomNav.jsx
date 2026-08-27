import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, Video, FileText, TrendingUp,
  Users, Radio, ClipboardList, MessageCircle, BarChart2, BookMarked
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const studentNavItems = [
  { to: '/student', icon: LayoutDashboard, label: 'الرئيسية', end: true },
  { to: '/student/curriculum', icon: BookOpen, label: 'المنهج', pattern: /^\/student\/(curriculum|lessons)/ },
  { to: '/student/live', icon: Video, label: 'المباشر', isLiveBadge: true },
  { to: '/student/exams', icon: FileText, label: 'الاختبارات', end: true },
  { to: '/student/progress', icon: TrendingUp, label: 'تقدمي' },
];

const teacherNavItems = [
  { to: '/teacher', icon: LayoutDashboard, label: 'الرئيسية', end: true },
  { to: '/teacher/groups', icon: Users, label: 'مجموعاتي' },
  { to: '/teacher/broadcast', icon: Radio, label: 'البث المباشر' },
  { to: '/teacher/review', icon: ClipboardList, label: 'التصحيح' },
  { to: '/teacher/discussion', icon: MessageCircle, label: 'النقاش' },
];

const adminNavItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'الرئيسية', end: true },
  { to: '/admin/groups', icon: BookMarked, label: 'المجموعات' },
  { to: '/admin/users', icon: Users, label: 'المستخدمين' },
  { to: '/admin/reports', icon: BarChart2, label: 'التقارير' },
  { to: '/admin/discussions', icon: MessageCircle, label: 'النقاش' },
];

const parentNavItems = [
  { to: '/parent', icon: LayoutDashboard, label: 'الرئيسية', end: true },
];

export default function MobileBottomNav() {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return null;

  // Hide bottom nav during exam taking or onboarding flows for maximum focus
  const isTakingExam = location.pathname.includes('/take') || location.pathname.startsWith('/onboarding');
  if (isTakingExam) return null;

  const items = user.role === 'admin' ? adminNavItems
    : user.role === 'teacher' ? teacherNavItems
    : user.role === 'parent' ? parentNavItems
    : studentNavItems;

  if (items.length <= 1) return null;

  return (
    <nav
      aria-label="شريط التنقل السفلي للهاتف"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 px-2"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isItemActive = item.pattern
            ? item.pattern.test(location.pathname)
            : item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex-1 flex flex-col items-center justify-center py-1 px-1 group select-none"
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                className={`relative flex flex-col items-center justify-center w-full py-1 rounded-2xl transition-colors duration-200 ${
                  isItemActive ? 'text-primary-600 font-bold' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {/* Active Indicator Background Glow/Pill */}
                {isItemActive && (
                  <motion.div
                    layoutId="mobileNavActivePill"
                    className="absolute inset-0 bg-primary-50 rounded-2xl -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}

                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isItemActive ? 'scale-110 text-primary-500' : ''}`} />
                  
                  {/* Live dot for live session */}
                  {item.isLiveBadge && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                  )}
                </div>

                <span className={`text-[10px] tracking-tight mt-0.5 leading-tight ${isItemActive ? 'font-black text-primary-600' : 'font-medium'}`}>
                  {item.label}
                </span>
              </motion.div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
