import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, BookOpen, Award, Check, Star, AlertTriangle, MessageSquare,
  BookMarked, CheckCircle2, RotateCcw, Volume2, Sparkles, Flame, ShieldCheck,
  FileCheck, Printer
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import PageLayout from '../../components/shared/PageLayout';
import IjazahCertificateModal from '../../components/shared/IjazahCertificateModal';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useSessionFeedbackStore from '../../store/sessionFeedbackStore';
import { getJuzPercentage, getCirclePath, getLevelLabel, timeAgoAr } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';

const weeklyProgress = [
  { week: 'أسبوع 1', pages: 5, lessons: 2 },
  { week: 'أسبوع 2', pages: 7, lessons: 3 },
  { week: 'أسبوع 3', pages: 6, lessons: 2 },
  { week: 'أسبوع 4', pages: 9, lessons: 4 },
  { week: 'أسبوع 5', pages: 8, lessons: 3 },
  { week: 'أسبوع 6', pages: 11, lessons: 5 },
];

const skillsData = [
  { skill: 'القراءة', score: 80 },
  { skill: 'الحفظ', score: 65 },
  { skill: 'التجويد', score: 70 },
  { skill: 'الفهم', score: 85 },
  { skill: 'الإملاء', score: 60 },
];

const JUZ = Array.from({ length: 30 }, (_, i) => i + 1);

