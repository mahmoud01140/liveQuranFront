import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, BookOpen, Clock, Video, Award, PenTool, Lock, Unlock,
  FileText, Plus, Trash2, CheckCircle, HelpCircle, Trophy, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';

import Navbar from '../../components/shared/Navbar';
import Sidebar from '../../components/shared/Sidebar';
import MobileBottomNav from '../../components/shared/MobileBottomNav';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import VideoPlayer, { isVideoUrl } from '../../components/shared/VideoPlayer';
import LessonContent from '../../components/shared/LessonContent';
import LessonResources from '../../components/shared/LessonResources';
import useAuthStore from '../../store/authStore';
import useLessonProgress from '../../hooks/useLessonProgress';
import api from '../../services/api';
import { LESSON_TYPES_AR } from '../../utils/constants';
import toast from 'react-hot-toast';

/* ── Quiz Question Bank ──────────────────────────────────── */
const QUESTIONS_BANK = {
  tajweed: [
    {
      q: "ما هو عدد حروف الإظهار الحلقي؟",
      options: ["3 حروف", "4 حروف", "6 حروف", "8 حروف"],
      answer: 2,
    },
    {
      q: "أي من الحروف التالية يعتبر من حروف الإدغام بغنة؟",
      options: ["الياء والميم", "الراء واللام", "الهمزة والهاء", "الخاء والغين"],
      answer: 0,
    },
    {
      q: "الإقلاب هو قلب النون الساكنة أو التنوين ميماً مخفاة عند ملاقاة حرف واحد هو:",
      options: ["الميم (م)", "الباء (ب)", "الواو (و)", "الهمزة (أ)"],
      answer: 1,
    },
    {
      q: "ما هو حكم النون الساكنة في قوله تعالى ﴿ مِن قَبۡلِ ﴾؟",
      options: ["إظهار حلقي", "إدغام بغنة", "إقلاب", "إخفاء حقيقي"],
      answer: 3,
    },
    {
      q: "ما هو مخرج الغنة الرئيسي في أحكام التجويد؟",
      options: ["الجوف", "الحلق", "الخيشوم", "الشفتان"],
      answer: 2,
    },
  ],
  memorization: [
    {
      q: "ما هو المعنى الاصطلاحي لـ 'ترتيل القرآن'؟",
      options: [
        "القراءة السريعة دون تدبر",
        "تلاوة القرآن بتمهل وتدبر مع إعطاء كل حرف حقه ومخرجه",
        "تلاوة القرآن فقط في الصلاة",
        "حفظ السور دون معرفة معانيها"
      ],
      answer: 1,
    },
    {
      q: "كم عدد صفحات الجزء الواحد في مصحف المدينة النبوية المعتاد؟",
      options: ["10 صفحات", "15 صفحة", "20 صفحة", "30 صفحة"],
      answer: 2,
    },
    {
      q: "ما هي الطريقة الأفضل لتثبيت الحفظ القديم وتفادي النسيان؟",
      options: ["الحفظ الجديد باستمرار", "المراجعة التراكمية اليومية (الورد اليومي)", "الاستماع فقط دون قراءة", "المراجعة مرة كل شهر"],
      answer: 1,
    },
    {
      q: "البسملة مشروعة ومطلوبة في أوائل السور جميعها عند البدء، عدا سورة:",
      options: ["سورة التوبة", "سورة يونس", "سورة الكهف", "سورة الرحمن"],
      answer: 0,
    },
    {
      q: "ما هو الفضل الأكبر لحافظ القرآن في الآخرة؟",
      options: ["يقال له اقرأ وارتقِ ورتل كما كنت ترتل في الدنيا", "يلبس والداه تاج الوقار", "يكون مع السفرة الكرام البررة", "كل ما سبق صحيح"],
      answer: 3,
    },
  ],
  default: [
    {
      q: "من آداب تلاوة القرآن الكريم الأساسية:",
      options: ["الوضوء واستحضار النية", "الإنصات والتدبر عند السماع", "تحسين الصوت بالتلاوة", "كل ما سبق صحيح"],
      answer: 3,
    },
    {
      q: "مرتبة قراءة القرآن بتوسط وسرعة معتدلة مع مراعاة الأحكام تسمى:",
      options: ["الترتيل", "التدوير", "الحدر", "التحقيق"],
      answer: 1,
    },
    {
      q: "الاستعاذة عند البدء بتلاوة القرآن الكريم حكمها:",
      options: ["مستحبة ومطلوبة", "محرمة", "مكروهة", "مباحة فقط"],
      answer: 0,
    },
    {
      q: "كم عدد سور القرآن الكريم بالكامل؟",
      options: ["110 سورة", "112 سورة", "114 سورة", "120 سورة"],
      answer: 2,
    },
    {
      q: "السورة التي تعدل تلاوتها ثلث القرآن الكريم هي سورة:",
      options: ["سورة الفاتحة", "سورة يس", "سورة الكهف", "سورة الإخلاص"],
      answer: 3,
    },
  ]
};

