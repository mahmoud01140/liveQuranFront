import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, PhoneOff, Bell, CheckCircle2, Clock, Sparkles, Lock, CreditCard,
  Gift, AlertTriangle, RefreshCw, Mic, Hand, BookOpen, Star, Award,
  ChevronDown, ChevronUp, Check, X, Radio
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import JitsiMeeting from '../../components/shared/JitsiMeeting';
import useAuthStore from '../../store/authStore';
import useLiveStore from '../../store/liveStore';
import useSocket from '../../hooks/useSocket';
import { joinGroupRoom } from '../../services/socket';
import api from '../../services/api';
import { formatCountdown } from '../../utils/helpers';

const POLL_INTERVAL_MS = 10_000; // فحص كل 10 ثوانٍ

export default function LiveClassPage() {
  const { user } = useAuthStore();
  const {
    session, isLive, setSession, setIsLive, joinSession, resetLive,
  } = useLiveStore();

  const [duration, setDuration] = useState(0);
  const [pingActive, setPingActive] = useState(null);
  const [confirmingPong, setConfirmingPong] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [accessDeniedInfo, setAccessDeniedInfo] = useState(null);
  const [voluntarilyLeft, setVoluntarilyLeft] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef(null);

  // Recitation Queue & Personalized Wird State (Vercel HTTP Polling)
  const [queue, setQueue] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [tasksMap, setTasksMap] = useState({});
  const [raisingHand, setRaisingHand] = useState(false);
  const [showWirdCard, setShowWirdCard] = useState(true);
  const queuePollingRef = useRef(null);
  const wasRecitingRef = useRef(false);

  useSocket({
    'broadcast-started': async ({ sessionId, groupId }) => {
      try {
        const res = await api.get(`/live/${sessionId}`);
        if (res.data?.session) {
          if (res.data?.subscription) setSubscriptionStatus(res.data.subscription);
          setSession(res.data.session);
          setIsLive(true);
          handleJoin(sessionId);
          toast.success('🔴 بدأ المعلم/المدير الحصة المباشرة!');
        }
      } catch (_) {}
    },
    'broadcast-ended': () => {
      toast('انتهت الجلسة المباشرة', { icon: '📤' });
      resetLive();
    },
    'attendance-ping': ({ sessionId, pingId, message, timeoutSeconds = 60 }) => {
      setPingActive({
        sessionId,
        pingId,
        message: message || 'نداء التحقق من التواجد في الحصة!',
        remaining: timeoutSeconds,
      });
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.connect(audioCtx.destination);
        osc.frequency.value = 587.33; // D5
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (_) {}
    },
  });

  // Countdown timer for Roll-Call ping
  useEffect(() => {
    if (!pingActive) return;
    const interval = setInterval(() => {
      setPingActive(prev => {
        if (!prev) return null;
        if (prev.remaining <= 1) {
          clearInterval(interval);
          return null;
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pingActive]);

  const handleJoin = useCallback(async (sessionId) => {
    try {
      await api.put(`/live/${sessionId}/join`);
      joinSession(sessionId);
      setAccessDeniedInfo(null);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.accessDenied) {
        setAccessDeniedInfo(err.response.data);
        if (err.response.data?.subscription) {
          setSubscriptionStatus(err.response.data.subscription);
        }
      }
    }
  }, [joinSession]);

  // ─── fetchActiveSession: يُجلب الجلسة النشطة من الـ API ────────────────────
  const fetchActiveSession = useCallback(async ({ silent = false } = {}) => {
    const groupId = user?.group?._id || user?.group;
    try {
      // 1. محاولة جلب الجلسة النشطة للمستخدم الحالي
      const resActive = await api.get('/live/active/me').catch(() => null);
      if (resActive?.data) {
        if (resActive.data.subscription) setSubscriptionStatus(resActive.data.subscription);

        if (resActive.data.session) {
          const liveSession = resActive.data.session;
          setSession(liveSession);
          setIsLive(true);
          await handleJoin(liveSession._id);
          if (liveSession.group?._id) joinGroupRoom(liveSession.group._id);
          if (!silent) toast.success('🔴 هناك حصة مباشرة الآن! جارٍ الانضمام...');
          return;
        }
      }

      // 2. احتياطي: جلب جلسات المجموعة مباشرةً
      if (groupId) {
        const res = await api.get(`/live/group/${groupId}`);
        const sessions = res.data.sessions || [];
        const liveSession = sessions.find(s => s.status === 'live');
        const latestSession = liveSession || sessions.find(s => s.status === 'scheduled');
        if (liveSession) {
          setSession(liveSession);
          setIsLive(true);
          await handleJoin(liveSession._id);
          if (!silent) toast.success('🔴 انضممت للحصة المباشرة!');
        } else if (latestSession) {
          setSession(latestSession);
        }
      }
    } catch (_) {}
  }, [user, handleJoin, setSession, setIsLive]);

  // ─── On mount: join group room + initial fetch ──────────────────────────────
  useEffect(() => {
    const groupId = user?.group?._id || user?.group;
    if (groupId) joinGroupRoom(groupId);
    fetchActiveSession({ silent: true });
  }, [user, fetchActiveSession]);

  // ─── Polling: فحص كل 10 ثوانٍ إذا لم تبدأ الجلسة بعد ─────────────────────
  // هذا يضمن عمل الإشعار حتى بدون Socket.io (مثل Vercel)
  useEffect(() => {
    const isSessionLiveNow = isLive || session?.status === 'live';

    // أوقف الـ polling إذا بدأ البث
    if (isSessionLiveNow) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsPolling(false);
      }
      return;
    }

    // ابدأ الـ polling إذا لم يكن يعمل
    if (!pollingRef.current) {
      setIsPolling(true);
      pollingRef.current = setInterval(() => {
        fetchActiveSession({ silent: true });
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsPolling(false);
      }
    };
  }, [isLive, session?.status, fetchActiveSession]);

  useEffect(() => {
    if (isLive || session?.status === 'live') {
      const timer = setInterval(() => setDuration(d => d + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [isLive, session]);

  const handleConfirmAttendance = async () => {
    if (!session?._id) return;
    setConfirmingPong(true);
    try {
      await api.post(`/live/${session._id}/attendance-pong`);
      toast.success('✅ تم تأكيد حضورك وتثبيته في سجل الحصة بنجاح!');
      setPingActive(null);
    } catch (err) {
      toast.error('حدث خطأ في تأكيد الحضور');
    } finally {
      setConfirmingPong(false);
    }
  };

  // ─── Fetch Recitation Queue & Personalized Wird via Polling ─────────────────
  const fetchQueueData = useCallback(async () => {
    if (!session?._id) return;
    try {
      const res = await api.get(`/live/${session._id}/queue`);
      const { queue: q = [], currentSpeaker: speaker, tasks = {} } = res.data;
      setQueue(q);
      setCurrentSpeaker(speaker);
      setTasksMap(tasks);

      const myId = user?._id?.toString();
      const myTurn = q.find(item => (item.student?._id || item.student)?.toString() === myId);
      const isMyTurnReciting = speaker?._id?.toString() === myId || myTurn?.status === 'reciting';

      if (isMyTurnReciting && !wasRecitingRef.current) {
        wasRecitingRef.current = true;
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
          osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
          osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24); // G5
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        } catch (_) {}
        toast.success('🎙️ حان دورك في التسميع الآن مع المعلم!', { duration: 6000 });
      } else if (!isMyTurnReciting) {
        wasRecitingRef.current = false;
      }
    } catch (_) {}
  }, [session?._id, user?._id]);

  // Polling every 3.5s when session is live (Zero socket.io, fully Vercel compliant)
  useEffect(() => {
    const isSessionLiveNow = isLive || session?.status === 'live';
    if (!session?._id || !isSessionLiveNow) {
      if (queuePollingRef.current) {
        clearInterval(queuePollingRef.current);
        queuePollingRef.current = null;
      }
      return;
    }

    fetchQueueData();
    queuePollingRef.current = setInterval(() => {
      fetchQueueData();
    }, 3500);

    return () => {
      if (queuePollingRef.current) {
        clearInterval(queuePollingRef.current);
        queuePollingRef.current = null;
      }
    };
  }, [isLive, session?._id, session?.status, fetchQueueData]);

  const handleToggleHand = async () => {
    if (!session?._id) return;
    setRaisingHand(true);
    try {
      const res = await api.post(`/live/${session._id}/queue/raise-hand`);
      toast.success(res.data.message || 'تم تحديث طلب الدور');
      fetchQueueData();
    } catch {
      toast.error('حدث خطأ في طلب الدور');
    } finally {
      setRaisingHand(false);
    }
  };

  const handleLeave = () => {
    setVoluntarilyLeft(true);
    resetLive();
    setDuration(0);
    toast('خرجت من الجلسة', { icon: '👋' });
  };

  const handleRejoin = async () => {
    setVoluntarilyLeft(false);
    setAccessDeniedInfo(null);
    await fetchActiveSession({ silent: false });
  };

  const isSessionLive = isLive || session?.status === 'live';

  // ─── LOCKED STATE: When trial is consumed or subscription is expired ───
  if (accessDeniedInfo || (subscriptionStatus && !subscriptionStatus.canAccessLiveSession && user?.role === 'student')) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
        <Navbar />
        <div className="pt-20 px-4 flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-l from-amber-400 via-primary-500 to-emerald-500" />
            
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 mx-auto mb-5 flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <span className="badge-gold text-xs mb-2 inline-block">
              {subscriptionStatus?.isExpired ? 'انتهت فترة الاشتراك الشهري' : 'أتممت المحاضرة التجريبية الأولى بنجاح 🌟'}
            </span>

            <h2 className="text-2xl font-black text-gray-900 mb-3">
              {subscriptionStatus?.isExpired
                ? 'تم تعليق حضور الجلسات لانتهاء الاشتراك'
                : 'مطلوب الاشتراك للاستمرار في الحلقات'}
            </h2>

            <p className="text-sm text-gray-600 leading-relaxed mb-8">
              {subscriptionStatus?.isExpired
                ? 'انتهت مدة اشتراكك الشهري. للاستمرار في حضور الحلقات المباشرة مع مجموعتك ومتابعة الحفظ، يرجى سداد الاشتراك.'
                : 'لقد استمتعت بحضور جلستك التجريبية المجانية! لمواصلة رحلتك المباركة وحضور باقي الحلقات المباشرة مع المعلم، يرجى سداد الاشتراك الشهري.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/student/subscription"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-quran text-white font-bold text-sm shadow-green hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                سداد الاشتراك الشهري الآن
              </Link>
              <Link
                to="/student"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all"
              >
                العودة للرئيسية
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── VOLUNTARILY LEFT STATE: Student clicked leave but broadcast may still be active ───
  if (voluntarilyLeft && !session) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
        <Navbar />
        <div className="pt-24 px-4 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-12 text-center max-w-md mx-auto shadow-sm"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 mx-auto mb-4 flex items-center justify-center shadow-inner">
              <Video className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">لقد غادرت الحصة المباشرة</h2>
            <p className="text-gray-500 text-sm mb-6">يمكنك إعادة الانضمام للمحاضرة في أي وقت طالما البث ما زال مستمراً من المعلم</p>

            <div className="space-y-3">
              <button
                onClick={handleRejoin}
                className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 shadow-green cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                إعادة الانضمام للحصة الآن
              </button>
              <Link
                to="/student"
                className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all block"
              >
                العودة للرئيسية
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
        <Navbar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="card-base p-12 text-center max-w-md mx-4 shadow-sm">
            <Video className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-black text-gray-900 mb-2">لا توجد جلسة مباشرة حالياً</h2>
            <p className="text-gray-500 text-sm mb-6">عند بدء المعلم الجلسة ستنضم تلقائياً خلال ثوانٍ</p>

            {/* Polling indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-primary-500 font-semibold mb-4">
              <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
              <span>{isPolling ? 'يبحث تلقائياً كل 10 ثوانٍ...' : 'البحث متوقف مؤقتاً'}</span>
            </div>

            <button
              onClick={() => {
                setVoluntarilyLeft(false);
                setAccessDeniedInfo(null);
                fetchActiveSession({ silent: false });
              }}
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-primary-500 bg-gray-100 hover:bg-primary-50 px-4 py-2 rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              تحديث يدوي
            </button>
          </div>
        </div>
      </div>
    );
  }


  const myId = user?._id?.toString();
  const myTurn = queue.find(item => (item.student?._id || item.student)?.toString() === myId);
  const isMyTurn = currentSpeaker?._id?.toString() === myId || myTurn?.status === 'reciting';
  const hasHandRaised = myTurn?.status === 'hand_raised';
  const isCompleted = myTurn?.status === 'completed';
  const myTask = myId ? tasksMap[myId] : null;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col h-screen overflow-hidden font-sans" dir="rtl">
      {/* Top status bar */}
      <header className="bg-gray-800/90 backdrop-blur border-b border-gray-700 px-4 py-2.5 flex items-center justify-between z-20 flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isSessionLive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-white font-black text-sm">{session?.title || 'الحلقة المباشرة'}</span>
          </div>

          {session?.group?.name && (
            <span className="hidden sm:inline text-xs bg-gray-700 text-gray-300 px-2.5 py-0.5 rounded-full">
              {session.group.name}
            </span>
          )}

          {/* Turn status badges */}
          {isMyTurn && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-500 text-white px-3 py-1 rounded-xl font-bold animate-pulse shadow-md shadow-emerald-500/30">
              <Mic className="w-3.5 h-3.5" />
              أنت تُسمّع الآن مع المعلم! 🎙️
            </span>
          )}

          {!isMyTurn && currentSpeaker && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs bg-blue-900/60 text-blue-200 border border-blue-500/30 px-2.5 py-1 rounded-xl">
              <Mic className="w-3 h-3 text-blue-400" />
              المعلم يستمع الآن لـ: {currentSpeaker.firstName} {currentSpeaker.lastName || ''}
            </span>
          )}

          {isCompleted && !isMyTurn && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-green-900/60 text-green-300 border border-green-500/30 px-2.5 py-1 rounded-xl font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              تم تقييمك ({myTurn?.evaluation?.score || 100}%)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Hand Raise Toggle Button */}
          {!isCompleted && !isMyTurn && (
            <button
              onClick={handleToggleHand}
              disabled={raisingHand}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                hasHandRaised
                  ? 'bg-amber-500 hover:bg-amber-600 text-white animate-bounce'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white'
              }`}
              title={hasHandRaised ? 'إنزال اليد' : 'طلب دور التسميع'}
            >
              <Hand className={`w-3.5 h-3.5 ${hasHandRaised ? 'fill-current' : ''}`} />
              <span>{hasHandRaised ? 'تم رفع اليد ✋' : 'طلب دور التسميع'}</span>
            </button>
          )}

          {/* Toggle My Daily Wird Card */}
          <button
            onClick={() => setShowWirdCard(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              showWirdCard
                ? 'bg-emerald-600/90 text-white shadow-md shadow-emerald-900/30'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">وردي اليومي</span>
            {showWirdCard ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {isSessionLive && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-300 bg-gray-700/60 px-3 py-1.5 rounded-xl font-mono">
              <Clock className="w-3.5 h-3.5 text-primary-400" />
              <span>{formatCountdown(duration)}</span>
            </div>
          )}

          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 text-xs font-bold bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-xl transition-all"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">مغادرة</span>
          </button>
        </div>
      </header>

      {/* Main meeting area */}
      <div className="flex-1 relative bg-black">
        {session?._id && (
          <JitsiMeeting
            roomName={session?.liveRoomName || `QuranPlatform_${session._id}`}
            displayName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'طالب'}
            userEmail={user?.email}
            onLeave={handleLeave}
          />
        )}

        {/* Floating / Collapsible Personalized Wird & Live Recitation Card */}
        <AnimatePresence>
          {showWirdCard && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`absolute top-4 left-4 z-30 max-w-sm w-full rounded-2xl shadow-2xl backdrop-blur-md border p-4 transition-all ${
                isMyTurn
                  ? 'bg-gray-900/95 border-emerald-500 ring-2 ring-emerald-500/40'
                  : 'bg-gray-900/90 border-gray-700/80'
              }`}
            >
              <div className="flex items-center justify-between border-b border-gray-700/80 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isMyTurn ? 'bg-emerald-500 text-white animate-pulse' : 'bg-gray-800 text-emerald-400'
                  }`}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {isMyTurn ? '🎙️ المطلوب منك تسميعه الآن' : '📖 وردك القرآني المخصص لليوم'}
                    </h4>
                    <span className="text-[10px] text-gray-400">خاص بك وفق وتيرة حفظك</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowWirdCard(false)}
                  className="w-6 h-6 rounded-lg bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks breakdown */}
              <div className="space-y-2 text-xs">
                {/* New Hifz */}
                <div className="bg-gray-800/80 rounded-xl p-2.5 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">
                    📖 الحفظ الجديد (السبق):
                  </span>
                  {myTask?.newHifz?.surahName ? (
                    <p className="text-white font-bold">
                      سورة {myTask.newHifz.surahName} (الآيات من {myTask.newHifz.fromVerse} إلى {myTask.newHifz.toVerse})
                    </p>
                  ) : (
                    <p className="text-gray-400 text-[11px]">تابع مع المعلم لتحديد السورة</p>
                  )}
                </div>

                {/* Near Revision */}
                <div className="bg-gray-800/80 rounded-xl p-2.5 border border-blue-500/20">
                  <span className="text-[10px] text-blue-400 font-bold block mb-0.5">
                    🔄 الماضي القريب (السبقي):
                  </span>
                  {myTask?.nearRevision?.surahName ? (
                    <p className="text-white font-bold">
                      سورة {myTask.nearRevision.surahName} (الآيات {myTask.nearRevision.fromVerse} إلى {myTask.nearRevision.toVerse})
                    </p>
                  ) : (
                    <p className="text-gray-400 text-[11px]">مراجعة آخر الأوجه المحفوظة</p>
                  )}
                </div>

                {/* Cumulative Revision */}
                {myTask?.cumulativeRevision?.surahName && (
                  <div className="bg-gray-800/80 rounded-xl p-2.5 border border-purple-500/20">
                    <span className="text-[10px] text-purple-400 font-bold block mb-0.5">
                      🏛️ الورد التمكيني:
                    </span>
                    <p className="text-white font-bold">
                      {myTask.cumulativeRevision.surahName}
                    </p>
                  </div>
                )}

                {/* Additional exercise */}
                {myTask?.additionalExercise?.details && (
                  <div className="bg-amber-950/30 rounded-xl p-2 border border-amber-500/20 text-amber-200 text-[11px]">
                    🎯 <span className="font-bold">تدريب:</span> {myTask.additionalExercise.details}
                  </div>
                )}

                {/* Evaluation Result if already reviewed */}
                {isCompleted && myTurn?.evaluation && (
                  <div className="bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 rounded-xl p-3 text-center mt-2">
                    <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= (myTurn.evaluation.rating || 5)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-black text-emerald-400">
                      درجة التسميع: {myTurn.evaluation.score || 100}%
                    </span>
                    {myTurn.evaluation.notes && (
                      <p className="text-[11px] text-gray-300 mt-1 italic">
                        "{myTurn.evaluation.notes}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attendance roll-call ping overlay */}
        <AnimatePresence>
          {pingActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-6 right-6 z-40 bg-white rounded-3xl shadow-2xl p-6 border-2 border-primary-500 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">نداء التحقق من الحضور! ✋</h4>
                  <p className="text-xs text-gray-500">متبقي: {pingActive.remaining} ثانية</p>
                </div>
              </div>

              <p className="text-xs text-gray-600 mb-4">{pingActive.message}</p>

              <button
                onClick={handleConfirmAttendance}
                disabled={confirmingPong}
                className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {confirmingPong ? <Sparkles className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                أنا متواجد ومتابع للحصة ✅
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
