import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Send, Mic, MicOff, CheckCircle, Clock,
  FileText, AlertCircle, BookOpen, Volume2, VolumeX, Play, Pause,
  SkipForward, SkipBack, Repeat, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import useExamStore from '../../store/examStore';
import useAuthStore from '../../store/authStore';
import useQuranAudio, { RECITERS } from '../../hooks/useQuranAudio';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../services/api';

export default function TakeExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentExam, setCurrentExam, answers, writtenAnswers,
    setAnswer, setWrittenAnswer, addOralRecording, oralRecordings,
    currentQuestion, nextQuestion, prevQuestion,
    submitWrittenExam, isSubmitting, resetExam,
  } = useExamStore();

  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedQuestions, setRecordedQuestions] = useState({});
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Quran Interactive state
  const [quranVerses, setQuranVerses] = useState([]);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [quranMode, setQuranMode] = useState({}); // { [questionIndex]: 'practice' | 'quiz' }
  const [showQuranPanel, setShowQuranPanel] = useState(true);

  // Quran Audio hook
  const audio = useQuranAudio();
  const {
    isPlaying, currentVerseIndex, isLoadingAudio,
    loadSurahAudio, playVerse, playAll, pause, resume, togglePlayPause,
    stop: stopAudio, nextVerse, prevVerse,
    reciter, changeReciter, audioProgress,
  } = audio;

  useEffect(() => {
    const load = async () => {
      try {
        const groupId = user?.group?._id || user?.group;
        const res = await api.get(`/exams/group/${groupId || 'none'}`);
        const exam = (res.data.exams || []).find(e => e._id === examId);
        if (!exam) {
          toast.error('لم يتم العثور على الامتحان');
          navigate('/student/exams');
          return;
        }
        setCurrentExam(exam);

        // Initialize modes from question defaults
        const modes = {};
        exam.questions?.forEach((q, i) => {
          if (q.type === 'recitation') {
            modes[i] = q.mode || 'practice';
          }
        });
        setQuranMode(modes);
      } catch {
        toast.error('خطأ في تحميل الامتحان');
        navigate('/student/exams');
      } finally {
        setLoading(false);
      }
    };
    resetExam();
    load();
    return () => { resetExam(); stopAudio(); };
  }, [examId]);

  // Load Quran verses & audio when switching to a recitation question
  const q = currentExam?.questions?.[currentQuestion];
  const total = currentExam?.questions?.length || 0;
  const isLast = currentQuestion === total - 1;

  useEffect(() => {
    if (q?.type === 'recitation' && q.surahNumber) {
      fetchQuranVerses(q.surahNumber, q.fromVerse, q.toVerse);
      loadSurahAudio(q.surahNumber, reciter);
    } else {
      setQuranVerses([]);
      stopAudio();
    }
  }, [currentQuestion, q?.surahNumber, q?.type, reciter]);

  const fetchQuranVerses = useCallback(async (surahNum, from, to) => {
    setLoadingVerses(true);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`);
      const data = await res.json();
      if (data.code === 200) {
        let ayahs = data.data.ayahs || [];
        if (from && to) {
          ayahs = ayahs.filter(a => a.numberInSurah >= from && a.numberInSurah <= to);
        } else if (from) {
          ayahs = ayahs.filter(a => a.numberInSurah >= from);
        }
        setQuranVerses(ayahs);
      }
    } catch {
      setQuranVerses([]);
    }
    setLoadingVerses(false);
  }, []);

  const startRecording = async (questionId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        addOralRecording(questionId, blob, url);
        setRecordedQuestions(p => ({ ...p, [questionId]: url }));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      toast.error('لا يمكن الوصول للميكروفون');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleSubmit = async () => {
    if (!window.confirm('هل أنت متأكد من تسليم الامتحان؟')) return;
    try {
      stopAudio();
      const res = await submitWrittenExam(examId);

      // If there are recitation recordings, submit them too
      const recitationRecs = oralRecordings.filter(r => r.audioBlob);
      if (recitationRecs.length > 0 && res?._id) {
        const formData = new FormData();
        formData.append('examResultId', res._id);
        recitationRecs.forEach((rec, idx) => {
          formData.append('recordings', rec.audioBlob, `rec-${idx}.webm`);
          if (rec.questionId) formData.append(`questionId_${idx}`, rec.questionId);
        });
        await api.post(`/exams/${examId}/submit-recitation`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setResult(res);
      setSubmitted(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'خطأ في التسليم');
    }
  };

  const currentMode = quranMode[currentQuestion] || 'practice';
  const toggleMode = () => {
    setQuranMode(p => ({
      ...p,
      [currentQuestion]: currentMode === 'practice' ? 'quiz' : 'practice',
    }));
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="pt-24 flex justify-center"><LoadingSpinner size="lg" /></div>
    </div>
  );

  if (submitted && result) {
    const hasRecitation = currentExam?.questions?.some(q => q.type === 'recitation');
    const score = result.totalPercentage ?? result.writtenPercentage ?? 0;
    const passed = result.isPassed;
    return (
      <div className="min-h-screen bg-gray-50"><Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${hasRecitation ? 'bg-yellow-50' : passed ? 'bg-green-50' : 'bg-red-50'}`}>
              {hasRecitation ? <Clock className="w-10 h-10 text-yellow-500" />
                : passed ? <CheckCircle className="w-10 h-10 text-green-500" />
                : <AlertCircle className="w-10 h-10 text-red-400" />}
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {hasRecitation ? 'تم تسليم تقييم الدرس' : passed ? 'أحسنت! إنجاز ممتاز 🎉' : 'تم التسليم بنجاح'}
            </h2>
            
            {/* Gamification badge */}
            <div className="my-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl flex items-center justify-around">
              <div className="text-center">
                <span className="text-xs text-emerald-600 font-semibold block">النقاط المكتسبة</span>
                <span className="text-lg font-black text-emerald-700">+{result.xpEarned || 50} XP ⚡</span>
              </div>
              <div className="h-8 w-px bg-emerald-200" />
              <div className="text-center">
                <span className="text-xs text-orange-600 font-semibold block">السلسلة اليومية</span>
                <span className="text-lg font-black text-orange-600">🔥 متواصل</span>
              </div>
            </div>

            {hasRecitation ? (
              <p className="text-gray-500 mb-6 text-sm">سيتم مراجعة تسجيلاتك الصوتية وإبداء الملاحظات من قبل المعلم</p>
            ) : (
              <div className="mb-6">
                <div className={`text-5xl font-black mb-2 ${passed ? 'text-green-600' : 'text-red-500'}`}>{score}%</div>
                <p className="text-gray-500 text-sm">درجة التقييم: {currentExam?.passingScore || 60}%</p>
              </div>
            )}
            <button onClick={() => navigate('/student/exams')} className="btn-primary w-full">
              العودة للاختبارات والتقييمات
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!currentExam || !q) return null;

  const SURAH_NAMES = [
    'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال',
    'التوبة', 'يونس', 'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر', 'النحل', 'الإسراء',
    'الكهف', 'مريم', 'طه', 'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء',
    'النمل', 'القصص', 'العنكبوت', 'الروم', 'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر',
    'يس', 'الصافات', 'ص', 'الزمر', 'غافر', 'فصلت', 'الشورى', 'الزخرف', 'الدخان',
    'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق', 'الذاريات', 'الطور', 'النجم',
    'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة', 'الصف',
    'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة',
    'المعارج', 'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الإنسان', 'المرسلات',
    'النبأ', 'النازعات', 'عبس', 'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج',
    'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل', 'الضحى', 'الشرح',
    'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات', 'القارعة', 'التكاثر',
    'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر',
    'المسد', 'الإخلاص', 'الفلق', 'الناس',
  ];

  const surahName = q.surahNumber ? SURAH_NAMES[q.surahNumber - 1] || `سورة ${q.surahNumber}` : '';

  return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="pt-16 min-h-screen flex flex-col">
        {/* Progress bar */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-1.5 sm:mb-2">
              <span className="text-xs sm:text-sm font-bold text-gray-700 truncate max-w-[200px] sm:max-w-none">{currentExam.title}</span>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className={`text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${
                  q.type === 'mcq' ? 'bg-blue-50 text-blue-600' :
                  q.type === 'true_false' ? 'bg-amber-50 text-amber-600' :
                  q.type === 'written' ? 'bg-purple-50 text-purple-600' :
                  'bg-emerald-50 text-emerald-600'
                }`}>
                  {q.type === 'mcq' ? '🔵 اختياري' : q.type === 'true_false' ? '✅ صح / خطأ' : q.type === 'written' ? '✏️ كتابي' : '🎙️ شفهي'}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 font-semibold">{currentQuestion + 1} / {total}</span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-gradient-to-l from-primary-500 to-primary-400 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / total) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 p-3 sm:p-4">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={currentQuestion}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>

                {/* Main Question Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm border border-gray-100 mb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 leading-relaxed">{q.text || q.arabicText}</h2>

                  {/* MCQ Options */}
                  {q.type === 'mcq' && (
                    <div className="space-y-2.5 sm:space-y-3">
                      {(q.options || []).map((opt, i) => (
                        <button key={i} onClick={() => setAnswer(currentQuestion, i)}
                          className={`w-full text-right px-4 py-3.5 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl border-2 transition-all font-medium active:scale-[0.99] flex items-center ${
                            answers[currentQuestion] === i
                              ? 'border-primary-500 bg-primary-50 text-primary-800 font-bold shadow-sm'
                              : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-primary-200 hover:bg-primary-50/50'
                          }`}>
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ml-3 flex-shrink-0 ${
                            answers[currentQuestion] === i ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="text-sm sm:text-base">{opt}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* True / False */}
                  {q.type === 'true_false' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
                      <button
                        type="button"
                        onClick={() => setAnswer(currentQuestion, true)}
                        className={`flex items-center justify-center gap-3 py-6 px-6 rounded-2xl border-2 transition-all font-bold text-lg active:scale-[0.98] ${
                          answers[currentQuestion] === true
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-md shadow-emerald-100 ring-2 ring-emerald-500/20'
                            : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/40'
                        }`}
                      >
                        <span className="text-2xl">✅</span>
                        <span className="text-xl font-bold">صحيح (صح)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswer(currentQuestion, false)}
                        className={`flex items-center justify-center gap-3 py-6 px-6 rounded-2xl border-2 transition-all font-bold text-lg active:scale-[0.98] ${
                          answers[currentQuestion] === false
                            ? 'border-rose-500 bg-rose-50 text-rose-800 shadow-md shadow-rose-100 ring-2 ring-rose-500/20'
                            : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-rose-200 hover:bg-rose-50/40'
                        }`}
                      >
                        <span className="text-2xl">❌</span>
                        <span className="text-xl font-bold">خطأ</span>
                      </button>
                    </div>
                  )}

                  {/* Written (fill-in) */}
                  {q.type === 'written' && (
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-gray-600 mb-2 block">أكمل الإجابة:</label>
                      <input
                        value={writtenAnswers[currentQuestion] || ''}
                        onChange={e => setWrittenAnswer(currentQuestion, e.target.value)}
                        className="input-base text-base sm:text-lg"
                        placeholder="اكتب إجابتك هنا..."
                        dir="rtl"
                      />
                    </div>
                  )}

                  {/* Recitation - Recording Area */}
                  {q.type === 'recitation' && (
                    <div className="space-y-4 sm:space-y-5">
                      {/* Mode Toggle */}
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2 bg-gray-100 p-1 sm:p-1.5 rounded-2xl max-w-md mx-auto">
                        <button type="button" onClick={() => setQuranMode(p => ({ ...p, [currentQuestion]: 'practice' }))}
                          className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all ${
                            currentMode === 'practice'
                              ? 'bg-white text-emerald-700 shadow-sm'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}>
                          📖 التدرب والاستماع
                        </button>
                        <button type="button" onClick={() => setQuranMode(p => ({ ...p, [currentQuestion]: 'quiz' }))}
                          className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all ${
                            currentMode === 'quiz'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}>
                          🎙️ وضع التسميع
                        </button>
                      </div>

                      {q.instruction && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 sm:p-4 text-right">
                          <p className="text-xs font-bold text-amber-800 mb-1">💡 التعليمات:</p>
                          <p className="text-amber-700 text-xs sm:text-sm">{q.instruction}</p>
                        </div>
                      )}

                      {/* Recording Controls */}
                      <div className="flex flex-col items-center gap-3 sm:gap-4 bg-gray-50/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100">
                        {recordedQuestions[q._id] && (
                          <div className="w-full max-w-md">
                            <p className="text-xs font-semibold text-emerald-700 mb-2 text-center">✓ تم تسجيل صوتك بنجاح. استمع للتسجيل:</p>
                            <audio controls src={recordedQuestions[q._id]} className="w-full rounded-xl shadow-sm" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => recording ? stopRecording() : startRecording(q._id)}
                          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
                            recording
                              ? 'bg-red-500 hover:bg-red-600 animate-pulse ring-8 ring-red-100'
                              : recordedQuestions[q._id]
                              ? 'bg-emerald-600 hover:bg-emerald-700 ring-4 ring-emerald-100'
                              : 'bg-primary-600 hover:bg-primary-700 ring-4 ring-primary-100'
                          }`}>
                          {recording ? <MicOff className="w-8 h-8 sm:w-10 sm:h-10 text-white" /> : <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-white" />}
                        </button>
                        <p className="text-xs sm:text-sm font-bold text-gray-700 text-center">
                          {recording ? '● جارٍ التسجيل... انقر لإيقاف' : recordedQuestions[q._id] ? 'انقر لإعادة تسجيل صوتك' : 'انقر على الميكروفون لبدء التسجيل'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ═══ Integrated Quran Panel (for recitation questions in practice mode) ═══ */}
                {q.type === 'recitation' && q.surahNumber && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className={`rounded-2xl sm:rounded-3xl border-2 overflow-hidden transition-all ${
                      currentMode === 'practice'
                        ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/50'
                        : 'border-gray-200 bg-gray-50'
                    }`}>

                    {/* Quran Panel Header */}
                    <div className={`px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 ${
                      currentMode === 'practice' ? 'bg-emerald-100/60' : 'bg-gray-100'
                    }`}>
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          currentMode === 'practice'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h3 className={`font-bold text-xs sm:text-sm ${
                            currentMode === 'practice' ? 'text-emerald-900' : 'text-gray-700'
                          }`}>
                            {currentMode === 'practice' ? '📖 المصحف التفاعلي' : '🔒 وضع التسميع'}
                          </h3>
                          <p className="text-[11px] sm:text-xs text-gray-500">
                            سورة {surahName} — الآيات {q.fromVerse || 1} إلى {q.toVerse || '...'}
                          </p>
                        </div>
                      </div>

                      {/* Reciter Selector (practice mode only) */}
                      {currentMode === 'practice' && (
                        <select value={reciter} onChange={e => changeReciter(e.target.value)}
                          className="text-xs border border-emerald-200 bg-white rounded-lg px-2.5 py-1.5 text-gray-700 font-medium w-full sm:w-auto">
                          {RECITERS.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Practice Mode: Show verses + audio controls */}
                    {currentMode === 'practice' ? (
                      <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
                        {/* Audio Player Controls */}
                        <div className="bg-white/90 rounded-2xl p-3 sm:p-4 shadow-sm border border-emerald-100">
                          <div className="flex items-center justify-center gap-3 mb-2.5 sm:mb-3">
                            <button onClick={prevVerse} className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-600" aria-label="السابق">
                              <SkipForward className="w-5 h-5" />
                            </button>
                            <button onClick={togglePlayPause}
                              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                                isPlaying
                                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-4 ring-emerald-200'
                                  : 'bg-emerald-500 hover:bg-emerald-600 ring-4 ring-emerald-100'
                              }`}>
                              {isLoadingAudio ? (
                                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
                              ) : isPlaying ? (
                                <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              ) : (
                                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white mr-[-2px]" />
                              )}
                            </button>
                            <button onClick={nextVerse} className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-600" aria-label="التالي">
                              <SkipBack className="w-5 h-5" />
                            </button>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                              style={{ width: `${audioProgress}%` }} />
                          </div>
                          <div className="flex justify-between mt-1.5">
                            <span className="text-[10px] sm:text-xs text-emerald-600 font-medium">
                              {currentVerseIndex >= 0 ? `آية ${currentVerseIndex + 1}` : 'اضغط ▶ للبدء'}
                            </span>
                            <button onClick={() => q.fromVerse ? playVerse(q.fromVerse) : playAll(1)}
                              className="text-[10px] sm:text-xs text-emerald-500 hover:text-emerald-700 font-bold flex items-center gap-0.5">
                              <Repeat className="w-3 h-3" /> تشغيل من البداية
                            </button>
                          </div>
                        </div>

                        {/* Quran Verses Display */}
                        <div className="bg-white/75 rounded-2xl p-4 sm:p-5 border border-emerald-100 max-h-[260px] sm:max-h-[300px] overflow-y-auto">
                          {loadingVerses ? (
                            <div className="flex justify-center py-8">
                              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                            </div>
                          ) : quranVerses.length === 0 ? (
                            <p className="text-center text-gray-400 text-xs sm:text-sm py-6">لا توجد آيات لعرضها</p>
                          ) : (
                            <div className="text-right leading-[2.2] sm:leading-[2.5] font-quran text-lg sm:text-xl space-y-0">
                              {quranVerses.map((verse) => {
                                const verseIdx = verse.numberInSurah - 1;
                                const isActive = currentVerseIndex === verseIdx;
                                return (
                                  <span
                                    key={verse.number}
                                    data-verse-index={verseIdx}
                                    onClick={() => playVerse(verse.numberInSurah)}
                                    className={`cursor-pointer rounded-lg px-1 py-0.5 transition-all inline ${
                                      isActive
                                        ? 'bg-emerald-200/60 text-emerald-900 ring-2 ring-emerald-300'
                                        : 'hover:bg-emerald-50 text-gray-800'
                                    }`}>
                                    {verse.text}
                                    <span className={`text-xs sm:text-sm font-bold mx-1 ${
                                      isActive ? 'text-emerald-600' : 'text-amber-500'
                                    }`}>
                                      ﴿{verse.numberInSurah}﴾
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] sm:text-xs text-emerald-700 text-center font-medium">
                          💡 اضغط على أي آية للاستماع إليها — ثم سجّل تلاوتك بالضغط على الميكروفون
                        </p>
                      </div>
                    ) : (
                      /* Quiz Mode: Hidden text */
                      <div className="p-6 sm:p-8 text-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                          <VolumeX className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-gray-700 mb-1">🔒 تم حجب النص القرآني وتعطيل التلاوة المرجعية</p>
                        <p className="text-[11px] sm:text-xs text-gray-500 mb-3 sm:mb-4">قم بتسجيل التلاوة من حفظك عن ظهر قلب</p>
                        <p className="text-[11px] sm:text-xs text-gray-400">
                          سورة {surahName} — الآيات {q.fromVerse || 1} إلى {q.toVerse || '...'}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6 pb-6">
              <button onClick={() => { stopAudio(); prevQuestion(); }} disabled={currentQuestion === 0}
                className="btn-ghost flex-1 py-3 text-sm disabled:opacity-30">
                <ChevronRight className="w-4 h-4" /> السابق
              </button>
              {isLast ? (
                <button onClick={handleSubmit} disabled={isSubmitting}
                  className="btn-primary flex-1 py-3 text-sm">
                  {isSubmitting ? <LoadingSpinner size="sm" color="white" /> : <><Send className="w-4 h-4" /> تسليم الامتحان</>}
                </button>
              ) : (
                <button onClick={() => { stopAudio(); nextQuestion(); }} className="btn-primary flex-1 py-3 text-sm">
                  التالي <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
