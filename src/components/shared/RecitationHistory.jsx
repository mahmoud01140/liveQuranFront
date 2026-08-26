import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Volume2, Star, Clock, CheckCircle, RefreshCw, MessageSquare, Award
} from 'lucide-react';
import api from '../../services/api';
import { timeAgoAr } from '../../utils/helpers';
import LoadingSpinner from './LoadingSpinner';

export default function RecitationHistory({ onClose }) {
  const [recitations, setRecitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyRecitations();
  }, []);

  const fetchMyRecitations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/student-recitations/my');
      setRecitations(res.data.recitations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm text-right"
      dir="rtl"
    >
      <motion.div
        initial={{ scale: 0.9, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 15 }}
        className="bg-white rounded-3xl p-6 w-full max-w-lg border border-gray-100 shadow-2xl relative flex flex-col max-h-[85vh]"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3 flex-shrink-0">
          <div className="w-10 h-10 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-500 shadow-sm">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 text-lg">سجل تلاواتي 🎙️</h2>
            <p className="text-xs text-gray-400 mt-0.5">شاهد تقييمات المعلم وملاحظاته على تلاواتك السابقة</p>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : recitations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Volume2 className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="font-bold text-sm">لم تقم بإرسال أي تلاوات بعد</p>
              <p className="text-xs text-gray-400 mt-1">تصفح المصحف، اختر الآيات، وابدأ التسجيل الآن 🌟</p>
            </div>
          ) : (
            recitations.map((rec) => (
              <div
                key={rec._id}
                className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-gray-200 transition-all space-y-3"
              >
                {/* Header surah info */}
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h4 className="font-black text-gray-900 text-sm">سورة {rec.surahName}</h4>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      الآيات: {rec.fromVerse} - {rec.toVerse} ({rec.toVerse - rec.fromVerse + 1} آية) · {timeAgoAr(rec.createdAt)}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    rec.status === 'reviewed'
                      ? 'bg-green-50 text-green-600 border border-green-100'
                      : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {rec.status === 'reviewed' ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        تم التقييم
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        قيد المراجعة
                      </>
                    )}
                  </span>
                </div>

                {/* Audio Player for student recitation */}
                <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100/50 shadow-sm">
                  <Volume2 className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  <audio src={rec.audioUrl} controls className="flex-1 h-6" />
                </div>

                {/* Evaluation Feedback block */}
                {rec.status === 'reviewed' && (
                  <div className="bg-white rounded-2xl p-3 border border-gray-100 space-y-2.5 shadow-sm">
                    {/* Rating stars */}
                    {rec.rating && (
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] text-gray-400 ml-1">تقييم المعلم:</span>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rec.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Text Notes */}
                    {rec.teacherNotes && (
                      <p className="text-xs text-primary-700 leading-relaxed bg-primary-50/20 px-3 py-1.5 rounded-xl border border-primary-50">
                        👨‍🏫 <strong>ملاحظات المعلم:</strong> {rec.teacherNotes}
                      </p>
                    )}

                    {/* Teacher Audio feedback */}
                    {rec.teacherAudioUrl && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-gray-400 flex-shrink-0">🎙️ الرد الصوتي:</span>
                        <audio src={rec.teacherAudioUrl} controls className="flex-1 h-6" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
