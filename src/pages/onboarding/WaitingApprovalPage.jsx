import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, BookOpen, RefreshCw, LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { getLevelLabel } from '../../utils/helpers';

export default function WaitingApprovalPage() {
  const { user, checkAuth, logout } = useAuthStore();
  const navigate = useNavigate();

  // Poll for updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkAuth();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // If user now has an assigned level, redirect to dashboard
  useEffect(() => {
    if (user?.assignedLevel) {
      navigate('/student', { replace: true });
    }
  }, [user?.assignedLevel]);

  const handleRefresh = async () => {
    await checkAuth();
    if (user?.assignedLevel) {
      navigate('/student', { replace: true });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="w-full max-w-lg"
      >
        <div className="card-base p-8 text-center">
          {/* Animated icon */}
          <div className="relative mx-auto w-24 h-24 mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-4 border-dashed border-primary-200"
            />
            <div className="absolute inset-2 bg-gradient-quran rounded-full flex items-center justify-center shadow-green">
              <Clock className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-gray-900 mb-3">
            جارٍ مراجعة امتحانك
          </h1>

          <p className="text-gray-500 leading-relaxed mb-6">
            لقد أتممت امتحان تحديد المستوى بنجاح! 🎉
            <br />
            فريقنا يراجع إجاباتك وتسجيلاتك الشفهية لتحديد مستواك النهائي.
          </p>

          {/* Status steps */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-6 text-right">
            <div className="space-y-4">
              {[
                { label: 'إنشاء الحساب', done: true },
                { label: 'امتحان تحديد المستوى', done: true },
                { label: 'مراجعة النتائج', done: false, current: true },
                { label: 'تعيين المجموعة', done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.done ? 'bg-green-100 text-green-600' :
                    step.current ? 'bg-primary-100 text-primary-500 animate-pulse' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {step.done ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    step.done ? 'text-green-700' :
                    step.current ? 'text-primary-600 font-bold' :
                    'text-gray-400'
                  }`}>
                    {step.label}
                    {step.current && (
                      <span className="text-xs text-primary-400 mr-2">⏳ قيد المراجعة</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Expected time */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3 text-right">
            <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">الوقت المتوقع</p>
              <p className="text-xs text-amber-700">
                ستصلك رسالة إشعار خلال <strong>24 ساعة</strong> عند اكتمال المراجعة.
              </p>
            </div>
          </div>

          {user?.placementExamScore !== undefined && (
            <div className="bg-primary-50 rounded-xl p-4 mb-6 flex items-center justify-between">
              <span className="text-sm text-primary-700 font-medium">نتيجتك المبدئية</span>
              <span className="text-lg font-black text-primary-600">{user.placementExamScore}%</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button onClick={handleRefresh} className="btn-primary w-full py-3">
              <RefreshCw className="w-4 h-4" />
              تحديث الحالة
            </button>
            <button onClick={handleLogout} className="btn-ghost w-full justify-center text-gray-400 text-sm">
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <BookOpen className="w-4 h-4 text-primary-300" />
            <span className="text-xs">منصة تحفيظ القرآن الكريم</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
