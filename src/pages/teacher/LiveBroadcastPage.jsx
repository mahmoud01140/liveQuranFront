import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radio, ClipboardList, PhoneOff, UserCheck, Mic, BookOpen,
  CheckCircle, AlertCircle, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import JitsiMeeting from '../../components/shared/JitsiMeeting';
import LiveAttendanceDrawer from '../../components/shared/LiveAttendanceDrawer';
import LiveRecitationDrawer from '../../components/shared/LiveRecitationDrawer';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useLiveStore from '../../store/liveStore';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import { formatCountdown } from '../../utils/helpers';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

export default function LiveBroadcastPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { groups, fetchAllGroups } = useGroupStore();
  const {
    isBroadcasting,
    setIsBroadcasting,
    resetLive,
  } = useLiveStore();

  const [selectedGroup, setSelectedGroup] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionType, setSessionType] = useState('lesson');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedLessonData, setSelectedLessonData] = useState(null);
  const [homeworkText, setHomeworkText] = useState('');
  const [homeworkDeadline, setHomeworkDeadline] = useState('');
  const [showAttendanceDrawer, setShowAttendanceDrawer] = useState(false);
  const [showRecitationDrawer, setShowRecitationDrawer] = useState(false);
  const [duration, setDuration] = useState(0);
  const [session, setSession] = useState(null);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const jitsiApiRef = useRef(null);

  const socket = getSocket();

  useEffect(() => {
    fetchAllGroups();
  }, []);

  // Guard: must come from curriculum page with groupId
  useEffect(() => {
    if (!location.state?.groupId) {
      toast.error('يجب بدء البث من صفحة منهج المجموعة');
      navigate('/admin/groups', { replace: true });
      return;
    }

    const { groupId, groupName, lessonTitle, lessonId } = location.state;
    setSelectedGroup(groupId);

    // Load lesson data from the study plan
    const loadLessonData = async () => {
      setLoadingLesson(true);
      try {
        const res = await api.get(`/study-plans/group/${groupId}/full`);
        const groupLessons = res.data.plan?.customLessons || [];

        if (lessonId) {
          const matched = groupLessons.find(l => l._id === lessonId);
          if (matched) {
            setSelectedLessonId(matched._id);
            setSelectedLessonData(matched);
            setSessionTitle(matched.title);
            if (matched.type && ['lesson', 'review', 'recitation', 'exam'].includes(matched.type)) {
              setSessionType(matched.type);
            }
          } else {
            setSessionTitle(lessonTitle || `حصة مباشرة — ${groupName}`);
          }
        } else if (lessonTitle) {
          const matched = groupLessons.find(l => l.title === lessonTitle);
          if (matched) {
            setSelectedLessonId(matched._id);
            setSelectedLessonData(matched);
            setSessionTitle(matched.title);
          } else {
            setSessionTitle(lessonTitle);
          }
        } else {
          setSessionTitle(`حصة مباشرة — ${groupName}`);
        }
      } catch {
        setSessionTitle(lessonTitle || `حصة مباشرة — ${groupName || ''}`);
      } finally {
        setLoadingLesson(false);
      }
    };
    loadLessonData();
  }, [location.state, navigate]);

  const currentGroup = groups.find(g => g._id === selectedGroup);

  useEffect(() => {
    if (isBroadcasting) {
      const timer = setInterval(() => setDuration(d => d + 1), 1000);
      const heartbeat = setInterval(() => {
        if (session?._id) socket?.emit('session-heartbeat', { sessionId: session._id });
      }, 30000);
      return () => { clearInterval(timer); clearInterval(heartbeat); };
    }
  }, [isBroadcasting, session, socket]);

  const handleStartBroadcast = async () => {
    if (!selectedGroup) { toast.error('خطأ: لم يتم تحديد المجموعة'); return; }
    if (!sessionTitle.trim()) { toast.error('عنوان الجلسة مطلوب'); return; }

    try {
      // Create session in DB
      const res = await api.post('/live', {
        groupId: selectedGroup,
        title: sessionTitle,
        sessionType,
        lessonCovered: selectedLessonId || undefined,
        lessonTitle: sessionTitle,
        scheduledAt: new Date(),
        homework: homeworkText || undefined,
        homeworkDeadline: homeworkDeadline || undefined,
      });
      const newSession = res.data.session;
      setSession(newSession);

      // Start session & notify via socket
      await api.put(`/live/${newSession._id}/start`, { teacherSocketId: socket?.id || '' });
      socket?.emit('join-group-room', { groupId: selectedGroup });

      setIsBroadcasting(true);
      toast.success('انطلق البث المباشر!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'خطأ في بدء البث');
    }
  };

  const handleEndBroadcast = async () => {
    if (!window.confirm('هل تريد إنهاء البث؟')) return;
    if (socket && session?._id) {
      socket.emit('end-broadcast', { sessionId: session._id, groupId: selectedGroup });
    }
    if (session?._id) {
      await api.put(`/live/${session._id}/end`, {}).catch(() => {});
    }
    setIsBroadcasting(false);
    setSession(null);
    setDuration(0);
    resetLive();
    toast('انتهى البث المباشر');
  };

  // Pre-broadcast setup — lesson is pre-selected from curriculum page
  if (!isBroadcasting) {
    if (loadingLesson) {
      return (
        <div className="halaqa" style={{ minHeight: '100vh', background: HQ.PAPER }}>
          <Navbar />
          <div style={{ paddingTop: 64, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="hq-skeleton" style={{ width: 40, height: 40, borderRadius: 9999, margin: '0 auto 16px' }} />
              <p style={{ color: HQ.MUTED, fontSize: 14, fontWeight: 700 }}>جاري تحضير بيانات الدرس...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="halaqa" style={{ minHeight: '100vh', background: HQ.PAPER }}>
        <Navbar />
        <div style={{ paddingTop: 64, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
            style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 'clamp(20px,4vw,32px)', width: '100%', maxWidth: 560 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, background: HQ.MENTOR, borderRadius: 18, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Radio size={30} color="#fff" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: HQ.INK, margin: '0 0 4px' }}>بدء بث مباشر جديد</h2>
              <p style={{ color: HQ.MUTED, fontSize: 14, margin: 0 }}>تأكد من بيانات الجلسة ثم انطلق</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Group & Lesson Info (read-only, pre-selected from curriculum) */}
              <div style={{ padding: 16, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <BookOpen size={16} color={HQ.MENTOR} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: HQ.INK }}>بيانات الدرس والمجموعة</span>
                </div>

                <div style={{ background: HQ.SURFACE, borderRadius: 12, padding: 12, border: `1px solid ${HQ.LINE}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: HQ.MUTED, fontWeight: 500 }}>المجموعة:</span>
                    <span style={{ fontWeight: 800, color: HQ.INK }}>{currentGroup?.name || location.state?.groupName || '—'}</span>
                  </div>
                  {selectedLessonData && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                        <span style={{ color: HQ.MUTED, fontWeight: 500 }}>الدرس:</span>
                        <span style={{ fontWeight: 800, color: HQ.MENTOR }}>
                          {selectedLessonData.lessonNumber ? `الدرس ${selectedLessonData.lessonNumber}: ` : ''}{selectedLessonData.title}
                        </span>
                      </div>
                      {selectedLessonData.duration && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
                          <span style={{ color: HQ.MUTED, fontWeight: 500 }}>المدة المقررة:</span>
                          <span style={{ fontWeight: 700, color: HQ.INK }}>{selectedLessonData.duration} دقيقة</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: HQ.MENTOR, background: '#E2EFE7', padding: '8px 12px', borderRadius: 12, fontWeight: 700, marginTop: 12 }}>
                  <CheckCircle size={15} />
                  تم ربط البث بالدرس من منهج المجموعة
                </div>

                <button
                  onClick={() => navigate(`/admin/groups/${selectedGroup}/curriculum`)}
                  style={{ width: '100%', fontSize: 13, color: HQ.MENTOR, background: 'none', border: 'none', borderRadius: 8, padding: '10px 0 0', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44 }}
                >
                  <ArrowRight size={14} />
                  الرجوع لصفحة المنهج واختيار درس آخر
                </button>
              </div>

              <div>
                <label style={{ fontSize: 14, fontWeight: 700, color: HQ.INK, marginBottom: 6, display: 'block' }}>عنوان الجلسة المباشرة *</label>
                <input
                  value={sessionTitle}
                  onChange={e => setSessionTitle(e.target.value)}
                  className="font-semibold focus:border-[#177B58] focus:outline-none"
                  style={{
                    width: '100%', minHeight: 48, background: HQ.SURFACE, color: HQ.INK,
                    border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 16px', fontSize: 16,
                  }}
                  placeholder="عنوان الجلسة..."
                />
                <p style={{ fontSize: 12, color: HQ.MUTED, marginTop: 4 }}>
                  سيظهر هذا الاسم للطلاب في الإشعار المباشر وأعلى شاشة الحصة.
                </p>
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 700, color: HQ.INK, marginBottom: 6, display: 'block' }}>نوع الجلسة</label>
                <select value={sessionType} onChange={e => setSessionType(e.target.value)}
                  className="focus:border-[#177B58] focus:outline-none"
                  style={{
                    width: '100%', minHeight: 48, background: HQ.SURFACE, color: HQ.INK,
                    border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 16px', fontSize: 16,
                  }}>
                  <option value="lesson">درس جديد</option>
                  <option value="review">مراجعة</option>
                  <option value="exam">امتحان</option>
                  <option value="practice">تطبيق</option>
                </select>
              </div>
              {/* Homework */}
              <div>
                <label style={{ fontSize: 14, fontWeight: 700, color: HQ.INK, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ClipboardList size={16} color="#B45309" /> الواجب (اختياري)
                </label>
                <textarea
                  value={homeworkText}
                  onChange={e => setHomeworkText(e.target.value)}
                  className="resize-none focus:border-[#177B58] focus:outline-none"
                  style={{
                    width: '100%', minHeight: 80, background: HQ.SURFACE, color: HQ.INK,
                    border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 16px', fontSize: 16,
                  }}
                  placeholder="اكتب الواجب المطلوب من الطلاب..."
                />
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 700, color: HQ.INK, marginBottom: 6, display: 'block' }}>موعد تسليم الواجب (اختياري)</label>
                <input type="date"
                  value={homeworkDeadline}
                  onChange={e => setHomeworkDeadline(e.target.value)}
                  className="focus:border-[#177B58] focus:outline-none"
                  style={{
                    width: '100%', minHeight: 48, background: HQ.SURFACE, color: HQ.INK,
                    border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 16px', fontSize: 16,
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <button onClick={handleStartBroadcast} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', fontSize: 16, width: '100%' }}>
                <Radio size={20} />
                انطلق — ابدأ البث الآن
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Live broadcast view with Jitsi Meet
  return (
    <div className="halaqa" dir="rtl" style={{ height: '100vh', maxHeight: '100dvh', background: HQ.PAPER, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar — paper chrome, the stage below is the only dark area */}
      <div style={{ background: HQ.SURFACE, borderBottom: `1px solid ${HQ.LINE}`, padding: '0 16px', height: 56, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#C2410C', color: '#fff', padding: '6px 12px', borderRadius: 12, fontSize: 13, fontWeight: 800, flex: 'none' }}>
            <span className="hq-live-dot" aria-hidden />
            بث مباشر
          </span>
          <h1 style={{ color: HQ.INK, fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="hidden sm:block">{sessionTitle}</h1>
          {selectedLessonData && (
            <span className="hidden md:inline-flex" style={{ alignItems: 'center', gap: 4, fontSize: 12, background: '#E2EFE7', color: HQ.MENTOR, padding: '4px 10px', borderRadius: 9999, fontWeight: 700 }}>
              <BookOpen size={12} />
              الدرس المرتبط بالبث
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          <span style={{ color: HQ.MUTED, fontSize: 13, fontWeight: 700 }} className="hidden sm:inline">{formatCountdown(duration)}</span>

          {/* Recitation Queue & Wird Drawer Button */}
          <button
            onClick={() => setShowRecitationDrawer(true)}
            className="hq-action"
            style={{ background: HQ.MENTOR, color: '#fff', padding: '0 14px', fontSize: 13 }}
            title="إدارة طابور التسميع والأوراد الفردية"
          >
            <Mic size={16} />
            <span className="hidden sm:inline">طابور التسميع والورد</span>
          </button>

          {/* Attendance Drawer Button */}
          <button
            onClick={() => setShowAttendanceDrawer(true)}
            className="hq-action"
            style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, color: HQ.INK, padding: '0 14px', fontSize: 13 }}
            title="كشف الحضور والغياب"
          >
            <UserCheck size={16} />
            <span className="hidden sm:inline">كشف الحضور</span>
          </button>


          <button
            onClick={handleEndBroadcast}
            className="hq-action"
            style={{ background: '#C2410C', color: '#fff', padding: '0 14px', fontSize: 13 }}
          >
            <PhoneOff size={16} />
            <span className="hidden sm:inline">إنهاء البث</span>
          </button>
        </div>
      </div>

      {/* Jitsi Meeting Container — the dark stage */}
      <div style={{ flex: 1, minHeight: 0, padding: 16, paddingTop: 8 }}>
        <div className="halaqa-stage" style={{ height: '100%', borderRadius: 18, overflow: 'hidden', position: 'relative' }}>
          <JitsiMeeting
            roomName={session?.liveRoomName || `QuranPlatform_${session?._id || 'Session'}`}
            displayName={`أ. ${user?.firstName || ''} ${user?.lastName || ''}`}
            userEmail={user?.email || ''}
            isTeacher={true}
            onLeave={handleEndBroadcast}
            onApiReady={(api) => { jitsiApiRef.current = api; }}
          />
        </div>
      </div>

      {/* Live Recitation & Individual Wird Drawer */}
      <LiveRecitationDrawer
        isOpen={showRecitationDrawer}
        onClose={() => setShowRecitationDrawer(false)}
        sessionId={session?._id}
        sessionTitle={sessionTitle}
        groupName={groups.find(g => g._id === selectedGroup)?.name}
        jitsiApi={jitsiApiRef.current}
      />

      {/* Live Attendance Drawer */}
      <LiveAttendanceDrawer
        isOpen={showAttendanceDrawer}
        onClose={() => setShowAttendanceDrawer(false)}
        sessionId={session?._id}
        sessionTitle={sessionTitle}
        groupName={groups.find(g => g._id === selectedGroup)?.name}
        socket={socket}
      />

    </div>
  );
}

