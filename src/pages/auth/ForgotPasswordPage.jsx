import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, BookOpen, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('البريد الإلكتروني مطلوب');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setIsSent(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'حدث خطأ، حاول مجدداً');
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
          <h1 className="text-2xl font-black text-gray-900">نسيت كلمة المرور</h1>
          <p className="text-gray-500 mt-1">أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين</p>
        </div>

        {isSent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-base p-8 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">تم إرسال الرابط!</h2>
            <p className="text-gray-500 text-sm mb-6">
              إذا كان البريد الإلكتروني مسجلاً لدينا، ستتلقى رابط إعادة تعيين كلمة المرور خلال دقائق.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5">
              العودة لتسجيل الدخول
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="card-base p-8 space-y-5">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">البريد الإلكتروني</label>
              <div className="relative rounded-xl">
                <Mail className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base pr-10"
                  placeholder="your@email.com"
                  dir="ltr"
                  id="forgot-email"
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
              {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'إرسال رابط إعادة التعيين'}
            </motion.button>

            <p className="text-center text-sm text-gray-500 pt-1">
              تتذكر كلمة المرور؟{' '}
              <Link to="/login" className="text-primary-400 font-semibold hover:underline hover:text-primary-500 transition-colors">
                تسجيل الدخول
              </Link>
            </p>
          </form>
        )}

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
