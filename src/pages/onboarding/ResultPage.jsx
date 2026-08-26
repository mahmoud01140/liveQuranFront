import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, BookOpen, Clock, ChevronLeft, Star } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import { getLevelLabel, getLevelColor, getCirclePath } from '../../utils/helpers';

export default function ResultPage() {
  const { user, checkAuth } = useAuthStore();
  const { result } = useExamStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth(); // Refresh user data with new assignedLevel
  }, []);

  const score = result?.totalPercentage ?? result?.writtenPercentage ?? 0;
  const level = user?.assignedLevel || result?.assignedLevel || 'foundation';
  const levelColor = getLevelColor(level);
  const { circumference, strokeDashoffset } = getCirclePath(score);

  const curricula = {
    foundation: ['فتح الرحمن', 'نور البيان', 'كتاب الزاد', 'تهجي جزء النبأ', 'تحفة الأطفال', 'الأذكار', 'الآداب'],
    memorization: ['تحفة الأطفال كاملاً', 'الفتح الرباني', 'مراجعة فتح الرحمن', 'جزء النبأ تطبيق', 'الأساس في الآداب', 'الجزرية', 'خطة الختم'],
    teacher_prep: ['كل كتب التأسيس والتحفيظ', 'منهج التدريس المتخصص', 'أساليب التفاعل', 'إدارة الفصل الافتراضي'],
    senior: ['نور البيان الميسر', 'الأحكام الأساسية المبسطة', 'أذكار الصلاة', 'سور قصيرة', 'خطة مرنة'],
  };

  const books = curricula[level] || curricula.foundation;

  const handleContinue = () => {
    if (user?.assignedLevel) {
      navigate('/student');
    } else {
      navigate('/waiting-approval');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white p-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Confetti header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center mb-8"
        >
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">أحسنت! انتهيت من التسجيل</h1>
          <p className="text-gray-500">هذه نتيجة امتحان التحديد الخاص بك</p>
        </motion.div>

        {/* Score circle */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-base p-8 mb-6 text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#E1F5EE" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke={levelColor.text}
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black" style={{ color: levelColor.text }}>{score}%</span>
                <span className="text-xs text-gray-400">النتيجة</span>
              </div>
            </div>
          </div>

          {/* Level badge */}
          <div
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-lg mb-4"
            style={{ backgroundColor: levelColor.bg, color: levelColor.text }}
          >
            <Star className="w-5 h-5" />
            مستواك: {getLevelLabel(level)}
          </div>

          <p className="text-gray-600 text-sm leading-relaxed">
            بناءً على إجاباتك في الاستبيان والامتحان التحريري، تم تحديد مستواك الدراسي.
          </p>
        </motion.div>

        {/* Oral exam notice */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex gap-4"
        >
          <Clock className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 mb-1">مراجعة التسجيلات الشفهية</p>
            <p className="text-amber-700 text-sm">
              سيتم مراجعة تسجيلاتك الشفهية من قِبَل المعلم المتخصص وتأكيد مستواك النهائي خلال <strong>24 ساعة</strong>.
              ستصلك رسالة إشعار عند اكتمال المراجعة.
            </p>
          </div>
        </motion.div>

        {/* Curriculum preview */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-base p-6 mb-6"
        >
          <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-400" />
            منهجك الدراسي المخصص
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {books.map((book, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-primary-50 rounded-xl px-3 py-2">
                <CheckCircle className="w-4 h-4 text-primary-400 flex-shrink-0" />
                {book}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleContinue}
            className="btn-primary flex-1 py-3.5 text-base"
          >
            {user?.assignedLevel ? 'الانتقال للوحة التحكم' : 'متابعة'}
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
