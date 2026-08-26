import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, Award, Video, ChevronLeft, Star, Check, Play, Headphones, GraduationCap, BarChart3, Smartphone, Building2, ShieldCheck } from 'lucide-react';
import Navbar from '../components/shared/Navbar';

const features = [
  { title: 'بث مباشر تفاعلي', desc: 'جلسات حية مع المعلم وجهاً لوجه', icon: Video },
  { title: 'منهج منظم', desc: 'مناهج متدرجة حسب مستواك', icon: BookOpen },
  { title: 'متابعة مستمرة', desc: 'تتبع تقدمك وأدائك بالتفصيل', icon: BarChart3 },
  { title: 'شهادات معتمدة', desc: 'احصل على شهادة عند إتمام المنهج', icon: GraduationCap },
];

const steps = [
  { step: '١', title: 'سجّل حسابك', desc: 'أنشئ حسابك في دقيقتين وتحقق من بريدك الإلكتروني.' },
  { step: '٢', title: 'اجتز امتحان التحديد', desc: 'امتحان قصير لتحديد مستواك وتخصيص منهج مناسب لك.' },
  { step: '٣', title: 'انضم لمجموعتك', desc: 'يعيّنك الأدمن في مجموعة دراسية تتلاءم مع مستواك وتوقيتك.' },
  { step: '٤', title: 'تعلّم وتحفّظ', desc: 'شارك في الجلسات المباشرة، اتبع المنهج، وتابع تقدّمك يومياً.' },
];

const testimonials = [
  { name: 'أم عبدالرحمن', country: 'السعودية', text: 'تعلّم أطفالي القرآن مع أفضل المعلمين من المنزل. المنصة رائعة جداً وسهلة الاستخدام!', level: 'التأسيس', rating: 5 },
  { name: 'محمد الكريم', country: 'مصر', text: 'ختمت القرآن الكريم في أقل من عام بفضل خطة الختم المنظمة والجلسات التفاعلية.', level: 'التحفيظ', rating: 5 },
  { name: 'الحاجة فاطمة', country: 'المغرب', text: 'كنت أعتقد أن تعلم القراءة في عمري صعب، لكن هذه المنصة جعلتني أقرأ القرآن باتقان.', level: 'كبار السن', rating: 5 },
];

const unifiedPlan = {
  name: 'الاشتراك الشهري في حلقات القرآن الكريم',
  priceEGP: '250',
  priceSAR: '49',
  period: 'شهر',
  features: [
    'حضور جميع الجلسات المباشرة التفاعلية مع المعلم في مجموعتك',
    'خطة متابعة الحفظ والختم ومراجعة المتشابهات والتجويد',
    'مراجعة وتصحيح التلاوات والتسميع الصوتي المباشر',
    'الوصول للتسجيلات ومكتبة الشروحات كاملة والمصادر التعليمية',
    'حل الواجبات اليومية وبنك الاختبارات والتقييمات المستمرة',
    'شهادة إتمام معتمدة وموثقة عند إنهاء المنهج الدراسي',
  ],
};

