import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, Menu, X, BookOpen, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import NotificationBell from './NotificationBell';
import { getInitials, getAvatarColor } from '../../utils/helpers';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Track scroll for navbar style change
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileOpen && !e.target.closest('.profile-dropdown')) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const handleLogout = async () => {
    await logout();
    toast.success('تم تسجيل الخروج');
    navigate('/login');
  };

  const dashboardPath = user?.role === 'admin' ? '/admin'
    : user?.role === 'teacher' ? '/teacher' : '/student';

  const isLanding = location.pathname === '/';

  const roleLabel = user?.role === 'admin' ? 'مدير' 
    : user?.role === 'teacher' ? 'معلم' : 'طالب';

  return (
    <nav className={`fixed top-0 right-0 left-0 z-40 h-16 transition-all duration-300 ${
      scrolled 
        ? 'glass-nav shadow-md' 
        : 'glass-nav'
    }`}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between relative">
        {/* Logo and Sidebar Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onMenuClick && (
            <button onClick={onMenuClick} className="lg:hidden p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" title="فتح القائمة">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Link to={user ? dashboardPath : '/'} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-quran rounded-xl flex items-center justify-center shadow-md group-hover:shadow-green transition-shadow duration-300">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-bold text-gray-900 leading-tight group-hover:text-primary-500 transition-colors">منصة تحفيظ القرآن</div>
              <div className="text-xs text-primary-400 font-medium">الكريم</div>
            </div>
          </Link>
        </div>

        {/* Landing nav links (Desktop) */}
        {isLanding && !user && (
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#how-it-works" className="hover:text-primary-400 transition-colors relative nav-link-hover">كيف يعمل</a>
            <a href="#pricing" className="hover:text-primary-400 transition-colors relative nav-link-hover">الأسعار</a>
            <a href="#testimonials" className="hover:text-primary-400 transition-colors relative nav-link-hover">آراء الطلاب</a>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <NotificationBell />

              {/* Profile dropdown */}
              <div className="relative profile-dropdown">
                <button 
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 py-1.5 px-2 sm:px-3 rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-primary-200" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                      style={{ backgroundColor: getAvatarColor(`${user.firstName}${user.lastName}`) }}
                    >
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                  )}
                  <div className="hidden md:block text-right">
                    <span className="text-sm font-semibold text-gray-700 block leading-tight">
                      {user.firstName}
                    </span>
                    <span className="text-xs text-gray-400">{roleLabel}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 hidden sm:block transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                    >
                      {/* Profile header */}
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <p className="font-bold text-gray-900 text-sm">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>
                      </div>

                      {/* Menu items */}
                      <div className="p-2">
                        <button
                          onClick={() => { setProfileOpen(false); navigate(dashboardPath); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          لوحة التحكم
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="p-2 border-t border-gray-100">
                        <button
                          onClick={() => { setProfileOpen(false); handleLogout(); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          تسجيل الخروج
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="hidden sm:flex btn-ghost text-sm">دخول</Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">تسجيل مجاني</Link>
              
              {/* Landing Page Mobile Menu Toggle */}
              {isLanding && (
                <button 
                  onClick={() => setMenuOpen(!menuOpen)} 
                  className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Landing Page Mobile Menu Dropdown */}
      {isLanding && !user && menuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-lg py-4 px-4 flex flex-col gap-4"
        >
          <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="text-gray-700 font-semibold hover:text-primary-500 transition-colors py-1">كيف يعمل</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="text-gray-700 font-semibold hover:text-primary-500 transition-colors py-1">الأسعار</a>
          <a href="#testimonials" onClick={() => setMenuOpen(false)} className="text-gray-700 font-semibold hover:text-primary-500 transition-colors py-1">آراء الطلاب</a>
          <Link to="/login" onClick={() => setMenuOpen(false)} className="text-gray-700 font-semibold hover:text-primary-500 transition-colors py-1 sm:hidden">تسجيل الدخول</Link>
        </motion.div>
      )}
    </nav>
  );
}
