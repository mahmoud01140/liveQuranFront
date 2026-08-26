import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, CheckCircle, Clock, Send, ChevronDown, ChevronLeft, Calendar, AlertCircle, Award, TrendingUp, Mic, Trash2, Volume2, FileText, Download, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from '../../components/shared/Navbar';
import Sidebar from '../../components/shared/Sidebar';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDateAr } from '../../utils/helpers';
import toast from 'react-hot-toast';
import QURAN_SURAHS from '../../utils/quranData';

export default function HomeworkPage() {
  const { user, checkAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [notes, setNotes] = useState({});
  const [showNoteInput, setShowNoteInput] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [quranVerses, setQuranVerses] = useState({});
  const [loadingVerses, setLoadingVerses] = useState({});

  useEffect(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [timerInterval]);

  useEffect(() => {
    if (expanded) {
      const sess = sessions.find(s => s._id === expanded);
      if (sess?.quranHomework?.surahNumber) {
        fetchQuranVerses(
          sess._id,
          sess.quranHomework.surahNumber,
          sess.quranHomework.fromVerse,
          sess.quranHomework.toVerse
        );
      }
    }
  }, [expanded, sessions]);

  useEffect(() => {
    const groupId = user?.group?._id || user?.group;
    if (!groupId) { setIsLoading(false); return; }
    api.get(`/live/group/${groupId}/homework`)
      .then(r => setSessions(r.data.sessions || []))
      .catch(() => toast.error('خطأ في تحميل الواجبات'))
      .finally(() => setIsLoading(false));
  }, [user]);

  const fetchQuranVerses = async (sessionId, surahNum, from, to) => {
    if (quranVerses[sessionId]) return;
    setLoadingVerses(p => ({ ...p, [sessionId]: true }));
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`);
      const data = await res.json();
      if (data.code === 200 && data.data && data.data.ayahs) {
        const filtered = data.data.ayahs.filter(
          a => a.numberInSurah >= from && a.numberInSurah <= to
        );
        setQuranVerses(p => ({ ...p, [sessionId]: filtered }));
      }
    } catch (err) {
      console.error('Error fetching Quran verses:', err);
    } finally {
      setLoadingVerses(p => ({ ...p, [sessionId]: false }));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      const interval = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
      setTimerInterval(interval);
    } catch (err) {
      toast.error('لم نتمكن من الوصول للميكروفون. يرجى تفعيل الصلاحية.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 5) {
      toast.error('يمكنك رفع 5 ملفات كحد أقصى للواجب الواحد');
      return;
    }
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const isSubmittedByMe = (session) =>
    session.homeworkSubmissions?.some(s =>
      (s.student?._id || s.student)?.toString() === user?._id?.toString()
    );

  const getMySubmission = (session) =>
    session.homeworkSubmissions?.find(s =>
      (s.student?._id || s.student)?.toString() === user?._id?.toString()
    );

  const handleSubmit = async (sessionId) => {
    setSubmitting(sessionId);
    try {
      const formData = new FormData();
      formData.append('notes', notes[sessionId] || '');
      if (audioBlob) {
        formData.append('audio', audioBlob, 'homework-recording.webm');
      }
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      await api.post(`/live/${sessionId}/homework/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update local state with mock submission details
      const newSubmission = {
        student: { _id: user._id },
        notes: notes[sessionId] || '',
        submittedAt: new Date(),
        audioUrl: audioUrl || '',
        files: selectedFiles.map(f => ({ name: f.name, url: URL.createObjectURL(f) })),
        isChecked: false
      };

      setSessions(prev => prev.map(s =>
        s._id === sessionId
          ? {
              ...s,
              homeworkSubmissions: [
                ...(s.homeworkSubmissions || []),
                newSubmission
              ]
            }
          : s
      ));
      setShowNoteInput(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setSelectedFiles([]);
      toast.success('✅ تم تسليم الواجب بنجاح!');
      await checkAuth();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'خطأ في التسليم');
    } finally { setSubmitting(null); }
  };

  const isOverdue = (session) => {
    if (!session.homeworkDeadline) return false;
    return new Date(session.homeworkDeadline) < new Date();
  };

  const pendingCount = sessions.filter(s => !isSubmittedByMe(s)).length;
  const doneCount = sessions.filter(s => isSubmittedByMe(s)).length;

  const chartData = [...sessions]
    .reverse()
    .slice(-7)
    .map(s => {
      const sub = getMySubmission(s);
      return {
        name: s.title.substring(0, 15) + (s.title.length > 15 ? '...' : ''),
        'النقاط المحصولة': sub ? (sub.earnedPoints || 0) : 0,
      };
    });

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50"><Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="pt-16 flex justify-center py-20"><LoadingSpinner size="lg" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:mr-64 pt-16">
        <div className="page-container">

          {/* Header */}
          <div className="mb-6">
            <h1 className="section-title">الواجبات الدراسية</h1>
            <p className="section-subtitle">تتبع واجبات مجموعتك وسجّل إنجازها</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card-base p-4 text-center">
              <div className="text-2xl font-black text-gray-900">{sessions.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">إجمالي الواجبات</div>
            </div>
            <div className="card-base p-4 text-center border-l-4 border-amber-400">
              <div className="text-2xl font-black text-amber-500">{pendingCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">بانتظار التسليم</div>
            </div>
            <div className="card-base p-4 text-center border-l-4 border-green-400">
              <div className="text-2xl font-black text-green-500">{doneCount}</div>
              <div className="text-xs text-gray-500 mt-0.5">مكتملة</div>
            </div>
          </div>

          {/* Charts & Badges Section */}
          {sessions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Commitment Chart */}
              <div className="card-base p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  نقاط الواجبات الأخيرة
                </h3>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="النقاط المحصولة" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Badges Shelf */}
              <div className="card-base p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-primary-500" />
                  أوسمتك المستحقة
                </h3>
                {user?.badges && user.badges.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {user.badges.map((badge, idx) => {
                      const isChampion = badge.icon === 'homework-champion';
                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-50/30 border border-amber-100 rounded-2xl text-center shadow-sm"
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-sm ${
                            isChampion ? 'bg-amber-100 text-amber-600' : 'bg-yellow-100 text-yellow-600'
                          }`}>
                            {isChampion ? (
                              <Award className="w-6 h-6" />
                            ) : (
                              <Star className="w-6 h-6 fill-yellow-400 text-yellow-500" />
                            )}
                          </div>
                          <span className="font-bold text-gray-800 text-xs">{badge.title}</span>
                          <span className="text-[10px] text-gray-400 mt-1">
                            {formatDateAr(badge.awardedAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
                    <Award className="w-12 h-12 text-gray-200 mb-2" />
                    <p className="text-sm">لم تحصل على أوسمة بعد</p>
                    <p className="text-xs text-gray-400 mt-1">سلّم الواجبات في موعدها واحصل على تقييم 5 نجوم للفوز بالأوسمة!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {sessions.length === 0 ? (
            <div className="card-base p-14 text-center">
              <ClipboardList className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <h2 className="font-black text-gray-900 text-lg mb-2">لا توجد واجبات بعد</h2>
              <p className="text-gray-400 text-sm">سيُضيف المعلم الواجبات بعد كل جلسة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, i) => {
                const submitted = isSubmittedByMe(session);
                const mySub = getMySubmission(session);
                const overdue = isOverdue(session) && !submitted;

                return (
                  <motion.div key={session._id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`card-base overflow-hidden border-r-4 ${
                      submitted ? 'border-green-400' : overdue ? 'border-red-400' : 'border-amber-400'
                    }`}
                  >
                    {/* Header row */}
                    <button
                      onClick={() => setExpanded(expanded === session._id ? null : session._id)}
                      className="w-full flex items-center gap-4 p-5 text-right hover:bg-gray-50 transition-colors"
                    >
                      {/* Status icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        submitted ? 'bg-green-50' : overdue ? 'bg-red-50' : 'bg-amber-50'
                      }`}>
                        {submitted
                          ? <CheckCircle className="w-5 h-5 text-green-500" />
                          : overdue
                            ? <AlertCircle className="w-5 h-5 text-red-400" />
                            : <Clock className="w-5 h-5 text-amber-500" />
                        }
                      </div>

                      <div className="flex-1 text-right">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900 text-sm">{session.title}</p>
                          {submitted && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">مكتمل ✓</span>}
                          {overdue && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">منتهي الموعد</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {session.scheduledAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDateAr(session.scheduledAt)}
                            </span>
                          )}
                          {session.homeworkDeadline && (
                            <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
                              <Clock className="w-3 h-3" />
                              الموعد: {formatDateAr(session.homeworkDeadline)}
                            </span>
                          )}
                        </div>
                      </div>

                      {expanded === session._id
                        ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronLeft className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      }
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {expanded === session._id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                            {/* Homework text */}
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                              <p className="text-xs font-bold text-amber-600 mb-1 flex items-center gap-1">
                                <ClipboardList className="w-3.5 h-3.5" /> الواجب المطلوب
                              </p>
                              <p className="text-sm text-gray-800 leading-relaxed">{session.homework}</p>
                            </div>

                            {/* If already submitted */}
                            {submitted ? (
                              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 space-y-3">
                                <p className="text-xs font-bold text-green-600 mb-1 flex items-center gap-2">
                                  <CheckCircle className="w-3.5 h-3.5" /> تم التسليم بنجاح
                                </p>
                                
                                {mySub?.notes && (
                                  <p className="text-sm text-gray-700 mt-1">ملاحظتك: {mySub.notes}</p>
                                )}

                                {/* Submitted Audio */}
                                {mySub?.audioUrl && (
                                  <div className="p-2.5 bg-white rounded-xl border border-green-100">
                                    <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                      <Volume2 className="w-3.5 h-3.5 text-primary-500" /> تسجيلك الصوتي:
                                    </p>
                                    <audio src={mySub.audioUrl} controls className="w-full h-8" />
                                  </div>
                                )}

                                {/* Submitted Files */}
                                {mySub?.files && mySub.files.length > 0 && (
                                  <div className="p-2.5 bg-white rounded-xl border border-green-100">
                                    <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                      <FileText className="w-3.5 h-3.5 text-primary-500" /> الملفات المرفوعة:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {mySub.files.map((file, idx) => (
                                        <a
                                          key={idx}
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs bg-gray-50 text-primary-600 px-2.5 py-1 rounded-lg border border-gray-100 flex items-center gap-1 hover:bg-gray-100 transition-colors"
                                        >
                                          <Download className="w-3 h-3 text-gray-400" /> {file.name}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {mySub?.submittedAt && (
                                  <p className="text-[10px] text-gray-400">{formatDateAr(mySub.submittedAt)}</p>
                                )}

                                {/* Teacher Rating (Stars) */}
                                {mySub?.isChecked && (
                                  <div className="mt-2 p-2.5 bg-white rounded-xl border border-green-100 flex flex-col gap-2">
                                    <div className="flex items-center gap-1 text-xs">
                                      <span className="font-semibold text-gray-600">تقييم المعلم:</span>
                                      <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <Star
                                            key={star}
                                            className={`w-3.5 h-3.5 ${
                                              star <= (mySub.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-gray-400">({mySub.rating || 5}/5)</span>
                                    </div>
                                    
                                    {mySub?.teacherFeedback && (
                                      <div className="border-t border-gray-100 pt-2">
                                        <p className="text-xs text-primary-600 font-bold mb-0.5">تعليق المعلم:</p>
                                        <p className="text-sm text-gray-700">{mySub.teacherFeedback}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                {session.quranHomework && session.quranHomework.surahName && (
                                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 space-y-1">
                                    <p className="font-bold flex items-center gap-1">📖 تلاوة مطلوبة:</p>
                                    <p>سورة {session.quranHomework.surahName} (الآيات من {session.quranHomework.fromVerse} إلى {session.quranHomework.toVerse})</p>
                                    
                                    {loadingVerses[session._id] ? (
                                      <div className="flex justify-center py-2"><LoadingSpinner size="sm" /></div>
                                    ) : quranVerses[session._id] ? (
                                      <div className="bg-white/80 rounded-lg p-3 text-center text-sm font-medium leading-loose text-gray-800 font-arabic border border-emerald-50">
                                        {quranVerses[session._id].map((a, aIdx) => (
                                          <span key={aIdx} className="inline-block">
                                            {a.text} <span className="text-emerald-600 font-bold font-sans text-xs mx-1">﴿{a.numberInSurah}﴾</span>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => fetchQuranVerses(session._id, session.quranHomework.surahNumber, session.quranHomework.fromVerse, session.quranHomework.toVerse)}
                                        className="text-[10px] text-emerald-600 hover:text-emerald-700 underline font-semibold mt-1"
                                      >
                                        عرض نص الآيات المحددة
                                      </button>
                                    )}
                                  </div>
                                )}

                                <div>
                                  <label className="text-xs font-semibold text-gray-700 mb-1 block">ملاحظات للطالب/المعلم (اختياري)</label>
                                  <textarea
                                    value={notes[session._id] || ''}
                                    onChange={e => setNotes(p => ({ ...p, [session._id]: e.target.value }))}
                                    className="input-base resize-none h-16 text-xs"
                                    placeholder="اكتب ملاحظة للمعلم هنا..."
                                  />
                                </div>

                                <div className="border border-gray-200/60 rounded-xl p-3 bg-white">
                                  <span className="text-xs font-semibold text-gray-600 block mb-2">التسجيل الصوتي (للواجبات الصوتية/التلاوة)</span>
                                  {isRecording ? (
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                                        <span className="text-xs text-red-500 font-bold">
                                          جاري التسجيل... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={stopRecording}
                                        className="btn-danger py-1 px-3 text-xs"
                                      >
                                        إيقاف وحفظ
                                      </button>
                                    </div>
                                  ) : audioUrl ? (
                                    <div className="flex flex-col gap-2">
                                      <audio src={audioUrl} controls className="w-full h-8" />
                                      <button
                                        type="button"
                                        onClick={deleteRecording}
                                        className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1 self-start"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> حذف وإعادة التسجيل
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={startRecording}
                                      className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-dashed border-primary-300 rounded-lg text-primary-600 hover:bg-primary-50 text-xs font-bold transition-colors"
                                    >
                                      <Mic className="w-4 h-4" />
                                      ابدأ تسجيل تلاوتك/إجابتك بالصوت
                                    </button>
                                  )}
                                </div>

                                <div className="border border-gray-200/60 rounded-xl p-3 bg-white">
                                  <span className="text-xs font-semibold text-gray-600 block mb-2">الملفات المرفقة (صور أو ملفات PDF)</span>
                                  <input
                                    type="file"
                                    multiple
                                    accept=".pdf,image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id={`file-upload-${session._id}`}
                                  />
                                  <label
                                    htmlFor={`file-upload-${session._id}`}
                                    className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-xs font-bold cursor-pointer transition-colors"
                                  >
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    اختر الملفات من جهازك (بحد أقصى 5 ملفات)
                                  </label>
                                  
                                  {selectedFiles.length > 0 && (
                                    <div className="mt-3 space-y-1.5">
                                      {selectedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100 text-xs">
                                          <span className="truncate max-w-[200px] text-gray-700 font-medium">{file.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => removeFile(idx)}
                                            className="text-red-500 hover:text-red-600"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleSubmit(session._id)}
                                  disabled={submitting === session._id}
                                  className="w-full btn-primary disabled:opacity-50 py-2.5"
                                >
                                  {submitting === session._id
                                    ? <LoadingSpinner size="sm" color="white" />
                                    : <><Send className="w-4 h-4" /> تسليم الواجب النهائي</>
                                  }
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
