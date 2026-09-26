import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Clock, ChevronLeft, Check, X, Mic, Square, CheckCircle, RotateCcw, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import useMediaRecorder from '../../hooks/useMediaRecorder';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatCountdown } from '../../utils/helpers';
import './Onboarding.css';

/* ─── Inline recorder for a single recitation question ─── */
function RecitationRecorder({ questionIndex, questionId, onSaved }) {
  const { addOralRecording } = useExamStore();
  const {
    isRecording, duration, audioUrl, audioBlob, error,
    startRecording, stopRecording, resetRecording,
  } = useMediaRecorder();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!audioBlob) return;
    addOralRecording(questionId || `recitation-q-${questionIndex}`, audioBlob, audioUrl);
    setSaved(true);
    if (onSaved) onSaved();
    toast.success('تم حفظ التسجيل وسيُرسل للمشرف مع تسليم الامتحان');
  };

  const handleRedo = () => {
    setSaved(false);
    resetRecording();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Record / Stop Button */}
      <div className="relative">
        {isRecording && (
          <div className="absolute inset-0 rounded-full animate-record opacity-50" aria-hidden />
        )}
        <button
          onClick={isRecording ? stopRecording : (saved ? handleRedo : startRecording)}
          className={`onb-record${isRecording ? ' rec' : ''}`}
          aria-label={isRecording ? 'إيقاف التسجيل' : saved ? 'إعادة التسجيل' : 'بدء التسجيل'}
          aria-pressed={isRecording}
          style={saved ? { background: '#177B58' } : undefined}
        >
          {isRecording
            ? <Square className="w-8 h-8 text-white" aria-hidden />
            : saved
              ? <CheckCircle className="w-8 h-8 text-white" aria-hidden />
              : <Mic className="w-8 h-8 text-white" aria-hidden />
          }
        </button>
      </div>

      {/* Live timer while recording */}
      {isRecording && (
        <div
          className="flex items-center gap-2 font-bold text-lg"
          style={{ color: '#C2410C', fontVariantNumeric: 'tabular-nums' }}
          role="timer"
          aria-label="مدة التسجيل"
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#C2410C' }} aria-hidden />
          {formatCountdown(duration)}
        </div>
      )}

      {/* Status text */}
      <p className="text-sm font-medium text-center" style={{ color: '#756E85' }}>
        {saved
          ? '✅ تم حفظ التسجيل — سيُرفع تلقائياً مع تسليم الامتحان'
          : isRecording
            ? 'جارٍ التسجيل... اضغط مربع الإيقاف للانتهاء'
            : audioUrl
              ? 'تم التسجيل — استمع للمراجعة ثم احفظ أو أعد التسجيل'
              : 'اضغط زر الميكروفون لتسجيل التلاوة بصوتك'}
      </p>

      {/* Mic permission error */}
      {error && (
        <p
          role="alert"
          className="text-sm px-4 py-2 rounded-xl w-full text-center"
          style={{ color: '#C2410C', background: '#FFF', border: '1px solid #C2410C' }}
        >
          {error}
        </p>
      )}

      {/* Audio preview + save / redo — shown after stopping & before saving */}
      {audioUrl && !isRecording && !saved && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full space-y-3"
        >
          <div className="rounded-xl p-3" style={{ background: '#F8F5FF', border: '1px solid #C4B5D0' }}>
            <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: '#756E85' }}>
              <Volume2 className="w-3.5 h-3.5" aria-hidden />
              استمع للتسجيل قبل الحفظ:
            </p>
            <audio src={audioUrl} controls className="w-full rounded-xl" />
          </div>
          <div className="flex gap-3">
            <button onClick={resetRecording} className="onb-ghost flex-1 text-sm">
              <RotateCcw className="w-4 h-4" aria-hidden />
              إعادة التسجيل
            </button>
            <button onClick={handleSave} className="onb-btn flex-1 text-sm">
              <CheckCircle className="w-4 h-4" aria-hidden />
              حفظ التسجيل
            </button>
          </div>
        </motion.div>
      )}

      {/* Saved — allow redo */}
      {saved && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full"
        >
          <div className="flex items-center justify-center gap-2 font-bold mb-2" style={{ color: '#177B58' }}>
            <CheckCircle className="w-5 h-5" aria-hidden />
            تم حفظ التسجيل بنجاح
          </div>
          <button onClick={handleRedo} className="onb-ghost w-full text-sm">
            <RotateCcw className="w-4 h-4" aria-hidden />
            إعادة التسجيل من جديد
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default function WrittenExamPage() {
  const { user, updateUser } = useAuthStore();
  const { currentExam, fetchPlacementExam, setAnswer, answers, setWrittenAnswer, writtenAnswers, oralRecordings, submitWrittenExam, submitOralExam, isLoading, isSubmitting, placementCompleted, placementResult, writtenCompleted } = useExamStore();
  const navigate = useNavigate();
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const autoSubmittedRef = useRef(false);
  // Track which recitation questions have been recorded
  const [recitationSaved, setRecitationSaved] = useState({});

  const regType = user?.registrationType || 'student';

  // Check if exam has recitation questions
  const hasRecitationQuestions = currentExam?.questions?.some(q => q.type === 'recitation');

  useEffect(() => {
    fetchPlacementExam(regType);
  }, [regType]);

  // Redirect if already completed — or if written is done and the oral
  // step is still open (retaking would 400 as duplicate on submit).
  // This applies to inline-recitation exams too: missing recordings must
  // recover on the oral page, never strand the student on a retake.
  useEffect(() => {
    if (placementCompleted && placementResult) {
      const hasOral = (placementResult.oralRecordings?.length > 0) || placementResult.status === 'reviewed';
      if (hasOral) {
        toast('لقد أجريت امتحان التحديد مسبقاً');
        navigate('/onboarding/result', { state: { resultId: placementResult._id }, replace: true });
      } else {
        navigate('/onboarding/oral-exam', {
          state: { resultId: placementResult._id, examId: currentExam?._id },
          replace: true,
        });
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

    // If there are inline recitation recordings, submit them directly.
    // A failed upload must NOT clear the recovery flags — the student
    // finishes on the oral page instead of losing the recordings silently.
    const hasInlineRecordings = hasRecitationQuestions && oralRecordings.length > 0;
    let oralUploaded = false;
    if (hasInlineRecordings) {
      try {
        await submitOralExam(currentExam._id, result._id);
        oralUploaded = true;
      } catch (_) {
        console.error('Oral submission alongside written failed, will retry on oral page');
      }
    }

    // Mark placement exam as taken in local state
    updateUser({ placementExamTaken: true });
    try {
      localStorage.removeItem(`survey_answers_${user?._id}_${regType}`);
      if (oralUploaded) {
        // Recordings safely stored — no separate oral step needed
        localStorage.removeItem(`oral_pending_${user?._id}`);
        localStorage.removeItem(`oral_context_${user?._id}`);
      } else {
        localStorage.setItem(`oral_pending_${user?._id}`, '1');
        localStorage.setItem(`oral_context_${user?._id}`, JSON.stringify({ resultId: result._id, examId: currentExam._id }));
      }
    } catch (_) {}

    if (oralUploaded) {
      toast.success('تم تسليم الامتحان!');
      navigate('/onboarding/result', { state: { resultId: result._id } });
    } else if (hasInlineRecordings) {
      toast.error('سُلم التحريري لكن تعذر رفع التسجيلات — أكملها في الخطوة التالية');
      navigate('/onboarding/oral-exam', { state: { resultId: result._id, examId: currentExam._id } });
    } else {
      toast.success('تم تسليم الامتحان!');
      navigate('/onboarding/oral-exam', { state: { resultId: result._id, examId: currentExam._id } });
    }
  };

  // Answered = MCQ/true-false choices + non-empty written texts + saved recitation recordings
  const isAnswered = (idx) => {
    const q = currentExam?.questions?.[idx];
    if (q?.type === 'recitation') return !!recitationSaved[idx];
    return answers[idx] !== undefined ||
      (typeof writtenAnswers[idx] === 'string' && writtenAnswers[idx].trim() !== '');
  };

  const handleSubmit = async (auto = false) => {
    if (!auto) {
      const answeredCount = (currentExam?.questions || []).filter((_, idx) => isAnswered(idx)).length;
      if (answeredCount < (currentExam?.questions?.length || 0)) {
        // Check specifically for unrecorded recitation questions
        const unrecordedRecitations = (currentExam?.questions || []).filter(
          (q, idx) => q.type === 'recitation' && !recitationSaved[idx]
        );
        if (unrecordedRecitations.length > 0) {
          if (!window.confirm(`لديك ${unrecordedRecitations.length} سؤال/أسئلة شفهية لم تسجل لها صوتاً بعد. هل تريد التسليم بدون تسجيل؟`)) return;
        } else {
          if (!window.confirm('لم تجب على جميع الأسئلة. هل تريد التسليم الآن؟')) return;
        }
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
                  /* Recitation Question — inline audio recording */
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-2xl p-3 mb-2" style={{ background: '#E2EFE7', border: '1px solid #177B58' }}>
                      <Mic className="w-5 h-5 flex-none mt-0.5" style={{ color: '#177B58' }} aria-hidden />
                      <div>
                        <p className="font-bold text-sm" style={{ color: '#0F5940' }}>
                          سؤال شفهي — سجّل تلاوتك بصوتك
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#177B58' }}>
                          سيستمع المشرف إلى تسجيلك ويقيّم مستواك. اضغط الميكروفون للبدء.
                        </p>
                      </div>
                    </div>
                    {question.instruction && (
                      <p className="text-sm font-medium text-center" style={{ color: '#2A2438' }}>
                        {question.instruction}
                      </p>
                    )}
                    <RecitationRecorder
                      key={question._id || `q-${currentQ}`}
                      questionIndex={currentQ}
                      questionId={question._id}
                      onSaved={() => setRecitationSaved(prev => ({ ...prev, [currentQ]: true }))}
                    />
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
            {currentExam.questions.map((q, i) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                aria-label={`السؤال ${i + 1}${isAnswered(i) ? ' (تمت الإجابة)' : ''}${q.type === 'recitation' ? ' (شفهي)' : ''}`}
                aria-current={i === currentQ ? 'true' : undefined}
                className={`onb-dot${i === currentQ ? ' now' : isAnswered(i) ? ' ans' : ''}${q.type === 'recitation' ? ' oral' : ''}`}
              >
                {q.type === 'recitation' ? '🎙' : i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