export default function ProgressPage() {
  const { user } = useAuthStore();
  const { studyPlan, fetchStudyPlan } = useGroupStore();
  const { myFeedbacks, commonErrors, avgRatings, fetchMyFeedbacks } = useSessionFeedbackStore();
  const [weakPoints, setWeakPoints] = useState([]);
  const [loadingWeakPoints, setLoadingWeakPoints] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({ attendanceRate: 100, attendedCount: 0, totalSessions: 0, history: [] });

  // Ijazah state
  const [ijazah, setIjazah] = useState(null);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

  useEffect(() => {
    const groupId = user?.group?._id || user?.group;
    if (groupId) fetchStudyPlan(groupId);
    fetchMyFeedbacks();

    // Fetch live attendance stats
    api.get('/users/me/attendance-stats')
      .then(res => setAttendanceStats(res.data))
      .catch(() => {});

    // Fetch Ijazah record
    api.get('/ijazah/my')
      .then(res => setIjazah(res.data.ijazah))
      .catch(() => {});

    // Fetch weak points
    api.get('/exams/weak-points/my')
      .then(res => setWeakPoints(res.data.weakPoints || []))
      .catch(() => {})
      .finally(() => setLoadingWeakPoints(false));
  }, [user?.group]);

  const handleMarkMastered = async (id) => {
    try {
      await api.put(`/exams/weak-points/${id}`, { status: 'mastered' });
      setWeakPoints(prev => prev.map(w => w._id === id ? { ...w, status: 'mastered' } : w));
      toast.success('🎉 ممتاز! تم تعيين الآية كـ "تمت مراجعتها بنجاح"');
    } catch {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  const completedJuz = studyPlan?.quranCompletionPlan?.completedJuz || [];
  const juzPct = getJuzPercentage(completedJuz);
  const { circumference, strokeDashoffset } = getCirclePath(juzPct);

  return (
    <PageLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="section-title">تقدمي الدراسي</h1>
        <p className="section-subtitle">متابعة شاملة لمسيرتك في حفظ القرآن الكريم</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Quran progress ring */}
        <div className="card-base p-4 sm:p-6 text-center">
          <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">تقدم الختم</h2>
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="relative">
              <svg className="w-32 h-32 sm:w-36 sm:h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#E1F5EE" strokeWidth="10" />
                <circle cx="60" cy="60" r="54" fill="none" stroke="#1D9E75" strokeWidth="10"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl sm:text-3xl font-black text-primary-500">{juzPct}%</span>
                <span className="text-[10px] sm:text-xs text-gray-400">مكتمل</span>
              </div>
            </div>
          </div>
          <p className="text-xs sm:text-sm font-bold text-gray-700">{completedJuz.length} جزء من 30</p>
        </div>

        {/* Skills radar */}
        <div className="card-base p-4 sm:p-6">
          <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">تقييم المهارات</h2>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillsData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                <Radar dataKey="score" stroke="#1D9E75" fill="#1D9E75" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats */}
        <div className="card-base p-4 sm:p-6 space-y-3 sm:space-y-4">
          <h2 className="font-bold text-gray-900 text-sm sm:text-base">إحصائيات سريعة</h2>
          {[
            { icon: BookOpen, label: 'الدروس المكتملة', value: user?.completedLessons?.length || 0, color: 'text-primary-500', bg: 'bg-primary-50' },
            { icon: TrendingUp, label: 'معدل الحضور', value: `${attendanceStats.attendanceRate}%`, color: 'text-blue-500', bg: 'bg-blue-50' },
            { icon: Award, label: 'الشهادات المحققة', value: 2, color: 'text-yellow-500', bg: 'bg-yellow-50' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs text-gray-500">{s.label}</p>
                <p className="text-base sm:text-lg font-black text-gray-900 leading-tight">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly progress chart */}
      <div className="card-base p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">التقدم الأسبوعي</h2>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyProgress}>
              <defs>
                <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fontFamily: 'Cairo' }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="pages" stroke="#1D9E75" fill="url(#colorPages)" strokeWidth={2} name="الصفحات" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Juz grid - 5 columns on mobile, 10 on larger screens */}
      <div className="card-base p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">خريطة الأجزاء (30 جزء)</h2>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-2.5">
          {JUZ.map((juz) => {
            const isDone = completedJuz.includes(juz);
            return (
              <motion.div
                key={juz}
                whileHover={{ scale: 1.08 }}
                className={`aspect-square rounded-xl flex items-center justify-center text-xs sm:text-sm font-black transition-all ${
                  isDone ? 'bg-gradient-quran text-white shadow-sm' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : juz}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Session Feedback Section */}
      {myFeedbacks.length > 0 && (
        <div className="mb-4 sm:mb-6">
          <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <MessageSquare className="w-5 h-5 text-amber-500" /> ملاحظات المعلم
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Average ratings */}
            {avgRatings && (
              <div className="card-base p-4 sm:p-5">
                <h3 className="font-bold text-gray-900 text-xs sm:text-sm mb-3">متوسط التقييمات</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'التلاوة', value: avgRatings.recitation, color: 'text-primary-500' },
                    { label: 'الحفظ', value: avgRatings.memorization, color: 'text-blue-500' },
                    { label: 'الانتباه', value: avgRatings.attention, color: 'text-purple-500' },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{r.label}</span>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(r.value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                        ))}
                        <span className={`text-xs font-bold mr-1 ${r.color}`}>{r.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Common tajweed errors */}
            {commonErrors.length > 0 && (
              <div className="card-base p-4 sm:p-5">
                <h3 className="font-bold text-gray-900 text-xs sm:text-sm mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> أخطاء تجويدية متكررة
                </h3>
                <div className="space-y-2">
                  {commonErrors.map((err, i) => (
                    <div key={i} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-1.5">
                      <span className="text-xs font-semibold text-red-600">{err.rule}</span>
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{err.count} مرات</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="card-base p-4 sm:p-5">
              <h3 className="font-bold text-gray-900 text-xs sm:text-sm mb-3">إحصائيات الملاحظات</h3>
              <div className="text-center py-2 sm:py-3">
                <p className="text-2xl sm:text-3xl font-black text-amber-500">{myFeedbacks.length}</p>
                <p className="text-xs text-gray-400 mt-1">ملاحظة من المعلم</p>
              </div>
            </div>
          </div>

          {/* Latest feedbacks */}
          <div className="card-base overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-xs sm:text-sm">آخر الملاحظات</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {myFeedbacks.slice(0, 5).map(fb => (
                <div key={fb._id} className="p-3.5 sm:p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-600">
                      👨‍🏫 {fb.teacher?.firstName} {fb.teacher?.lastName}
                    </span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400">{timeAgoAr(fb.sessionDate)}</span>
                    {fb.surahName && (
                      <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-lg font-bold">سورة {fb.surahName}</span>
                    )}
                  </div>
                  {fb.generalNotes && <p className="text-xs sm:text-sm text-gray-700 mb-2 leading-relaxed">{fb.generalNotes}</p>}
                  <div className="flex gap-2 flex-wrap">
                    {fb.strengths && (
                      <p className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-medium">✅ {fb.strengths}</p>
                    )}
                    {fb.improvements && (
                      <p className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg font-medium">🔧 {fb.improvements}</p>
                    )}
                  </div>
                  {fb.tajweedErrors?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {fb.tajweedErrors.map((e, i) => (
                        <span key={i} className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold">{e.rule}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weak Points Review Bank */}
      <div className="card-base overflow-hidden border-amber-200">
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-amber-900 text-xs sm:text-sm">بنك مراجعة الأخطاء ونقاط الضعف 📌</h3>
              <p className="text-[11px] sm:text-xs text-amber-700">الآيات والملاحظات المؤشر عليها من قِبل المعلم للتسميع والمراجعة</p>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-bold bg-amber-200/60 text-amber-900 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full flex-shrink-0">
            {weakPoints.filter(w => w.status !== 'mastered').length} تحتاج مراجعة
          </span>
        </div>

        <div className="p-3.5 sm:p-4">
          {loadingWeakPoints ? (
            <p className="text-xs text-gray-400 text-center py-4">جارٍ تحميل بنك المراجعة...</p>
          ) : weakPoints.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-bold text-gray-800">ماشاء الله! لا توجد نقاط ضعف أو أخطاء مسجلة حالياً</p>
              <p className="text-xs text-gray-400 mt-1">استمر في التقييم اليومي والمراجعة للحفاظ على تسلسلك الممتاز.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weakPoints.map(wp => {
                const isMastered = wp.status === 'mastered';
                return (
                  <div key={wp._id} className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    isMastered ? 'bg-emerald-50/50 border-emerald-200 opacity-75' : 'bg-amber-50/40 border-amber-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs sm:text-sm text-gray-900">{wp.surahName}</span>
                          <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                            الآية {wp.fromVerse}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            wp.errorType === 'hifz' ? 'bg-red-100 text-red-700' :
                            wp.errorType === 'tajweed' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {wp.errorType === 'hifz' ? 'حفظ' : wp.errorType === 'tajweed' ? 'تجويد' : 'تشكيل'}
                          </span>
                        </div>
                        {wp.notes && (
                          <p className="text-xs text-gray-700 font-medium">💡 تنبيه المعلم: {wp.notes}</p>
                        )}
                      </div>
                      {!isMastered ? (
                        <button
                          type="button"
                          onClick={() => handleMarkMastered(wp._id)}
                          className="btn-primary py-2 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto flex-shrink-0">
                          تمت المراجعة بنجاح ✓
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 flex items-center justify-center sm:justify-start gap-1 bg-emerald-100 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> أتقنتها
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Ijazah & Sanad Pathway Section ── */}
      {ijazah && (
        <div className="card-base p-4 sm:p-6 mb-4 sm:mb-6 border-2 border-[#D4AF37]/50 bg-gradient-to-br from-[#FAF7EE] to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center text-xl flex-shrink-0 font-bold border border-amber-300">
                📜
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-gray-900 text-sm sm:text-base">
                    مسار السند والإجازة القرآنية المتصلة 🏅
                  </h3>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    ijazah.status === 'awarded'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {ijazah.status === 'awarded' ? 'مجاز بالسند المتصل ✅' : 'قيد العرض والتسميع ⏳'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  الرواية: <strong>حفص عن عاصم من طريق الشاطبية</strong> | المقرئ: <strong>{ijazah.sheikhName || 'الشيخ المجيز'}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCertificateOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all self-stretch sm:self-auto"
            >
              <Award className="w-4 h-4" />
              <span>عرض وطباعة شهادة الإجازة 📜</span>
            </button>
          </div>

          {/* Sanad Progress Bar */}
          <div className="mt-4 pt-4 border-t border-amber-200/60">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
              <span>الأجزاء المعروضة غيباً بالسند:</span>
              <span className="text-amber-800 font-black">{ijazah.completedJuz?.length || 0} من 30 جزء</span>
            </div>
            <div className="h-2.5 bg-amber-100/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.round(((ijazah.completedJuz?.length || 0) / 30) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Official Ijazah Certificate Modal ── */}
      <IjazahCertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        ijazah={ijazah}
      />
    </PageLayout>
  );
}
