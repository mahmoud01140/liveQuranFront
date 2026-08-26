import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, BookOpen, ArrowLeft, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isFocused, setIsFocused] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email) errs.email = 'البريد الإلكتروني مطلوب';
    if (!password) errs.password = 'كلمة المرور مطلوبة';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      const data = await login(email, password);
      toast.success(`مرحباً ${data.user.firstName}! 👋`);
      const u = data.user;

      if (u.role === 'admin') navigate('/admin');
      else if (u.role === 'teacher') navigate('/teacher');
      else if (u.role === 'parent') navigate('/parent');
      else if (u.placementExamTaken) {
        // Already took the exam — go to dashboard or waiting
        if (u.assignedLevel) navigate('/student');
        else navigate('/waiting-approval');
      }
      else if (!u.isVerified) navigate('/onboarding/type');
      else if (!u.assignedLevel) navigate('/onboarding/type');
      else navigate('/student');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'خطأ في تسجيل الدخول');
    }
  };

  const handleFocus = (field) => setIsFocused(prev => ({ ...prev, [field]: true }));
  const handleBlur = (field) => setIsFocused(prev => ({ ...prev, [field]: false }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      {/* Decorative background elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-56 h-56 bg-primary-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 bg-gradient-quran rounded-xl flex items-center justify-center shadow-md group-hover:shadow-green transition-shadow duration-300">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 group-hover:text-primary-500 transition-colors">منصة تحفيظ القرآن</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900">مرحباً بعودتك</h1>
          <p className="text-gray-500 mt-1">سجّل دخولك لمتابعة رحلتك</p>
        </div>

        <form onSubmit={handleSubmit} className="card-base p-8 space-y-5">
          {/* Demo credentials hint */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-primary-50 rounded-xl p-3 text-sm text-primary-700 border border-primary-100"
          >
            <p className="font-semibold mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              بيانات تجريبية:
            </p>
            <p className="text-xs opacity-80">Admin: admin@quran.com / Admin123!</p>
            <p className="text-xs opacity-80">معلم: teacher1@quran.com / Teacher123!</p>
            <p className="text-xs opacity-80">طالب: student1@quran.com / Student123!</p>
          </motion.div>

          {/* Email field */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">البريد الإلكتروني</label>
            <div className={`relative rounded-xl transition-all duration-200 ${isFocused.email ? 'ring-2 ring-primary-400/30' : ''}`}>
              <Mail className={`absolute right-3 top-3.5 w-4 h-4 transition-colors duration-200 ${isFocused.email ? 'text-primary-400' : 'text-gray-400'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(p => ({ ...p, email: null })); }}
                onFocus={() => handleFocus('email')}
                onBlur={() => handleBlur('email')}
                className={`input-base pr-10 ${errors.email ? 'input-error' : ''}`}
                placeholder="your@email.com"
                dir="ltr"
                id="login-email"
              />
            </div>
            {errors.email && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs mt-1.5">
                {errors.email}
              </motion.p>
            )}
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-gray-700">كلمة المرور</label>
              <Link to="/forgot-password" className="text-xs text-primary-400 hover:underline hover:text-primary-500 transition-colors">
                نسيت كلمة المرور؟
              </Link>
            </div>
            <div className={`relative rounded-xl transition-all duration-200 ${isFocused.password ? 'ring-2 ring-primary-400/30' : ''}`}>
              <Lock className={`absolute right-3 top-3.5 w-4 h-4 transition-colors duration-200 ${isFocused.password ? 'text-primary-400' : 'text-gray-400'}`} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(p => ({ ...p, password: null })); }}
                onFocus={() => handleFocus('password')}
                onBlur={() => handleBlur('password')}
                className={`input-base pr-10 pl-10 ${errors.password ? 'input-error' : ''}`}
                placeholder="••••••••"
                dir="ltr"
                id="login-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute left-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 text-xs mt-1.5">
                {errors.password}
              </motion.p>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.01 }}
            whileTap={{ scale: isLoading ? 1 : 0.99 }}
            className="btn-primary w-full py-3.5 text-base"
          >
            {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'تسجيل الدخول'}
          </motion.button>

          <p className="text-center text-sm text-gray-500 pt-1">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="text-primary-400 font-semibold hover:underline hover:text-primary-500 transition-colors">
              إنشاء حساب مجاناً
            </Link>
          </p>
        </form>

        {/* Back to home */}
        <div className="text-center mt-5">
          <Link to="/" className="text-xs text-gray-400 hover:text-primary-400 transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            الرجوع للرئيسية
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
