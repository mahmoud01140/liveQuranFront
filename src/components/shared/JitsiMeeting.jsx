import { useEffect, useRef, useState } from 'react';

/**
 * JitsiMeeting Component
 * Embeds a Jitsi Meet video conference inside the React application using the Jitsi External API.
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const domain = import.meta.env.VITE_JITSI_DOMAIN || 'meet.element.io';

  // Sanitize room name for Jitsi compatibility
  const sanitizedRoomName = (roomName || 'quran_platform_session')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();

  useEffect(() => {
    let isMounted = true;

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

        // Clean up any existing instance
        if (jitsiApiRef.current) {
          jitsiApiRef.current.dispose();
          jitsiApiRef.current = null;
        }

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
            startWithAudioMuted: !isTeacher,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            lobbyModeEnabled: false,
            enableWelcomePage: false,
            enableClosePage: false,
            defaultLanguage: 'ar',
            toolbarButtons: [
              'camera',
              'chat',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'handraising',
              'microphone',
              'noisesuppression',
              'participants-pane',
              'raisehand',
              'select-background',
              'settings',
              'shading',
              'sharedvideo',
              'tileview',
              'toggle-camera',
              'videoquality',
              'hangup',
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: '#111827',
            TOOLBAR_ALWAYS_VISIBLE: true,
            MOBILE_APP_PROMO: false,
          },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        if (onApiReady) {
          onApiReady(api);
        }

        api.addEventListener('readyToClose', () => {
          if (onLeave) onLeave();
        });

        api.addEventListener('videoConferenceLeft', () => {
          if (onLeave) onLeave();
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
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
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
    <div className="relative w-full h-full min-h-[500px] bg-gray-950 rounded-2xl overflow-hidden shadow-2xl">
      {loading && (
        <div className="absolute inset-0 z-10 bg-gray-900 flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <p className="text-gray-300 font-semibold text-sm animate-pulse">
            جارٍ تجهيز الغرفة المباشرة (Jitsi Meet)...
          </p>
        </div>
      )}
      <div ref={containerRef} style={{ width, height }} className="w-full h-full" />
    </div>
  );
}
