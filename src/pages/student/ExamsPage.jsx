import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle, XCircle, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import { formatDateAr } from '../../utils/helpers';

export default function ExamsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { results, availableExams, fetchMyResults, fetchAvailableExams } = useExamStore();
  const [tab, setTab] = useState('available');

  useEffect(() => {
    if (user) {
      fetchMyResults(user._id);
      const groupId = user.group?._id || user.group;
      if (groupId) fetchAvailableExams(groupId, user._id);
    }
  }, [user]);

  return (
    <PageLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="section-title">امتحاناتي والتقييمات</h1>
        <p className="section-subtitle">الامتحانات المتاحة وسجل النتائج والتسميع</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-full sm:w-fit">
        {[
          { key: 'available', label: 'متاح للأداء', count: availableExams.length },
          { key: 'results', label: 'النتائج السابقة', count: results.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === t.key ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span>{t.label}</span>
            {t.count > 0 && (
              <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Available Exams */}
      {tab === 'available' && (
        <div>
          {availableExams.length === 0 ? (
            <div className="card-base p-8 sm:p-12 text-center">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-600 font-bold text-sm sm:text-base">لا توجد امتحانات متاحة الآن</p>
              <p className="text-xs text-gray-400 mt-1">ستظهر هنا الامتحانات التي يضيفها المعلم لمجموعتك</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {availableExams.map((exam, i) => (
                <motion.div key={exam._id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  className="card-base p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 text-primary-500">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{exam.title}</h3>
                      {exam.lessonTitle && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">درس: {exam.lessonTitle}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                        <span className="text-[10px] sm:text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                          {exam.questions?.length || 0} سؤال
                        </span>
                        {exam.duration && (
                          <span className="text-[10px] sm:text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3" />{exam.duration} دقيقة
                          </span>
                        )}
                        <span className="text-[10px] sm:text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-semibold">
                          {exam.questions?.some(q => q.type === 'recitation') ? '🎙️ يشمل شفهي' :
                           exam.questions?.some(q => q.type === 'written') ? '✏️ يشمل إكمال' : '🔵 اختياري'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/student/exams/${exam._id}/take`)}
                    className="btn-primary w-full sm:w-auto py-2.5 px-5 text-xs sm:text-sm font-bold flex-shrink-0">
                    <Play className="w-4 h-4" /> ابدأ الامتحان
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Past Results */}
      {tab === 'results' && (
        <div>
          {results.length === 0 ? (
            <div className="card-base p-8 sm:p-12 text-center">
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">لا توجد نتائج سابقة بعد</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {results.map((result, i) => {
                const isPassed = result.isPassed;
                const score = result.totalPercentage ?? result.writtenPercentage ?? 0;
                const isPending = result.status === 'pending_oral_review';
                return (
                  <motion.div key={result._id}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                    className="card-base p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isPending ? 'bg-yellow-50' : isPassed ? 'bg-green-50' : 'bg-red-50'}`}>
                        {isPending ? <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                          : isPassed ? <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                          : <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{result.exam?.title || 'امتحان'}</h3>
                        {result.exam?.lessonTitle && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">درس: {result.exam.lessonTitle}</p>
                        )}
                        <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">{formatDateAr(result.createdAt)}</p>
                        {isPending && (
                          <span className="text-[11px] sm:text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-lg mt-1.5 inline-block font-semibold">
                            ⏳ في انتظار مراجعة التسجيل الشفهي من المعلم
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <div className="text-center">
                        <div className={`text-xl sm:text-2xl font-black ${isPassed ? 'text-green-600' : score > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {score > 0 ? `${score}%` : '—'}
                        </div>
                        <p className="text-[10px] text-gray-400">النتيجة</p>
                      </div>
                      <div>
                        {isPending ? <span className="badge-gold">قيد المراجعة</span>
                          : isPassed ? <span className="badge-green">ناجح ✓</span>
                          : <span className="bg-red-50 text-red-500 text-xs font-semibold px-2.5 py-1 rounded-full">راجع إجاباتك</span>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
