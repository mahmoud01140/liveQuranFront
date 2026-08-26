import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Square,
  Volume2, VolumeX, Repeat, Mic, Settings,
  ChevronUp, ChevronDown, Loader2, Minus, Plus,
  ChevronsRight, ChevronsLeft,
} from 'lucide-react';
import { RECITERS, PLAYBACK_RATES } from '../../hooks/useQuranAudio';

// ─── Play-mode config ────────────────────────────────────────
const PLAY_MODES = [
  { id: 'continuous',     label: 'متواصل',          icon: Play },
  { id: 'repeat',         label: 'تكرار',           icon: Repeat },
  { id: 'listen-repeat',  label: 'استماع ثم ترديد', icon: Mic },
];

// ─── Component ───────────────────────────────────────────────
export default function QuranAudioPlayer({ audio, surahName, totalSurahVerses }) {
  const [showSettings, setShowSettings] = useState(false);

  const {
    isPlaying, currentVerseNumber, reciter, playbackRate,
    isLoadingAudio, playMode, repeatCount, currentRepeat,
    repeatRange, isPausedForRepeat, audioProgress, volume,
    totalVerses,
    togglePlayPause, nextVerse, prevVerse, stop, playAll,
    changeReciter, changePlaybackRate, changeVolume,
    changePlayMode, changeRepeatCount, changeRepeatRange,
    continueAfterRepeat, seekTo,
  } = audio;

  const isActive   = currentVerseNumber > 0;
  const verseCount = totalSurahVerses || totalVerses;

  /* ── Progress bar click handler ───────────────────────────── */
  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // RTL: progress goes right-to-left
    const clickX = e.clientX - rect.left;
    const pct    = (clickX / rect.width) * 100;
    seekTo(pct);
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="audio-player-bar fixed bottom-0 left-0 right-0 z-50">

      {/* ── Listen-repeat overlay ───────────────────────────── */}
      <AnimatePresence>
        {isPausedForRepeat && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-gradient-to-l from-primary-500 to-emerald-600 text-white px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 animate-pulse" />
              <span className="font-bold text-sm">دورك الآن! رددّ الآية ثم اضغط التالي</span>
            </div>
            <button
              onClick={continueAfterRepeat}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm
                         px-4 py-2 rounded-xl text-sm font-bold transition-all"
            >
              التالي <ChevronsLeft className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Progress bar ────────────────────────────────────── */}
      <div
        className="h-1.5 bg-gray-200/60 cursor-pointer group relative"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-gradient-to-l from-primary-400 to-emerald-400 transition-all duration-150 relative"
          style={{ width: `${audioProgress}%` }}
        >
          {/* Seek thumb */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2
                          w-3.5 h-3.5 rounded-full bg-primary-500 shadow-md border-2 border-white
                          opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* ── Main controls row ───────────────────────────────── */}
      <div className="px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2">

        {/* Left: Surah / verse info */}
        <div className="flex items-center gap-2 min-w-0">
          {isLoadingAudio ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary-400 flex-shrink-0" />
          ) : (
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isPlaying ? 'bg-primary-400 animate-pulse' : 'bg-gray-300'}`} />
          )}
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-gray-800 truncate leading-tight">
              {surahName ? `سورة ${surahName}` : 'المشغل الصوتي'}
            </p>
            {isActive && (
              <p className="text-[10px] sm:text-xs text-gray-400 leading-tight">
                آية {currentVerseNumber} من {verseCount}
              </p>
            )}
          </div>
        </div>

        {/* Center: Transport controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Prev */}
          <button
            onClick={prevVerse}
            disabled={!isActive || currentVerseNumber <= 1}
            className="p-1.5 sm:p-2 rounded-xl text-gray-500 hover:bg-gray-100
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="الآية السابقة"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlayPause}
            disabled={isLoadingAudio || totalVerses === 0}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center
                       bg-gradient-to-br from-primary-400 to-emerald-500 text-white shadow-lg
                       hover:shadow-xl hover:scale-105 active:scale-95 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isLoadingAudio ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 mr-[-2px]" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={nextVerse}
            disabled={!isActive || currentVerseNumber >= verseCount}
            className="p-1.5 sm:p-2 rounded-xl text-gray-500 hover:bg-gray-100
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="الآية التالية"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Stop */}
          {isActive && (
            <button
              onClick={stop}
              className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:bg-red-50
                         hover:text-red-500 transition-colors"
              title="إيقاف"
            >
              <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {/* Right: Settings toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-xl transition-colors ${
            showSettings
              ? 'bg-primary-50 text-primary-500'
              : 'text-gray-400 hover:bg-gray-100'
          }`}
          title="إعدادات المشغل"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
          {showSettings
            ? <ChevronDown className="w-3 h-3 inline mr-0.5" />
            : <ChevronUp   className="w-3 h-3 inline mr-0.5" />
          }
        </button>
      </div>

      {/* ── Expandable settings panel ───────────────────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="px-3 sm:px-5 py-3 space-y-3">

              {/* Row 1: Reciter + Speed */}
              <div className="flex flex-wrap gap-3 items-end">
                {/* Reciter */}
                <div className="flex-1 min-w-[160px]">
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">📖 القارئ</label>
                  <select
                    value={reciter}
                    onChange={(e) => changeReciter(e.target.value)}
                    className="w-full text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl
                               px-3 py-2 focus:ring-2 focus:ring-primary-300 focus:border-transparent
                               outline-none transition-all cursor-pointer text-right"
                  >
                    {RECITERS.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Speed */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">⚡ السرعة</label>
                  <div className="flex gap-1">
                    {PLAYBACK_RATES.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          playbackRate === rate
                            ? 'bg-primary-400 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume */}
                <div className="hidden sm:block">
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block">🔊 الصوت</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeVolume(volume > 0 ? 0 : 1)}
                      className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                    >
                      {volume === 0
                        ? <VolumeX  className="w-4 h-4" />
                        : <Volume2  className="w-4 h-4" />
                      }
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => changeVolume(parseFloat(e.target.value))}
                      className="audio-range-slider w-20"
                      style={{ direction: 'ltr' }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Play mode */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1.5 block">🔄 وضع التشغيل</label>
                <div className="flex gap-2 flex-wrap">
                  {PLAY_MODES.map((m) => {
                    const Icon   = m.icon;
                    const active = playMode === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => changePlayMode(m.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold
                                    transition-all ${
                          active
                            ? 'bg-primary-400 text-white shadow-md'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3: Repeat-specific settings */}
              {playMode === 'repeat' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3"
                >
                  <div className="flex flex-wrap gap-4 items-end">
                    {/* Range */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-semibold">من آية</span>
                      <input
                        type="number"
                        min="1"
                        max={verseCount}
                        value={repeatRange.from}
                        onChange={(e) => {
                          const v = Math.max(1, Math.min(+e.target.value, verseCount));
                          changeRepeatRange(v, Math.max(v, repeatRange.to));
                        }}
                        className="w-16 text-center text-sm bg-white border border-gray-200
                                   rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-300 outline-none"
                        style={{ direction: 'ltr' }}
                      />
                      <span className="text-xs text-gray-500 font-semibold">إلى آية</span>
                      <input
                        type="number"
                        min={repeatRange.from}
                        max={verseCount}
                        value={repeatRange.to}
                        onChange={(e) => {
                          const v = Math.max(repeatRange.from, Math.min(+e.target.value, verseCount));
                          changeRepeatRange(repeatRange.from, v);
                        }}
                        className="w-16 text-center text-sm bg-white border border-gray-200
                                   rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-300 outline-none"
                        style={{ direction: 'ltr' }}
                      />
                    </div>

                    {/* Repeat count */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-semibold">عدد التكرار</span>
                      <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => changeRepeatCount(Math.max(1, repeatCount - 1))}
                          className="px-2 py-1.5 hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <span className="px-3 py-1.5 text-sm font-bold text-gray-800 min-w-[32px] text-center">
                          {repeatCount}
                        </span>
                        <button
                          onClick={() => changeRepeatCount(Math.min(50, repeatCount + 1))}
                          className="px-2 py-1.5 hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* Current repeat indicator */}
                    {currentRepeat > 0 && (
                      <span className="badge-green text-xs font-bold">
                        التكرار {currentRepeat + 1} من {repeatCount}
                      </span>
                    )}
                  </div>

                  {/* Quick action: repeat current verse */}
                  {isActive && (
                    <button
                      onClick={() => {
                        changeRepeatRange(currentVerseNumber, currentVerseNumber);
                        playAll(currentVerseNumber);
                      }}
                      className="mt-2 text-xs text-amber-700 hover:text-amber-900
                                 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Repeat className="w-3 h-3" />
                      كرّر الآية الحالية ({currentVerseNumber}) {repeatCount} مرات
                    </button>
                  )}
                </motion.div>
              )}

              {/* Listen-repeat description */}
              {playMode === 'listen-repeat' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-3
                             flex items-center gap-2"
                >
                  <Mic className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700 font-medium">
                    سيتم تشغيل كل آية ثم التوقف تلقائياً لتردد خلف القارئ.
                    اضغط "التالي" للانتقال للآية التالية.
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
