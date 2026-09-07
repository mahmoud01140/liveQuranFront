import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Search, Filter, Trash2, Eye, BarChart2,
  Users, User, Target, GraduationCap, Award, Clock, Sparkles,
  AlertCircle, ChevronLeft, CheckCircle2, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import useExamStore from '../../store/examStore';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDateAr } from '../../utils/helpers';

const TARGET_FILTERS = [
  { id: 'all', label: 'كافة الامتحانات', icon: FileText },
  { id: 'group', label: 'امتحانات المجموعات', icon: Users },
  { id: 'individual', label: 'امتحانات فردية', icon: Target },
  { id: 'level', label: 'امتحانات المستويات', icon: GraduationCap },
];

const LEVEL_LABELS = {
  foundation: 'المستوى التأسيسي',
  memorization: 'الحفظ والإتقان',
  teacher_prep: 'إعداد معلمين',
  senior: 'كبار السن',
  all: 'جميع المستويات',
};

export default function AdminExamsPage() {
  const navigate = useNavigate();
  const { adminExams, fetchAdminAllExams, deleteGroupExam, isLoading } = useExamStore();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(null);

  useEffect(() => {
    fetchAdminAllExams();
  }, []);

  const handleDelete = async (examId) => {
    setDeletingId(examId);
    try {
      await deleteGroupExam(examId);
      toast.success('تم حذف الامتحان بنجاح');
      setConfirmDeleteModal(null);
      fetchAdminAllExams();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'تعذر حذف الامتحان');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredExams = useMemo(() => {
    return adminExams.filter((exam) => {
      // Type filter
      if (selectedFilter !== 'all') {
        const t = exam.targetType || 'group';
        if (t !== selectedFilter) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const titleMatch = exam.title?.toLowerCase().includes(q);
        const groupMatch = exam.group?.name?.toLowerCase().includes(q);
        const studentMatch = exam.targetStudent &&
          `${exam.targetStudent.firstName} ${exam.targetStudent.lastName} ${exam.targetStudent.email}`.toLowerCase().includes(q);
        return titleMatch || groupMatch || studentMatch;
      }
      return true;
    });
  }, [adminExams, selectedFilter, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const total = adminExams.length;
    const groupCount = adminExams.filter(e => (e.targetType || 'group') === 'group').length;
    const individualCount = adminExams.filter(e => e.targetType === 'individual').length;
    const levelCount = adminExams.filter(e => e.targetType === 'level').length;
    const totalSubmissions = adminExams.reduce((sum, e) => sum + (e.submissionsCount || 0), 0);
    return { total, groupCount, individualCount, levelCount, totalSubmissions };
  }, [adminExams]);

  return (
    <PageLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                إدارة وبنك الامتحانات 📝
              </h1>
            </div>
            <p className="text-sm text-gray-500">
              إدارة امتحانات المستويات، الامتحانات العامة للحلقات، والامتحانات الفردية الموجهة للطلاب
            </p>
          </div>

          <button
            onClick={() => navigate('/teacher/create-exam')}
            className="btn-primary flex items-center justify-center gap-2 py-3 px-5 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>إنشاء امتحان جديد</span>
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between text-blue-600 mb-2">
              <span className="text-xs font-bold text-gray-500">إجمالي الامتحانات</span>
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.totalSubmissions} تسليم وحل مسجل</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between text-indigo-600 mb-2">
              <span className="text-xs font-bold text-gray-500">امتحانات المجموعات</span>
              <Users className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{stats.groupCount}</p>
            <p className="text-xs text-indigo-500 font-semibold mt-1">موجهة لحلقات كاملة</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-bold text-gray-500">امتحانات فردية للطلاب</span>
              <Target className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{stats.individualCount}</p>
            <p className="text-xs text-amber-600 font-semibold mt-1">مخصصة لكل طالب</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold text-gray-500">امتحانات المستويات</span>
              <GraduationCap className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{stats.levelCount}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">تسكين وتثبيت عام</p>
          </motion.div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl w-full md:w-auto">
              {TARGET_FILTERS.map((f) => {
                const Icon = f.icon;
                const isActive = selectedFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFilter(f.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بعنوان الامتحان أو الطالب..."
                className="input-base text-xs pr-9 w-full"
              />
            </div>
          </div>
        </div>

        {/* Exams List */}
        {isLoading ? (
          <div className="py-16 text-center">
            <LoadingSpinner size="lg" text="جارٍ تحميل بنك الامتحانات..." />
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">لا توجد امتحانات مطابقة للبحث</h3>
            <p className="text-sm text-gray-500 mb-5">
              لم يتم العثور على امتحانات ضمن هذا التصنيف، يمكنك إضافة امتحان جديد بكل سهولة.
            </p>
            <button
              onClick={() => navigate('/teacher/create-exam')}
              className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء أول امتحان</span>
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredExams.map((exam) => {
              const target = exam.targetType || 'group';
              return (
                <motion.div
                  key={exam._id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {target === 'individual' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Target className="w-3.5 h-3.5 text-amber-600" />
                          امتحان فردي لطالب
                        </span>
                      ) : target === 'level' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                          امتحان مستوى ({LEVEL_LABELS[exam.level] || 'عام'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          امتحان مجموعة {exam.group?.name ? `(${exam.group.name})` : ''}
                        </span>
                      )}

                      <span className="text-[11px] text-gray-400">
                        {formatDateAr(exam.createdAt)}
                      </span>
                    </div>

                    {/* Individual Student Info if target individual */}
                    {target === 'individual' && exam.targetStudent && (
                      <div className="mb-3 p-2.5 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 font-bold text-xs flex items-center justify-center">
                          {exam.targetStudent.firstName?.[0] || 'ط'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            الطالب: {exam.targetStudent.firstName} {exam.targetStudent.lastName}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {exam.targetStudent.email}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Exam Title */}
                    <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-2">
                      {exam.title}
                    </h3>

                    {/* Exam Specs */}
                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-50 text-center my-3">
                      <div>
                        <span className="text-[11px] text-gray-400 block">الأسئلة</span>
                        <span className="text-xs font-bold text-gray-800">{exam.questions?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-gray-400 block">المدة</span>
                        <span className="text-xs font-bold text-gray-800">{exam.duration} د</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-gray-400 block">النجاح</span>
                        <span className="text-xs font-bold text-gray-800">{exam.passingScore}%</span>
                      </div>
                    </div>

                    {/* Submission Stats */}
                    <div className="flex items-center justify-between text-xs bg-gray-50 p-2.5 rounded-xl mb-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <BarChart2 className="w-4 h-4 text-emerald-600" />
                        <span>التسليمات:</span>
                        <strong className="text-gray-900">{exam.submissionsCount || 0}</strong>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <span>متوسط الدرجة:</span>
                        <strong className="text-emerald-700">{exam.averageScore || 0}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => navigate(`/admin/exams/${exam._id}/results`)}
                      className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-1.5 font-bold"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>عرض النتائج</span>
                    </button>

                    <button
                      onClick={() => navigate(`/student/exams/${exam._id}/take`)}
                      title="معاينة كطالب"
                      className="p-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setConfirmDeleteModal(exam)}
                      title="حذف الامتحان"
                      className="p-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {confirmDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">تأكيد حذف الامتحان</h3>
                  <p className="text-sm text-gray-500">
                    هل أنت متأكد من رغبتك في حذف امتحان{' '}
                    <span className="font-bold text-gray-800">&quot;{confirmDeleteModal.title}&quot;</span>؟
                    سيتم حذف نتائج الطلاب المرتبطة به.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleDelete(confirmDeleteModal._id)}
                    disabled={deletingId === confirmDeleteModal._id}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deletingId === confirmDeleteModal._id ? 'جارٍ الحذف...' : 'نعم، احذف'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteModal(null)}
                    disabled={deletingId === confirmDeleteModal._id}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}
