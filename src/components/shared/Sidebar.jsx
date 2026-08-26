import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, Video, FileText,
  BarChart2, Settings, BookMarked, Radio, ClipboardList,
  UserCheck, Book, TrendingUp, ChevronLeft, Sparkles, MessageCircle, CalendarCheck, FolderOpen, Flame, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import { getInitials, getAvatarColor, getLevelLabel } from '../../utils/helpers';

const studentLinks = [
  { to: '/student', icon: LayoutDashboard, label: 'الرئيسية', end: true },
  { to: '/student/group', icon: Users, label: 'مجموعتي' },
  { to: '/student/live', icon: Video, label: 'الجلسة المباشرة' },
  { to: '/student/curriculum', icon: BookOpen, label: 'المنهج وتقييمات الدروس' },
  { to: '/student/quran', icon: BookMarked, label: 'المصحف المكرر والمتشابهات' },
  { to: '/student/exams', icon: FileText, label: 'الاختبارات والتقييمات' },
  { to: '/student/progress', icon: TrendingUp, label: 'تقدمي وبنك المراجعة' },
  { to: '/student/subscription', icon: CreditCard, label: 'الاشتراكات والمدفوعات' },
  { to: '/student/discussion', icon: MessageCircle, label: 'غرفة النقاش' },
  { to: '/student/resources', icon: FolderOpen, label: 'المكتبة التعليمية' },
];

const teacherLinks = [
  { to: '/teacher', icon: LayoutDashboard, label: 'الرئيسية', end: true },
  { to: '/teacher/groups', icon: Users, label: 'مجموعاتي' },
  { to: '/teacher/broadcast', icon: Radio, label: 'البث المباشر' },
  { to: '/teacher/review', icon: ClipboardList, label: 'مركز التصحيح والمراجعة' },
  { to: '/teacher/create-exam', icon: FileText, label: 'نشاط / تقييم الدرس' },
  { to: '/teacher/discussion', icon: MessageCircle, label: 'غرفة النقاش' },
  { to: '/teacher/daily-review', icon: CalendarCheck, label: 'مراجعة الحفظ' },
];

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'الرئيسية', end: true },
  { to: '/admin/payments', icon: CreditCard, label: 'إدارة المدفوعات والاشتراكات' },
  { to: '/admin/groups', icon: BookMarked, label: 'إدارة وتسكين المجموعات' },
  { to: '/admin/live', icon: Radio, label: 'البث المباشر للحلقات' },
  { to: '/teacher/review', icon: ClipboardList, label: 'مركز التصحيح والمراجعة' },
  { to: '/admin/users', icon: Users, label: 'إدارة الطلاب والمستخدمين' },
  { to: '/admin/reports', icon: BarChart2, label: 'التقارير والإحصاءات' },
  { to: '/admin/discussions', icon: MessageCircle, label: 'غرفة النقاش' },
  { to: '/admin/resources', icon: FolderOpen, label: 'المكتبة التعليمية' },
];

const parentLinks = [
  { to: '/parent', icon: LayoutDashboard, label: 'الرئيسية', end: true },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const links = user?.role === 'admin' ? adminLinks
    : user?.role === 'teacher' ? teacherLinks
    : user?.role === 'parent' ? parentLinks
    : studentLinks;

  const roleLabel = user?.role === 'admin' ? 'مدير النظام'
    : user?.role === 'teacher' ? 'معلم'
    : user?.role === 'parent' ? 'ولي أمر'
    : `طالب — ${getLevelLabel(user?.assignedLevel)}`;

  const roleColor = user?.role === 'admin' ? 'badge-gold'
    : user?.role === 'teacher' ? 'badge-purple'
    : user?.role === 'parent' ? 'badge-blue'
    : 'badge-green';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* User card */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-white"
            style={{ backgroundColor: getAvatarColor(`${user?.firstName}${user?.lastName}`) }}
          >
            {getInitials(user?.firstName, user?.lastName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 leading-tight truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <span className={`${roleColor} text-xs mt-1 inline-block`}>{roleLabel}</span>
          </div>
        </div>

        {/* Quick stats for student */}
        {user?.role === 'student' && (
          <div className="mt-3 flex items-center justify-between gap-2 bg-gradient-to-r from-primary-50 to-emerald-50 rounded-xl px-3 py-2 border border-primary-100/50">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary-500" />
              <span className="text-xs font-bold text-primary-700">{user?.points || 0} XP</span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-100/70 text-orange-700 px-2 py-0.5 rounded-lg">
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
              <span className="text-xs font-bold">{user?.streak || 0} أيام</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-item group ${isActive ? 'active' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary-400 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-primary-50 group-hover:text-primary-400'
                }`}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <span className="truncate">{label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute right-0 w-1 h-8 bg-primary-400 rounded-l-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gradient-quran rounded-xl p-3 text-center text-white">
          <p className="text-xs font-medium opacity-90">منصة تحفيظ القرآن الكريم</p>
          <p className="text-xs opacity-70 mt-0.5">نور القرآن في كل بيت ✨</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-l border-gray-100 h-screen fixed right-0 top-16 shadow-sm z-30">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed right-0 top-0 bottom-0 w-72 bg-white z-50 shadow-2xl"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                <span className="font-bold text-gray-900">القائمة</span>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
