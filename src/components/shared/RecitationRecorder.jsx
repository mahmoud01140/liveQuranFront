import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, Play, Pause, RefreshCw, Send, X, Volume2,
  AlertCircle, Sparkles, CheckCircle, HelpCircle, Info
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

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
      toast.error('الرجاء السماح بالوصول إلى الميكروفون لبدء التسجيل 🎙️');
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
      toast.success('🎉 تم إرسال تلاوتك بنجاح! سيقوم المعلم بمراجعتها قريباً.', { duration: 4000 });
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm text-right"
      dir="rtl"
    >
      <motion.div
        initial={{ scale: 0.9, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 15 }}
        className="bg-white rounded-3xl p-4 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto border border-gray-100 shadow-2xl relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-3">
          <div className="w-10 h-10 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-500 shadow-sm">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-gray-900 text-lg">تسجيل تلاوة تفاعلية 🎙️</h2>
            <p className="text-xs text-gray-400 mt-0.5">سجل صوتك، قارنه بالتلاوة المرجعية، وأرسله للتقييم</p>
          </div>
        </div>

        {/* Range selection */}
        <div className="card-base p-4 bg-slate-50/50 border border-gray-100 rounded-2xl mb-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">السورة المحددة:</span>
            <span className="text-sm font-black text-primary-600 bg-primary-50 px-3 py-1 rounded-xl">
              سورة {surah?.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">من الآية</label>
              <select
                value={fromVerse}
                onChange={(e) => setFromVerse(parseInt(e.target.value))}
                className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-400 text-right"
              >
                {verseOptions.map((v) => (
                  <option key={v} value={v}>آية {v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">إلى الآية</label>
              <select
                value={toVerse}
                onChange={(e) => setToVerse(parseInt(e.target.value))}
                className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-400 text-right"
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
          <h3 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
            <Volume2 className="w-4 h-4 text-primary-400" />
            1. الاستماع للتلاوة المرجعية (بصوت العفاسي)
          </h3>
          <button
            onClick={playReferenceRange}
            disabled={refLoading}
            className={`w-full py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              isPlayReference
                ? 'bg-slate-800 text-white border-slate-700 shadow'
                : 'bg-white text-primary-600 border-primary-200 hover:bg-primary-50/50 shadow-sm'
            }`}
          >
            {refLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isPlayReference ? (
              <>
                <Pause className="w-4 h-4" />
                <span>إيقاف الاستماع (آية {fromVerse + refCurrentIdx} من {toVerse})</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-0.5" />
                <span>تشغيل التلاوة المرجعية للنطاق</span>
              </>
            )}
          </button>
        </div>

        {/* 2. Recording panel */}
        <div className="mb-6 card-base p-5 border border-dashed border-primary-300 bg-primary-50/20 rounded-3xl flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold text-gray-500 mb-3 self-start flex items-center gap-1">
            <Mic className="w-4 h-4 text-primary-400" />
            2. تلاوتك وتسجيلك الصوتي
          </h3>

          {!recordedAudioUrl && !isRecording ? (
            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              title="ابدأ التسجيل"
            >
              <Mic className="w-7 h-7" />
            </button>
          ) : isRecording ? (
            <div className="flex flex-col items-center gap-3">
              {/* Waveform pulsating bar */}
              <div className="flex items-center gap-1 h-6">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 24, 8] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.12,
                    }}
                    className="w-1.5 bg-red-500 rounded-full"
                  />
                ))}
              </div>

              <span className="text-sm font-mono font-bold text-red-600 animate-pulse">
                {fmtDuration(recordingDuration)}
              </span>

              <button
                onClick={stopRecording}
                className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
                title="إيقاف التسجيل"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
          ) : (
            // Recorded Preview audio controls
            <div className="w-full flex items-center justify-between gap-4 bg-white border border-gray-100 p-3 rounded-2xl shadow-sm">
              <button
                onClick={togglePlayRecorded}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isPlayingRecorded
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                }`}
                title={isPlayingRecorded ? "إيقاف مؤقت" : "استمع لتسجيلك"}
              >
                {isPlayingRecorded ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-0.5" />}
              </button>
              <div className="flex-1 text-right">
                <span className="text-xs font-bold text-gray-800 block">تلاوتي المسجلة</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">جاهزة للإرسال والمقارنة 🗣️</span>
              </div>
              <button
                onClick={() => {
                  setRecordedAudioUrl(null);
                  setRecordedBlob(null);
                }}
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                title="إعادة التسجيل"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Informative alert */}
        <div className="mb-6 flex gap-2 p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-800">
          <Info className="w-4.5 h-4.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed">
            <strong>نصيحة للمقارنة:</strong> استمع أولاً للتلاوة المرجعية للنطاق لتتذكر مخارج الحروف وأحكام التجويد، ثم ابدأ تسجيل تلاوتك الخاصة، ثم قارن بين التلاوتين قبل الضغط على زر الإرسال.
          </p>
        </div>

        {/* Submit action */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !recordedBlob}
          className="w-full py-3 bg-gradient-to-l from-primary-400 to-emerald-500 text-white rounded-2xl text-xs font-black shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5"
        >
          {submitting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>إرسال التلاوة للمعلم للتقييم 🎙️</span>
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
