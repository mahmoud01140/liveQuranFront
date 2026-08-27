import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, XCircle, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function WrittenExamPage() {
  const { user, updateUser } = useAuthStore();
  const { currentExam, fetchPlacementExam, setAnswer, answers, submitWrittenExam, isLoading, isSubmitting, placementCompleted, placementResult } = useExamStore();
  const navigate = useNavigate();
  const [currentQ, setCurrentQ] = useState(0);
  const [locked, setLocked] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);

  const regType = user?.registrationType || 'student';

  useEffect(() => {
    fetchPlacementExam(regType);
  }, [regType]);

  // Redirect if already completed
  useEffect(() => {
    if (placementCompleted && placementResult) {
      toast('لقد أجريت امتحان التحديد مسبقاً', { icon: '⚠️' });
      navigate('/onboarding/result', { state: { resultId: placementResult._id }, replace: true });
    }
  }, [placementCompleted, placementResult]);

  useEffect(() => {
    if (currentExam?.duration) {
      setTimeLeft(currentExam.duration * 60);
    }
  }, [currentExam]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswer = (qIdx, aIdx) => {
    if (locked[qIdx]) return;
    setAnswer(qIdx, aIdx);
    setLocked((prev) => ({ ...prev, [qIdx]: true }));
  };

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < (currentExam?.questions?.length || 0)) {
      if (!window.confirm('لم تجب على جميع الأسئلة. هل تريد التسليم الآن؟')) return;
    }
    try {
      const result = await submitWrittenExam(currentExam._id);
      // Mark placement exam as taken in local state
      updateUser({ placementExamTaken: true });
      toast.success('تم تسليم الامتحان!');
      navigate('/onboarding/oral-exam', { state: { resultId: result._id, examId: currentExam._id } });
    } catch (err) {
      const msg = err?.response?.data?.message || 'خطأ في التسليم. حاول مجدداً.';
      toast.error(msg);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="جارٍ تحميل الامتحان..." />
    </div>
  );

  if (placementCompleted) return null; // Will redirect via useEffect

  if (!currentExam) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">الامتحان غير متاح حالياً</p>
    </div>
  );

  const question = currentExam.questions[currentQ];
  const totalQ = currentExam.questions.length;
  const progress = ((currentQ + 1) / totalQ) * 100;
  const mm = Math.floor((timeLeft || 0) / 60).toString().padStart(2, '0');
  const ss = ((timeLeft || 0) % 60).toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white p-4 py-8">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="badge-green text-sm">الخطوة 4 من 6 — الامتحان التحريري</span>
            <p className="text-sm text-gray-500 mt-1">{currentExam.title}</p>
          </div>
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold ${
              timeLeft < 120 ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600'
            }`}>
              <Clock className="w-4 h-4" />
              {mm}:{ss}
            </div>
          )}
        </div>
        <div className="progress-bar">
          <div className="progress-fill transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-center">
          السؤال {currentQ + 1} من {totalQ} — إجابة {Object.keys(answers).length} من {totalQ}
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <div className="card-base p-8">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-9 h-9 bg-primary-400 text-white rounded-xl flex items-center justify-center font-black flex-shrink-0">
                  {currentQ + 1}
                </div>
                <div>
                  {question.arabicText && (
                    <p className="font-quran text-xl leading-loose text-primary-900 mb-2">{question.arabicText}</p>
                  )}
                  {question.text !== question.arabicText && (
                    <p className="text-gray-700 font-medium">{question.text}</p>
                  )}
                </div>
              </div>

              {/* True/False Question */}
              {question.type === 'true_false' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { value: true, label: 'صحيح (صح)', emoji: '✅', color: 'emerald' },
                    { value: false, label: 'خطأ', emoji: '❌', color: 'rose' },
                  ].map((item) => {
                    const isSelected = answers[currentQ] === item.value;
                    const isAnswered = locked[currentQ];
                    const isCorrect = isAnswered && item.value === question.correctAnswerBool;
                    const isWrong = isAnswered && isSelected && !isCorrect;

                    return (
                      <motion.button
                        key={String(item.value)}
                        whileHover={!isAnswered ? { scale: 1.02 } : {}}
                        whileTap={!isAnswered ? { scale: 0.98 } : {}}
                        onClick={() => handleAnswer(currentQ, item.value)}
                        disabled={!!locked[currentQ]}
                        className={`flex items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all font-bold text-lg ${
                          isCorrect
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                            : isWrong
                            ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                            : isSelected
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary-200 hover:bg-primary-50/30'
                        } ${locked[currentQ] ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <span className="text-2xl">{item.emoji}</span>
                        <span>{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                /* MCQ Options */
                <div className="space-y-3">
                  {(question.options || []).map((opt, i) => {
                    const isSelected = answers[currentQ] === i;
                    const isAnswered = locked[currentQ];
                    const isCorrect = isAnswered && i === question.correctAnswer;
                    const isWrong = isAnswered && isSelected && !isCorrect;

                    return (
                      <motion.button
                        key={i}
                        whileHover={!isAnswered ? { scale: 1.01 } : {}}
                        whileTap={!isAnswered ? { scale: 0.99 } : {}}
                        onClick={() => handleAnswer(currentQ, i)}
                        disabled={!!locked[currentQ]}
                        className={`w-full text-right px-5 py-4 rounded-2xl border-2 transition-all duration-200 font-medium ${
                          isCorrect ? 'border-green-400 bg-green-50 text-green-700'
                          : isWrong ? 'border-red-400 bg-red-50 text-red-700'
                          : isSelected ? 'border-primary-400 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-700 hover:border-primary-200 hover:bg-primary-50/30'
                        } ${locked[currentQ] ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-3">
                          {isCorrect ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            : isWrong ? <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            : <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                                isSelected ? 'border-primary-400 bg-primary-400' : 'border-gray-300'
                              }`} />
                          }
                          {opt}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setCurrentQ((c) => Math.max(0, c - 1))} disabled={currentQ === 0}
            className="btn-ghost disabled:opacity-30">
            السابق
          </button>
          {currentQ < totalQ - 1 ? (
            <button onClick={() => setCurrentQ((c) => c + 1)} className="btn-primary px-8">
              السؤال التالي
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary px-8 bg-green-600 hover:bg-green-700">
              {isSubmitting ? <LoadingSpinner size="sm" color="white" /> : 'تسليم الامتحان ✓'}
            </button>
          )}
        </div>

        {/* Question dots */}
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          {currentExam.questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentQ(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                i === currentQ ? 'bg-primary-400 text-white scale-110'
                : answers[i] !== undefined ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
