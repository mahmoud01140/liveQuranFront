import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MessageSquare, Bookmark, BookmarkPlus, Plus, Trash2,
  Play, Pause, Clock, FileText, RotateCcw, Volume2,
  ChevronDown, ChevronUp, StickyNote,
} from 'lucide-react';
import useVideoProgress from '../../hooks/useVideoProgress';

/* ═══════════════════════════════════════════════════════════
   Helpers
═══════════════════════════════════════════════════════════ */
function detectType(url) {
  if (!url) return 'unknown';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/vimeo\.com/i.test(url))             return 'vimeo';
  return 'direct';
}

function youtubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([^&?#]+)/);
  return m ? m[1] : null;
}

function vimeoId(url) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function fmtTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

function parseTimeInput(str) {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function isVideoUrl(url) {
  if (!url) return false;
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url) ||
         /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

/* ═══════════════════════════════════════════════════════════
   VideoPlayer Component
═══════════════════════════════════════════════════════════ */
export default function VideoPlayer({ url, title, onClose }) {
  const videoRef = useRef(null);

  /* ── UI state ─────────────────────────────────────────── */
  const [showPanel, setShowPanel]               = useState(false);
  const [panelTab, setPanelTab]                 = useState('notes');
  const [currentTime, setCurrentTime]           = useState(0);
  const [duration, setDuration]                 = useState(0);
  const [isPlaying, setIsPlaying]               = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [noteText, setNoteText]                 = useState('');
  const [bookmarkLabel, setBookmarkLabel]       = useState('');
  const [manualTime, setManualTime]             = useState('');

  const type    = detectType(url);
  const isDirect = type === 'direct';

  /* ── Progress hook ────────────────────────────────────── */
  const {
    progress, savePosition, saveWatchedPercentage,
    addBookmark, removeBookmark,
    addNote, removeNote, getLastPosition,
  } = useVideoProgress(url);

  /* ── Direct video events ──────────────────────────────── */
  useEffect(() => {
    if (!isDirect) return;
    const v = videoRef.current;
    if (!v) return;

    const onMeta   = () => {
      setDuration(v.duration);
      const lp = getLastPosition();
      if (lp > 10 && lp < v.duration - 5) setShowResumePrompt(true);
    };
    const onUpdate = () => setCurrentTime(v.currentTime);
    const onPlay   = () => setIsPlaying(true);
    const onPause  = () => setIsPlaying(false);

    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('timeupdate',     onUpdate);
    v.addEventListener('play',           onPlay);
    v.addEventListener('pause',          onPause);

    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('timeupdate',     onUpdate);
      v.removeEventListener('play',           onPlay);
      v.removeEventListener('pause',          onPause);
    };
  }, [isDirect, getLastPosition]);

  /* ── Periodic save (every 5 s while playing) ──────────── */
  useEffect(() => {
    if (!isDirect || !isPlaying) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (v && v.currentTime > 0) {
        savePosition(v.currentTime);
        if (v.duration) saveWatchedPercentage(Math.round((v.currentTime / v.duration) * 100));
      }
    }, 5000);
    return () => clearInterval(id);
  }, [isDirect, isPlaying, savePosition, saveWatchedPercentage]);

  /* ── Save on unmount ──────────────────────────────────── */
  useEffect(() => () => {
    const v = videoRef.current;
    if (v && v.currentTime > 0) savePosition(v.currentTime);
  }, [savePosition]);

  /* ── Actions ──────────────────────────────────────────── */
  const seekTo = useCallback((sec) => {
    if (isDirect && videoRef.current) {
      videoRef.current.currentTime = sec;
      setCurrentTime(sec);
    }
  }, [isDirect]);

  const handleResume = () => { seekTo(getLastPosition()); setShowResumePrompt(false); };

  const handleAddNote = () => {
    const t = isDirect ? currentTime : parseTimeInput(manualTime);
    if (!noteText.trim()) return;
    addNote(t, noteText.trim());
    setNoteText('');
    setManualTime('');
  };

  const handleAddBookmark = () => {
    const t = isDirect ? currentTime : parseTimeInput(manualTime);
    addBookmark(t, bookmarkLabel.trim() || `مرجعية ${fmtTime(t)}`);
    setBookmarkLabel('');
    setManualTime('');
  };

  /* ── Render player area ───────────────────────────────── */
  const renderVideo = () => {
    switch (type) {
      case 'youtube':
        return (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId(url)}?rel=0`}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title || 'فيديو'}
          />
        );
      case 'vimeo':
        return (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId(url)}`}
            className="w-full aspect-video"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={title || 'فيديو'}
          />
        );
      default:
        return (
          <video
            ref={videoRef}
            src={url}
            controls
            className="w-full aspect-video bg-black"
            controlsList="nodownload"
          />
        );
    }
  };

  /* ── Main render ──────────────────────────────────────── */
  return (
    <div className="video-player-wrapper rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-white">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white">
        <h3 className="font-bold text-sm truncate flex-1 flex items-center gap-2">
          <Play className="w-4 h-4 text-primary-400 flex-shrink-0" />
          {title || 'مشغل الفيديو'}
        </h3>

        <div className="flex items-center gap-1">
          {/* Toggle notes panel */}
          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`p-1.5 rounded-lg transition-colors ${
              showPanel ? 'bg-primary-500/30 text-primary-300' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            title="ملاحظات ومرجعيات"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row">

        {/* Video area */}
        <div className={`${showPanel ? 'lg:w-2/3' : 'w-full'} transition-all duration-300`}>
          {renderVideo()}

          {/* Bookmark markers bar (direct video only) */}
          {isDirect && duration > 0 && progress?.bookmarks?.length > 0 && (
            <div className="relative h-1.5 bg-gray-100">
              {progress.bookmarks.map((b) => (
                <div
                  key={b.id}
                  className="absolute w-2.5 h-2.5 bg-amber-400 rounded-full -top-0.5 cursor-pointer
                             hover:scale-150 transition-transform border border-white shadow-sm z-10"
                  style={{ left: `${Math.min((b.time / duration) * 100, 99)}%` }}
                  onClick={() => seekTo(b.time)}
                  title={`${b.label} — ${fmtTime(b.time)}`}
                />
              ))}
            </div>
          )}

          {/* Resume prompt */}
          <AnimatePresence>
            {showResumePrompt && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2.5
                                bg-gradient-to-l from-primary-50 to-emerald-50 border-t border-primary-100">
                  <div className="flex items-center gap-2 text-sm">
                    <RotateCcw className="w-4 h-4 text-primary-500" />
                    <span className="text-gray-700 font-medium">
                      أكملت حتى <span className="font-bold text-primary-600">{fmtTime(getLastPosition())}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResume}
                      className="text-xs font-bold bg-primary-400 text-white px-3 py-1.5 rounded-lg
                                 hover:bg-primary-500 transition-colors"
                    >
                      استئناف
                    </button>
                    <button
                      onClick={() => setShowResumePrompt(false)}
                      className="text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg
                                 hover:bg-gray-100 transition-colors"
                    >
                      من البداية
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick actions bar */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50/50">
            {isDirect ? (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {fmtTime(currentTime)} / {fmtTime(duration)}
              </span>
            ) : (
              <span className="text-xs text-gray-400">
                {type === 'youtube' ? 'YouTube' : type === 'vimeo' ? 'Vimeo' : 'فيديو'}
              </span>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowPanel(true); setPanelTab('bookmarks'); handleAddBookmark(); }}
                className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1
                           hover:bg-amber-50 px-2 py-1 rounded-lg transition-colors"
                title="إضافة مرجعية هنا"
              >
                <BookmarkPlus className="w-3.5 h-3.5" /> مرجعية
              </button>
              <button
                onClick={() => { setShowPanel(true); setPanelTab('notes'); }}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1
                           hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                title="إضافة ملاحظة"
              >
                <StickyNote className="w-3.5 h-3.5" /> ملاحظة
              </button>
            </div>
          </div>
        </div>

        {/* ── Side panel (notes & bookmarks) ─────────────── */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:w-1/3 w-full border-t lg:border-t-0 lg:border-r border-gray-200
                         bg-gray-50/50 flex flex-col max-h-[500px] min-w-0 lg:min-w-[280px]"
            >
              {/* Tabs */}
              <div className="flex border-b border-gray-200 flex-shrink-0">
                <button
                  onClick={() => setPanelTab('notes')}
                  className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    panelTab === 'notes'
                      ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  ملاحظات ({progress?.notes?.length || 0})
                </button>
                <button
                  onClick={() => setPanelTab('bookmarks')}
                  className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    panelTab === 'bookmarks'
                      ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  مرجعيات ({progress?.bookmarks?.length || 0})
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {panelTab === 'notes' ? (
                  progress?.notes?.length > 0 ? (
                    progress.notes.map((n) => (
                      <div
                        key={n.id}
                        className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm
                                   hover:shadow-md transition-shadow group"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <button
                            onClick={() => seekTo(n.time)}
                            className="text-[11px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5
                                       rounded-full hover:bg-blue-100 transition-colors"
                          >
                            {fmtTime(n.time)}
                          </button>
                          <button
                            onClick={() => removeNote(n.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300
                                       hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{n.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-300">
                      <FileText className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs">لا توجد ملاحظات بعد</p>
                    </div>
                  )
                ) : (
                  progress?.bookmarks?.length > 0 ? (
                    progress.bookmarks.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm
                                   hover:shadow-md transition-shadow group flex items-center gap-2"
                      >
                        <button
                          onClick={() => seekTo(b.time)}
                          className="text-[11px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5
                                     rounded-full hover:bg-amber-100 transition-colors flex-shrink-0"
                        >
                          {fmtTime(b.time)}
                        </button>
                        <span className="text-xs text-gray-700 flex-1 truncate">{b.label}</span>
                        <button
                          onClick={() => removeBookmark(b.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300
                                     hover:text-red-400 transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-300">
                      <Bookmark className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs">لا توجد مرجعيات بعد</p>
                    </div>
                  )
                )}
              </div>

              {/* Add form */}
              <div className="p-3 border-t border-gray-200 flex-shrink-0 bg-white">
                {panelTab === 'notes' ? (
                  <div className="space-y-2">
                    {!isDirect && (
                      <input
                        type="text"
                        placeholder="الوقت (مثال: 5:30)"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg
                                   px-3 py-2 focus:ring-2 focus:ring-blue-300 outline-none text-right"
                        style={{ direction: 'ltr' }}
                      />
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={isDirect ? `ملاحظة عند ${fmtTime(currentTime)}` : 'اكتب ملاحظة...'}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                        className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg
                                   px-3 py-2 focus:ring-2 focus:ring-blue-300 outline-none text-right"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!noteText.trim()}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold
                                   hover:bg-blue-600 disabled:opacity-40 transition-colors flex-shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {!isDirect && (
                      <input
                        type="text"
                        placeholder="الوقت (مثال: 5:30)"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg
                                   px-3 py-2 focus:ring-2 focus:ring-amber-300 outline-none text-right"
                        style={{ direction: 'ltr' }}
                      />
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={isDirect ? `مرجعية عند ${fmtTime(currentTime)}` : 'عنوان المرجعية...'}
                        value={bookmarkLabel}
                        onChange={(e) => setBookmarkLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddBookmark()}
                        className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg
                                   px-3 py-2 focus:ring-2 focus:ring-amber-300 outline-none text-right"
                      />
                      <button
                        onClick={handleAddBookmark}
                        className="px-3 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold
                                   hover:bg-amber-600 transition-colors flex-shrink-0"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
