import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Volume2, Star, Clock, CheckCircle, RefreshCw, MessageSquare, Award,
} from 'lucide-react';
import api from '../../services/api';
import { timeAgoAr } from '../../utils/helpers';
import LoadingSpinner from './LoadingSpinner';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

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

  const iconBtn = {
    minWidth: 44, minHeight: 44, borderRadius: 12, border: 'none', background: 'transparent',
    color: HQ.MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="halaqa fixed inset-0 z-50 flex items-center justify-center p-4 text-right"
      style={{ background: 'rgba(42,36,56,0.55)' }}
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg relative flex flex-col"
        style={{
          background: HQ.SURFACE, borderRadius: 18, padding: 24,
          border: `1px solid ${HQ.LINE}`, maxHeight: '85vh',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق سجل التلاوات"
          className="absolute top-4 left-4"
          style={iconBtn}
        >
          <X size={19} aria-hidden />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-6 pb-3 flex-none" style={{ borderBottom: `1px solid ${HQ.LINE}` }}>
          <span aria-hidden style={{
            width: 40, height: 40, borderRadius: 14, background: '#E2EFE7', color: HQ.MENTOR,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
          }}>
            <Award size={19} />
          </span>
          <div>
            <h2 className="font-black" style={{ fontSize: '1.25rem', color: HQ.INK, margin: 0 }}>سجل تلاواتي</h2>
            <p className="text-xs mt-0.5" style={{ color: HQ.MUTED, marginBottom: 0 }}>شاهد تقييمات المعلم وملاحظاته على تلاواتك السابقة</p>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : recitations.length === 0 ? (
            <div className="text-center py-12" style={{ color: HQ.MUTED }}>
              <Volume2 size={46} color={HQ.LINE} style={{ margin: '0 auto 12px' }} aria-hidden />
              <p className="font-bold text-sm" style={{ margin: '0 0 4px' }}>لم تقم بإرسال أي تلاوات بعد</p>
              <p className="text-xs" style={{ margin: 0 }}>تصفح المصحف، اختر الآيات، وابدأ التسجيل الآن</p>
            </div>
          ) : (
            recitations.map((rec) => (
              <div
                key={rec._id}
                className="rounded-2xl p-4 space-y-3"
                style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}
              >
                {/* Header surah info */}
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <div>
                    <h4 className="font-black text-sm" style={{ color: HQ.INK, margin: 0 }}>سورة {rec.surahName}</h4>
                    <span className="block mt-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED, fontVariantNumeric: 'tabular-nums' }}>
                      الآيات: {rec.fromVerse} - {rec.toVerse} ({rec.toVerse - rec.fromVerse + 1} آية) · {timeAgoAr(rec.createdAt)}
                    </span>
                  </div>

                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: '0.8125rem', fontWeight: 800, padding: '4px 12px', borderRadius: 9999,
                    background: rec.status === 'reviewed' ? '#E2EFE7' : HQ.SURFACE,
                    color: rec.status === 'reviewed' ? '#0F5940' : '#B45309',
                    border: `1px solid ${rec.status === 'reviewed' ? '#E2EFE7' : '#B45309'}`,
                  }}>
                    {rec.status === 'reviewed' ? (
                      <>
                        <CheckCircle size={13} aria-hidden />
                        تم التقييم
                      </>
                    ) : (
                      <>
                        <Clock size={13} aria-hidden />
                        قيد المراجعة
                      </>
                    )}
                  </span>
                </div>

                {/* Audio Player for student recitation */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
                  <Volume2 size={15} color={HQ.MENTOR} aria-hidden className="flex-none" />
                  <audio src={rec.audioUrl} controls className="flex-1" style={{ height: 24 }} />
                </div>

                {/* Evaluation Feedback block */}
                {rec.status === 'reviewed' && (
                  <div className="rounded-2xl p-3 space-y-2.5" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
                    {/* Rating stars */}
                    {rec.rating && (
                      <div className="flex items-center gap-0.5" role="img" aria-label={`تقييم المعلم ${rec.rating} من 5`}>
                        <span className="ml-1" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>تقييم المعلم:</span>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            aria-hidden
                            color={s <= rec.rating ? '#D9A441' : HQ.LINE}
                            fill={s <= rec.rating ? '#D9A441' : 'none'}
                          />
                        ))}
                      </div>
                    )}

                    {/* Text Notes */}
                    {rec.teacherNotes && (
                      <p className="text-xs px-3 py-1.5 rounded-xl" style={{ color: HQ.INK, background: HQ.PAPER, margin: 0 }}>
                        <strong>ملاحظات المعلم:</strong> {rec.teacherNotes}
                      </p>
                    )}

                    {/* Teacher Audio feedback */}
                    {rec.teacherAudioUrl && (
                      <div className="flex items-center gap-2 pt-2" style={{ borderTop: `1px solid ${HQ.LINE}` }}>
                        <span className="flex-none" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>الرد الصوتي:</span>
                        <audio src={rec.teacherAudioUrl} controls className="flex-1" style={{ height: 24 }} />
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
