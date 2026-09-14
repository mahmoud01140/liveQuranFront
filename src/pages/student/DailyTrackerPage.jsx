import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Check, Clock, AlertCircle, Star, Trash2,
  ChevronDown, Calendar, TrendingUp, BookMarked, RefreshCw
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useDailyRecordStore from '../../store/dailyRecordStore';
import { timeAgoAr, getCirclePath } from '../../utils/helpers';
import toast from 'react-hot-toast';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';

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
  const { records, weeklyStats, isLoading, fetchMyRecords, deleteRecord } = useDailyRecordStore();
  const recordsPagination = usePagination(records, 10);

  useEffect(() => { fetchMyRecords({ week: 'current' }); }, []);

  const weeklyGoal = 50; // default weekly verse goal
  const weeklyPct = weeklyStats ? Math.min(100, Math.round((weeklyStats.totalVerses / weeklyGoal) * 100)) : 0;
  const { circumference, strokeDashoffset } = getCirclePath(weeklyPct);

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
        <div>
          <h1 className="section-title flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary-400" /> سجل الحفظ والتسميع المعتمد
          </h1>
          <p className="section-subtitle">سجل متابعة تلاوتك وتسميعك المعتمد في الجلسات المباشرة مع المعلم</p>
        </div>
      </motion.div>

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
            <p className="text-sm">يتم تسجيل واعتماد محفوظاتك وتلاوتك تلقائياً بعد كل جلسة تسميع مباشرة مع المعلم 📖</p>
          </div>
        ) : (
          <div>
            <div className="divide-y divide-gray-50">
              {recordsPagination.paginatedItems.map((record, idx) => {
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

            <div className="p-4 border-t border-gray-100">
              <Pagination
                currentPage={recordsPagination.currentPage}
                totalPages={recordsPagination.totalPages}
                totalItems={recordsPagination.totalItems}
                pageSize={recordsPagination.pageSize}
                onPageChange={recordsPagination.setCurrentPage}
                onPageSizeChange={recordsPagination.setPageSize}
                showPageSize={true}
                pageSizeOptions={[5, 10, 20, 50]}
                itemName="سجل حفظ"
              />
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
