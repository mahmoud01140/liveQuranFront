import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhoneOff, Bell, CheckCircle2, Clock, Lock, CreditCard,
  RefreshCw, Hand, BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import JitsiMeeting from '../../components/shared/JitsiMeeting';
import useAuthStore from '../../store/authStore';
import useLiveStore from '../../store/liveStore';
import useSocket from '../../hooks/useSocket';
import { joinGroupRoom, getSocket } from '../../services/socket';
import api from '../../services/api';
import { formatCountdown } from '../../utils/helpers';
import '../../components/halaqa/halaqa.css';
import { HqBadge, HQ } from '../../components/halaqa/primitives';
import { SpeakerStage, CircleStrip, QueueList, WirdCard, PresenceBar } from '../../components/halaqa/LiveBits';

const POLL_INTERVAL_MS = 10_000;

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

  /* Recitation queue & personalized wird (HTTP polling — logic unchanged) */
  const [queue, setQueue] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [tasksMap, setTasksMap] = useState({});
  const [raisingHand, setRaisingHand] = useState(false);
  const [showWirdCard, setShowWirdCard] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
          toast.success('بدأ المعلم الحصة المباشرة');
        }
      } catch (_) {}
    },
    'broadcast-ended': () => {
      toast('انتهت الجلسة المباشرة');
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
        osc.frequency.value = 587.33;
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (_) {}
    },
  });

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

  const fetchActiveSession = useCallback(async ({ silent = false } = {}) => {
    const groupId = user?.group?._id || user?.group;
    try {
      const resActive = await api.get('/live/active/me').catch(() => null);
      if (resActive?.data) {
        if (resActive.data.subscription) setSubscriptionStatus(resActive.data.subscription);
        if (resActive.data.session) {
          const liveSession = resActive.data.session;
          setSession(liveSession);
          setIsLive(true);
          await handleJoin(liveSession._id);
          if (liveSession.group?._id) joinGroupRoom(liveSession.group._id);
          if (!silent) toast.success('هناك حصة مباشرة الآن! جارٍ الانضمام...');
          return;
        }
      }
      if (groupId) {
        const res = await api.get(`/live/group/${groupId}`);
        const sessions = res.data.sessions || [];
        const liveSession = sessions.find(s => s.status === 'live');
        const latestSession = liveSession || sessions.find(s => s.status === 'scheduled');
        if (liveSession) {
          setSession(liveSession);
          setIsLive(true);
          await handleJoin(liveSession._id);
          if (!silent) toast.success('انضممت للحصة المباشرة!');
        } else if (latestSession) {
          setSession(latestSession);
        }
      }
    } catch (_) {}
  }, [user, handleJoin, setSession, setIsLive]);

  useEffect(() => {
    const groupId = user?.group?._id || user?.group;
    if (groupId) joinGroupRoom(groupId);
    fetchActiveSession({ silent: true });
  }, [user, fetchActiveSession]);

  useEffect(() => {
    const isSessionLiveNow = isLive || session?.status === 'live';
    if (isSessionLiveNow) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsPolling(false);
      }
      return;
    }
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
      toast.success('تم تأكيد حضورك في سجل الحصة');
      setPingActive(null);
    } catch (err) {
      toast.error('حدث خطأ في تأكيد الحضور');
    } finally {
      setConfirmingPong(false);
    }
  };

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
          osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
          osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12);
          osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        } catch (_) {}
        toast.success('حان دورك في التسميع الآن مع المعلم!');
      } else if (!isMyTurnReciting) {
        wasRecitingRef.current = false;
      }
    } catch (_) {}
  }, [session?._id, user?._id]);

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
    const socket = getSocket();
    if (socket && session?._id) {
      socket.emit('leave-session', {
        sessionId: session._id,
        groupId: session.group?._id || session.group,
      });
    }
    setVoluntarilyLeft(true);
    resetLive();
    setDuration(0);
    toast('خرجت من الجلسة');
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      const socket = getSocket();
      if (socket && session?._id) {
        socket.emit('leave-session', {
          sessionId: session._id,
          groupId: session.group?._id || session.group,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      const socket = getSocket();
      if (socket && session?._id) {
        socket.emit('leave-session', {
          sessionId: session._id,
          groupId: session.group?._id || session.group,
        });
      }
    };
  }, [session?._id, session?.group]);

  const handleRejoin = async () => {
    setVoluntarilyLeft(false);
    setAccessDeniedInfo(null);
    await fetchActiveSession({ silent: false });
  };

  const isSessionLive = isLive || session?.status === 'live';

  /* ── LOCKED: trial consumed or subscription expired (same logic, halaqa skin) ── */
  if (accessDeniedInfo || (subscriptionStatus && !subscriptionStatus.canAccessLiveSession && user?.role === 'student')) {
    return (
      <div className="halaqa" style={{ minHeight: '100vh', background: HQ.PAPER }} dir="rtl">
        <Navbar />
        <div style={{ paddingTop: 96, padding: 16, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 'clamp(24px,5vw,48px)', textAlign: 'center', maxWidth: 520, width: '100%' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: '#F8EDD3', color: '#B45309', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={30} />
            </div>
            <HqBadge tone="gold">
              {subscriptionStatus?.isExpired ? 'انتهت فترة الاشتراك الشهري' : 'أتممت المحاضرة التجريبية الأولى بنجاح'}
            </HqBadge>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: HQ.INK, margin: '12px 0' }}>
              {subscriptionStatus?.isExpired ? 'انتهى اشتراكك — المحتوى محجوب بالكامل' : 'الاشتراك مطلوب لمواصلة الحلقات'}
            </h2>
            <p style={{ fontSize: 15, color: HQ.MUTED, lineHeight: 1.8, margin: '0 0 28px' }}>
              {subscriptionStatus?.isExpired
                ? 'انتهت مدة اشتراكك. سدد الاشتراك لفتح كامل المحتوى — تُراجَع الإيصالات خلال 24 ساعة.'
                : 'استمتعت بجلستك التجريبية المجانية! سدد الاشتراك لفتح كامل المحتوى ومواصلة الحلقات مع المعلم.'}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link to="/student/subscription" className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 32px', fontSize: 15, textDecoration: 'none' }}>
                <CreditCard size={17} /> سداد الاشتراك الشهري
              </Link>
              <Link to="/student" className="hq-action" style={{ background: HQ.PAPER, color: HQ.INK, border: `1px solid ${HQ.LINE}`, padding: '0 24px', fontSize: 15, textDecoration: 'none' }}>
                العودة للرئيسية
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── LEFT state ── */
  if (voluntarilyLeft && !session) {
    return (
      <div className="halaqa" style={{ minHeight: '100vh', background: HQ.PAPER }} dir="rtl">
        <Navbar />
        <div style={{ paddingTop: 96, padding: 16, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 'clamp(24px,5vw,48px)', textAlign: 'center', maxWidth: 440, width: '100%' }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: HQ.INK, margin: '0 0 8px' }}>غادرت الحصة المباشرة</h2>
            <p style={{ color: HQ.MUTED, fontSize: 14, margin: '0 0 24px' }}>يمكنك العودة في أي وقت ما دام البث مستمرًا.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button type="button" onClick={handleRejoin} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', fontSize: 15 }}>
                إعادة الانضمام للحصة
              </button>
              <Link to="/student" className="hq-action" style={{ background: HQ.PAPER, color: HQ.INK, border: `1px solid ${HQ.LINE}`, fontSize: 15, textDecoration: 'none' }}>
                العودة للرئيسية
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── NO SESSION state ── */
  if (!session) {
    return (
      <div className="halaqa" style={{ minHeight: '100vh', background: HQ.PAPER }} dir="rtl">
        <Navbar />
        <div style={{ paddingTop: 64, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 48, textAlign: 'center', maxWidth: 420, width: '100%' }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: HQ.INK, margin: '0 0 8px' }}>لا توجد جلسة مباشرة حاليًا</h2>
            <p style={{ color: HQ.MUTED, fontSize: 14, margin: '0 0 20px' }}>عند بدء المعلم الجلسة ستنضم تلقائيًا خلال ثوانٍ.</p>
            <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: HQ.MENTOR, fontWeight: 700, margin: '0 0 16px' }}>
              <RefreshCw size={14} className={isPolling ? 'animate-spin' : ''} />
              {isPolling ? 'يبحث تلقائيًا كل 10 ثوانٍ...' : 'البحث متوقف مؤقتًا'}
            </p>
            <button type="button" onClick={() => { setVoluntarilyLeft(false); setAccessDeniedInfo(null); fetchActiveSession({ silent: false }); }}
              className="hq-action" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, color: HQ.INK, padding: '0 20px', fontSize: 14 }}>
              <RefreshCw size={15} /> تحديث يدوي
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
  const speakerObj = currentSpeaker && typeof currentSpeaker === 'object' ? currentSpeaker : null;

  const rail = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section aria-label="طابور التسميع" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 16 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: HQ.INK }}>طابور التسميع</h2>
        <QueueList queue={queue} myId={myId} currentId={speakerObj?._id?.toString()}
          onRaiseHand={(!isCompleted && !isMyTurn) ? handleToggleHand : null} raisingHand={raisingHand} />
      </section>
      <WirdCard task={myTask} evaluation={isCompleted ? myTurn?.evaluation : null}
        open={showWirdCard} onToggle={() => setShowWirdCard(v => !v)} />
      <PresenceBar state="joined" pinging={Boolean(pingActive)} onOpen={() => setDrawerOpen(true)} />
    </div>
  );

  return (
    <div className="halaqa" dir="rtl"
      style={{ height: '100vh', maxHeight: '100dvh', width: '100%', background: HQ.PAPER, display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      {/* Slim paper header — chrome stays paper, only the stage is dark */}
      <header style={{ background: HQ.SURFACE, borderBottom: `1px solid ${HQ.LINE}`, padding: '0 12px', height: 56, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span className="hq-live-dot" aria-hidden />
          <strong style={{ fontSize: 15, color: HQ.INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '38vw' }}>
            {session?.title || 'الحلقة المباشرة'}
          </strong>
          {session?.group?.name && (
            <span className="hidden md:inline" style={{ fontSize: 12, color: HQ.MUTED, fontWeight: 700 }}>{session.group.name}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          {isCompleted && !isMyTurn && (
            <HqBadge tone="mentor"><CheckCircle2 size={13} /> {myTurn?.evaluation?.score || 100}%</HqBadge>
          )}
          {isSessionLive && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: HQ.MUTED, fontWeight: 700 }}>
              <Clock size={14} color={HQ.MENTOR} />{formatCountdown(duration)}
            </span>
          )}
        </div>
      </header>

      {/* Body: stage + rail (desktop) / stage + sheet (mobile) */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 16, padding: 16, paddingBottom: 8 }}>
        {/* ── Stage: the only dark surface ── */}
        <div className="halaqa-stage hq-stagebox" style={{ flex: 1, minWidth: 0, borderRadius: 18, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <SpeakerStage speaker={speakerObj} isMe={isMyTurn} isLive={isSessionLive}
            teacherName={session?.teacher ? `${session.teacher.firstName || ''} ${session.teacher.lastName || ''}`.trim() : ''} />
          <div style={{ padding: '0 4px' }}>
            <CircleStrip members={queue} currentId={speakerObj?._id?.toString()} />
          </div>
          <div style={{ flex: 1, minHeight: 0, borderRadius: 12, overflow: 'hidden', background: '#0C0C1D', position: 'relative' }}>
            {session?._id && (
              <JitsiMeeting
                roomName={session?.liveRoomName || `QuranPlatform_${session._id}`}
                displayName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'طالب'}
                userEmail={user?.email}
                onLeave={handleLeave}
              />
            )}
          </div>
        </div>

        {/* Desktop rail — visually lighter than the stage */}
        <aside aria-label="لوحات الحلقة" className="hidden lg:block"
          style={{ width: 340, flex: 'none', overflowY: 'auto', paddingBottom: 8 }}>
          {rail}
        </aside>
      </div>

      {/* Mobile bottom sheet — queue / wird / presence */}
      <div className="lg:hidden" style={{
        flex: 'none', background: HQ.SURFACE, borderTop: `1px solid ${HQ.LINE}`,
        borderRadius: '18px 18px 0 0', maxHeight: drawerOpen ? '52dvh' : 'none',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <button type="button" onClick={() => setDrawerOpen(o => !o)} aria-expanded={drawerOpen}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minHeight: 48 }}>
          <span className="hq-grip" aria-hidden />
          <span style={{ fontSize: 13, fontWeight: 800, color: HQ.INK }}>
            {drawerOpen ? 'إخفاء لوحات الحلقة' : `الطابور والورد والحضور (${queue.length})`}
          </span>
        </button>
        <div style={{
          display: 'grid', gridTemplateRows: drawerOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s ease',
        }}>
          <div style={{ overflow: drawerOpen ? 'auto' : 'hidden', padding: drawerOpen ? '4px 16px 16px' : '0 16px', minHeight: 0 }}>
            {rail}
          </div>
        </div>
      </div>

      {/* Attendance ping — paper alert above the action bar, never floating glass */}
      {pingActive && (
        <div role="alert" className="hq-ping" style={{
          flex: 'none', margin: '8px 16px 0', background: HQ.SURFACE,
          border: `2px solid ${HQ.MENTOR}`, borderRadius: 18,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: HQ.PAPER, color: HQ.MENTOR, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Bell size={22} />
          </span>
          <span style={{ flex: 1, minWidth: 180 }}>
            <strong style={{ display: 'block', fontSize: 15, color: HQ.INK }}>المعلم ينادي الحضور</strong>
            <span style={{ fontSize: 13, color: HQ.MUTED }}>{pingActive.message} — متبقي {pingActive.remaining} ثانية</span>
          </span>
          <button type="button" onClick={handleConfirmAttendance} disabled={confirmingPong}
            className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 24px', fontSize: 15, opacity: confirmingPong ? 0.6 : 1 }}>
            <CheckCircle2 size={17} /> أنا متواجد
          </button>
        </div>
      )}

      {/* Fixed bottom action bar — every target ≥48px */}
      <nav aria-label="إجراءات الحصة" className="hq-actionbar"
        style={{ flex: 'none', display: 'flex', gap: 8, padding: '8px 16px', justifyContent: 'center' }}>
        {!isCompleted && !isMyTurn && (
          <button type="button" onClick={handleToggleHand} disabled={raisingHand} className="hq-action"
            aria-pressed={hasHandRaised}
            style={{
              flex: 1, maxWidth: 220, fontSize: 15,
              background: hasHandRaised ? '#B45309' : HQ.MENTOR, color: '#fff',
              opacity: raisingHand ? 0.6 : 1,
            }}>
            <Hand size={18} /> {hasHandRaised ? 'إنزال اليد' : 'طلب التسميع'}
          </button>
        )}
        {isMyTurn && (
          <span className="hq-action" role="status" style={{ flex: 1, maxWidth: 220, fontSize: 15, background: HQ.PAPER, border: `1.5px solid ${HQ.MENTOR}`, color: HQ.MENTOR }}>
            دورك في التسميع الآن
          </span>
        )}
        <button type="button" onClick={() => { setDrawerOpen(true); setShowWirdCard(true); }} className="hq-action hq-wird-btn"
          style={{ flex: 1, maxWidth: 180, fontSize: 15, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, color: HQ.INK }}>
          <BookOpen size={18} /> وردي
        </button>
        <button type="button" onClick={handleLeave} className="hq-action"
          style={{ flex: 1, maxWidth: 180, fontSize: 15, background: '#C2410C', color: '#fff' }}>
          <PhoneOff size={18} /> مغادرة
        </button>
      </nav>
    </div>
  );
}
