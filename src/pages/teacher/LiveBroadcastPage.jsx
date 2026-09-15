import { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radio, ClipboardList, PhoneOff, UserCheck, Mic, BookOpen,
  CheckCircle, AlertCircle, Sparkles, ArrowRight
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

  // Pre-broadcast setup — lesson is pre-selected from curriculum page
  if (!isBroadcasting) {
    if (loadingLesson) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="pt-16 flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm font-semibold">جاري تحضير بيانات الدرس...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card-base p-8 w-full max-w-lg mx-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-quran rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Radio className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-black text-gray-900">بدء بث مباشر جديد</h2>
              <p className="text-gray-500 text-sm mt-1">تأكد من بيانات الجلسة ثم انطلق</p>
            </div>
            <div className="space-y-4">
              {/* Group & Lesson Info (read-only, pre-selected from curriculum) */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-950">بيانات الدرس والمجموعة</span>
                </div>

                <div className="bg-white rounded-xl p-3 border border-emerald-100 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 font-medium">المجموعة:</span>
                    <span className="font-bold text-gray-900">{currentGroup?.name || location.state?.groupName || '—'}</span>
                  </div>
                  {selectedLessonData && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 font-medium">الدرس:</span>
                        <span className="font-bold text-emerald-700">
                          {selectedLessonData.lessonNumber ? `الدرس ${selectedLessonData.lessonNumber}: ` : ''}{selectedLessonData.title}
                        </span>
                      </div>
                      {selectedLessonData.duration && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 font-medium">المدة المقررة:</span>
                          <span className="font-semibold text-gray-700">{selectedLessonData.duration} دقيقة</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-xl font-bold">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  تم ربط البث بالدرس من منهج المجموعة
                </div>

                <button
                  onClick={() => navigate(`/admin/groups/${selectedGroup}/curriculum`)}
                  className="w-full text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg py-1.5 transition-colors font-semibold flex items-center justify-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  الرجوع لصفحة المنهج واختيار درس آخر
                </button>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">عنوان الجلسة المباشرة *</label>
                <input
                  value={sessionTitle}
                  onChange={e => setSessionTitle(e.target.value)}
                  className="input-base font-semibold"
                  placeholder="عنوان الجلسة..."
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  سيظهر هذا الاسم للطلاب في الإشعار المباشر وأعلى شاشة الحصة.
                </p>
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
          {selectedLessonData && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              <BookOpen className="w-3 h-3 text-emerald-400" />
              الدرس المرتبط بالبث
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-gray-300 text-sm font-mono hidden sm:inline">{formatCountdown(duration)}</span>

          {/* Recitation Queue & Wird Drawer Button */}
          <button
            onClick={() => setShowRecitationDrawer(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-700/20"
            title="إدارة طابور التسميع والأوراد الفردية"
          >
            <Mic className="w-4 h-4 text-emerald-200" />
            <span>طابور التسميع والورد</span>
          </button>

          {/* Attendance Drawer Button */}
          <button
            onClick={() => setShowAttendanceDrawer(true)}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
            title="كشف الحضور والغياب"
          >
            <UserCheck className="w-4 h-4" />
            <span>كشف الحضور</span>
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
          roomName={session?.liveRoomName || `QuranPlatform_${session?._id || 'Session'}`}
          displayName={`أ. ${user?.firstName || ''} ${user?.lastName || ''}`}
          userEmail={user?.email || ''}
          isTeacher={true}
          onLeave={handleEndBroadcast}
        />
      </div>

      {/* Live Recitation & Individual Wird Drawer */}
      <LiveRecitationDrawer
        isOpen={showRecitationDrawer}
        onClose={() => setShowRecitationDrawer(false)}
        sessionId={session?._id}
        sessionTitle={sessionTitle}
        groupName={groups.find(g => g._id === selectedGroup)?.name}
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

