import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, ClipboardList, PhoneOff, UserCheck } from 'lucide-react';
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

export default function LiveBroadcastPage() {
  const { user } = useAuthStore();
  const { groups } = useGroupStore();
  const {
    isBroadcasting,
    setIsBroadcasting,
    resetLive,
  } = useLiveStore();

  const [selectedGroup, setSelectedGroup] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionType, setSessionType] = useState('lesson');
  const [homeworkText, setHomeworkText] = useState('');
  const [homeworkDeadline, setHomeworkDeadline] = useState('');
  const [savingHomework, setSavingHomework] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showAttendanceDrawer, setShowAttendanceDrawer] = useState(false);
  const [liveHomework, setLiveHomework] = useState('');
  const [liveHomeworkDeadline, setLiveHomeworkDeadline] = useState('');
  const [duration, setDuration] = useState(0);
  const [session, setSession] = useState(null);

  const socket = getSocket();
  const myGroups = groups.filter(g => g.teacher?._id === user?._id || g.teacher === user?._id);

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
    if (!selectedGroup) { toast.error('اختر مجموعة أولاً'); return; }
    if (!sessionTitle.trim()) { toast.error('أدخل عنوان الجلسة'); return; }

    try {
      // Create session in DB
      const res = await api.post('/live', {
        groupId: selectedGroup, title: sessionTitle, sessionType,
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
      toast.success('🔴 انطلق البث المباشر!');
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
    toast('انتهى البث المباشر', { icon: '📴' });
  };

  // Save homework during live session
  const handleSaveLiveHomework = async () => {
    if (!liveHomework.trim()) { toast.error('اكتب الواجب أولاً'); return; }
    if (!session?._id) return;
    setSavingHomework(true);
    try {
      await api.put(`/live/${session._id}/homework`, {
        homework: liveHomework,
        homeworkDeadline: liveHomeworkDeadline || null,
      });
      setShowHomeworkModal(false);
      toast.success('✅ تم إرسال الواجب للطلاب!');
    } catch { toast.error('خطأ في حفظ الواجب'); }
    finally { setSavingHomework(false); }
  };

  // Pre-broadcast setup
  if (!isBroadcasting) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card-base p-8 w-full max-w-lg mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-quran rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Radio className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-black text-gray-900">بدء بث مباشر جديد (Jitsi Meet)</h2>
              <p className="text-gray-500 text-sm mt-1">قم بإعداد الجلسة وانطلق</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">المجموعة *</label>
                <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="input-base">
                  <option value="">اختر المجموعة</option>
                  {myGroups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">عنوان الجلسة *</label>
                <input value={sessionTitle} onChange={e => setSessionTitle(e.target.value)}
                  className="input-base" placeholder="مثل: درس تجويد - النون الساكنة" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">نوع الجلسة</label>
                <select value={sessionType} onChange={e => setSessionType(e.target.value)} className="input-base">
                  <option value="lesson">درس جديد</option>
                  <option value="review">مراجعة</option>
                  <option value="exam">امتحان</option>
                  <option value="practice">تطبيق</option>
                </select>
              </div>
              {/* Homework */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block flex items-center gap-1">
                  <ClipboardList className="w-4 h-4 text-amber-500" /> الواجب (اختياري)
                </label>
                <textarea
                  value={homeworkText}
                  onChange={e => setHomeworkText(e.target.value)}
                  className="input-base resize-none h-20"
                  placeholder="اكتب الواجب المطلوب من الطلاب..."
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">موعد تسليم الواجب (اختياري)</label>
                <input type="date"
                  value={homeworkDeadline}
                  onChange={e => setHomeworkDeadline(e.target.value)}
                  className="input-base"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <button onClick={handleStartBroadcast} className="btn-primary w-full py-4 text-base">
                <Radio className="w-5 h-5" />
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
    <div className="min-h-screen bg-gray-900 flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="bg-gray-800 px-6 py-3 flex items-center justify-between flex-shrink-0 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            بث مباشر
          </div>
          <h1 className="text-white font-bold text-sm hidden sm:block">{sessionTitle}</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-gray-300 text-sm font-mono hidden sm:inline">{formatCountdown(duration)}</span>

          {/* Attendance Drawer Button */}
          <button
            onClick={() => setShowAttendanceDrawer(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-md shadow-emerald-600/20"
            title="كشف الحضور والغياب"
          >
            <UserCheck className="w-4 h-4" />
            <span>كشف الحضور</span>
          </button>

          <button
            onClick={() => setShowHomeworkModal(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
            title="إضافة واجب للطلاب"
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">إضافة واجب</span>
          </button>
          <button
            onClick={handleEndBroadcast}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
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
          displayName={`أ. ${user?.firstName || ''} ${user?.lastName || ''}`}
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
        groupName={groups.find(g => g._id === selectedGroup)?.name}
        socket={socket}
      />

      {/* Homework Modal */}
      {showHomeworkModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-black text-gray-900 mb-1 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-500" />
              إضافة واجب للطلاب
            </h2>
            <p className="text-xs text-gray-400 mb-5">سيصل الواجب فوراً لجميع طلاب المجموعة كإشعار</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">نص الواجب *</label>
                <textarea
                  value={liveHomework}
                  onChange={e => setLiveHomework(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-right resize-none h-28 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="اكتب الواجب المطلوب من الطلاب..."
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">موعد التسليم (اختياري)</label>
                <input
                  type="date"
                  value={liveHomeworkDeadline}
                  onChange={e => setLiveHomeworkDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowHomeworkModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveLiveHomework}
                disabled={savingHomework || !liveHomework.trim()}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingHomework
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><ClipboardList className="w-4 h-4" /> إرسال الواجب</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

