import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, PhoneOff, UserCheck,
  Radio, Signal, Wifi, BookOpen, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import JitsiMeeting from '../../components/shared/JitsiMeeting';
import LiveAttendanceDrawer from '../../components/shared/LiveAttendanceDrawer';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useLiveStore from '../../store/liveStore';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import { formatCountdown } from '../../utils/helpers';

const LEVEL_LABELS = {
  foundation: 'التأسيس',
  memorization: 'التحفيظ',
  teacher_prep: 'إعداد معلم',
  senior: 'كبار السن',
};

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
      toast.success('🔴 انطلق البث المباشر!');
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
    toast('انتهى البث المباشر', { icon: '📴' });
  };

  // PRE-BROADCAST SETUP
  if (!isBroadcasting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
        <Navbar />
        <div className="pt-16 min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-xl"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-2xl shadow-red-500/30">
                <Radio className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white mb-1">بث مباشر — لوحة الأدمن (Jitsi Meet)</h1>
              <p className="text-gray-400 text-sm">ابدأ بثاً مباشراً لأي مجموعة على المنصة</p>
              {lessonId && (
                <div className="mt-3 inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-full text-sm font-semibold">
                  <BookOpen className="w-4 h-4" />
                  بث مرتبط بدرس: {location.state?.lessonTitle}
                </div>
              )}
            </div>

            {/* Form */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" /> المجموعة المستهدفة *
                </label>
                <select
                  value={selectedGroup}
                  onChange={e => setSelectedGroup(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 outline-none focus:border-red-400 transition-colors"
                >
                  <option value="" className="bg-gray-800">اختر المجموعة</option>
                  {groups.map(g => (
                    <option key={g._id} value={g._id} className="bg-gray-800">
                      {g.name} — {LEVEL_LABELS[g.level] || g.level} ({g.students?.length || 0} طالب)
                    </option>
                  ))}
                </select>
                {selectedGroupData && (
                  <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
                    <Wifi className="w-3 h-3" />
                    {selectedGroupData.students?.length || 0} طالب سيتلقى إشعار البث
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">
                  عنوان الجلسة *
                </label>
                <input
                  value={sessionTitle}
                  onChange={e => setSessionTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStartBroadcast()}
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 outline-none focus:border-red-400 transition-colors placeholder:text-gray-500"
                  placeholder="مثال: محاضرة أحكام التجويد"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">نوع الجلسة</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'lesson', label: 'درس' },
                    { id: 'review', label: 'مراجعة' },
                    { id: 'recitation', label: 'تلاوة' },
                    { id: 'exam', label: 'امتحان' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSessionType(t.id)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        sessionType === t.id
                          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartBroadcast}
                disabled={isStarting || !selectedGroup || !sessionTitle.trim()}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-3 hover:from-red-600 hover:to-rose-700 transition-all shadow-xl shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Signal className="w-5 h-5" />
                }
                {isStarting ? 'جارٍ الإعداد...' : 'ابدأ البث الآن 🔴'}
              </button>
            </div>

            {lessonId && (
              <button
                onClick={() => navigate(`/admin/groups/${location.state?.groupId || selectedGroup}/curriculum`)}
                className="mt-4 w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white text-sm transition-colors py-2"
              >
                <ArrowRight className="w-4 h-4" />
                العودة إلى منهج المجموعة
              </button>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // LIVE BROADCAST VIEW WITH JITSI MEET
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col h-screen overflow-hidden select-none">
      {/* Top bar */}
      <div className="bg-gray-800/90 backdrop-blur border-b border-gray-700 px-4 sm:px-6 py-3 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex-shrink-0">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            بث مباشر (أدمن)
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-xs sm:text-sm truncate">{sessionTitle}</h1>
            <p className="text-gray-400 text-[10px] sm:text-xs truncate">{selectedGroupData?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span className="text-gray-300 text-xs sm:text-sm font-mono hidden sm:inline">{formatCountdown(duration)}</span>

          {/* Attendance Drawer Button */}
          <button
            onClick={() => setShowAttendanceDrawer(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <UserCheck className="w-4 h-4" />
            <span>كشف الحضور</span>
          </button>

          <button
            onClick={handleEndBroadcast}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-500/20"
          >
            <PhoneOff className="w-4 h-4" />
            <span>إنهاء البث</span>
          </button>
        </div>
      </div>

      {/* Jitsi Meeting Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <JitsiMeeting
          roomName={`QuranPlatform_${session?._id || 'Session'}`}
          displayName={`مدير: ${user?.firstName || ''} ${user?.lastName || ''}`}
          userEmail={user?.email || ''}
          isTeacher={true}
          onLeave={handleEndBroadcast}
        />
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

