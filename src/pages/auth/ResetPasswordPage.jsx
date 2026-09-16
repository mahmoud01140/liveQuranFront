import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { Lock, Eye, EyeOff, BookOpen, ArrowRight, CircleCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import './Auth.css';

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
    <MotionConfig reducedMotion="user">
      <div className="auth" dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 min-h-[44px]">
              <span
                aria-hidden
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: '#177B58' }}
              >
                <BookOpen className="w-5 h-5 text-white" />
              </span>
              <span className="font-bold text-lg" style={{ color: '#2A2438' }}>الحلقة</span>
            </Link>
            <h1 className="text-2xl font-extrabold" style={{ color: '#2A2438' }}>إعادة تعيين كلمة المرور</h1>
            <p className="mt-1" style={{ color: '#756E85' }}>أدخل كلمة المرور الجديدة</p>
          </div>

          {isSuccess ? (
            <div className="auth-card text-center">
              <span
                aria-hidden
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: '#E2EFE7' }}
              >
                <CircleCheck className="w-8 h-8" style={{ color: '#177B58' }} />
              </span>
              <h2 className="text-lg font-extrabold mb-2" style={{ color: '#2A2438' }}>تم التغيير بنجاح!</h2>
              <p className="text-sm mb-6" style={{ color: '#756E85' }}>يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
              <button
                onClick={() => navigate('/login')}
                className="auth-btn auth-btn-auto px-6"
              >
                تسجيل الدخول
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-card space-y-5">
              <div>
                <label htmlFor="reset-password" className="auth-label">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#756E85]" aria-hidden />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input pr-10 pl-12"
                    style={{ direction: 'ltr', textAlign: 'left' }}
                    placeholder="••••••••"
                    id="reset-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="auth-iconbtn"
                    aria-label={showPass ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    aria-pressed={showPass}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className="auth-label">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#756E85]" aria-hidden />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="auth-input pr-10"
                    style={{ direction: 'ltr', textAlign: 'left' }}
                    placeholder="••••••••"
                    id="reset-confirm-password"
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="auth-btn">
                {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'تغيير كلمة المرور'}
              </button>
            </form>
          )}

          <div className="text-center mt-5">
            <Link to="/login" className="auth-link-quiet">
              <ArrowRight className="w-3 h-3" aria-hidden />
              العودة لتسجيل الدخول
            </Link>
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
