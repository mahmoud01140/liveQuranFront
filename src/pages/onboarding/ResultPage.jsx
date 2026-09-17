import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { CheckCircle, BookOpen, Clock, ChevronLeft, Star } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import { getLevelLabel, getCirclePath } from '../../utils/helpers';
import './Onboarding.css';

/* Level tones in Al-Halaqa identity (local to onboarding —
   the shared getLevelColor util is untouched). */
const LEVEL_TONES = {
  foundation: { bg: '#E2EFE7', fg: '#0F5940' },
  memorization: { bg: '#ECE9F4', fg: '#4A3F6B' },
  teacher_prep: { bg: '#ECE9F4', fg: '#4A3F6B' },
  senior: { bg: '#FBF7EE', fg: '#2A2438' },
};

export default function ResultPage() {
  const { user, checkAuth, refreshUser } = useAuthStore();
  const { result, oralRecordings } = useExamStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth(); // Refresh user data with new assignedLevel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const score = result?.totalPercentage ?? result?.writtenPercentage ?? 0;
  const level = user?.assignedLevel || result?.assignedLevel || 'foundation';
  const tone = LEVEL_TONES[level] || LEVEL_TONES.foundation;
  const { circumference, strokeDashoffset } = getCirclePath(score);
  const hasOral = (oralRecordings?.length || 0) > 0 || (user?.oralExamRecordings?.length || 0) > 0;

  const handleContinue = async () => {
    // Wait for the fresh user record — a stale store may still lack assignedLevel.
    let fresh = user;
    try {
      fresh = (await refreshUser()) || user;
    } catch (_) {}
    if (fresh?.assignedLevel) {
      navigate('/student');
    } else {
      navigate('/waiting-approval');
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="onb" dir="rtl">
        <div className="max-w-2xl mx-auto px-4 py-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-center mb-8"
          >
            <span className="onb-badge">الخطوة 5 من 5 — النتيجة</span>
            <h1 className="font-extrabold mt-3 mb-2" style={{ fontSize: '2rem', lineHeight: 1.4, color: '#2A2438' }}>أحسنت! انتهيت من التسجيل</h1>
            <p style={{ color: '#756E85' }}>هذه نتيجة امتحان التحديد الخاص بك</p>
          </motion.div>

          {/* Score circle */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="onb-card mb-6 text-center"
          >
            <div className="flex justify-center mb-6">
              <div
                className="relative"
                role="img"
                aria-label={`نتيجتك ${score} بالمئة، المستوى ${getLevelLabel(level)}`}
                style={{ width: 144, height: 144, borderRadius: 9999, position: 'relative', flex: 'none' }}
              >
                <svg width={144} height={144} viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }} aria-hidden>
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#E8E2D4" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke="#177B58"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.25s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="font-black" style={{ fontSize: '2rem', lineHeight: 1.2, color: '#2A2438' }}>{score}%</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#756E85' }}>النتيجة</span>
                </div>
              </div>
            </div>

            {/* Level badge */}
            <div
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-extrabold text-lg mb-4"
              style={{ backgroundColor: tone.bg, color: tone.fg }}
            >
              <Star className="w-5 h-5" aria-hidden />
              مستواك المبدئي: {getLevelLabel(level)}
            </div>

            <p className="text-sm" style={{ color: '#756E85', lineHeight: 1.8 }}>
              هذا تقييم مبدئي بناءً على الامتحان التحريري — سيؤكد المعلم مستواك النهائي بعد مراجعة تسجيلاتك الشفهية.
            </p>
          </motion.div>

          {/* Oral exam notice */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="onb-notice mb-6"
          >
            <Clock className="w-6 h-6 flex-none mt-0.5" style={{ color: '#B45309' }} aria-hidden />
            <div>
              <p className="font-bold mb-1" style={{ color: '#2A2438' }}>مراجعة التسجيلات الشفهية (إجبارية)</p>
              <p className="text-sm" style={{ color: '#756E85' }}>
                {hasOral
                  ? 'سيتم مراجعة تسجيلاتك الشفهية من قِبَل المعلم المتخصص وتأكيد مستواك النهائي خلال 24 ساعة. ستصلك رسالة إشعار عند اكتمال المراجعة.'
                  : 'لم نستلم تسجيلاتك الشفهية بعد — الامتحان الشفهي إجباري. ارجع وأكمل التسجيل حتى تُعتمد نتيجتك.'}
              </p>
              {!hasOral && (
                <button type="button" onClick={() => navigate('/onboarding/oral-exam')} className="onb-btn mt-3">
                  إكمال الامتحان الشفهي
                  <ChevronLeft className="w-4 h-4" aria-hidden />
                </button>
              )}
            </div>
          </motion.div>

          {/* Curriculum preview */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="onb-card mb-6"
          >
            <h3 className="font-extrabold mb-4 flex items-center gap-2" style={{ fontSize: '1.25rem', color: '#2A2438' }}>
              <BookOpen className="w-5 h-5" style={{ color: '#177B58' }} aria-hidden />
              ماذا بعد؟
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'مراجعة المعلم لتسجيلاتك خلال 24 ساعة',
                'تسكينك في مجموعة تناسب مستواك',
                'منهجك الدراسي يظهر داخل مجموعتك',
                'ابدأ من الآن بتصفح المصحف',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm rounded-xl px-3 py-2" style={{ color: '#2A2438', background: '#FBF7EE' }}>
                  <CheckCircle className="w-4 h-4 flex-none" style={{ color: '#177B58' }} aria-hidden />
                  {step}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/student/quran')}
              className="onb-ghost mt-4 text-sm"
            >
              <BookOpen className="w-4 h-4" aria-hidden />
              افتح المصحف الآن
            </button>
          </motion.div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleContinue}
              className="onb-btn onb-btn-block"
            >
              {user?.assignedLevel ? 'الانتقال للوحة التحكم' : 'متابعة'}
              <ChevronLeft className="w-5 h-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
