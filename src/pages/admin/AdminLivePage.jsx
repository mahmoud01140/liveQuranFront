import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import {
  Users, PhoneOff, UserCheck,
  Radio, Signal, Wifi, BookOpen, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import JitsiMeeting from '../../components/shared/JitsiMeeting';
import LiveAttendanceDrawer from '../../components/shared/LiveAttendanceDrawer';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useLiveStore from '../../store/liveStore';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import { formatCountdown } from '../../utils/helpers';
import { getLevelLabel } from '../../utils/helpers';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

/* Admin live — same setup and broadcast flow as before, now on warm
   paper. The Jitsi area stays the only dark surface (the stage). */

export default function AdminLivePage() {
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
  const [duration, setDuration] = useState(0);
  const [session, setSession] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [lessonId, setLessonId] = useState(null);
  const [showAttendanceDrawer, setShowAttendanceDrawer] = useState(false);

  const socket = getSocket();
  const selectedGroupData = groups.find(g => g._id === selectedGroup);

  useEffect(() => { fetchAllGroups(); }, []);

  // Pre-select group & lesson if navigated from curriculum page
  useEffect(() => {
    if (location.state?.groupId) {
      setSelectedGroup(location.state.groupId);
      if (location.state.lessonTitle) {
        setSessionTitle(location.state.lessonTitle);
        setLessonId(location.state.lessonId || null);
      } else {
        setSessionTitle(`حصة مباشرة — ${location.state.groupName || ''}`);
      }
    }
  }, [location.state]);

  // Duration counter + heartbeat
  useEffect(() => {
    if (isBroadcasting) {
      const timer = setInterval(() => setDuration(d => d + 1), 1000);
      const heartbeat = setInterval(() => {
        if (session?._id) socket?.emit('session-heartbeat', { sessionId: session._id });
      }, 30000);
      return () => { clearInterval(timer); clearInterval(heartbeat); };
    }
  }, [isBroadcasting, session, socket]);

  // ─── Actions ──────────────────────────────────────────────────
  const handleStartBroadcast = async () => {
    if (!selectedGroup) { toast.error('اختر مجموعة أولاً'); return; }
    if (!sessionTitle.trim()) { toast.error('أدخل عنوان الجلسة'); return; }
    setIsStarting(true);
    try {
      // 1. Create session in DB
      const res = await api.post('/live', {
        groupId: selectedGroup,
        title: sessionTitle,
        sessionType,
        scheduledAt: new Date(),
      });
      const newSession = res.data.session;
      setSession(newSession);

      // 2. Mark session as live in DB
      await api.put(`/live/${newSession._id}/start`, { teacherSocketId: socket?.id || '' });

      // 3. Join room
      socket?.emit('join-group-room', { groupId: selectedGroup });

      setIsBroadcasting(true);
      toast.success('انطلق البث المباشر!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'خطأ في بدء البث');
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndBroadcast = async () => {
    if (!window.confirm('هل تريد إنهاء البث المباشر؟')) return;
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

  const field = {
    width: '100%', minHeight: 48, background: HQ.SURFACE, color: HQ.INK,
    border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 16px',
    fontSize: 16, fontFamily: 'inherit',
  };
  const lbl = { fontSize: 14, fontWeight: 700, color: HQ.INK, marginBottom: 8, display: 'block' };

  // PRE-BROADCAST SETUP
  if (!isBroadcasting) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="halaqa" style={{ minHeight: '100vh', background: HQ.PAPER, color: HQ.INK }} dir="rtl">
          <Navbar />
          <div style={{ paddingTop: 64, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 'clamp(20px,4vw,32px)', width: '100%', maxWidth: 600 }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <span aria-hidden style={{
                  width: 64, height: 64, background: HQ.MENTOR, borderRadius: 18, margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Radio size={30} color="#fff" />
                </span>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: HQ.INK, margin: '0 0 4px' }}>بث مباشر — لوحة الإدارة</h1>
                <p style={{ color: HQ.MUTED, fontSize: 14, margin: 0 }}>ابدأ بثاً مباشراً لأي مجموعة على المنصة</p>
                {lessonId && (
                  <span style={{
                    marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#E2EFE7', color: '#0F5940', padding: '6px 14px', borderRadius: 9999,
                    fontSize: '0.8125rem', fontWeight: 700,
                  }}>
                    <BookOpen size={14} aria-hidden />
                    بث مرتبط بدرس: {location.state?.lessonTitle}
                  </span>
                )}
              </div>

              {/* Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label htmlFor="al-group" style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={15} aria-hidden /> المجموعة المستهدفة *
                  </label>
                  <select
                    id="al-group"
                    value={selectedGroup}
                    onChange={e => setSelectedGroup(e.target.value)}
                    className="focus:border-[#177B58] focus:outline-none"
                    style={field}
                  >
                    <option value="">اختر المجموعة</option>
                    {groups.map(g => (
                      <option key={g._id} value={g._id}>
                        {g.name} — {getLevelLabel(g.level)} ({g.students?.length || 0} طالب)
                      </option>
                    ))}
                  </select>
                  {selectedGroupData && (
                    <p className="mt-2 text-xs flex items-center gap-1.5" style={{ color: HQ.MENTOR, fontWeight: 700 }}>
                      <Wifi size={13} aria-hidden />
                      {selectedGroupData.students?.length || 0} طالب سيتلقى إشعار البث
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="al-title" style={lbl}>عنوان الجلسة *</label>
                  <input
                    id="al-title"
                    value={sessionTitle}
                    onChange={e => setSessionTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleStartBroadcast()}
                    className="focus:border-[#177B58] focus:outline-none"
                    style={field}
                    placeholder="مثال: محاضرة أحكام التجويد"
                  />
                </div>

                <div>
                  <span style={lbl} id="al-type-label">نوع الجلسة</span>
                  <div className="grid grid-cols-4 gap-2" role="group" aria-labelledby="al-type-label">
                    {[
                      { id: 'lesson', label: 'درس' },
                      { id: 'review', label: 'مراجعة' },
                      { id: 'recitation', label: 'تلاوة' },
                      { id: 'exam', label: 'امتحان' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSessionType(t.id)}
                        aria-pressed={sessionType === t.id}
                        className="text-sm font-bold"
                        style={{
                          minHeight: 48, borderRadius: 12, cursor: 'pointer',
                          border: `2px solid ${sessionType === t.id ? HQ.MENTOR : HQ.LINE}`,
                          background: sessionType === t.id ? HQ.MENTOR : HQ.SURFACE,
                          color: sessionType === t.id ? '#fff' : HQ.MUTED,
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStartBroadcast}
                  disabled={isStarting || !selectedGroup || !sessionTitle.trim()}
                  className="hq-action w-full"
                  style={{ background: HQ.MENTOR, color: '#fff', fontSize: 16, opacity: (isStarting || !selectedGroup || !sessionTitle.trim()) ? 0.55 : 1 }}
                >
                  {isStarting
                    ? <LoadingSpinner size="sm" color="white" />
                    : <Signal size={19} aria-hidden />
                  }
                  {isStarting ? 'جارٍ الإعداد...' : 'ابدأ البث الآن'}
                </button>
              </div>

              {lessonId && (
                <button
                  type="button"
                  onClick={() => navigate(`/admin/groups/${location.state?.groupId || selectedGroup}/curriculum`)}
                  className="mt-4 w-full flex items-center justify-center gap-2 text-sm font-bold"
                  style={{ color: HQ.MUTED, background: 'none', border: 'none', cursor: 'pointer', minHeight: 44 }}
                >
                  <ArrowRight size={15} aria-hidden />
                  العودة إلى منهج المجموعة
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </MotionConfig>
    );
  }

  // LIVE BROADCAST VIEW WITH JITSI MEET
  return (
    <div className="halaqa" dir="rtl" style={{ height: '100vh', maxHeight: '100dvh', background: HQ.PAPER, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar — paper chrome, the stage below is the only dark area */}
      <div style={{ background: HQ.SURFACE, borderBottom: `1px solid ${HQ.LINE}`, padding: '0 16px', height: 56, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#C2410C', color: '#fff', padding: '6px 12px', borderRadius: 12, fontSize: 13, fontWeight: 800, flex: 'none' }}>
            <span className="hq-live-dot" aria-hidden />
            بث مباشر (إدارة)
          </span>
          <h1 style={{ color: HQ.INK, fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className="hidden sm:block">{sessionTitle}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          <span style={{ color: HQ.MUTED, fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }} className="hidden sm:inline">{formatCountdown(duration)}</span>

          <button
            type="button"
            onClick={() => setShowAttendanceDrawer(true)}
            className="hq-action"
            style={{ background: HQ.MENTOR, color: '#fff', padding: '0 14px', fontSize: 13 }}
            title="كشف الحضور والغياب"
          >
            <UserCheck size={16} aria-hidden />
            <span className="hidden sm:inline">كشف الحضور</span>
          </button>

          <button
            type="button"
            onClick={handleEndBroadcast}
            className="hq-action"
            style={{ background: '#C2410C', color: '#fff', padding: '0 14px', fontSize: 13 }}
          >
            <PhoneOff size={16} aria-hidden />
            <span className="hidden sm:inline">إنهاء البث</span>
          </button>
        </div>
      </div>

      {/* Jitsi Meeting Container — the dark stage */}
      <div style={{ flex: 1, minHeight: 0, padding: 16, paddingTop: 8 }}>
        <div className="halaqa-stage" style={{ height: '100%', borderRadius: 18, overflow: 'hidden', position: 'relative' }}>
          <JitsiMeeting
            roomName={session?.liveRoomName || `QuranPlatform_${session?._id || 'Session'}`}
            displayName={`مدير: ${user?.firstName || ''} ${user?.lastName || ''}`}
            userEmail={user?.email || ''}
            isTeacher={true}
            onLeave={handleEndBroadcast}
          />
        </div>
      </div>

      {/* Live Attendance Drawer */}
      <LiveAttendanceDrawer
        isOpen={showAttendanceDrawer}
        onClose={() => setShowAttendanceDrawer(false)}
        sessionId={session?._id}
        sessionTitle={sessionTitle}
        groupName={selectedGroupData?.name}
        socket={socket}
      />
    </div>
  );
}