export default function LandingPage() {
  const [currency, setCurrency] = useState('EGP');

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <Navbar />

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 pattern-bg overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-20 left-0 w-72 h-72 bg-primary-50 rounded-full blur-3xl opacity-80" />

        <div className="max-w-7xl mx-auto px-4 py-16 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="badge-green text-sm mb-4 inline-block">🌙 منصة تعليمية متخصصة</span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6">
              تعلّم القرآن الكريم
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary-400 to-primary-600">
                مع أفضل المعلمين
              </span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              منصة متكاملة لتحفيظ القرآن الكريم وتعليم أحكام التجويد عبر الإنترنت مع بث مباشر وإدارة مجموعات دراسية منظمة.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary text-base px-8 py-3.5 rounded-2xl shadow-green">
                ابدأ رحلتك الآن
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <a href="#how-it-works" className="btn-outline text-base px-8 py-3.5 rounded-2xl">
                <Play className="w-5 h-5" />
                كيف يعمل؟
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-4 mt-10 flex-wrap">
              <div className="flex items-center gap-2 bg-primary-50 rounded-full px-4 py-2">
                <Video className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-semibold text-primary-700">بث مباشر</span>
              </div>
              <div className="flex items-center gap-2 bg-primary-50 rounded-full px-4 py-2">
                <Users className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-semibold text-primary-700">مجموعات صغيرة</span>
              </div>
              <div className="flex items-center gap-2 bg-primary-50 rounded-full px-4 py-2">
                <BookOpen className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-semibold text-primary-700">منهج متكامل</span>
              </div>
            </div>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-gradient-quran rounded-3xl p-8 text-white shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-10 -translate-x-5" />
              
              <div className="relative z-10 text-center">
                <div className="font-quran text-3xl mb-6 leading-loose opacity-90">
                  ﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾
                </div>
                <p className="text-primary-100 text-sm mb-8">ادكر الله</p>

                {/* Platform features */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'جلسات مباشرة', desc: 'مع معلمين متخصصين', icon: '🎙️' },
                    { label: 'امتحان تحديد', desc: 'لتحديد مستواك بدقة', icon: '📝' },
                    { label: 'خطة ختم القرآن', desc: 'مخصصة لك', icon: '📖' },
                    { label: 'متابعة يومية', desc: 'لتقدمك وأدائك', icon: '📊' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/15 rounded-2xl p-4 text-center backdrop-blur-sm">
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="text-sm font-bold">{s.label}</div>
                      <div className="text-primary-100 text-xs">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────────── */}
      <section className="bg-primary-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-14 h-14 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-sm">
                  <f.icon className="w-7 h-7 text-primary-400" />
                </div>
                <div className="text-base font-black text-gray-900">{f.title}</div>
                <div className="text-gray-500 text-sm mt-1">{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <span className="badge-green text-sm">✨ عملية بسيطة</span>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3">كيف تبدأ رحلتك؟</h2>
          <p className="text-gray-500 mt-3 text-lg">أربع خطوات بسيطة تبدأ بها مسيرة تعلم القرآن</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              viewport={{ once: true }}
              className="relative text-center"
            >
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-0 w-full h-0.5 bg-primary-100 z-0 translate-x-1/2" />
              )}
              <div className="relative z-10 w-20 h-20 bg-gradient-quran rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-2xl font-black shadow-green">
                {step.step}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─────────────────────────────────────── */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <span className="badge-green text-sm">💬 آراء حقيقية</span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3">ماذا يقول طلابنا؟</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="card-base p-6"
              >
                <div className="flex text-yellow-400 mb-4">{'★'.repeat(t.rating)}</div>
                <p className="text-gray-700 leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ background: 'linear-gradient(135deg, #1D9E75, #0F5740)' }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.country} · {t.level}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" className="py-20 max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="badge-green text-sm">💰 اشتراك شهري ميسر وشامل</span>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mt-3">خطة الاشتراك في الحلقات</h2>
          <p className="text-gray-500 mt-2">سجّل الآن واحضر أول محاضرة تجريبية مجاناً 🎁 ثم اشترك شهرياً للاستمرار</p>

          {/* Payment Badges */}
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200/60">
              <Smartphone className="w-3.5 h-3.5 text-red-600" />
              متاح الدفع عبر فودافون كاش (Vodafone Cash)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              متاح الدفع عبر انستاباي اللحظي (InstaPay)
            </span>
          </div>

          {/* Currency Toggle */}
          <div className="inline-flex items-center bg-gray-100 p-1 rounded-2xl mt-6 text-xs font-bold">
            <button
              onClick={() => setCurrency('EGP')}
              className={`px-4 py-2 rounded-xl transition-all ${
                currency === 'EGP' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🇪🇬 بالجنيه المصري (EGP)
            </button>
            <button
              onClick={() => setCurrency('SAR')}
              className={`px-4 py-2 rounded-xl transition-all ${
                currency === 'SAR' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🇸🇦 بالريال السعودي (SAR)
            </button>
          </div>
        </div>

        {/* Single Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-quran text-white rounded-3xl p-8 sm:p-12 shadow-2xl shadow-green relative overflow-hidden"
        >
          <div className="absolute top-4 left-6 bg-amber-400 text-amber-950 text-xs font-black px-4 py-1.5 rounded-full shadow-md">
            أول محاضرة تجريبية مجاناً 🎁
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                {unifiedPlan.name}
              </h3>
              <p className="text-emerald-100 text-sm leading-relaxed">
                خطة متكاملة وميسرة تتيح لك الحضور مع مجموعتك الدراسية ومتابعة المنهج القرآني الشامل مع معلمين مجازين بالسند المتصل.
              </p>
              <ul className="space-y-3 pt-2">
                {unifiedPlan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                    <span className="text-emerald-50">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-5 bg-white text-gray-900 rounded-3xl p-8 text-center flex flex-col justify-between shadow-xl">
              <div>
                <span className="text-xs font-bold text-gray-400 block mb-1">رسوم الاشتراك الشهري</span>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl font-black text-gray-900">
                    {currency === 'EGP' ? unifiedPlan.priceEGP : unifiedPlan.priceSAR}
                  </span>
                  <span className="text-base font-bold text-gray-500">
                    {currency === 'EGP' ? 'ج.م' : 'ر.س'} / شهر
                  </span>
                </div>
                <p className="text-xs text-emerald-600 font-bold mb-6">
                  ✨ بدون أي التزام مسبق — احضر أول محاضرة مجاناً
                </p>
              </div>

              <Link
                to="/register"
                className="w-full py-4 rounded-2xl bg-gradient-quran text-white font-bold text-base shadow-green hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                سجّل وابدأ محاضرتك التجريبية مجاناً
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-quran">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <div className="font-quran text-4xl mb-6 opacity-90">
            ﴿ اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ ﴾
          </div>
          <h2 className="text-3xl font-black mb-4">ابدأ رحلتك مع القرآن اليوم</h2>
          <p className="text-primary-100 mb-8 text-lg">
            انضم لآلاف الطلاب الذين يتعلمون القرآن الكريم مع أفضل المعلمين
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-primary-500 font-bold px-10 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            سجّل الآن مجاناً
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="w-6 h-6 text-primary-400" />
            <span className="text-white font-bold text-lg">منصة تحفيظ القرآن الكريم</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} جميع الحقوق محفوظة — نور القرآن في كل بيت</p>
        </div>
      </footer>
    </div>
  );
}
