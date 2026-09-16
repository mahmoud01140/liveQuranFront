import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, Play, Pause, RefreshCw, Send, X, Volume2,
  AlertCircle, CheckCircle, HelpCircle, Info,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

export default function RecitationRecorder({ surah, onClose, onSuccess }) {
  const [fromVerse, setFromVerse] = useState(1);
  const [toVerse, setToVerse] = useState(1);

  // Recorder states
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);

  // Audio Playback states (Student recorded audio)
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [recordedAudioPlayer, setRecordedAudioPlayer] = useState(null);

  // Reference Quran Audio states (Alafasy reciter)
  const [isPlayReference, setIsPlayReference] = useState(false);
  const [referenceAudioUrls, setReferenceAudioUrls] = useState([]);
  const [refLoading, setRefLoading] = useState(false);
  const [refCurrentIdx, setRefCurrentIdx] = useState(0);

  const timerRef = useRef(null);
  const refAudioPlayerRef = useRef(new Audio());

  // Build range dropdowns
  const totalVerses = surah?.verses || 7;
  const verseOptions = Array.from({ length: totalVerses }, (_, i) => i + 1);

  // Automatically adjust toVerse if fromVerse changes
  useEffect(() => {
    if (fromVerse > toVerse) {
      setToVerse(fromVerse);
    }
  }, [fromVerse, toVerse]);

  // Cleanup players on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      refAudioPlayerRef.current.pause();
      if (recordedAudioPlayer) {
        recordedAudioPlayer.pause();
      }
    };
  }, [recordedAudioPlayer]);

  // Fetch Reference Audio URLs for the selected range from api.alquran.cloud
  const playReferenceRange = async () => {
    if (isPlayReference) {
      refAudioPlayerRef.current.pause();
      setIsPlayReference(false);
      return;
    }

    setRefLoading(true);
    try {
      const urls = [];
      for (let v = fromVerse; v <= toVerse; v++) {
        // Alafasy global verse index is not needed, we can call the Surah/Verse audio endpoint
        const surahNum = surah.number;
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${v}/ar.alafasy`);
        const data = await res.json();
        if (data.code === 200 && data.data?.audio) {
          urls.push(data.data.audio);
        }
      }

      if (urls.length === 0) {
        toast.error('فشل تحميل الصوت المرجعي');
        setRefLoading(false);
        return;
      }

      setReferenceAudioUrls(urls);
      setRefCurrentIdx(0);
      setRefLoading(false);
      setIsPlayReference(true);

      // Play first verse
      playRefAudioIndex(urls, 0);

    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء تحميل الصوت المرجعي');
      setRefLoading(false);
    }
  };

  const playRefAudioIndex = (urls, index) => {
    if (index >= urls.length) {
      setIsPlayReference(false);
      setRefCurrentIdx(0);
      return;
    }

    setRefCurrentIdx(index);
    const audio = refAudioPlayerRef.current;
    audio.src = urls[index];
    audio.play();

    audio.onended = () => {
      playRefAudioIndex(urls, index + 1);
    };
  };

  // Start Media Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedAudioUrl(url);
        setRecordedAudioPlayer(new Audio(url));
      };

      // Reset previous records
      setAudioChunks([]);
      setRecordedAudioUrl(null);
      setRecordedBlob(null);

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);

      // Stop after 2 minutes safety limit
      setTimeout(() => {
        if (recorder.state === 'recording') {
          stopRecording();
        }
      }, 120000);

    } catch (err) {
      console.error(err);
      toast.error('الرجاء السماح بالوصول إلى الميكروفون لبدء التسجيل');
    }
  };

  // Stop Media Recording
  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      // stop stream tracks
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Playback recorded audio
  const togglePlayRecorded = () => {
    if (!recordedAudioPlayer) return;

    if (isPlayingRecorded) {
      recordedAudioPlayer.pause();
      setIsPlayingRecorded(false);
    } else {
      // Pause reference if active
      if (isPlayReference) {
        refAudioPlayerRef.current.pause();
        setIsPlayReference(false);
      }

      recordedAudioPlayer.play();
      setIsPlayingRecorded(true);
      recordedAudioPlayer.onended = () => {
        setIsPlayingRecorded(false);
      };
    }
  };

  // Submit recorded recitation to teacher
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!recordedBlob) {
      toast.error('الرجاء تسجيل تلاوتك أولاً قبل الإرسال');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('audio', recordedBlob, 'recitation.webm');
    formData.append('surahNumber', surah.number);
    formData.append('surahName', surah.name);
    formData.append('fromVerse', fromVerse);
    formData.append('toVerse', toVerse);

    try {
      await api.post('/student-recitations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('تم إرسال تلاوتك بنجاح! سيقوم المعلم بمراجعتها قريباً.', { duration: 4000 });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'فشل إرسال التلاوة. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
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
        className="w-full max-w-lg overflow-y-auto relative"
        style={{ background: HQ.SURFACE, borderRadius: 18, padding: 16, border: `1px solid ${HQ.LINE}`, maxHeight: '92vh' }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق مسجل التلاوة"
          className="absolute top-4 left-4"
          style={{ minWidth: 44, minHeight: 44, borderRadius: 12, border: 'none', background: HQ.PAPER, color: HQ.MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={19} aria-hidden />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-6 pb-3" style={{ borderBottom: `1px solid ${HQ.LINE}` }}>
          <span aria-hidden style={{
            width: 40, height: 40, borderRadius: 14, background: '#E2EFE7', color: HQ.MENTOR,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
          }}>
            <Mic size={19} />
          </span>
          <div>
            <h2 className="font-black" style={{ fontSize: '1.25rem', color: HQ.INK, margin: 0 }}>تسجيل تلاوة تفاعلية</h2>
            <p className="text-xs mt-0.5" style={{ color: HQ.MUTED, marginBottom: 0 }}>سجل صوتك، قارنه بالتلاوة المرجعية، وأرسله للتقييم</p>
          </div>
        </div>

        {/* Range selection */}
        <div className="p-4 rounded-2xl mb-5 space-y-4" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold" style={{ color: HQ.INK }}>السورة المحددة:</span>
            <span className="text-sm font-black px-3 py-1" style={{ background: '#E2EFE7', color: '#0F5940', borderRadius: 12 }}>
              سورة {surah?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rec-from" className="block mb-1" style={{ fontSize: '0.8125rem', fontWeight: 700, color: HQ.MUTED }}>من الآية</label>
              <select
                id="rec-from"
                value={fromVerse}
                onChange={(e) => setFromVerse(parseInt(e.target.value))}
                className="w-full text-xs font-bold focus:border-[#177B58] focus:outline-none"
                style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, color: HQ.INK, borderRadius: 12, padding: '10px 12px', minHeight: 44 }}
              >
                {verseOptions.map((v) => (
                  <option key={v} value={v}>آية {v}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="rec-to" className="block mb-1" style={{ fontSize: '0.8125rem', fontWeight: 700, color: HQ.MUTED }}>إلى الآية</label>
              <select
                id="rec-to"
                value={toVerse}
                onChange={(e) => setToVerse(parseInt(e.target.value))}
                className="w-full text-xs font-bold focus:border-[#177B58] focus:outline-none"
                style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, color: HQ.INK, borderRadius: 12, padding: '10px 12px', minHeight: 44 }}
              >
                {verseOptions.filter(v => v >= fromVerse).map((v) => (
                  <option key={v} value={v}>آية {v}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 1. Play Reference Audio block */}
        <div className="mb-5">
          <h3 className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: HQ.MUTED }}>
            <Volume2 size={15} color={HQ.MENTOR} aria-hidden />
            1. الاستماع للتلاوة المرجعية (بصوت العفاسي)
          </h3>
          <button
            type="button"
            onClick={playReferenceRange}
            disabled={refLoading}
            className="w-full text-xs font-bold flex items-center justify-center gap-2"
            style={{
              minHeight: 48, padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
              border: `1.5px solid ${HQ.MENTOR}`,
              background: isPlayReference ? HQ.MENTOR : HQ.SURFACE,
              color: isPlayReference ? '#fff' : HQ.MENTOR,
              opacity: refLoading ? 0.6 : 1,
            }}
          >
            {refLoading ? (
              <RefreshCw size={15} className="animate-spin" aria-hidden />
            ) : isPlayReference ? (
              <>
                <Pause size={15} aria-hidden />
                <span>إيقاف الاستماع (آية {fromVerse + refCurrentIdx} من {toVerse})</span>
              </>
            ) : (
              <>
                <Play size={15} aria-hidden />
                <span>تشغيل التلاوة المرجعية للنطاق</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Recording panel */}
        <div className="mb-6 p-5 flex flex-col items-center justify-center" style={{ background: HQ.PAPER, border: `1.5px dashed ${HQ.LINE}`, borderRadius: 18 }}>
          <h3 className="text-xs font-bold mb-3 self-start flex items-center gap-1" style={{ color: HQ.MUTED }}>
            <Mic size={15} color={HQ.MENTOR} aria-hidden />
            2. تلاوتك وتسجيلك الصوتي
          </h3>

          {!recordedAudioUrl && !isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              aria-label="ابدأ التسجيل"
              title="ابدأ التسجيل"
              style={{
                width: 64, height: 64, borderRadius: 9999, border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: '#C2410C', color: '#fff',
              }}
            >
              <Mic size={27} aria-hidden />
            </button>
          ) : isRecording ? (
            <div className="flex flex-col items-center gap-3">
              {/* Waveform pulsating bar */}
              <div className="flex items-center gap-1 h-6" aria-hidden>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 24, 8] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.12,
                    }}
                    className="w-1.5 rounded-full"
                    style={{ background: '#C2410C' }}
                  />
                ))}
              </div>

              <span className="text-sm font-bold animate-pulse" style={{ color: '#C2410C', fontVariantNumeric: 'tabular-nums' }}>
                {fmtDuration(recordingDuration)}
              </span>

              <button
                type="button"
                onClick={stopRecording}
                aria-label="إيقاف التسجيل"
                title="إيقاف التسجيل"
                style={{
                  width: 48, height: 48, borderRadius: 9999, border: 'none', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: HQ.INK, color: '#fff',
                }}
              >
                <Square size={19} aria-hidden />
              </button>
            </div>
          ) : (
            // Recorded Preview audio controls
            <div className="w-full flex items-center justify-between gap-4 p-3 rounded-2xl" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}` }}>
              <button
                type="button"
                onClick={togglePlayRecorded}
                aria-label={isPlayingRecorded ? 'إيقاف مؤقت' : 'استمع لتسجيلك'}
                style={{
                  width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer', flex: 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: isPlayingRecorded ? HQ.MENTOR : '#E2EFE7',
                  color: isPlayingRecorded ? '#fff' : HQ.MENTOR,
                }}
                title={isPlayingRecorded ? "إيقاف مؤقت" : "استمع لتسجيلك"}
              >
                {isPlayingRecorded ? <Pause size={17} aria-hidden /> : <Play size={17} aria-hidden />}
              </button>
              <div className="flex-1 text-right">
                <span className="text-xs font-bold block" style={{ color: HQ.INK }}>تلاوتي المسجلة</span>
                <span className="block mt-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED }}>جاهزة للإرسال والمقارنة</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRecordedAudioUrl(null);
                  setRecordedBlob(null);
                }}
                aria-label="إعادة التسجيل"
                style={{
                  minWidth: 44, minHeight: 44, borderRadius: 12, cursor: 'pointer',
                  background: HQ.SURFACE, color: '#C2410C', border: '1px solid #C2410C',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
                title="إعادة التسجيل"
              >
                <RefreshCw size={15} aria-hidden />
              </button>
            </div>
          )}
        </div>

        {/* Informative alert */}
        <div className="mb-6 flex gap-2 p-3 rounded-2xl" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
          <Info size={15} color={HQ.MUTED} aria-hidden className="flex-none mt-0.5" />
          <p style={{ fontSize: '0.8125rem', color: HQ.MUTED, margin: 0, lineHeight: 1.8 }}>
            <strong style={{ color: HQ.INK }}>نصيحة للمقارنة:</strong> استمع أولاً للتلاوة المرجعية للنطاق لتتذكر مخارج الحروف وأحكام التجويد، ثم ابدأ تسجيل تلاوتك الخاصة، ثم قارن بين التلاوتين قبل الضغط على زر الإرسال.
          </p>
        </div>

        {/* Submit action */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !recordedBlob}
          className="hq-action w-full"
          style={{ background: HQ.MENTOR, color: '#fff', fontSize: 14, opacity: (submitting || !recordedBlob) ? 0.55 : 1 }}
        >
          {submitting ? (
            <RefreshCw size={15} className="animate-spin" aria-hidden />
          ) : (
            <>
              <Send size={15} aria-hidden />
              <span>إرسال التلاوة للمعلم للتقييم</span>
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
