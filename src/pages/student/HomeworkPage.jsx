import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle, Clock, Send, ChevronDown, ChevronLeft, Calendar, AlertCircle, Mic, Trash2, Volume2, FileText, Download, RotateCcw } from 'lucide-react';
import Navbar from '../../components/shared/Navbar';
import Sidebar from '../../components/shared/Sidebar';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { formatDateAr } from '../../utils/helpers';
import toast from 'react-hot-toast';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';
import '../../components/halaqa/halaqa.css';
import { HQ, HqStars } from '../../components/halaqa/primitives';

/* الواجبات — a clear list: what is due, when, its state, what now.
   Same endpoints, submission, recording, and grading logic;
   only the hierarchy changed. List-first, rows not cards. */

export default function HomeworkPage() {
  const { user, checkAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const sessionsPagination = usePagination(sessions, 5);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [notes, setNotes] = useState({});

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

  const loadHomework = () => {
    const groupId = user?.group?._id || user?.group;
    if (!groupId) { setIsLoading(false); return; }
    setIsLoading(true);
    setLoadFailed(false);
    api.get(`/live/group/${groupId}/homework`)
      .then(r => setSessions(r.data.sessions || []))
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadHomework(); }, [user]);

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
          ? { ...s, homeworkSubmissions: [...(s.homeworkSubmissions || []), newSubmission] }
          : s
      ));
      setAudioBlob(null);
      setAudioUrl(null);
      setSelectedFiles([]);
      toast.success('تم تسليم الواجب بنجاح');
      await checkAuth();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'خطأ في التسليم');
    } finally { setSubmitting(null); }
  };

  const isOverdue = (session) => {
    if (!session.homeworkDeadline) return false;
    return new Date(session.homeworkDeadline) < new Date();
  };

  const statusOf = (session) => {
    if (isSubmittedByMe(session)) return 'done';
    if (isOverdue(session)) return 'overdue';
    return 'pending';
  };
  const STATUS_LABEL = { done: 'مكتمل', overdue: 'متأخر', pending: 'مطلوب' };
  const STATUS_COLOR = { done: HQ.MENTOR, overdue: '#C2410C', pending: '#B45309' };

  const pendingCount = sessions.filter(s => !isSubmittedByMe(s)).length;
  const doneCount = sessions.filter(s => isSubmittedByMe(s)).length;

  const sheet = { background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 'clamp(16px, 3vw, 28px)' };

  return (
    <div className="halaqa" style={{ minHeight: '100vh', background: HQ.PAPER }}>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:mr-64" style={{ paddingTop: 64, paddingBottom: 88 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: HQ.INK }}>واجباتي</h1>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: HQ.MUTED }}>
            {sessions.length ? `${sessions.length} واجبًا · ${pendingCount} معلق · ${doneCount} مكتمل` : 'واجبات مجموعتك'}
          </p>

          {isLoading ? (
            <div aria-label="جارٍ تحميل الواجبات">
              <div className="hq-skeleton" style={{ height: 60, width: '100%', marginBottom: 10 }} />
              <div className="hq-skeleton" style={{ height: 60, width: '100%', marginBottom: 10 }} />
              <div className="hq-skeleton" style={{ height: 60, width: '100%' }} />
            </div>
          ) : loadFailed ? (
            <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 48, textAlign: 'center' }} role="alert">
              <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: HQ.INK }}>تعذّر تحميل الواجبات</h2>
              <p style={{ color: HQ.MUTED, fontSize: 14, margin: '0 0 20px' }}>تحقق من الاتصال ثم حاول مرة أخرى.</p>
              <button type="button" onClick={loadHomework} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 24px', fontSize: 15 }}>
                <RotateCcw size={17} /> إعادة المحاولة
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 48, textAlign: 'center' }}>
              <ClipboardList size={44} color={HQ.LINE} style={{ margin: '0 auto 12px' }} />
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: HQ.INK }}>لا واجبات بعد</h2>
              <p style={{ color: HQ.MUTED, fontSize: 14, margin: 0 }}>سيضيف المعلم الواجبات بعد كل حصة — ستجدها هنا.</p>
            </div>
          ) : (
            <>
              {/* Earned badges — quiet row, existing data only */}
              {user?.badges?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }} aria-label="أوسمتك">
                  {user.badges.map((badge, idx) => (
                    <span key={idx} title={badge.awardedAt ? formatDateAr(badge.awardedAt) : ''}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F8EDD3', color: HQ.INK, borderRadius: 9999, padding: '6px 14px', fontSize: 13, fontWeight: 700 }}>
                      {badge.title}
                    </span>
                  ))}
                </div>
              )}

              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {sessionsPagination.paginatedItems.map((session) => {
                  const st = statusOf(session);
                  const mySub = getMySubmission(session);
                  const open = expanded === session._id;
                  return (
                    <li key={session._id} style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, marginBottom: 12, overflow: 'hidden' }}>
                      {/* Row: name · date · status · action */}
                      <button type="button" aria-expanded={open}
                        onClick={() => setExpanded(open ? null : session._id)}
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 14, minHeight: 68, textAlign: 'right' }}>
                        <span aria-hidden style={{ width: 12, height: 12, borderRadius: 9999, background: STATUS_COLOR[st], flex: 'none' }} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontWeight: 800, fontSize: 16, color: HQ.INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {session.title}
                          </span>
                          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 13, color: HQ.MUTED, marginTop: 2 }}>
                            {session.homeworkDeadline && <span>الموعد: {formatDateAr(session.homeworkDeadline)}</span>}
                            {session.scheduledAt && <span>{formatDateAr(session.scheduledAt)}</span>}
                          </span>
                        </span>
                        <span style={{ flex: 'none', fontSize: 13, fontWeight: 800, color: STATUS_COLOR[st] }}>{STATUS_LABEL[st]}</span>
                        {open ? <ChevronDown size={18} color={HQ.MUTED} style={{ flex: 'none' }} /> : <ChevronLeft size={18} color={HQ.MUTED} style={{ flex: 'none' }} />}
                      </button>

                      {open && (
                        <div style={{ borderTop: `1px solid ${HQ.LINE}`, padding: 16 }}>
                          {/* Required homework text */}
                          {session.homework && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: HQ.MUTED }}>المطلوب</p>
                              <p style={{ margin: 0, fontSize: 15, color: HQ.INK, lineHeight: 1.8 }}>{session.homework}</p>
                            </div>
                          )}

                          {st === 'done' && mySub ? (
                            <div>
                              <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: HQ.MENTOR }}>
                                <CheckCircle size={16} /> تم التسليم{mySub.submittedAt ? ` · ${formatDateAr(mySub.submittedAt)}` : ''}
                              </p>
                              {mySub.notes && <p style={{ fontSize: 14, color: HQ.INK, margin: '0 0 8px' }}>ملاحظتك: {mySub.notes}</p>}
                              {mySub.audioUrl && (
                                <div style={{ marginBottom: 8 }}>
                                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: HQ.MUTED }}>
                                    <Volume2 size={14} /> تسجيلك الصوتي
                                  </p>
                                  <audio src={mySub.audioUrl} controls style={{ width: '100%', height: 36 }} />
                                </div>
                              )}
                              {mySub.files?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                                  {mySub.files.map((file, idx) => (
                                    <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: HQ.MENTOR, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 10, padding: '8px 12px', textDecoration: 'none', minHeight: 44 }}>
                                      <Download size={14} /> {file.name}
                                    </a>
                                  ))}
                                </div>
                              )}
                              {/* Teacher evaluation in place — never a dashboard */}
                              {mySub.isChecked && (
                                <div style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: 12 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: HQ.MUTED }}>تقييم المعلم</span>
                                    <HqStars value={mySub.rating || 5} />
                                  </div>
                                  {mySub.teacherFeedback && (
                                    <p style={{ margin: 0, fontSize: 14, color: HQ.INK, lineHeight: 1.8 }}>{mySub.teacherFeedback}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              {/* Quran recitation required */}
                              {session.quranHomework?.surahName && (
                                <div style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: HQ.MENTOR }}>تلاوة مطلوبة</p>
                                  <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: HQ.INK }}>
                                    سورة {session.quranHomework.surahName} — الآيات {session.quranHomework.fromVerse} إلى {session.quranHomework.toVerse}
                                  </p>
                                  {loadingVerses[session._id] ? (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: 8 }}><LoadingSpinner size="sm" /></div>
                                  ) : quranVerses[session._id] ? (
                                    <div className="hq-quran" style={{ fontSize: 18, textAlign: 'center', background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 10, padding: 12 }}>
                                      {quranVerses[session._id].map((a, aIdx) => (
                                        <span key={aIdx}>{a.text} <span style={{ color: HQ.MENTOR, fontWeight: 700, fontSize: 14 }}>﴿{a.numberInSurah}﴾</span> </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <button type="button"
                                      onClick={() => fetchQuranVerses(session._id, session.quranHomework.surahNumber, session.quranHomework.fromVerse, session.quranHomework.toVerse)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: HQ.MENTOR, textDecoration: 'underline', padding: 0, minHeight: 44 }}>
                                      عرض نص الآيات
                                    </button>
                                  )}
                                </div>
                              )}

                              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: HQ.MUTED, marginBottom: 6 }}>
                                ملاحظة للمعلم (اختياري)
                              </label>
                              <textarea value={notes[session._id] || ''}
                                onChange={e => setNotes(p => ({ ...p, [session._id]: e.target.value }))}
                                placeholder="اكتب ملاحظة للمعلم هنا..."
                                style={{ width: '100%', minHeight: 64, resize: 'vertical', background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: 10, fontSize: 14, color: HQ.INK, fontFamily: 'inherit', marginBottom: 12 }} />

                              {/* Voice recording */}
                              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: HQ.MUTED }}>التسجيل الصوتي</p>
                              {isRecording ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: 10, marginBottom: 12 }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#C2410C' }}>
                                    <span className="hq-live-dot" aria-hidden /> جارٍ التسجيل {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                  </span>
                                  <button type="button" onClick={stopRecording} className="hq-action" style={{ background: '#C2410C', color: '#fff', padding: '0 16px', fontSize: 13 }}>
                                    إيقاف وحفظ
                                  </button>
                                </div>
                              ) : audioUrl ? (
                                <div style={{ marginBottom: 12 }}>
                                  <audio src={audioUrl} controls style={{ width: '100%', height: 36, marginBottom: 8 }} />
                                  <button type="button" onClick={deleteRecording}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#C2410C', display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44 }}>
                                    <Trash2 size={15} /> حذف وإعادة التسجيل
                                  </button>
                                </div>
                              ) : (
                                <button type="button" onClick={startRecording} className="hq-action"
                                  style={{ width: '100%', background: HQ.SURFACE, border: `1.5px dashed ${HQ.MENTOR}`, color: HQ.MENTOR, fontSize: 14, marginBottom: 12 }}>
                                  <Mic size={17} /> سجّل تلاوتك بالصوت
                                </button>
                              )}

                              {/* Files */}
                              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: HQ.MUTED }}>الملفات (بحد أقصى 5)</p>
                              <input type="file" multiple accept=".pdf,image/*" onChange={handleFileChange} id={`file-upload-${session._id}`} style={{ display: 'none' }} />
                              <label htmlFor={`file-upload-${session._id}`} className="hq-action"
                                style={{ width: '100%', background: HQ.SURFACE, border: `1.5px dashed ${HQ.LINE}`, color: HQ.INK, fontSize: 14, marginBottom: 8, cursor: 'pointer' }}>
                                <FileText size={17} color={HQ.MUTED} /> اختر الملفات من جهازك
                              </label>
                              {selectedFiles.length > 0 && (
                                <ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0 }}>
                                  {selectedFiles.map((file, idx) => (
                                    <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 10, padding: '8px 12px', fontSize: 13, marginBottom: 6 }}>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: HQ.INK }}>{file.name}</span>
                                      <button type="button" onClick={() => removeFile(idx)} aria-label={`إزالة ${file.name}`}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C2410C', minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Trash2 size={16} />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              <button type="button" onClick={() => handleSubmit(session._id)} disabled={submitting === session._id} className="hq-action"
                                style={{ width: '100%', background: HQ.MENTOR, color: '#fff', fontSize: 15, opacity: submitting === session._id ? 0.6 : 1 }}>
                                {submitting === session._id ? <LoadingSpinner size="sm" color="white" /> : <><Send size={16} /> تسليم الواجب</>}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>

              <Pagination
                currentPage={sessionsPagination.currentPage}
                totalPages={sessionsPagination.totalPages}
                totalItems={sessionsPagination.totalItems}
                pageSize={sessionsPagination.pageSize}
                onPageChange={sessionsPagination.setCurrentPage}
                onPageSizeChange={sessionsPagination.setPageSize}
                showPageSize={true}
                pageSizeOptions={[3, 5, 10, 20]}
                itemName="واجب"
                className="mt-6"
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
