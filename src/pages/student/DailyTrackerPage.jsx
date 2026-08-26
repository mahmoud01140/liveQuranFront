import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Check, Clock, AlertCircle, Star, Trash2,
  ChevronDown, Calendar, TrendingUp, X, BookMarked, RefreshCw
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useDailyRecordStore from '../../store/dailyRecordStore';
import { timeAgoAr, getCirclePath } from '../../utils/helpers';
import QURAN_SURAHS from '../../utils/quranData';
import toast from 'react-hot-toast';

const ACTIVITY_TYPES = {
  memorization: { label: 'حفظ جديد', icon: '📖', color: 'bg-primary-50 text-primary-600 border-primary-200' },
  review: { label: 'مراجعة', icon: '🔄', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  tajweed: { label: 'تجويد', icon: '🎯', color: 'bg-purple-50 text-purple-600 border-purple-200' },
};

const STATUS_MAP = {
  pending: { label: 'قيد المراجعة', icon: Clock, color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  approved: { label: 'تمت الموافقة', icon: Check, color: 'bg-green-50 text-green-600', dot: 'bg-green-400' },
  needs_review: { label: 'يحتاج مراجعة', icon: AlertCircle, color: 'bg-red-50 text-red-600', dot: 'bg-red-400' },
};

export default function DailyTrackerPage() {
  const { user } = useAuthStore();
  const { records, weeklyStats, isLoading, fetchMyRecords, createRecord, deleteRecord } = useDailyRecordStore();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    surahNumber: '', fromVerse: '', toVerse: '', activityType: 'memorization', studentNotes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchMyRecords({ week: 'current' }); }, []);

  const selectedSurah = QURAN_SURAHS.find(s => s.number === Number(form.surahNumber));
  const weeklyGoal = 50; // default weekly verse goal
  const weeklyPct = weeklyStats ? Math.min(100, Math.round((weeklyStats.totalVerses / weeklyGoal) * 100)) : 0;
  const { circumference, strokeDashoffset } = getCirclePath(weeklyPct);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.surahNumber || !form.fromVerse || !form.toVerse) {
      return toast.error('يرجى ملء جميع الحقول المطلوبة');
    }
    if (Number(form.fromVerse) > Number(form.toVerse)) {
      return toast.error('آية البداية يجب أن تكون قبل آية النهاية');
    }
    if (selectedSurah && Number(form.toVerse) > selectedSurah.verses) {
      return toast.error(`سورة ${selectedSurah.name} تحتوي على ${selectedSurah.verses} آية فقط`);
    }

    setSubmitting(true);
    try {
      await createRecord({
        surahNumber: Number(form.surahNumber),
        surahName: selectedSurah?.name || '',
        fromVerse: Number(form.fromVerse),
        toVerse: Number(form.toVerse),
        activityType: form.activityType,
        studentNotes: form.studentNotes,
      });
      toast.success('تم تسجيل الحفظ بنجاح! +5 نقاط ⭐');
      setForm({ surahNumber: '', fromVerse: '', toVerse: '', activityType: 'memorization', studentNotes: '' });
      setShowForm(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'خطأ في التسجيل');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteRecord(id);
      toast.success('تم حذف السجل');
    } catch {
      toast.error('فشل في حذف السجل');
    }
  };

  return (
    <PageLayout>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="section-title flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary-400" /> سجل الحفظ اليومي
            </h1>
            <p className="section-subtitle">سجّل ما حفظته يومياً وتابع تقدمك الأسبوعي</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className={showForm ? 'btn-ghost' : 'btn-primary'}>
            {showForm ? <><X className="w-4 h-4" /> إغلاق</> : <><Plus className="w-4 h-4" /> تسجيل حفظ جديد</>}
          </button>
        </div>
      </motion.div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 stagger-children">
        {/* Progress Ring */}
        <motion.div whileHover={{ y: -2 }} className="col-span-2 lg:col-span-1 card-base p-5 flex flex-col items-center justify-center">
          <div className="relative mb-2">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#E1F5EE" strokeWidth="10" />
              <circle cx="60" cy="60" r="54" fill="none" stroke="#1D9E75" strokeWidth="10"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-primary-500">{weeklyPct}%</span>
            </div>
          </div>
          <p className="text-xs text-gray-400">الهدف الأسبوعي</p>
        </motion.div>

        {[
          { label: 'آيات هذا الأسبوع', value: weeklyStats?.totalVerses || 0, icon: BookMarked, bg: 'bg-primary-50', color: 'text-primary-500', iconBg: 'bg-primary-100' },
          { label: 'أيام نشطة', value: `${weeklyStats?.daysActive || 0}/7`, icon: Calendar, bg: 'bg-blue-50', color: 'text-blue-500', iconBg: 'bg-blue-100' },
          { label: 'تمت الموافقة', value: weeklyStats?.approvedCount || 0, icon: Check, bg: 'bg-green-50', color: 'text-green-500', iconBg: 'bg-green-100' },
          { label: 'قيد المراجعة', value: weeklyStats?.pendingCount || 0, icon: Clock, bg: 'bg-amber-50', color: 'text-amber-500', iconBg: 'bg-amber-100' },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ y: -2 }} className="stat-card">
            <div className={`w-11 h-11 ${s.iconBg} rounded-xl flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-lg font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Record Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <form onSubmit={handleSubmit} className="card-base p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary-400" /> تسجيل حفظ جديد
              </h2>

              {/* Activity type */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {Object.entries(ACTIVITY_TYPES).map(([key, val]) => (
                  <button key={key} type="button" onClick={() => setForm({ ...form, activityType: key })}
                    className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                      form.activityType === key ? val.color + ' border-current font-bold shadow-sm' : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'
                    }`}>
                    <span className="text-xl block mb-1">{val.icon}</span>
                    <span className="text-xs">{val.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                {/* Surah selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">السورة *</label>
                  <select value={form.surahNumber} onChange={(e) => setForm({ ...form, surahNumber: e.target.value, fromVerse: '', toVerse: '' })}
                    className="input-base" required>
                    <option value="">اختر السورة</option>
                    {QURAN_SURAHS.map(s => (
                      <option key={s.number} value={s.number}>{s.number}. {s.name} ({s.verses} آية)</option>
                    ))}
                  </select>
                </div>

                {/* From verse */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">من آية *</label>
                  <input type="number" min="1" max={selectedSurah?.verses || 999}
                    value={form.fromVerse} onChange={(e) => setForm({ ...form, fromVerse: e.target.value })}
                    className="input-base" placeholder="1" required />
                </div>

                {/* To verse */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">إلى آية *</label>
                  <input type="number" min={form.fromVerse || 1} max={selectedSurah?.verses || 999}
                    value={form.toVerse} onChange={(e) => setForm({ ...form, toVerse: e.target.value })}
                    className="input-base" placeholder="10" required />
                </div>
              </div>

              {/* Verse count preview */}
              {form.fromVerse && form.toVerse && Number(form.toVerse) >= Number(form.fromVerse) && (
                <div className="bg-primary-50 rounded-xl px-4 py-2 mb-4 text-sm text-primary-700 font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {Number(form.toVerse) - Number(form.fromVerse) + 1} آية
                  {selectedSurah && ` — سورة ${selectedSurah.name}`}
                </div>
              )}

              {/* Notes */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">ملاحظات (اختياري)</label>
                <textarea value={form.studentNotes} onChange={(e) => setForm({ ...form, studentNotes: e.target.value })}
                  className="input-base" rows={2} maxLength={500}
                  placeholder="مثال: واجهت صعوبة في آية 5..." />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {submitting ? 'جارٍ التسجيل...' : 'تسجيل الحفظ'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">إلغاء</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Records list */}
      <div className="card-base overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-400" /> سجلات هذا الأسبوع
          </h2>
          <button onClick={() => fetchMyRecords({ week: 'current' })} className="btn-ghost text-xs py-1.5 px-3">
            <RefreshCw className="w-3.5 h-3.5" /> تحديث
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-300" />
            <p className="text-sm">جارٍ التحميل...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <BookOpen className="w-14 h-14 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold mb-1">لا توجد سجلات بعد</p>
            <p className="text-sm">ابدأ بتسجيل حفظك اليومي! 📖</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {records.map((record, idx) => {
              const statusInfo = STATUS_MAP[record.status];
              const actInfo = ACTIVITY_TYPES[record.activityType] || ACTIVITY_TYPES.memorization;
              return (
                <motion.div key={record._id}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="p-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Activity icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                      record.activityType === 'memorization' ? 'bg-primary-100' :
                      record.activityType === 'review' ? 'bg-blue-100' : 'bg-purple-100'
                    }`}>
                      {actInfo.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">سورة {record.surahName}</h3>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
                          الآيات {record.fromVerse} - {record.toVerse}
                        </span>
                        <span className="text-xs font-semibold bg-primary-50 text-primary-600 px-2 py-0.5 rounded-lg">
                          {record.versesCount} آية
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${statusInfo.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </span>
                        <span className="text-xs text-gray-400">{timeAgoAr(record.date)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg border ${actInfo.color}`}>{actInfo.label}</span>
                      </div>

                      {record.studentNotes && (
                        <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
                          📝 {record.studentNotes}
                        </p>
                      )}

                      {/* Teacher feedback */}
                      {record.teacherNotes && (
                        <p className="text-xs text-primary-700 mt-1.5 bg-primary-50 rounded-lg px-3 py-1.5">
                          👨‍🏫 ملاحظات المعلم: {record.teacherNotes}
                        </p>
                      )}

                      {/* Rating */}
                      {record.rating && (
                        <div className="flex items-center gap-0.5 mt-1.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= record.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete (only pending) */}
                    {record.status === 'pending' && (
                      <button onClick={() => handleDelete(record._id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 group">
                        <Trash2 className="w-4 h-4 text-gray-300 group-hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
