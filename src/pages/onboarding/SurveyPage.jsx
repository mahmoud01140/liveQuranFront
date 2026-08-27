import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import { SURVEY_QUESTIONS } from '../../utils/constants';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function SurveyPage() {
  const { user } = useAuthStore();
  const { setSurveyAnswer, surveyAnswers } = useExamStore();
  const navigate = useNavigate();
  const [currentQ, setCurrentQ] = useState(0);
  const [loading, setLoading] = useState(true);

  const regType = user?.registrationType || 'student';
  const [questions, setQuestions] = useState(SURVEY_QUESTIONS[regType] || SURVEY_QUESTIONS.student);

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/survey/${regType}`);
        if (res.data?.survey?.questions?.length > 0) {
          setQuestions(res.data.survey.questions);
        }
      } catch (err) {
        // Fallback already set from SURVEY_QUESTIONS
      } finally {
        setLoading(false);
      }
    };
    fetchSurvey();
  }, [regType]);

  const question = questions[currentQ] || questions[0];
  const isLast = currentQ === questions.length - 1;
  const selectedOption = surveyAnswers[currentQ];

  const handleSelect = (index) => {
    setSurveyAnswer(currentQ, index);
  };

  const handleNext = () => {
    if (selectedOption === undefined) {
      toast.error('الرجاء اختيار إجابة');
      return;
    }
    if (isLast) {
      navigate('/onboarding/written-exam');
    } else {
      setCurrentQ((c) => c + 1);
    }
  };

  const handlePrev = () => {
    if (currentQ > 0) setCurrentQ((c) => c - 1);
  };

  const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 100;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white">
        <LoadingSpinner size="lg" text="جارٍ تجهيز الاستبيان..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white p-4 py-12">
      {/* Progress */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span className="badge-green">الخطوة 3 من 6 — الاستبيان</span>
          <span>السؤال {currentQ + 1} من {questions.length}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <div className="card-base p-8">
              {/* Question number */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-quran text-white rounded-xl flex items-center justify-center font-black text-lg">
                  {currentQ + 1}
                </div>
                <h2 className="text-xl font-black text-gray-900">{question.text}</h2>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((opt, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleSelect(i)}
                    className={`w-full text-right px-5 py-4 rounded-2xl border-2 transition-all duration-200 font-medium ${
                      selectedOption === i
                        ? 'border-primary-400 bg-primary-50 text-primary-700 shadow-sm'
                        : 'border-gray-200 text-gray-700 hover:border-primary-200 hover:bg-primary-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
                        selectedOption === i ? 'border-primary-400 bg-primary-400' : 'border-gray-300'
                      }`} />
                      {opt}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-6">
          <button onClick={handlePrev} disabled={currentQ === 0}
            className="btn-ghost disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
            السابق
          </button>
          <button onClick={handleNext} className="btn-primary px-8">
            {isLast ? 'انتقل للامتحان التحريري' : 'التالي'}
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
