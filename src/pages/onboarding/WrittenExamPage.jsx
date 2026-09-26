import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Clock, ChevronLeft, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import './Onboarding.css';

export default function WrittenExamPage() {
  const { user, updateUser } = useAuthStore();
  const { currentExam, fetchPlacementExam, setAnswer, answers, setWrittenAnswer, writtenAnswers, submitWrittenExam, isLoading, isSubmitting, placementCompleted, placementResult, writtenCompleted } = useExamStore();
  const navigate = useNavigate();
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const autoSubmittedRef = useRef(false);

  const regType = user?.registrationType || 'student';

  useEffect(() => {
    fetchPlacementExam(regType);
  }, [regType]);

  // Redirect if already completed — or if written is done and only the
  // mandatory oral remains (retaking would 400 as duplicate on submit).
  useEffect(() => {
    if (placementCompleted && placementResult) {
      const hasOral = (placementResult.oralRecordings?.length > 0) || placementResult.status === 'reviewed';
      if (!hasOral) {
        navigate('/onboarding/oral-exam', {
          state: { resultId: placementResult._id, examId: currentExam?._id },
          replace: true,
        });
      } else {
        toast('لقد أجريت امتحان التحديد مسبقاً');
        navigate('/onboarding/result', { state: { resultId: placementResult._id }, replace: true });
      }
    } else if (writtenCompleted && placementResult && !placementCompleted) {
      navigate('/onboarding/oral-exam', {
        state: { resultId: placementResult._id, examId: currentExam?._id },
        replace: true,
      });
    }
  }, [placementCompleted, placementResult, writtenCompleted, currentExam, navigate]);

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

  // The correct answer is never revealed during the exam — the student
  // may freely change their choice until they submit.
  const handleAnswer = (qIdx, aIdx) => {
    setAnswer(qIdx, aIdx);
  };

  const doSubmit = async () => {
    const result = await submitWrittenExam(currentExam._id);
    // Mark placement exam as taken in local state + flag the mandatory oral step
    updateUser({ placementExamTaken: true });
    try {
      localStorage.setItem(`oral_pending_${user?._id}`, '1');
      // Persist the oral context so a refresh on the oral page never strands the student
      localStorage.setItem(`oral_context_${user?._id}`, JSON.stringify({ resultId: result._id, examId: currentExam._id }));
      localStorage.removeItem(`survey_answers_${user?._id}_${regType}`);
    } catch (_) {}
    toast.success('تم تسليم الامتحان!');
    navigate('/onboarding/oral-exam', { state: { resultId: result._id, examId: currentExam._id } });
  };

  // Answered = MCQ/true-false choices + non-empty written texts
  const isAnswered = (idx) =>
    answers[idx] !== undefined ||
    (typeof writtenAnswers[idx] === 'string' && writtenAnswers[idx].trim() !== '');

  const handleSubmit = async (auto = false) => {
    if (!auto) {
      const answeredCount = (currentExam?.questions || []).filter((_, idx) => isAnswered(idx)).length;
      if (answeredCount < (currentExam?.questions?.length || 0)) {
        if (!window.confirm('لم تجب على جميع الأسئلة. هل تريد التسليم الآن؟')) return;
      }
    }
    try {
      await doSubmit();
    } catch (err) {
      autoSubmittedRef.current = false;
      const msg = err?.response?.data?.message || 'خطأ في التسليم. حاول مجدداً.';
      toast.error(msg);
    }
  };

  // Auto-submit exactly once when the timer runs out
  useEffect(() => {
    if (timeLeft === 0 && !autoSubmittedRef.current && currentExam && !placementCompleted) {
      autoSubmittedRef.current = true;
      toast('انتهى الوقت وتم تسليم الامتحان تلقائياً');
      handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  if (isLoading) return (
    <div className="onb" dir="rtl">
      <div className="onb-center">
        <LoadingSpinner size="lg" text="جارٍ تحميل الامتحان..." />
      </div>
    </div>
  );

  if (placementCompleted) return null; // Will redirect via useEffect

  if (!currentExam) return (
    <div className="onb" dir="rtl">
      <div className="onb-center">
        <p style={{ color: '#756E85', marginBottom: 16 }}>الامتحان غير متاح حالياً</p>
        <div className="flex gap-3 justify-center">
          <button type="button" onClick={() => fetchPlacementExam(regType)} className="onb-btn">
            إعادة المحاولة
          </button>
          <button type="button" onClick={() => navigate('/student/quran')} className="onb-ghost">
            تصفح المصحف ريثما تُحل المشكلة
          </button>
        </div>
      </div>
    </div>
  );

  const question = currentExam.questions[currentQ];
  const totalQ = currentExam.questions.length;
  const progress = ((currentQ + 1) / totalQ) * 100;
  const mm = Math.floor((timeLeft || 0) / 60).toString().padStart(2, '0');
  const ss = ((timeLeft || 0) % 60).toString().padStart(2, '0');
  const urgent = timeLeft !== null && timeLeft < 120;

  return (
    <MotionConfig reducedMotion="user">
      <div className="onb" dir="rtl">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <span className="onb-badge">الخطوة 3 من 5 — الامتحان التحريري</span>
                <p className="text-sm mt-1" style={{ color: '#756E85' }}>{currentExam.title}</p>
              </div>
              {timeLeft !== null && (
                <span className={`onb-timer${urgent ? ' urgent' : ''}`} role="timer" aria-label={`الوقت المتبقي ${mm} دقيقة و${ss} ثانية`}>
                  <Clock className="w-4 h-4" aria-hidden />
                  {mm}:{ss}
                </span>
              )}
            </div>
            <div className="onb-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="تقدم الامتحان">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-center" style={{ fontSize: '0.8125rem', color: '#756E85' }}>
              السؤال {currentQ + 1} من {totalQ} — إجابة {(currentExam?.questions || []).filter((_, idx) => isAnswered(idx)).length} من {totalQ}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <div className="onb-card">
                <div className="flex items-start gap-3 mb-6">
                  <span className="onb-num" style={{ width: 36, height: 36, fontSize: '1rem' }} aria-hidden>
                    {currentQ + 1}
                  </span>
                  <div>
                    {question.arabicText && (
                      <p className="onb-quran" style={{ textAlign: 'right', marginBottom: 8 }}>{question.arabicText}</p>
                    )}
                    {question.text !== question.arabicText && (
                      <p className="font-medium" style={{ color: '#2A2438' }}>{question.text}</p>
                    )}
                  </div>
                </div>

                {/* True/False Question */}
                {question.type === 'true_false' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="group" aria-label="اختر صحيح أو خطأ">
                    {[
                      { value: true, label: 'صحيح (صح)', Icon: Check },
                      { value: false, label: 'خطأ', Icon: X },
                    ].map((item) => {
                      const isSelected = answers[currentQ] === item.value;

                      return (
                        <button
                          key={String(item.value)}
                          type="button"
                          onClick={() => handleAnswer(currentQ, item.value)}
                          aria-pressed={isSelected}
                          className="onb-opt"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 12, padding: 24, fontWeight: 700, fontSize: '1.25rem',
                            ...(isSelected
                            ? { borderColor: '#177B58', background: '#E2EFE7', color: '#0F5940' }
                            : undefined),
                          }}
                        >
                          <item.Icon size={26} strokeWidth={2.5} aria-hidden />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : question.type === 'written' ? (
                  /* Written / Fill-in Question — text input (scored from writtenAnswers slice) */
                  <div className="space-y-3">
                    <textarea
                      className="onb-opt"
                      rows={3}
                      placeholder="اكتب إجابتك هنا..."
                      value={writtenAnswers[currentQ] || ''}
                      onChange={e => setWrittenAnswer(currentQ, e.target.value)}
                      style={{
                        width: '100%', resize: 'vertical', textAlign: 'right',
                        fontFamily: 'inherit', fontSize: '1rem',
                        ...(writtenAnswers[currentQ] ? { borderColor: '#177B58', background: '#E2EFE7', color: '#0F5940' } : undefined),
                      }}
                      aria-label="حقل الإجابة الكتابية"
                    />
                  </div>
                ) : question.type === 'recitation' ? (
                  /* Recitation Question — audio task, just display the instruction */
                  <div className="p-4 rounded-xl text-center" style={{ background: '#E2EFE7', border: '1px solid #177B58' }}>
                    <p className="font-bold" style={{ color: '#0F5940' }}>سيتم تقييم التلاوة من قِبل المعلم في الامتحان الشفهي.</p>
                  </div>
                ) : (
                  /* MCQ Options */
                  <div className="space-y-3" role="group" aria-label="خيارات الإجابة">
                    {(question.options || []).map((opt, i) => {
                      const isSelected = answers[currentQ] === i;

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleAnswer(currentQ, i)}
                          aria-pressed={isSelected}
                          className="onb-opt"
                          style={isSelected
                            ? { borderColor: '#177B58', background: '#E2EFE7', color: '#0F5940', fontWeight: 700 }
                            : undefined}
                        >
                          <span className="flex items-center gap-3">
                            <span aria-hidden className={`onb-radio${isSelected ? ' on' : ''}`} />
                            {opt}
                          </span>
                        </button>
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
              className="onb-ghost">
              السابق
            </button>
            {currentQ < totalQ - 1 ? (
              <button onClick={() => setCurrentQ((c) => c + 1)} className="onb-btn">
                السؤال التالي
                <ChevronLeft className="w-4 h-4" aria-hidden />
              </button>
            ) : (
              <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="onb-btn">
                {isSubmitting ? <LoadingSpinner size="sm" color="white" /> : (
                  <>
                    تسليم الامتحان
                    <Check className="w-4 h-4" aria-hidden />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Question dots */}
          <div className="flex flex-wrap gap-2 justify-center mt-6" role="group" aria-label="التنقل بين الأسئلة">
            {currentExam.questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                aria-label={`السؤال ${i + 1}${isAnswered(i) ? ' (تمت الإجابة)' : ''}`}
                aria-current={i === currentQ ? 'true' : undefined}
                className={`onb-dot${i === currentQ ? ' now' : isAnswered(i) ? ' ans' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
