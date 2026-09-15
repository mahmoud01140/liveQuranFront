import { useEffect, useRef, useState } from 'react';

/**
 * JitsiMeeting Component
 * Embeds a Jitsi Meet video conference inside the React application using the Jitsi External API.
 *
 * Optimizations for Quran Learning Platform:
 * 1. Students join audio-muted by default
 * 2. Auto-pin reciting student via onApiReady (exposes pinParticipantByName)
 * 3. Noise suppression enabled by default for clear recitation
 * 4. Students join video-off with no camera controls (audio-only experience)
 */
export default function JitsiMeeting({
  roomName,
  displayName = 'مستخدم',
  userEmail = '',
  isTeacher = false,
  onApiReady,
  onLeave,
  height = '100%',
  width = '100%',
}) {
  const containerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const isDisposingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const domain = import.meta.env.VITE_JITSI_DOMAIN || 'meet.element.io';

  // Sanitize room name for Jitsi compatibility
  const sanitizedRoomName = (roomName || 'quran_platform_session')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();

  // أزرار المعلم: تحكم كامل
  const teacherToolbarButtons = [
    'camera',
    'chat',
    'closedcaptions',
    'desktop',
    'fullscreen',
    'hangup',
    'microphone',
    'noisesuppression',
    'participants-pane',
    'raisehand',
    'select-background',
    'settings',
    'toggle-camera',
    'videoquality',
  ];

  // أزرار الطالب: صوت فقط مخصصة للهواتف بدون زحمة
  const studentToolbarButtons = [
    'microphone',
    'raisehand',
    'chat',
    'fullscreen',
    'hangup',
    'settings',
  ];

  useEffect(() => {
    let isMounted = true;
    isDisposingRef.current = false;

    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://${domain}/external_api.js`;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('تعذّر تحميل مكتبة Jitsi Meet'));
        document.body.appendChild(script);
      });
    };

    const initJitsi = async () => {
      try {
        await loadJitsiScript();

        if (!isMounted || !containerRef.current) return;

        // Clean up any existing instance without triggering onLeave
        isDisposingRef.current = true;
        if (jitsiApiRef.current) {
          try {
            jitsiApiRef.current.dispose();
          } catch (_) {}
          jitsiApiRef.current = null;
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
        isDisposingRef.current = false;

        const options = {
          roomName: sanitizedRoomName,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          userInfo: {
            displayName: displayName,
            email: userEmail,
          },
          configOverwrite: {
            // تحسين 1: الطلاب يدخلون صامتين
            startWithAudioMuted: !isTeacher,
            // تحسين 4: الطلاب بدون كاميرا (صوت فقط)
            startWithVideoMuted: !isTeacher,
            disableDeepLinking: true,
            disableThirdPartyRequests: true,
            enableNoisyMicDetection: false, // توفير استهلاك البطارية والمعالج على الهواتف
            p2p: { enabled: false }, // إجبار الاتصال عبر SFU لضمان ثبات اتصال الهواتف وشبكات 4G/5G
            prejoinPageEnabled: false,
            lobbyModeEnabled: false,
            enableWelcomePage: false,
            enableClosePage: false,
            defaultLanguage: 'ar',

            // تحسين دقة الفيديو لتناسب شاشات الهواتف وتمنع التقطيع والحرارة
            constraints: {
              video: {
                height: { ideal: 480, max: 720 },
              },
            },

            // Stage View: المعلم كبير في المنتصف والطلاب شريط جانبي
            disableTileView: true,
            filmstrip: {
              disabled: false,
              minParticipantCountForFilmstrip: 2,
            },

            // تحسين 3: تفعيل كشف الضوضاء افتراضياً لوضوح التلاوة
            disableNS: false,
            noiseSuppression: {
              enabled: true,
            },

            // تحسين 4: منع الطلاب من تفعيل الكاميرا
            ...(!isTeacher && {
              videoMuted: true,
            }),

            // أزرار مختلفة حسب الدور
            toolbarButtons: isTeacher ? teacherToolbarButtons : studentToolbarButtons,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: '#111827',
            TOOLBAR_ALWAYS_VISIBLE: true,
            MOBILE_APP_PROMO: false,
            HIDE_DEEP_LINKING_LOGO: true,
            DISABLE_FOCUS_INDICATOR: true,
            // تحسين 4: إخفاء خلفية الفيديو للطلاب
            ...(!isTeacher && {
              DISABLE_VIDEO_BACKGROUND: true,
            }),
          },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        // تحسين 2: تجهيز خريطة المشاركين لتثبيت الطالب المُسمّع تلقائياً
        const participantsMap = new Map(); // displayName -> jitsiParticipantId

        api.addEventListener('participantJoined', (participant) => {
          participantsMap.set(participant.displayName, participant.id);
        });

        api.addEventListener('participantLeft', (participant) => {
          for (const [name, id] of participantsMap.entries()) {
            if (id === participant.id) {
              participantsMap.delete(name);
              break;
            }
          }
        });

        // Expose enhanced API with helper methods
        if (onApiReady) {
          // دالة تثبيت طالب بالاسم — تُستخدم من طابور التسميع
          api.pinParticipantByName = (name) => {
            let participantId = participantsMap.get(name);
            if (!participantId) {
              for (const [pName, pId] of participantsMap.entries()) {
                if (pName.includes(name) || name.includes(pName)) {
                  participantId = pId;
                  break;
                }
              }
            }
            if (participantId) {
              api.pinParticipant(participantId);
              return true;
            }
            return false;
          };

          // دالة إلغاء التثبيت
          api.unpinAll = () => {
            api.pinParticipant(null);
          };

          // دالة لكتم مايك طالب معين (للمعلم فقط)
          api.muteParticipantByName = (name) => {
            let participantId = participantsMap.get(name);
            if (!participantId) {
              for (const [pName, pId] of participantsMap.entries()) {
                if (pName.includes(name) || name.includes(pName)) {
                  participantId = pId;
                  break;
                }
              }
            }
            if (participantId) {
              api.executeCommand('muteEveryone', participantId);
              return true;
            }
            return false;
          };

          onApiReady(api);
        }

        api.addEventListener('readyToClose', () => {
          if (!isDisposingRef.current && isMounted && onLeave) onLeave();
        });

        api.addEventListener('videoConferenceLeft', () => {
          if (!isDisposingRef.current && isMounted && onLeave) onLeave();
        });

        setLoading(false);
      } catch (err) {
        console.error('Jitsi initialization error:', err);
        if (isMounted) {
          setError(err.message || 'حدث خطأ في تحميل البث المباشر');
          setLoading(false);
        }
      }
    };

    initJitsi();

    return () => {
      isMounted = false;
      isDisposingRef.current = true;
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (_) {}
        jitsiApiRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [sanitizedRoomName, domain, displayName, isTeacher]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[400px] bg-gray-900 flex flex-col items-center justify-center text-white p-6 rounded-2xl">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">
          ⚠️
        </div>
        <h3 className="text-lg font-bold mb-2">عذراً، فشل اتصال Jitsi</h3>
        <p className="text-gray-400 text-sm text-center max-w-md mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-0 bg-gray-950 rounded-none sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {loading && (
        <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <p className="text-gray-300 font-semibold text-sm animate-pulse">
            جارٍ تجهيز الغرفة المباشرة (Jitsi Meet)...
          </p>
          {!isTeacher && (
            <p className="text-gray-500 text-xs mt-2">
              🎧 ستنضم بوضع الصوت فقط — لتوفير الإنترنت والتركيز على التلاوة
            </p>
          )}
        </div>
      )}
      <div ref={containerRef} style={{ width, height }} className="w-full h-full" />
    </div>
  );
}
