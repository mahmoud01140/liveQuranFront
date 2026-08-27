import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, XCircle, Clock, Users, BarChart2, Mic, Eye } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Sidebar from '../../components/shared/Sidebar';
import PageLayout from '../../components/shared/PageLayout';
import useExamStore from '../../store/examStore';
import { formatDateAr } from '../../utils/helpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminExamResultsPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { examResults, fetchExamResults, isLoading } = useExamStore();
  const [exam, setExam] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ oralScore: '', teacherNotes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchExamResults(examId);
    api.get(`/exams/group/any`).catch(() => {});
    // Fetch exam info from results
  }, [examId]);

  useEffect(() => {
    if (examResults.length > 0 && examResults[0].exam) {
      setExam(examResults[0].exam);
    }
  }, [examResults]);

  const handleReview = async () => {
    setSaving(true);
    try {
      await api.put(`/exams/results/${reviewModal._id}/review`, reviewForm);
      toast.success('تم حفظ التقييم');
      setReviewModal(null);
      fetchExamResults(examId);
    } catch { toast.error('خطأ في الحفظ'); }
    finally { setSaving(false); }
  };

  const passed = examResults.filter(r => r.isPassed).length;
  const failed = examResults.filter(r => !r.isPassed && r.status !== 'pending_oral_review').length;
  const pending = examResults.filter(r => r.status === 'pending_oral_review').length;
  const avgScore = examResults.length
    ? Math.round(examResults.reduce((s, r) => s + (r.totalPercentage || r.writtenPercentage || 0), 0) / examResults.length)
    : 0;

  return (
    <PageLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="section-title">{exam?.title || 'نتائج الامتحان'}</h1>
              {exam?.lessonTitle && <p className="section-subtitle">درس: {exam.lessonTitle}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'المتقدمون', value: examResults.length, icon: Users, color: 'text-blue-600 bg-blue-50' },
              { label: 'ناجح', value: passed, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
              { label: 'راسب', value: failed, icon: XCircle, color: 'text-red-500 bg-red-50' },
              { label: 'متوسط الدرجات', value: `${avgScore}%`, icon: BarChart2, color: 'text-primary-600 bg-primary-50' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="card-base p-5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : examResults.length === 0 ? (
            <div className="card-base p-12 text-center">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">لم يؤدِ أي طالب هذا الامتحان بعد</p>
            </div>
          ) : (
            <div className="card-base overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-right p-4 font-bold text-gray-600">الطالب</th>
                    <th className="text-center p-4 font-bold text-gray-600">الدرجة</th>
                    <th className="text-center p-4 font-bold text-gray-600">الحالة</th>
                    <th className="text-center p-4 font-bold text-gray-600">التاريخ</th>
                    <th className="text-center p-4 font-bold text-gray-600">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {examResults.map((result, i) => {
                    const score = result.totalPercentage ?? result.writtenPercentage ?? 0;
                    const isPending = result.status === 'pending_oral_review';
                    return (
                      <motion.tr key={result._id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-quran flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {result.student?.firstName?.[0]}{result.student?.lastName?.[0]}
                            </div>
                            <span className="font-semibold text-gray-800">
                              {result.student?.firstName} {result.student?.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-lg font-black ${result.isPassed ? 'text-green-600' : score > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            {score > 0 ? `${score}%` : '—'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {isPending ? <span className="badge-gold">قيد المراجعة</span>
                            : result.isPassed ? <span className="badge-green">ناجح</span>
                            : <span className="bg-red-50 text-red-500 text-xs font-semibold px-2.5 py-1 rounded-full">راسب</span>}
                        </td>
                        <td className="p-4 text-center text-gray-400 text-xs">
                          {formatDateAr(result.submittedAt)}
                        </td>
                        <td className="p-4 text-center">
                          {isPending && result.oralRecordings?.length > 0 && (
                            <button onClick={() => { setReviewModal(result); setReviewForm({ oralScore: '', teacherNotes: '' }); }}
                              className="text-xs bg-amber-50 text-amber-600 hover:bg-amber-100 px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 mx-auto">
                              <Mic className="w-3 h-3" /> مراجعة التسجيل
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-7 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-black text-gray-900 mb-4">
              مراجعة تسجيل — {reviewModal.student?.firstName} {reviewModal.student?.lastName}
            </h2>
            <div className="space-y-4 mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">التسجيلات الصوتية:</div>
              {reviewModal.oralRecordings?.map((rec, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-2">تسجيل {i + 1}</p>
                  <audio controls src={rec.audioUrl} className="w-full" />
                </div>
              ))}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">الدرجة (من 100)</label>
                <input type="number" min="0" max="100"
                  value={reviewForm.oralScore}
                  onChange={e => setReviewForm(p => ({ ...p, oralScore: e.target.value }))}
                  className="input-base" placeholder="مثال: 85" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">ملاحظات المعلم</label>
                <textarea value={reviewForm.teacherNotes}
                  onChange={e => setReviewForm(p => ({ ...p, teacherNotes: e.target.value }))}
                  className="input-base resize-none h-24" placeholder="أضف ملاحظاتك..." />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReviewModal(null)} className="btn-ghost flex-1">إلغاء</button>
              <button onClick={handleReview} disabled={saving || !reviewForm.oralScore}
                className="btn-primary flex-1 disabled:opacity-50">
                {saving ? <LoadingSpinner size="sm" color="white" /> : 'حفظ التقييم'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </PageLayout>
  );
}

