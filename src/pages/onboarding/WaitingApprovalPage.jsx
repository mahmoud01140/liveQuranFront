import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { Clock, Check, BookOpen, RefreshCw, LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import './Onboarding.css';

export default function WaitingApprovalPage() {
  const { user, checkAuth, refreshUser, logout } = useAuthStore();
  const navigate = useNavigate();

  // Poll for updates every 30 seconds — always read the FRESH store value
  useEffect(() => {
    const interval = setInterval(async () => {
      const fresh = await refreshUser();
      if (fresh?.assignedLevel) {
        navigate('/student', { replace: true });
      }
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If user now has an assigned level, redirect to dashboard
  useEffect(() => {
    if (user?.assignedLevel) {
      navigate('/student', { replace: true });
    }
  }, [user?.assignedLevel, navigate]);

  const handleRefresh = async () => {
    const fresh = await refreshUser();
    await checkAuth();
    const current = fresh?.assignedLevel
      || useAuthStore.getState().user?.assignedLevel;
    if (current) {
      navigate('/student', { replace: true });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const steps = [
    { label: 'إنشاء الحساب', done: true },
    { label: 'امتحان تحديد المستوى', done: true },
    { label: 'مراجعة النتائج', done: false, current: true },
    { label: 'تعيين المجموعة', done: false },
  ];

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
              {/* Calm status mark */}
              <span
                aria-hidden
                className="mx-auto mb-6 flex items-center justify-center"
                style={{ width: 88, height: 88, borderRadius: 22, background: '#E2EFE7' }}
              >
                <Clock size={40} style={{ color: '#177B58' }} />
              </span>

              <h1 className="font-extrabold mb-3" style={{ fontSize: '1.5rem', color: '#2A2438' }}>
                جارٍ مراجعة امتحانك
              </h1>

              <p className="mb-6" style={{ color: '#756E85', lineHeight: 1.8 }}>
                لقد أتممت امتحان تحديد المستوى بنجاح!
                <br />
                فريقنا يراجع إجاباتك وتسجيلاتك الشفهية لتحديد مستواك النهائي.
              </p>

              {/* Status steps */}
              <ol className="rounded-2xl p-5 mb-6 text-right" style={{ background: '#FBF7EE', listStyle: 'none', margin: 0 }}>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span aria-hidden className={`onb-stepdot${step.done ? ' done' : step.current ? ' now' : ''}`}>
                        {step.done ? <Check size={14} strokeWidth={3.5} /> : (i + 1)}
                      </span>
                      <span className="text-sm" style={{
                        fontWeight: step.current ? 800 : 500,
                        color: step.done ? '#2A2438' : step.current ? '#0F5940' : '#756E85',
                      }}>
                        {step.label}
                        {step.current && (
                          <span className="mr-2" style={{ fontSize: '0.8125rem', color: '#756E85' }}>— قيد المراجعة</span>
                        )}
                      </span>
                    </li>
                  ))}
                </div>
              </ol>

              {/* Expected time */}
              <div className="onb-notice mb-6 text-right">
                <Clock className="w-5 h-5 flex-none mt-0.5" style={{ color: '#B45309' }} aria-hidden />
                <div>
                  <p className="text-sm font-bold" style={{ color: '#2A2438' }}>الوقت المتوقع</p>
                  <p className="text-sm" style={{ color: '#756E85' }}>
                    مراجعة التسجيلات الشفهية خلال <strong>24 ساعة</strong>، ثم تسكينك في مجموعة تناسب مستواك.
                    ستصلك رسالة إشعار عند كل خطوة.
                  </p>
                </div>
              </div>

              {user?.placementExamScore !== undefined && (
                <div className="rounded-xl p-4 mb-6 flex items-center justify-between" style={{ background: '#E2EFE7' }}>
                  <span className="text-sm font-medium" style={{ color: '#0F5940' }}>نتيجتك المبدئية</span>
                  <span className="text-lg font-black" style={{ color: '#0F5940' }}>{user.placementExamScore}%</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button onClick={() => navigate('/student/quran')} className="onb-btn onb-btn-block">
                  <BookOpen className="w-4 h-4" aria-hidden />
                  افتح المصحف ريثما تتم المراجعة
                </button>
                <button onClick={handleRefresh} className="onb-ghost w-full justify-center">
                  <RefreshCw className="w-4 h-4" aria-hidden />
                  تحديث الحالة
                </button>
                <button onClick={handleLogout} className="onb-ghost w-full justify-center text-sm">
                  <LogOut className="w-4 h-4" aria-hidden />
                  تسجيل الخروج
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6">
              <div className="flex items-center justify-center gap-2" style={{ color: '#756E85' }}>
                <BookOpen className="w-4 h-4" style={{ color: '#177B58' }} aria-hidden />
                <span style={{ fontSize: '0.8125rem' }}>منصة الحلقة لتحفيظ القرآن الكريم</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}
