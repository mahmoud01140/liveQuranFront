import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

const types = [
  {
    id: 'student',
    icon: '📖',
    title: 'طالب تأسيس',
    color: 'primary',
    gradient: 'from-primary-400 to-primary-600',
    desc: 'للمبتدئين والمتوسطين الراغبين في تعلم القراءة والتجويد وحفظ القرآن',
    features: ['منهج متدرج من الصفر', 'مجموعات دراسية صغيرة', 'جلسات مباشرة تفاعلية', 'خطة ختم مخصصة'],
  },
  {
    id: 'teacher',
    icon: '👨‍🏫',
    title: 'إعداد معلم',
    color: 'teacher',
    gradient: 'from-teacher to-purple-700',
    desc: 'للراغبين في تطوير مهاراتهم التدريسية وتأهيل أنفسهم لتدريس القرآن',
    features: ['منهج التدريس المتقدم', 'تدريب على الأساليب التفاعلية', 'شهادة إعداد معلمين', 'فرص تدريس على المنصة'],
  },
  {
    id: 'senior',
    icon: '🌙',
    title: 'كبار السن',
    color: 'senior',
    gradient: 'from-senior to-amber-600',
    desc: 'برنامج خاص بوتيرة هادئة ومناسبة لمتطلبات كبار السن ومساعدتهم في التقنية',
    features: ['وتيرة دراسية هادئة', 'شاشة وأزرار كبيرة', 'دعم تقني مخصص', 'مجموعات صغيرة ودافئة'],
  },
];

export default function RegistrationTypePage() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (!selected) { toast.error('الرجاء اختيار نوع التسجيل'); return; }
    setIsLoading(true);
    try {
      await api.put(`/users/${user._id}`, { registrationType: selected });
      updateUser({ registrationType: selected });
      navigate('/onboarding/survey');
    } catch {
      toast.error('حدث خطأ. حاول مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white p-4 py-12">
      {/* Progress */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span className="badge-green">الخطوة 2 من 6</span>
          <span>اختيار نوع التسجيل</span>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: '33%' }} /></div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-gray-900 mb-3">ما هو هدفك؟</h1>
          <p className="text-gray-500">اختر النوع الأنسب لك ليتم تخصيص منهجك وامتحانك التحديدي</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {types.map((type, i) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelected(type.id)}
              className={`card-base p-6 cursor-pointer transition-all duration-200 hover:-translate-y-1 ${
                selected === type.id
                  ? 'ring-2 ring-primary-400 shadow-green scale-[1.02]'
                  : 'hover:shadow-md'
              }`}
            >
              {/* Radio indicator */}
              <div className="flex justify-between items-start mb-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${type.gradient} flex items-center justify-center text-3xl shadow-md`}>
                  {type.icon}
                </div>
                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                  selected === type.id ? 'border-primary-400 bg-primary-400' : 'border-gray-300'
                }`}>
                  {selected === type.id && <div className="w-full h-full rounded-full bg-white scale-50 block" />}
                </div>
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">{type.title}</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">{type.desc}</p>
              <ul className="space-y-1.5">
                {type.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-4 h-4 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleNext}
            disabled={!selected || isLoading}
            className="btn-primary px-12 py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'جارٍ الحفظ...' : 'التالي — الاستبيان'}
          </button>
        </div>
      </div>
    </div>
  );
}
