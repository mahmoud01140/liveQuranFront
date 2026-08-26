import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, BookOpen, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setIsSuccess(true);
      toast.success('تم تغيير كلمة المرور بنجاح');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'الرابط غير صالح أو منتهي الصلاحية');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary-100 rounded-full blur-3xl opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 bg-gradient-quran rounded-xl flex items-center justify-center shadow-md group-hover:shadow-green transition-shadow duration-300">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 group-hover:text-primary-500 transition-colors">منصة تحفيظ القرآن</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900">إعادة تعيين كلمة المرور</h1>
          <p className="text-gray-500 mt-1">أدخل كلمة المرور الجديدة</p>
        </div>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-base p-8 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">تم التغيير بنجاح!</h2>
            <p className="text-gray-500 text-sm mb-6">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary inline-flex items-center gap-2 px-6 py-2.5"
            >
              تسجيل الدخول
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="card-base p-8 space-y-5">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">كلمة المرور الجديدة</label>
              <div className="relative rounded-xl">
                <Lock className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pr-10 pl-10"
                  placeholder="••••••••"
                  dir="ltr"
                  id="reset-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">تأكيد كلمة المرور</label>
              <div className="relative rounded-xl">
                <Lock className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-base pr-10"
                  placeholder="••••••••"
                  dir="ltr"
                  id="reset-confirm-password"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: isLoading ? 1 : 0.99 }}
              className="btn-primary w-full py-3.5 text-base"
            >
              {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'تغيير كلمة المرور'}
            </motion.button>
          </form>
        )}

        <div className="text-center mt-5">
          <Link to="/login" className="text-xs text-gray-400 hover:text-primary-400 transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            العودة لتسجيل الدخول
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