export default function LessonPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studyPlan, setStudyPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Notes state
  const [personalNotes, setPersonalNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showAnswerResult, setShowAnswerResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Lesson steps tracker
  const { toggleStep, isStepDone, allDone } = useLessonProgress();

  // Load lesson details and personal notes
  useEffect(() => {
    const fetchPlanAndNotes = async () => {
      setIsLoading(true);
      try {
        const groupId = user?.group?._id || user?.group;
        if (groupId) {
          const res = await api.get(`/study-plans/group/${groupId}/full`);
          setStudyPlan(res.data.plan);
        }
      } catch (err) {
        console.error("Error fetching study plan", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlanAndNotes();

    // Fetch personal notes from localStorage
    const savedNotes = localStorage.getItem(`lesson_notes_${lessonId}`);
    if (savedNotes) {
      try {
        setPersonalNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error(e);
      }
    } else {
      setPersonalNotes([]);
    }

    // Reset quiz state when switching lessons
    setQuizStarted(false);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setShowAnswerResult(false);
    setScore(0);
    setQuizFinished(false);
  }, [lessonId, user]);

  // Save notes to localStorage
  const saveNotes = (updated) => {
    setPersonalNotes(updated);
    localStorage.setItem(`lesson_notes_${lessonId}`, JSON.stringify(updated));
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const note = {
      id: Date.now().toString(),
      text: newNote.trim(),
      createdAt: Date.now(),
    };
    const updated = [note, ...personalNotes];
    saveNotes(updated);
    setNewNote('');
    toast.success('تم حفظ الملاحظة بنجاح 📝', { icon: '✍️' });
  };

  const handleDeleteNote = (id) => {
    const filtered = personalNotes.filter(n => n.id !== id);
    saveNotes(filtered);
    toast.success('تم حذف الملاحظة');
  };

  // Find active lesson and sibling navigation lessons
  const { currentLesson, prevLesson, nextLesson, isUnlocked } = useMemo(() => {
    if (!studyPlan?.customLessons?.length) {
      return { currentLesson: null, prevLesson: null, nextLesson: null, isUnlocked: false };
    }
    const lessons = studyPlan.customLessons;
    const activeIndex = lessons.findIndex(l => l._id === lessonId);

    if (activeIndex === -1) {
      return { currentLesson: null, prevLesson: null, nextLesson: null, isUnlocked: false };
    }

    const current = lessons[activeIndex];
    const prev = activeIndex > 0 ? lessons[activeIndex - 1] : null;
    const next = activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null;

    // Sequential unlocking: a lesson is unlocked if it's the first one,
    // or if the student has marked the previous lesson as completed in backend or local progress
    let unlocked = true;
    if (activeIndex > 0 && prev) {
      const prevSteps = [
        { key: 'readMaterial' },
        ...(isVideoUrl(prev.resources) ? [{ key: 'watchedVideo' }] : []),
        { key: 'exercises' },
        { key: 'exam' }
      ];
      const prevDone = user?.completedLessons?.includes(prev._id) || allDone(prev._id, prevSteps);
      unlocked = prevDone;
    }

    return { currentLesson: current, prevLesson: prev, nextLesson: next, isUnlocked: unlocked };
  }, [studyPlan, lessonId, user, allDone]);

  // Quiz questions selection
  const quizQuestions = useMemo(() => {
    if (!currentLesson) return [];
    return QUESTIONS_BANK[currentLesson.type] || QUESTIONS_BANK.default;
  }, [currentLesson]);

  // Auto mark backend completion when lesson is finished
  const markCompleteBackend = async (lid) => {
    try {
      await api.put(`/curriculum/complete-lesson/${lid}`);
    } catch {}
  };

  const handleQuizAnswerSubmit = () => {
    if (selectedOption === null) return;
    setShowAnswerResult(true);
    const correct = quizQuestions[currentQuestionIdx].answer === selectedOption;
    if (correct) {
      setScore(s => s + 1);
    }
  };

  const handleQuizNextQuestion = () => {
    setSelectedOption(null);
    setShowAnswerResult(false);
    if (currentQuestionIdx < quizQuestions.length - 1) {
      setCurrentQuestionIdx(idx => idx + 1);
    } else {
      setQuizFinished(true);
      const passed = score >= 4 || (score === 3 && quizQuestions[currentQuestionIdx].answer === selectedOption);
      // Auto complete the exam step if they pass the quiz
      const finalScore = score + (quizQuestions[currentQuestionIdx].answer === selectedOption ? 1 : 0);
      if (finalScore >= 4) {
        if (!isStepDone(lessonId, 'exam')) {
          toggleStep(lessonId, 'exam');
          toast.success('🎉 تهانينا! لقد اجتزت اختبار الدرس وسجلنا تقدمك!', { icon: '🏆', duration: 4000 });
          // If this completes the lesson, sync with backend
          const steps = [
            { key: 'readMaterial' },
            ...(isVideoUrl(currentLesson.resources) ? [{ key: 'watchedVideo' }] : []),
            { key: 'exercises' },
            { key: 'exam' }
          ];
          const allDoneAfter = steps.every(s => s.key === 'exam' ? true : isStepDone(lessonId, s.key));
          if (allDoneAfter) {
            markCompleteBackend(lessonId);
          }
        }
      }
    }
  };

  const handleRetakeQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setShowAnswerResult(false);
    setScore(0);
    setQuizFinished(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="pt-24 flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="pt-24 max-w-md mx-auto text-center p-6">
          <Award className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="font-black text-gray-900 text-lg mb-2">عذراً، الدرس غير موجود</h2>
          <p className="text-gray-500 text-xs mb-4">ربما تم حذف هذا الدرس أو تغيير مكانه في خطة الدراسة.</p>
          <Link to="/student/curriculum" className="btn-primary py-2 px-6 text-xs inline-flex items-center gap-1.5">
            <ArrowRight className="w-4 h-4" /> العودة للمنهج الدراسي
          </Link>
        </div>
      </div>
    );
  }

  const hasVideo = isVideoUrl(currentLesson.resources);
  const steps = [
    { key: 'readMaterial', label: 'قرأت المادة', icon: BookOpen },
    ...(hasVideo ? [{ key: 'watchedVideo', label: 'شاهدت الفيديو', icon: Video }] : []),
    { key: 'exercises', label: 'حللت التمارين', icon: PenTool },
    { key: 'exam', label: 'اجتزت الاختبار', icon: Award }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:mr-64 pt-16 pb-20 lg:pb-8">
        <div className="page-container max-w-5xl">
          {/* Breadcrumb / Back button */}
          <div className="mb-4 flex items-center justify-between">
            <Link to="/student/curriculum" className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1">
              <ArrowRight className="w-4 h-4" /> العودة إلى المنهج
            </Link>
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold bg-primary-50 text-primary-600 border border-primary-100`}>
              الدرس {currentLesson.lessonNumber}
            </span>
          </div>

          {/* Sibling warning if locked */}
          {!isUnlocked && (
            <div className="mb-6 card-base p-4 bg-amber-50 border border-amber-200/60 rounded-2xl flex items-center gap-3 text-amber-800">
              <Lock className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <div className="text-right">
                <h4 className="font-bold text-xs">هذا الدرس مغلق حالياً 🔒</h4>
                <p className="text-[10px] text-amber-700 mt-0.5">يرجى إكمال خطوات الدرس السابق أولاً لكي تتمكن من تسجيل تقدمك هنا.</p>
              </div>
            </div>
          )}

          {/* Lesson Header Title Card */}
          <div className="card-base p-4 sm:p-6 bg-white border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-lg sm:text-2xl font-black text-gray-900 mb-1.5">{currentLesson.title}</h1>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {currentLesson.duration} دقيقة</span>
                  <span>·</span>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                    {LESSON_TYPES_AR[currentLesson.type] || currentLesson.type}
                  </span>
                  {currentLesson.isLiveRequired && (
                    <>
                      <span>·</span>
                      <span className="text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded">مطلوب حضور حصة مباشرة</span>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Stepper badges */}
              <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 border-t md:border-t-0 pt-3 md:pt-0">
                {steps.map(s => {
                  const done = isStepDone(lessonId, s.key);
                  return (
                    <button
                      key={s.key}
                      disabled={!isUnlocked}
                      onClick={() => {
                        const wasDone = done;
                        toggleStep(lessonId, s.key);
                        if (!wasDone) {
                          toast.success(`أحسنت! أتممت: ${s.label} ✅`);
                          // Check if all steps done
                          const doneAfter = steps.every(st => st.key === s.key ? true : isStepDone(lessonId, st.key));
                          if (doneAfter) markCompleteBackend(lessonId);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-sm flex-shrink-0 ${
                        done
                          ? 'bg-gradient-to-l from-primary-400 to-emerald-500 text-white border-primary-300'
                          : 'bg-white text-gray-500 hover:text-gray-700 border-gray-200 hover:border-gray-300 disabled:opacity-50'
                      }`}
                    >
                      <s.icon className="w-3.5 h-3.5" />
                      <span>{s.label}</span>
                      {done && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Area: Content, Video, Explanation (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. Explanatory Video */}
              {hasVideo && (
                <div className="space-y-2">
                  <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                    <Video className="w-4.5 h-4.5 text-blue-500" /> فيديو شرح الدرس
                  </h3>
                  <VideoPlayer url={currentLesson.resources} title={currentLesson.title} />
                </div>
              )}

              {/* 2. Text Explanation (LessonContent) */}
              <LessonContent content={currentLesson.description} />
            </div>

            {/* Right Area: Sidebar resources, Quiz, Notes (1/3 width) */}
            <div className="space-y-6">
              {/* 1. Attached Files (LessonResources) */}
              <LessonResources
                resources={currentLesson.resources}
                title={currentLesson.title}
                lessonId={currentLesson._id}
              />

              {/* 2. Quick Quiz */}
              <div className="card-base p-5 bg-white border border-gray-100">
                <div className="flex items-center gap-2 mb-3 border-b border-gray-50 pb-2.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <h3 className="font-black text-gray-900 text-sm">الاختبار السريع للدرس</h3>
                </div>

                {!quizStarted ? (
                  <div className="text-center py-4">
                    <Trophy className="w-10 h-10 mx-auto text-amber-400 mb-2" />
                    <p className="text-xs text-gray-600 leading-relaxed mb-4">
                      اختبر مدى استيعابك للمفاهيم الأساسية في هذا الدرس من خلال 5 أسئلة سريعة.
                    </p>
                    <button
                      onClick={() => setQuizStarted(true)}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> ابدأ الاختبار الآن
                    </button>
                  </div>
                ) : quizFinished ? (
                  <div className="text-center py-4">
                    <Trophy className="w-12 h-12 mx-auto text-emerald-500 mb-2 animate-bounce" />
                    <h4 className="font-bold text-gray-900 text-sm mb-1">
                      {score >= 4 ? '🎉 ممتاز! لقد اجتزت بنجاح' : '😢 حاول مرة أخرى'}
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      أجبت بشكل صحيح على {score} من أصل 5 أسئلة ({score * 20}%).
                    </p>
                    {score < 4 && (
                      <button
                        onClick={handleRetakeQuiz}
                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all mb-2"
                      >
                        إعادة محاولة الاختبار
                      </button>
                    )}
                    <button
                      onClick={handleRetakeQuiz}
                      className="w-full py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-xs font-bold transition-all"
                    >
                      إغلاق لوحة الاختبار
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>السؤال {currentQuestionIdx + 1} من {quizQuestions.length}</span>
                      <span className="font-bold text-amber-500">مجموع الإجابات الصحيحة: {score}</span>
                    </div>

                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%` }}
                      />
                    </div>

                    <p className="text-xs font-bold text-gray-800 leading-relaxed bg-gray-50 p-3 rounded-xl min-h-[50px]">
                      {quizQuestions[currentQuestionIdx]?.q}
                    </p>

                    <div className="space-y-2">
                      {quizQuestions[currentQuestionIdx]?.options.map((opt, oIdx) => {
                        const isSelected = selectedOption === oIdx;
                        const isCorrectAnswer = quizQuestions[currentQuestionIdx].answer === oIdx;
                        
                        let optionStyle = "border-gray-200 hover:border-gray-300 bg-white text-gray-700";
                        if (showAnswerResult) {
                          if (isCorrectAnswer) {
                            optionStyle = "bg-green-50 border-green-400 text-green-800 font-bold";
                          } else if (isSelected) {
                            optionStyle = "bg-red-50 border-red-400 text-red-800 font-bold";
                          } else {
                            optionStyle = "bg-gray-50 border-gray-200 opacity-50";
                          }
                        } else if (isSelected) {
                          optionStyle = "border-amber-400 bg-amber-50 text-amber-800 font-bold ring-1 ring-amber-300";
                        }

                        return (
                          <button
                            key={oIdx}
                            disabled={showAnswerResult}
                            onClick={() => setSelectedOption(oIdx)}
                            className={`w-full text-right p-2.5 rounded-xl border text-xs leading-relaxed transition-all flex items-center gap-2 ${optionStyle}`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                              isSelected ? 'bg-amber-400 text-white border-transparent' : 'border-gray-300 text-gray-400 bg-gray-50'
                            }`}>
                              {oIdx + 1}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {!showAnswerResult ? (
                      <button
                        onClick={handleQuizAnswerSubmit}
                        disabled={selectedOption === null}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 text-white disabled:text-gray-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        تحقق من الإجابة
                      </button>
                    ) : (
                      <button
                        onClick={handleQuizNextQuestion}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm"
                      >
                        <span>{currentQuestionIdx === quizQuestions.length - 1 ? 'عرض النتيجة' : 'السؤال التالي'}</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Student Notes */}
              <div className="card-base p-5 bg-white border border-gray-100">
                <div className="flex items-center gap-2 mb-3 border-b border-gray-50 pb-2.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <h3 className="font-black text-gray-900 text-sm">ملاحظاتي الشخصية</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="اكتب ملاحظة أو فائدة سريعة..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 text-right"
                    />
                    <button
                      onClick={handleAddNote}
                      className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {personalNotes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-gray-50 border border-gray-100 rounded-xl p-3 shadow-sm hover:border-gray-200 transition-all flex justify-between gap-3 items-start group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 leading-relaxed break-words">{note.text}</p>
                          <span className="text-[9px] text-gray-400 block mt-1">
                            {new Date(note.createdAt).toLocaleDateString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {personalNotes.length === 0 && (
                      <p className="text-[10px] text-gray-400 text-center py-6">
                        لا توجد ملاحظات مسجلة لهذا الدرس بعد.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls: Previous / Next Lesson */}
          <div className="mt-8 border-t border-gray-100 pt-6 flex items-center justify-between gap-4">
            {prevLesson ? (
              <button
                onClick={() => navigate(`/student/lessons/${prevLesson._id}`)}
                className="flex-1 max-w-[240px] flex items-center justify-start gap-2.5 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-gray-200 hover:shadow transition-all text-right"
              >
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 flex-shrink-0">
                  <ChevronRight className="w-5 h-5 mr-0.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-gray-400 block font-bold">الدرس السابق {prevLesson.lessonNumber}</span>
                  <span className="text-xs font-black text-gray-800 truncate block">{prevLesson.title}</span>
                </div>
              </button>
            ) : (
              <div className="flex-1 max-w-[240px]" />
            )}

            {nextLesson ? (
              <button
                onClick={() => isUnlocked && navigate(`/student/lessons/${nextLesson._id}`)}
                disabled={!isUnlocked}
                className={`flex-1 max-w-[240px] flex items-center justify-end gap-2.5 p-3 rounded-2xl border shadow-sm transition-all text-left ${
                  isUnlocked
                    ? 'bg-white border-gray-100 hover:border-gray-200 hover:shadow'
                    : 'bg-gray-50/50 border-gray-100 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="min-w-0 flex-1 text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    {!isUnlocked && <Lock className="w-3 h-3 text-amber-500" />}
                    <span className="text-[9px] text-gray-400 font-bold block">الدرس التالي {nextLesson.lessonNumber}</span>
                  </div>
                  <span className="text-xs font-black text-gray-800 truncate block">{nextLesson.title}</span>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isUnlocked ? 'bg-primary-50 text-primary-500' : 'bg-gray-100 text-gray-400'
                }`}>
                  <ChevronLeft className="w-5 h-5 ml-0.5" />
                </div>
              </button>
            ) : (
              <div className="flex-1 max-w-[240px]" />
            )}
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
