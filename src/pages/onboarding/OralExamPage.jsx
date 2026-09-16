import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { Mic, Square, CheckCircle, Upload, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import useMediaRecorder from '../../hooks/useMediaRecorder';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatCountdown } from '../../utils/helpers';
import './Onboarding.css';

export default function OralExamPage() {
  const { user } = useAuthStore();
  const { currentExam, addOralRecording, submitOralExam, isSubmitting } = useExamStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { resultId } = location.state || {};

  // Guard: if no resultId, the user hasn't completed the written exam first
  if (!resultId && !currentExam) {
    navigate('/onboarding/written-exam', { replace: true });
    return null;
  }

  const [currentTask, setCurrentTask] = useState(0);
  const [completed, setCompleted] = useState({});

  const {
    isRecording, duration, audioUrl, audioBlob, error,
    startRecording, stopRecording, resetRecording,
  } = useMediaRecorder();

  const tasks = currentExam?.oralTasks || [
    { taskNumber: 1, instruction: 'اقرأ سورة الفاتحة بصوت واضح', arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', duration: 60 },
    { taskNumber: 2, instruction: 'تهجأ الكلمات القرآنية التالية', arabicText: 'كِتَابٌ - رَحْمَةٌ - قُرْآنٌ', duration: 45 },
    { taskNumber: 3, instruction: 'ميّز الحركات في الآية الكريمة', arabicText: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', duration: 45 },
  ];

  const task = tasks[currentTask];
  const allCompleted = Object.keys(completed).length === tasks.length;

  const handleSaveRecording = () => {
    if (!audioBlob) return;
    addOralRecording(task._id || `task-${currentTask}`, audioBlob, audioUrl);
    setCompleted((prev) => ({ ...prev, [currentTask]: true }));
    toast.success('تم حفظ التسجيل!');
  };

  const handleSubmitAll = async () => {
    try {
      const examId = currentExam?._id || 'placement';
      await submitOralExam(examId, resultId);
      toast.success('تم رفع جميع التسجيلات!');
      navigate('/onboarding/result');
    } catch {
      toast.error('خطأ في رفع التسجيلات. حاول مجدداً.');
    }
  };

  const handleSkip = () => navigate('/onboarding/result');

  return (
    <MotionConfig reducedMotion="user">
      <div className="onb" dir="rtl">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="onb-badge">الخطوة 5 من 6 — الامتحان الشفهي</span>
              <span className="text-sm" style={{ color: '#756E85' }}>المهمة {currentTask + 1} من {tasks.length}</span>
            </div>
            <div className="onb-progress" role="progressbar" aria-valuenow={Math.round(((currentTask + 1) / tasks.length) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="تقدم الامتحان الشفهي">
              <span style={{ width: `${((currentTask + 1) / tasks.length) * 100}%` }} />
            </div>
          </div>

          {/* Task tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar" role="tablist" aria-label="مهام الامتحان الشفهي">
            {tasks.map((t, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === currentTask}
                onClick={() => { setCurrentTask(i); resetRecording(); }}
                className={`onb-tab${i === currentTask ? ' on' : completed[i] ? ' done' : ''}`}
              >
                {completed[i] && <CheckCircle className="w-3.5 h-3.5" aria-hidden />}
                مهمة {i + 1}
              </button>
            ))}
          </div>

          <div className="onb-card">
            {/* Task instruction */}
            <div className="mb-6">
              <h3 className="font-extrabold mb-3" style={{ fontSize: '1.25rem', color: '#2A2438' }}>{task.instruction}</h3>
              {task.arabicText && (
                <div className="onb-wash">
                  <p className="onb-quran">{task.arabicText}</p>
                </div>
              )}
              {task.duration && (
                <p className="mt-2 text-center" style={{ fontSize: '0.8125rem', color: '#756E85' }}>
                  الوقت المقترح: {task.duration} ثانية
                </p>
              )}
            </div>

            {/* Recording controls */}
            <div className="flex flex-col items-center gap-6">
              {/* Big record button */}
              <div className="relative">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full animate-record opacity-50" aria-hidden />
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`onb-record${isRecording ? ' rec' : ''}`}
                  aria-label={isRecording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
                  aria-pressed={isRecording}
                >
                  {isRecording
                    ? <Square className="w-10 h-10 text-white" aria-hidden />
                    : <Mic className="w-10 h-10 text-white" aria-hidden />
                  }
                </button>
              </div>

              {/* Duration */}
              {isRecording && (
                <div className="flex items-center gap-2 font-bold text-lg" style={{ color: '#C2410C', fontVariantNumeric: 'tabular-nums' }} role="timer" aria-label="مدة التسجيل الحالية">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#C2410C' }} aria-hidden />
                  {formatCountdown(duration)}
                </div>
              )}

              {/* Recording label */}
              <p className="text-sm font-medium" style={{ color: '#756E85' }}>
                {isRecording ? 'جارٍ التسجيل... اضغط للإيقاف' : audioUrl ? 'تم التسجيل — استمع أو أعد التسجيل' : 'اضغط للبدء بالتسجيل'}
              </p>

              {error && (
                <p role="alert" className="text-sm px-4 py-2 rounded-xl" style={{ color: '#C2410C', background: '#FFFFFF', border: '1px solid #C2410C' }}>
                  {error}
                </p>
              )}

              {/* Audio preview */}
              {audioUrl && !isRecording && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="w-full">
                  <audio src={audioUrl} controls className="w-full rounded-xl" />
                  <div className="flex gap-3 mt-3">
                    <button onClick={resetRecording} className="onb-ghost flex-1 text-sm">
                      <RotateCcw className="w-4 h-4" aria-hidden />
                      إعادة التسجيل
                    </button>
                    <button onClick={handleSaveRecording} className="onb-btn flex-1 text-sm">
                      <CheckCircle className="w-4 h-4" aria-hidden />
                      حفظ هذا التسجيل
                    </button>
                  </div>
                </motion.div>
              )}

              {completed[currentTask] && (
                <div className="flex items-center gap-2 font-bold" style={{ color: '#177B58' }}>
                  <CheckCircle className="w-5 h-5" aria-hidden />
                  تم حفظ تسجيل هذه المهمة
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button onClick={handleSkip} className="onb-ghost text-sm">
              تخطي الامتحان الشفهي
            </button>

            <div className="flex gap-3">
              {currentTask < tasks.length - 1 && (
                <button
                  onClick={() => { setCurrentTask((t) => t + 1); resetRecording(); }}
                  className="onb-btn-outline"
                >
                  المهمة التالية
                </button>
              )}
              {allCompleted && (
                <button onClick={handleSubmitAll} disabled={isSubmitting} className="onb-btn">
                  {isSubmitting ? <LoadingSpinner size="sm" color="white" /> : (
                    <>
                      <Upload className="w-4 h-4" aria-hidden />
                      رفع جميع التسجيلات
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
