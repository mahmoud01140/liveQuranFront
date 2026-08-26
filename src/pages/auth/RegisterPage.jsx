import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, Globe, Calendar, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { validateRegisterForm, hasErrors } from '../../utils/validators';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function RegisterPage() {
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '', country: '', dateOfBirth: '', gender: '', role: 'student',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateRegisterForm(form);
    if (hasErrors(errs)) { setErrors(errs); return; }

    try {
      const { firstName, lastName, email, password, phone, country, dateOfBirth, gender, role } = form;
      await register({ firstName, lastName, email, password, phone, country, dateOfBirth, gender, role });
      toast.success('تم إنشاء الحساب بنجاح! 🎉');
      if (role === 'parent') {
        navigate('/parent');
      } else {
        navigate('/onboarding/type');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'خطأ في التسجيل');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-quran rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">منصة تحفيظ القرآن</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900">إنشاء حساب جديد</h1>
          <p className="text-gray-500 mt-1">ابدأ رحلتك مع القرآن الكريم اليوم</p>
        </div>

        <form onSubmit={handleSubmit} className="card-base p-8 space-y-4">
          {/* Account Type Selection */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">نوع الحساب *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, role: 'student' }))}
                className={`py-2 px-4 rounded-xl text-sm font-bold border transition-all ${
                  form.role === 'student'
                    ? 'bg-primary-50 text-primary-600 border-primary-300 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                📖 طالب علم
              </button>
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, role: 'parent' }))}
                className={`py-2 px-4 rounded-xl text-sm font-bold border transition-all ${
                  form.role === 'parent'
                    ? 'bg-blue-50 text-blue-600 border-blue-300 shadow-sm'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                👨‍👩‍👦 ولي أمر
              </button>
            </div>
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">الاسم الأول *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange}
                className={`input-base ${errors.firstName ? 'input-error' : ''}`} placeholder="أحمد" />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">اسم العائلة *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange}
                className={`input-base ${errors.lastName ? 'input-error' : ''}`} placeholder="العمري" />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">البريد الإلكتروني *</label>
            <div className="relative">
              <Mail className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" />
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className={`input-base pr-10 ${errors.email ? 'input-error' : ''}`}
                placeholder="your@email.com" dir="ltr" />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">كلمة المرور *</label>
            <div className="relative">
              <Lock className="absolute right-3 top-3.5 w-4 h-4 text-gray-400" />
              <input name="password" type={showPass ? 'text' : 'password'} value={form.password}
                onChange={handleChange}
                className={`input-base pr-10 pl-10 ${errors.password ? 'input-error' : ''}`}
                placeholder="6 أحرف على الأقل" dir="ltr" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute left-3 top-3.5 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">تأكيد كلمة المرور *</label>
            <input name="confirmPassword" type="password" value={form.confirmPassword}
              onChange={handleChange}
              className={`input-base ${errors.confirmPassword ? 'input-error' : ''}`}
              placeholder="أعد كتابة كلمة المرور" dir="ltr" />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* Phone & Country */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">الهاتف</label>
              <input name="phone" value={form.phone} onChange={handleChange}
                className={`input-base ${errors.phone ? 'input-error' : ''}`}
                placeholder="+966..." dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">البلد</label>
              <select name="country" value={form.country} onChange={handleChange} className="input-base">
                <option value="">اختر البلد</option>
                {['السعودية', 'مصر', 'الإمارات', 'الكويت', 'الأردن', 'سوريا', 'المغرب', 'الجزائر', 'تونس', 'العراق', 'فلسطين', 'ليبيا', 'اليمن', 'عمان', 'البحرين', 'قطر', 'أخرى'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* DOB & Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">تاريخ الميلاد</label>
              <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange}
                className="input-base" dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">الجنس</label>
              <select name="gender" value={form.gender} onChange={handleChange} className="input-base">
                <option value="">اختر</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5 mt-2">
            {isLoading ? <LoadingSpinner size="sm" color="white" /> : 'إنشاء الحساب'}
          </button>

          <p className="text-center text-sm text-gray-500">
            لديك حساب؟{' '}
            <Link to="/login" className="text-primary-400 font-semibold hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
