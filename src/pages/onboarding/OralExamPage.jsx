import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Square, Play, RotateCcw, CheckCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import useMediaRecorder from '../../hooks/useMediaRecorder';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatCountdown } from '../../utils/helpers';

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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white p-4 py-8">
      {/* Progress */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="badge-green text-sm">الخطوة 5 من 6 — الامتحان الشفهي</span>
          <span className="text-sm text-gray-500">المهمة {currentTask + 1} من {tasks.length}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((currentTask + 1) / tasks.length) * 100}%` }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Task tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tasks.map((t, i) => (
            <button key={i} onClick={() => { setCurrentTask(i); resetRecording(); }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                i === currentTask ? 'bg-primary-400 text-white shadow-sm'
                : completed[i] ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-200'
              }`}
            >
              {completed[i] && <CheckCircle className="w-3.5 h-3.5" />}
              مهمة {i + 1}
            </button>
          ))}
        </div>

        <div className="card-base p-8">
          {/* Task instruction */}
          <div className="mb-6">
            <h3 className="text-lg font-black text-gray-900 mb-3">{task.instruction}</h3>
            {task.arabicText && (
              <div className="bg-primary-50 rounded-2xl p-5 text-center border border-primary-100">
                <p className="font-quran text-2xl text-primary-900 leading-loose">{task.arabicText}</p>
              </div>
            )}
            {task.duration && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                الوقت المقترح: {task.duration} ثانية
              </p>
            )}
          </div>

          {/* Recording controls */}
          <div className="flex flex-col items-center gap-6">
            {/* Big record button */}
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 rounded-full animate-record opacity-50" />
              )}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 scale-110'
                    : 'bg-primary-400 hover:bg-primary-500 hover:scale-105'
                }`}
              >
                {isRecording
                  ? <Square className="w-10 h-10 text-white" />
                  : <Mic className="w-10 h-10 text-white" />
                }
              </button>
            </div>

            {/* Duration */}
            {isRecording && (
              <div className="flex items-center gap-2 text-red-500 font-mono font-bold text-lg">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {formatCountdown(duration)}
              </div>
            )}

            {/* Recording label */}
            <p className="text-sm font-medium text-gray-500">
              {isRecording ? 'جارٍ التسجيل... اضغط للإيقاف' : audioUrl ? 'تم التسجيل — استمع أو أعد التسجيل' : 'اضغط للبدء بالتسجيل'}
            </p>

            {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

            {/* Audio preview */}
            {audioUrl && !isRecording && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                <audio src={audioUrl} controls className="w-full rounded-xl" />
                <div className="flex gap-3 mt-3">
                  <button onClick={resetRecording} className="btn-ghost flex-1 text-sm">
                    <RotateCcw className="w-4 h-4" />
                    إعادة التسجيل
                  </button>
                  <button onClick={handleSaveRecording} className="btn-primary flex-1 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    حفظ هذا التسجيل
                  </button>
                </div>
              </motion.div>
            )}

            {completed[currentTask] && (
              <div className="flex items-center gap-2 text-green-600 font-semibold">
                <CheckCircle className="w-5 h-5" />
                تم حفظ تسجيل هذه المهمة
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={handleSkip} className="btn-ghost text-gray-400 text-sm">
            تخطي الامتحان الشفهي
          </button>

          <div className="flex gap-3">
            {currentTask < tasks.length - 1 && (
              <button
                onClick={() => { setCurrentTask((t) => t + 1); resetRecording(); }}
                className="btn-outline"
              >
                المهمة التالية
              </button>
            )}
            {allCompleted && (
              <button onClick={handleSubmitAll} disabled={isSubmitting} className="btn-primary">
                {isSubmitting ? <LoadingSpinner size="sm" color="white" /> : (
                  <>
                    <Upload className="w-4 h-4" />
                    رفع جميع التسجيلات
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
