import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, CheckCircle2, AlertCircle, Clock, ShieldCheck,
  Copy, Check, Upload, Sparkles, Phone,
  HelpCircle, Eye, RefreshCw, Smartphone, Building2, Gift, Lock, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../services/api';
import { formatDateAr } from '../../utils/helpers';
import useAuthStore from '../../store/authStore';

export default function SubscriptionPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [currency, setCurrency] = useState('EGP'); // 'EGP' | 'SAR'
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'quarterly' | 'annual'

  // Backend config & status
  const [planConfig, setPlanConfig] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState(null);
  const [supportInfo, setSupportInfo] = useState({});
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);

  // Modal states
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('vodafone_cash'); // 'vodafone_cash' | 'instapay'
  const [selectedReceiptPreview, setSelectedReceiptPreview] = useState(null);

  // Form states
  const [senderPhone, setSenderPhone] = useState('');
  const [senderName, setSenderName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copy state
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [configRes, historyRes] = await Promise.all([
        api.get('/payments/public-config'),
        api.get('/payments/my-history'),
      ]);

      if (configRes.data) {
        setPlanConfig(configRes.data.plan || null);
        setPaymentMethods(configRes.data.methods || null);
        setSupportInfo(configRes.data.support || {});
      }

      if (historyRes.data) {
        setSubscription(historyRes.data.subscription || null);
        setPayments(historyRes.data.payments || []);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      toast.error('حدث خطأ أثناء تحميل بيانات الاشتراك');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('تم النسخ إلى الحافظة');
    setTimeout(() => setCopiedKey(''), 2500);
  };

  const handleOpenCheckout = () => {
    setSenderPhone(user?.phone || '');
    setSenderName(`${user?.firstName || ''} ${user?.lastName || ''}`.trim());
    setReferenceNumber('');
    setNotes('');
    setReceiptFile(null);
    setReceiptPreviewUrl('');
    setCheckoutModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('يرجى اختيار صورة إيصال صحيحة (JPG, PNG, WebP) أو ملف PDF');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً، الحد الأقصى 15 ميغابايت');
      return;
    }

    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreviewUrl(url);
    } else {
      setReceiptPreviewUrl('');
    }
  };

  const calculateAmount = (plan, cycle, curr) => {
    if (!plan) return 0;
    const baseMonthly = curr === 'EGP' ? (plan.priceEGP || 250) : (plan.priceSAR || 49);
    if (cycle === 'monthly') return baseMonthly;
    if (cycle === 'quarterly') {
      const total = baseMonthly * 3;
      const discount = (plan.quarterlyDiscountPercent || 10) / 100;
      return Math.round(total * (1 - discount));
    }
    if (cycle === 'annual') {
      const total = baseMonthly * 12;
      const discount = (plan.annualDiscountPercent || 20) / 100;
      return Math.round(total * (1 - discount));
    }
    return baseMonthly;
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!receiptFile) {
      toast.error('يرجى رفع صورة إيصال التحويل أو لقطة الشاشة للعملية');
      return;
    }

    if (selectedMethod === 'vodafone_cash' && !senderPhone) {
      toast.error('يرجى إدخال رقم المحفظة / الهاتف المحول منه');
      return;
    }

    const calculatedAmount = calculateAmount(planConfig, billingCycle, currency);

    const formData = new FormData();
    formData.append('billingCycle', billingCycle);
    formData.append('amount', calculatedAmount);
    formData.append('currency', currency);
    formData.append('method', selectedMethod);
    formData.append('senderPhone', senderPhone);
    formData.append('senderName', senderName);
    formData.append('referenceNumber', referenceNumber);
    formData.append('notes', notes);
    formData.append('receipt', receiptFile);

    setIsSubmitting(true);
    try {
      const res = await api.post('/payments/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(res.data.message || 'تم إرسال إيصال التحويل بنجاح!');
      setCheckoutModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Submit payment error:', err);
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء إرسال طلب الدفع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPaidActive = subscription?.status === 'active' && !subscription?.isExpired;
  const isTrial = subscription?.isTrial;
  const isExpiringSoon = subscription?.isExpiringSoon;
  const isExpired = subscription?.isExpired;
  const trialUsed = (subscription?.trialSessionsAttended || 0) >= (subscription?.trialSessionsAllowed || 1);
  const currencyLabel = currency === 'EGP' ? 'ج.م' : 'ر.س';

  return (
    <PageLayout>
      <div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  دفع آمن ومباشر داخل مصر 🇪🇬
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700">
                  فودافون كاش & انستاباي
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                الاشتراكات والمدفوعات 💳
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                اشتراك شهري موحد يضمن حضور الحلقات المباشرة، خطة الختم، ومتابعة الحفظ مع أفضل المعلمين
              </p>
            </div>

            <button
              onClick={fetchData}
              disabled={isLoading}
              className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 shadow-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث الحالة
            </button>
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="lg" text="جارٍ تحميل بيانات الاشتراك..." />
            </div>
          ) : (
            <div className="space-y-8">

              {/* ─── Subscription Status Banner / Card ────────────────────────── */}
              {isExpiringSoon && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                      <AlertTriangle className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-amber-950">
                        تنبيه: اقترب موعد سداد الاشتراك الشهري ⚠️
                      </h3>
                      <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                        يتبقى <span className="font-black underline">{subscription?.daysRemaining} أيام</span> على انتهاء اشتراكك الحالي. يرجى سداد الاشتراك لتجنب تعليق الدخول للحلقات المباشرة.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleOpenCheckout}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 flex-shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    تجديد الاشتراك الآن
                  </button>
                </motion.div>
              )}

              {isExpired && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-red-950">
                        تم تعليق الوصول للحلقات المباشرة مؤقتاً 🔒
                      </h3>
                      <p className="text-xs sm:text-sm text-red-800 mt-0.5">
                        انتهت فترة اشتراكك الشهري. يرجى سداد الاشتراك عبر فودافون كاش أو انستاباي لاستئناف الحضور مع مجموعتك فوراً.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleOpenCheckout}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 flex-shrink-0"
                  >
                    <CreditCard className="w-4 h-4" />
                    سداد الاشتراك واستعادة الوصول
                  </button>
                </motion.div>
              )}

              {/* Status Overview Card */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-l from-primary-400 via-emerald-500 to-teal-400" />
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-inner ${
                      isPaidActive
                        ? 'bg-gradient-to-br from-primary-400 to-primary-600 text-white'
                        : isTrial && !trialUsed
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {isPaidActive ? '⭐' : isTrial && !trialUsed ? '🎁' : '🔒'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-black text-gray-900">
                          {isPaidActive
                            ? 'الاشتراك الشهري الشامل (مفعل وسارٍ)'
                            : isTrial && !trialUsed
                            ? 'المحاضرة التجريبية الأولى (مجاناً 🎁)'
                            : trialUsed && !isPaidActive
                            ? 'انتهت المحاضرة التجريبية (مطلوب الاشتراك)'
                            : 'الاشتراك الشهري (منتهي الصلاحية)'}
                        </h2>
                        <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                          isPaidActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : isTrial && !trialUsed
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isPaidActive
                            ? 'مشترك نشط ✅'
                            : isTrial && !trialUsed
                            ? 'متاح حضور أول جلسة مجاناً'
                            : 'مطلوب السداد للمتابعة ⚠️'}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 mt-1">
                        {isPaidActive && subscription?.endDate ? (
                          <>
                            ينتهي اشتراكك الحالي في: <span className="font-bold text-gray-800">{formatDateAr(subscription.endDate)}</span>
                            {' '}(متبقي <span className="text-primary-600 font-extrabold">{subscription.daysRemaining}</span> يوم)
                          </>
                        ) : isTrial && !trialUsed ? (
                          'يمكنك الانضمام لحضور أول جلسة مباشرة في مجموعتك لتجربة الحفظ والتفاعل مع المعلم مجاناً.'
                        ) : (
                          'أتممت جلستك التجريبية بنجاح! للاستمرار في حضور الحلقات مع مجموعتك، يرجى سداد الاشتراك الشهري.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleOpenCheckout}
                      className="px-6 py-3.5 rounded-2xl bg-gradient-quran text-white font-bold text-sm shadow-green hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      {isPaidActive ? 'تجديد الاشتراك مقدماً' : 'الاشتراك وسداد الرسوم الآن'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── Egyptian Payment Badges Highlights ─────────────────────── */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-red-500/10 via-red-50 to-white border border-red-200/60 rounded-3xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-red-950 text-base">فودافون كاش (Vodafone Cash)</h3>
                    <p className="text-xs text-red-800/80 mt-0.5">
                      تحويل فوري وسهل من أي محفظة إلكترونية (فودافون، أورنج، اتصالات، وي)
                    </p>
                  </div>
                  <span className="badge-red text-xs">متاح 24/7</span>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 via-purple-50 to-white border border-purple-200/60 rounded-3xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-purple-950 text-base">انستاباي (InstaPay Egypt)</h3>
                    <p className="text-xs text-purple-800/80 mt-0.5">
                      تحويل لحظي من كافة البنوك المصرية عبر العنوان اللحظي (IPA) أو رقم الهاتف
                    </p>
                  </div>
                  <span className="badge-purple text-xs">بدون أي رسوم</span>
                </div>
              </div>

              {/* ─── The Single Plan Card Section ───────────────────────────── */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-gray-100 pb-6">
                  <div>
                    <span className="text-xs font-black tracking-wider uppercase text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                      الباقة الشاملة الموحدة
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2">
                      خطة الاشتراك في حلقات القرآن الكريم
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      احضر أول محاضرة مجاناً 🎁 ثم اشترك للاستمرار في رحلتك مع القرآن الكريم
                    </p>
                  </div>

                  {/* Controls: Currency & Billing cycle */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Currency toggle */}
                    <div className="bg-gray-100 p-1 rounded-2xl flex items-center text-xs font-bold">
                      <button
                        onClick={() => setCurrency('EGP')}
                        className={`px-3.5 py-1.5 rounded-xl transition-all ${
                          currency === 'EGP' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        🇪🇬 جنيه مصري (EGP)
                      </button>
                      <button
                        onClick={() => setCurrency('SAR')}
                        className={`px-3.5 py-1.5 rounded-xl transition-all ${
                          currency === 'SAR' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        🇸🇦 ريال سعودي (SAR)
                      </button>
                    </div>

                    {/* Billing Cycle */}
                    <div className="bg-gray-100 p-1 rounded-2xl flex items-center text-xs font-bold">
                      <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-3.5 py-1.5 rounded-xl transition-all ${
                          billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        شهري (30 يوم)
                      </button>
                      <button
                        onClick={() => setBillingCycle('quarterly')}
                        className={`px-3.5 py-1.5 rounded-xl transition-all ${
                          billingCycle === 'quarterly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        3 شهور (-10%)
                      </button>
                      <button
                        onClick={() => setBillingCycle('annual')}
                        className={`px-3.5 py-1.5 rounded-xl transition-all ${
                          billingCycle === 'annual' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        سنوي (-20% 🔥)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Single Plan Content Box */}
                <div className="grid lg:grid-cols-12 gap-8 items-center bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-primary-50/60 rounded-3xl p-6 sm:p-8 border border-primary-100/60">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                      <Gift className="w-3.5 h-3.5" />
                      أول محاضرة تجريبية مجاناً لجميع الطلاب الجدد
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">
                      {planConfig?.name || 'الاشتراك الشهري في الحلقات'}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {planConfig?.description || 'اشتراك شهري شامل لحضور كافة الحلقات المباشرة، خطة الحفظ والختم، وتصحيح التلاوات مع المعلم'}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-3 pt-2">
                      {(planConfig?.features || [
                        'حضور جميع الجلسات المباشرة التفاعلية مع المعلم',
                        'خطة متابعة الحفظ والختم ومراجعة المتشابهات',
                        'مراجعة وتصحيح التلاوات والتسميع الصوتي المباشر',
                        'الوصول للتسجيلات ومكتبة الشروحات كاملة',
                        'حل الواجبات اليومية وبنك الاختبارات والتقييمات',
                        'شهادة إتمام معتمدة وموثقة عند إنهاء المنهج الدراسي',
                      ]).map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-md flex flex-col justify-between text-center">
                    <div>
                      <span className="text-xs font-bold text-gray-400 block">رسوم الاشتراك</span>
                      <div className="flex items-center justify-center gap-1.5 my-2">
                        <span className="text-5xl font-black text-gray-900">
                          {calculateAmount(planConfig, billingCycle, currency)}
                        </span>
                        <span className="text-base font-bold text-gray-500">
                          {currencyLabel} / {
                            billingCycle === 'annual' ? 'سنة'
                            : billingCycle === 'quarterly' ? '3 شهور'
                            : 'شهر'
                          }
                        </span>
                      </div>
                      <p className="text-xs text-emerald-600 font-semibold mb-6">
                        {billingCycle === 'annual' ? '🎉 وفرت 20% باشتراك سنوي كامل' : billingCycle === 'quarterly' ? '🎉 وفرت 10% باشتراك 3 شهور' : 'سداد شهري ميسر'}
                      </p>
                    </div>

                    <button
                      onClick={handleOpenCheckout}
                      className="w-full py-4 rounded-2xl bg-gradient-quran text-white font-bold text-base shadow-green hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <CreditCard className="w-5 h-5" />
                      {isPaidActive ? 'تجديد الاشتراك الآن' : 'اشترك وسدد الآن عبر كاش أو انستاباي'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── Payment History Table ─────────────────────────────────────── */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">سجل عمليات التحويل والإيصالات 📋</h2>
                    <p className="text-xs text-gray-500 mt-0.5">متابعة حالة الإيصالات المرفوعة وتاريخ انتهاء الاشتراكات</p>
                  </div>
                  <span className="text-xs font-bold bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                    إجمالي الطلبات: {payments.length}
                  </span>
                </div>

                {payments.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-300 stroke-1" />
                    <p className="font-semibold text-sm">لا توجد عمليات سداد سابقة حتى الآن</p>
                    <p className="text-xs text-gray-400 mt-1">عند قيامك بالتحويل ورفع صورة الإيصال ستظهر تفاصيل العملية هنا</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold">
                          <th className="pb-3 pr-4">تاريخ الطلب</th>
                          <th className="pb-3">طريقة الدفع</th>
                          <th className="pb-3">المبلغ</th>
                          <th className="pb-3">رقم المرجع / الهاتف</th>
                          <th className="pb-3">صورة الإيصال</th>
                          <th className="pb-3 pl-4">حالة الطلب</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-gray-700">
                        {payments.map((p) => {
                          const isVodafone = p.method === 'vodafone_cash';
                          return (
                            <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 pr-4 font-medium text-xs text-gray-600">
                                {formatDateAr(p.createdAt)}
                              </td>
                              <td className="py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                  isVodafone ? 'bg-red-50 text-red-700 border border-red-200/50' : 'bg-purple-50 text-purple-700 border border-purple-200/50'
                                }`}>
                                  {isVodafone ? '🔴 فودافون كاش' : '🟣 انستاباي'}
                                </span>
                              </td>
                              <td className="py-4 font-black text-gray-900">
                                {p.amount} {p.currency === 'EGP' ? 'ج.م' : 'ر.س'}
                              </td>
                              <td className="py-4 text-xs font-mono text-gray-600">
                                {p.referenceNumber || p.senderPhone || '—'}
                              </td>
                              <td className="py-4">
                                {p.receiptUrl ? (
                                  <button
                                    onClick={() => setSelectedReceiptPreview(p.receiptUrl)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg hover:bg-primary-100 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    معاينة الإيصال
                                  </button>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="py-4 pl-4">
                                {p.status === 'approved' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    معتمد ومفعل ✅
                                  </span>
                                ) : p.status === 'rejected' ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      مرفوض
                                    </span>
                                    {p.rejectionReason && (
                                      <p className="text-[11px] text-red-600 mt-1 max-w-xs">
                                        السبب: {p.rejectionReason}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                                    <Clock className="w-3.5 h-3.5" />
                                    قيد المراجعة ⏳
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ─── Help & Support Card ───────────────────────────────────────── */}
              <div className="bg-gradient-to-r from-emerald-50 to-primary-50 border border-primary-100 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-right">
                  <div className="w-12 h-12 rounded-2xl bg-white text-primary-600 flex items-center justify-center shadow-sm flex-shrink-0">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">هل واجهت أي صعوبة في عملية التحويل؟</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      فريق الدعم الفني جاهز لمساعدتك عبر الواتساب وتأكيد تفعيل اشتراكك في دقائق.
                    </p>
                  </div>
                </div>

                {supportInfo?.whatsapp && (
                  <a
                    href={`https://wa.me/${supportInfo.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 flex-shrink-0"
                  >
                    <Phone className="w-4 h-4" />
                    تواصل معنا عبر واتساب
                  </a>
                )}
              </div>

            </div>
          )}

        </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          CHECKOUT & PAYMENT MODAL
      ═════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {checkoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setCheckoutModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10 p-6 sm:p-8 relative border border-gray-100"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                <div>
                  <span className="text-xs font-black text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-full">
                    إتمام سداد الاشتراك الشهري
                  </span>
                  <h3 className="text-xl font-black text-gray-900 mt-1">
                    {planConfig?.name || 'الاشتراك الشهري في الحلقات'}
                  </h3>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  disabled={isSubmitting}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-6">

                {/* Amount to pay summary */}
                <div className="bg-gradient-to-r from-primary-50 to-emerald-50 rounded-2xl p-4 border border-primary-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-primary-800 font-semibold">المبلغ المطلوب تحويله:</span>
                    <p className="text-2xl font-black text-primary-950 mt-0.5">
                      {calculateAmount(planConfig, billingCycle, currency)} {currency === 'EGP' ? 'جنيه مصري (EGP)' : 'ريال سعودي (SAR)'}
                    </p>
                  </div>
                  <span className="badge-green text-xs">
                    {billingCycle === 'annual' ? 'سنة كاملة (خصم 20%)' : billingCycle === 'quarterly' ? '3 شهور (خصم 10%)' : '30 يوماً'}
                  </span>
                </div>

                {/* Step 1: Choose Method */}
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-3">
                    ١. اختر طريقة التحويل داخل مصر:
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {/* Vodafone Cash */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('vodafone_cash')}
                      className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                        selectedMethod === 'vodafone_cash'
                          ? 'border-red-500 bg-red-50/50 ring-2 ring-red-400 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        selectedMethod === 'vodafone_cash' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'
                      }`}>
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900 text-sm">فودافون كاش</span>
                          {selectedMethod === 'vodafone_cash' && <Check className="w-4 h-4 text-red-600" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">محافظ إلكترونية (كاش)</p>
                      </div>
                    </button>

                    {/* InstaPay */}
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('instapay')}
                      className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                        selectedMethod === 'instapay'
                          ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-400 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        selectedMethod === 'instapay' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-700'
                      }`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900 text-sm">انستاباي (InstaPay)</span>
                          {selectedMethod === 'instapay' && <Check className="w-4 h-4 text-purple-600" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">تحويل بنكي ولحظي فوري</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Step 2: Transfer Details / Copy Box */}
                <div className="rounded-2xl p-5 border border-gray-200 bg-gray-50 space-y-3">
                  <label className="block text-xs font-black text-gray-700">
                    ٢. بيانات الحساب للتحويل:
                  </label>

                  {selectedMethod === 'vodafone_cash' ? (
                    <div className="space-y-3">
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-gray-400 block">رقم محفظة فودافون كاش:</span>
                          <span className="text-base font-black font-mono text-red-600">
                            {paymentMethods?.vodafoneCash?.numbers?.[0] || '01012345678'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(paymentMethods?.vodafoneCash?.numbers?.[0] || '01012345678', 'voda-num')}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          {copiedKey === 'voda-num' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKey === 'voda-num' ? 'تم النسخ' : 'نسخ الرقم'}
                        </button>
                      </div>

                      <div className="text-xs text-gray-600 bg-white/80 p-3 rounded-xl border border-gray-100 leading-relaxed">
                        <p className="font-bold text-gray-800 mb-1">💡 طريقة التحويل:</p>
                        <p>1. افتح لوحة الاتصال واطلب: <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1 rounded">*9*7*الرقم*المبلغ#</span></p>
                        <p>2. أو استخدم تطبيق "أنا فودافون" ثم تحويل أموال.</p>
                        <p>3. احفظ لقطة شاشة (Screenshot) لرسالة التأكيد أو الإشعار.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-gray-400 block">العنوان اللحظي للانستاباي (IPA):</span>
                          <span className="text-sm font-black font-mono text-purple-700">
                            {paymentMethods?.instaPay?.address || 'quran-academy@instapay'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(paymentMethods?.instaPay?.address || 'quran-academy@instapay', 'insta-addr')}
                          className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          {copiedKey === 'insta-addr' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedKey === 'insta-addr' ? 'تم النسخ' : 'نسخ العنوان'}
                        </button>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="text-gray-400 block text-[11px]">اسم الحساب المستلم:</span>
                          <span className="font-bold text-gray-800">
                            {paymentMethods?.instaPay?.accountName || 'أكاديمية تحفيظ القرآن الكريم'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 bg-white/80 p-3 rounded-xl border border-gray-100 leading-relaxed">
                        <p className="font-bold text-gray-800 mb-1">💡 طريقة التحويل:</p>
                        <p>1. افتح تطبيق انستاباي واضغط "إرسال نقود".</p>
                        <p>2. اختر التحويل عبر عنوان الدفع اللحظي (IPA) أو رقم الهاتف.</p>
                        <p>3. أدخل المبلغ ({calculateAmount(planConfig, billingCycle, currency)} ج.م) وأكّد العملية واحفظ صورة الإيصال.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 3: Sender Details & Proof Upload */}
                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-700">
                    ٣. بيانات التحويل وتأكيد الدفع:
                  </label>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        {selectedMethod === 'vodafone_cash' ? 'رقم الهاتف / المحفظة المحول منها *' : 'رقم الهاتف أو اسم حساب انستاباي *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder={selectedMethod === 'vodafone_cash' ? '010XXXXXXXX' : 'اسم المستخدم أو 01XXXXXXXXX'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        رقم العملية / المرجع (اختياري)
                      </label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="مثال: TRX-837482"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
                      />
                    </div>
                  </div>

                  {/* Upload Receipt screenshot */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      صورة إيصال التحويل / لقطة الشاشة *
                    </label>

                    <div className="border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-2xl p-4 text-center transition-colors bg-gray-50/50">
                      {receiptPreviewUrl ? (
                        <div className="relative inline-block">
                          <img
                            src={receiptPreviewUrl}
                            alt="Receipt Preview"
                            className="max-h-44 rounded-xl shadow-sm mx-auto object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptFile(null);
                              setReceiptPreviewUrl('');
                            }}
                            className="absolute -top-2 -left-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-gray-700">اضغط لرفع صورة إيصال التحويل</span>
                          <span className="text-[11px] text-gray-400">PNG, JPG, WebP أو PDF حتى 15 ميغابايت</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      ملاحظات إضافية (اختياري)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أي معلومات إضافية تود إبلاغ الإدارة بها..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-gradient-quran text-white font-bold text-base shadow-green hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>جارٍ إرسال الإيصال وتأكيد الطلب...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>تأكيد وإرسال إيصال التحويل</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-gray-400 mt-2">
                    🔒 يتم مراجعة الإيصال وتفعيل اشتراكك الشهري سريعاً من قِبل المشرفين
                  </p>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════════
          RECEIPT PREVIEW MODAL
      ═════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedReceiptPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReceiptPreview(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-4 max-w-2xl w-full z-10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                <h4 className="font-bold text-gray-900 text-sm">معاينة صورة إيصال التحويل</h4>
                <button
                  onClick={() => setSelectedReceiptPreview(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[75vh] overflow-y-auto flex justify-center bg-gray-900 rounded-2xl p-2">
                <img
                  src={selectedReceiptPreview}
                  alt="Receipt Full"
                  className="max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  </PageLayout>
);
}
