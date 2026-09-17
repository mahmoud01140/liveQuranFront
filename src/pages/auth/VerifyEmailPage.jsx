import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { MailCheck, RefreshCw, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import '../onboarding/Onboarding.css';

const RESEND_COOLDOWN = 60;

export default function VerifyEmailPage() {
  const { user, verifyEmail, resendOTP, logout, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user?.isVerified) {
      navigate('/onboarding/type', { replace: true });
    }
  }, [user?.isVerified, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.trim().length < 4) {
      toast.error('أدخل رمز التحقق المرسل إلى بريدك');
      return;
    }
    try {
      await verifyEmail(otp.trim());
      toast.success('تم تفعيل بريدك بنجاح!');
      navigate('/onboarding/type', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        const m = err?.response?.data?.message?.match(/(\d+)/);
        setCooldown(m ? parseInt(m[1], 10) : RESEND_COOLDOWN);
      }
      toast.error(err?.response?.data?.message || 'رمز غير صحيح. حاول مجدداً.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendOTP();
      toast.success('تم إرسال رمز جديد إلى بريدك');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        const m = err?.response?.data?.message?.match(/(\d+)/);
        setCooldown(m ? parseInt(m[1], 10) : RESEND_COOLDOWN);
        toast.error(err?.response?.data?.message);
      } else {
        toast.error(err?.response?.data?.message || 'تعذر الإرسال. حاول مجدداً.');
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="onb" dir="rtl">
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg"
          >
            <div className="onb-card text-center">
              <span
                aria-hidden
                className="mx-auto mb-6 flex items-center justify-center"
                style={{ width: 88, height: 88, borderRadius: 22, background: '#E2EFE7' }}
              >
                <MailCheck size={40} style={{ color: '#177B58' }} />
              </span>

              <p className="onb-badge" style={{ marginBottom: 12 }}>الخطوة 1 من 6 — تفعيل البريد</p>
              <h1 className="font-extrabold mb-3" style={{ fontSize: '1.5rem', color: '#2A2438' }}>
                فعّل بريدك الإلكتروني
              </h1>
              <p className="mb-6" style={{ color: '#756E85', lineHeight: 1.8 }}>
                أرسلنا رمز تحقق إلى <strong style={{ color: '#2A2438' }}>{user?.email}</strong>
                <br />
                صالح لمدة 10 دقائق — بدونه لن تظهر للإدارة للمراجعة.
              </p>

              <form onSubmit={handleVerify}>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  aria-label="رمز التحقق"
                  style={{
                    width: '100%', minHeight: 56, borderRadius: 14, textAlign: 'center',
                    fontSize: '1.5rem', fontWeight: 800, letterSpacing: 8,
                    border: '1.5px solid #E8E2D4', background: '#FBF7EE', color: '#2A2438',
                    fontFamily: 'inherit', marginBottom: 12,
                  }}
                />
                <button type="submit" disabled={isLoading} className="onb-btn onb-btn-block" style={{ marginBottom: 12 }}>
                  {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'تفعيل ومتابعة'}
                </button>
              </form>

              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="onb-ghost w-full justify-center"
                style={{ opacity: cooldown > 0 ? 0.6 : 1 }}
              >
                <RefreshCw className="w-4 h-4" aria-hidden />
                {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown} ثانية` : 'إعادة إرسال الرمز'}
              </button>
              <button onClick={handleLogout} className="onb-ghost w-full justify-center text-sm" style={{ marginTop: 8 }}>
                <LogOut className="w-4 h-4" aria-hidden />
                تسجيل الخروج
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}
