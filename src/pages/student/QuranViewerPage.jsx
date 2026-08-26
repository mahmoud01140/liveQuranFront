import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronLeft, ChevronRight, Search, Check, Loader2, Volume2,
  Mic, Award, Eye, EyeOff, Sparkles, Repeat, HelpCircle, X, ExternalLink,
  BookMarked, Info
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import QuranAudioPlayer from '../../components/shared/QuranAudioPlayer';
import RecitationRecorder from '../../components/shared/RecitationRecorder';
import RecitationHistory from '../../components/shared/RecitationHistory';
import QURAN_SURAHS from '../../utils/quranData';
import { MUTASHABIHAT_ITEMS, getMutashabihForAyah } from '../../utils/mutashabihatData';
import useQuranAudio from '../../hooks/useQuranAudio';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function QuranViewerPage() {
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [verses, setVerses] = useState([]);
  const [memorizedVerses, setMemorizedVerses] = useState({});
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSurahList, setShowSurahList] = useState(true);
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // ── Memorization & Blur Mode states ────────────────────────
  const [isBlurMode, setIsBlurMode] = useState(false);
  const [revealedVerses, setRevealedVerses] = useState(new Set());

  // ── Mutashabihat Popover & Modal states ──────────────────────
  const [selectedMutashabih, setSelectedMutashabih] = useState(null);
  const [isMutashabihatModalOpen, setIsMutashabihatModalOpen] = useState(false);

  // ── Audio hook ──────────────────────────────────────────────
  const audio = useQuranAudio();
  const {
    currentVerseIndex, isPlaying, reciter, loadSurahAudio, playVerse,
    repeatCount, changeRepeatCount, changePlayMode, playMode
  } = audio;

  const versesContainerRef = useRef(null);
  const surah = QURAN_SURAHS.find(s => s.number === selectedSurah);

  // ── Fetch memorization map ──────────────────────────────────
  useEffect(() => {
    api.get('/daily-records/memorization-map')
      .then(res => setMemorizedVerses(res.data.memorizedVerses || {}))
      .catch(() => {});
  }, []);

  // ── Fetch surah text ────────────────────────────────────────
  const fetchVerses = useCallback(async (surahNum) => {
    setLoadingVerses(true);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`);
      const data = await res.json();
      if (data.code === 200) {
        setVerses(data.data.ayahs || []);
        // Reset revealed verses on surah change
        setRevealedVerses(new Set());
      }
    } catch {
      setVerses([]);
    }
    setLoadingVerses(false);
  }, []);

  useEffect(() => { fetchVerses(selectedSurah); }, [selectedSurah, fetchVerses]);

  // ── Load audio when surah or reciter changes ────────────────
  useEffect(() => {
    loadSurahAudio(selectedSurah, reciter);
  }, [selectedSurah, reciter, loadSurahAudio]);

  // ── Auto-scroll to playing verse ────────────────────────────
  useEffect(() => {
    if (currentVerseIndex >= 0) {
      const el = document.querySelector(`[data-verse-index="${currentVerseIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // If playing in blur mode, auto-reveal playing verse
      if (isBlurMode) {
        setRevealedVerses(prev => new Set(prev).add(currentVerseIndex));
      }
    }
  }, [currentVerseIndex, isBlurMode]);

  // ── Stats ───────────────────────────────────────────────────
  const memorizedSet = new Set(memorizedVerses[selectedSurah] || []);
  const totalVerses = surah?.verses || 0;
  const memorizedCount = memorizedSet.size;
  const progressPct = totalVerses > 0 ? Math.round((memorizedCount / totalVerses) * 100) : 0;

  const totalMemorizedVerses = Object.values(memorizedVerses).reduce((sum, arr) => sum + arr.length, 0);
  const totalQuranVerses = QURAN_SURAHS.reduce((sum, s) => sum + s.verses, 0);
  const overallPct = Math.round((totalMemorizedVerses / totalQuranVerses) * 100);
  const surahsComplete = QURAN_SURAHS.filter(s => {
    const mem = memorizedVerses[s.number];
    return mem && mem.length >= s.verses;
  }).length;

  const filteredSurahs = QURAN_SURAHS.filter(s =>
    !searchQuery || s.name.includes(searchQuery) || String(s.number).includes(searchQuery)
  );

  const goToSurah = (num) => {
    setSelectedSurah(num);
    setShowSurahList(false);
  };

  const handleVerseClick = (verseNum, index) => {
    if (isBlurMode && !revealedVerses.has(index)) {
      setRevealedVerses(prev => new Set(prev).add(index));
    }
    playVerse(verseNum);
  };

  const toggleVerseReveal = (index, e) => {
    e.stopPropagation();
    setRevealedVerses(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleRevealAll = () => {
    setRevealedVerses(new Set(verses.map((_, i) => i)));
    toast.success('تم إظهار جميع الآيات');
  };

  const handleHideAll = () => {
    setRevealedVerses(new Set());
    toast.success('تم إخفاء الآيات للاختبار الغيبي 👁️');
  };

  const handleSetLoop = (count) => {
    changePlayMode('repeat');
    changeRepeatCount(count);
    toast.success(`تم تعيين التكرار: ${count === 999 ? 'لا نهائي ∞' : `${count} مرات`}`);
  };

  return (
    <PageLayout>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-title flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary-500" /> المصحف المكرر وتثبيت المتشابهات 📖
            </h1>
            <p className="section-subtitle">
              تكرار الآيات، الاختبار الغيبي، وضبط المتشابهات اللفظية بأعلى درجات الإتقان
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mutashabihat Bank button */}
            <button
              onClick={() => setIsMutashabihatModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>بنك المتشابهات ({MUTASHABIHAT_ITEMS.length})</span>
            </button>

            {/* Recorder Button */}
            <button
              onClick={() => setIsRecorderOpen(true)}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <Mic className="w-3.5 h-3.5" /> تسجيل تلاوة
            </button>

            {/* History Button */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Award className="w-3.5 h-3.5 text-primary-500" /> سجل تلاواتي
            </button>
          </div>
        </div>
      </motion.div>

      {/* Progress Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'إجمالي المحفوظ', value: totalMemorizedVerses.toLocaleString(), sub: `من ${totalQuranVerses.toLocaleString()} آية`, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'نسبة الختم الكلية', value: `${overallPct}%`, sub: 'من المصحف الشريف', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'سور مكتملة الحفظ', value: surahsComplete, sub: `من 114 سورة`, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'السورة الحالية', value: surah?.name || '', sub: `${progressPct}% مكتمل`, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ y: -2 }} className="stat-card">
            <div className={`w-2 h-10 ${s.bg} rounded-full`} style={{ backgroundColor: 'currentColor' }} />
            <div>
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 font-bold">{s.label}</p>
              <p className="text-[10px] text-gray-400">{s.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-4 gap-5">
        {/* Surah list */}
        <div className={`lg:col-span-1 ${showSurahList ? '' : 'hidden lg:block'}`}>
          <div className="card-base overflow-hidden sticky top-20">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث عن سورة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-base pr-9 py-2 text-xs"
                />
              </div>
            </div>
            <div className="max-h-[58vh] overflow-y-auto divide-y divide-gray-50">
              {filteredSurahs.map(s => {
                const mem = memorizedVerses[s.number] || [];
                const pct = Math.round((mem.length / s.verses) * 100);
                const isComplete = mem.length >= s.verses;
                const isSelected = selectedSurah === s.number;
                return (
                  <button
                    key={s.number}
                    onClick={() => goToSurah(s.number)}
                    className={`w-full p-2.5 flex items-center gap-2.5 text-right transition-colors hover:bg-gray-50 ${
                      isSelected ? 'bg-primary-50/80 border-r-4 border-primary-500' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isComplete ? 'bg-emerald-600 text-white' : isSelected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isComplete ? <Check className="w-4 h-4" /> : s.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isComplete ? 'bg-emerald-500' : pct > 0 ? 'bg-primary-400' : ''
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold flex-shrink-0">{pct}%</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Quran Content Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Smart Toolbar (Memorization Mode, Loop Controls, Surah Navigator) */}
          <div className="card-base p-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => selectedSurah > 1 && setSelectedSurah(selectedSurah - 1)}
                  disabled={selectedSurah <= 1}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-30"
                  title="السورة السابقة"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
                <div className="text-center min-w-[130px]">
                  <h2 className="text-2xl font-black text-gray-900" style={{ fontFamily: "'Amiri', serif" }}>
                    سورة {surah?.name}
                  </h2>
                  <p className="text-xs text-gray-400 font-bold">{surah?.verses} آية — الجزء {surah?.juz || '—'}</p>
                </div>
                <button
                  onClick={() => selectedSurah < 114 && setSelectedSurah(selectedSurah + 1)}
                  disabled={selectedSurah >= 114}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-30"
                  title="السورة التالية"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Blur Mode Toggle & Reveal Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const nextMode = !isBlurMode;
                    setIsBlurMode(nextMode);
                    if (nextMode) handleHideAll();
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                    isBlurMode
                      ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {isBlurMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{isBlurMode ? 'وضع الاختبار الغيبي (مفعل)' : 'وضع الاختبار الغيبي'}</span>
                </button>

                {isBlurMode && (
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-xl p-0.5">
                    <button
                      onClick={handleRevealAll}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
                    >
                      كشف الكل
                    </button>
                    <button
                      onClick={handleHideAll}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
                    >
                      إخفاء الكل
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Ayah Repeat Loop Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-3 text-xs">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary-500" />
                <span className="font-bold text-gray-700">تكرار الآية للتثبيت:</span>
                <div className="flex items-center gap-1">
                  {[1, 3, 5, 10, 999].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => handleSetLoop(cnt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        repeatCount === cnt && playMode === 'repeat'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                    >
                      {cnt === 999 ? '∞' : `${cnt}x`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-gray-400 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> محفوظ
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" /> متشابهة
                </span>
                <span className="font-bold text-primary-600">{memorizedCount} / {totalVerses} آية</span>
              </div>
            </div>
          </div>

          {/* Verses Quran Flow */}
          {loadingVerses ? (
            <div className="card-base p-16 text-center">
              <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary-400 mb-3" />
              <p className="text-xs font-bold text-gray-500">جارٍ تحميل آيات السورة...</p>
            </div>
          ) : (
            <div className="card-base p-6 sm:p-8" ref={versesContainerRef}>
              {/* Bismillah */}
              {selectedSurah !== 1 && selectedSurah !== 9 && (
                <div className="text-center mb-8 pb-5 border-b border-gray-100">
                  <p className="text-2xl text-gray-800" style={{ fontFamily: "'Amiri', serif" }}>
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                </div>
              )}

              {/* Verses Flow with Blur & Mutashabihat */}
              <div
                className="leading-[3.2] text-right"
                dir="rtl"
                style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif" }}
              >
                {verses.map((verse, index) => {
                  const verseNum = verse.numberInSurah;
                  const isMemorized = memorizedSet.has(verseNum);
                  const isCurrentVerse = currentVerseIndex === index;
                  const isVersePlaying = isCurrentVerse && isPlaying;
                  const mutashabih = getMutashabihForAyah(selectedSurah, verseNum);
                  const isRevealed = !isBlurMode || revealedVerses.has(index);

                  return (
                    <span key={verse.number} className="inline-block relative group/verse mx-1" data-verse-index={index}>
                      {/* Verse Text */}
                      <span
                        onClick={() => handleVerseClick(verseNum, index)}
                        className={`text-2xl inline px-1.5 py-0.5 rounded-lg transition-all cursor-pointer select-none ${
                          !isRevealed
                            ? 'filter blur-[7px] bg-amber-50/70 text-gray-400 hover:blur-[3px]'
                            : isCurrentVerse
                            ? 'bg-primary-50 text-primary-900 font-bold ring-2 ring-primary-300'
                            : isMemorized
                            ? 'text-gray-900 bg-emerald-50/40 hover:bg-emerald-50'
                            : 'text-gray-800 hover:bg-gray-100'
                        }`}
                        title={
                          !isRevealed
                            ? 'انقر لكشف الآية واختبار حفظك غيباً'
                            : `آية ${verseNum} — اضغط للاستماع`
                        }
                      >
                        {verse.text}
                      </span>

                      {/* Verse Number Pill */}
                      <span
                        onClick={() => handleVerseClick(verseNum, index)}
                        className={`inline-flex items-center justify-center w-8 h-8 mx-1 rounded-full text-xs font-bold align-middle cursor-pointer transition-all ${
                          isVersePlaying
                            ? 'bg-gradient-to-br from-primary-500 to-emerald-500 text-white shadow-md scale-110'
                            : isCurrentVerse
                            ? 'bg-primary-500 text-white shadow-sm'
                            : isMemorized
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-500 hover:bg-primary-100 hover:text-primary-700'
                        }`}
                      >
                        {isVersePlaying ? '♪' : verseNum}
                      </span>

                      {/* Mutashabih Badge if exists */}
                      {mutashabih && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMutashabih(mutashabih);
                          }}
                          className="inline-flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full align-middle mx-1 shadow-sm transition-transform hover:scale-105"
                          title="توجد آية مشابهة — اضغط لمعرفة الفارق والضابط"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          متشابهة
                        </button>
                      )}

                      {/* Reveal Eye toggle if in blur mode */}
                      {isBlurMode && (
                        <button
                          type="button"
                          onClick={(e) => toggleVerseReveal(index, e)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] align-middle mx-0.5"
                          title={isRevealed ? 'إخفاء' : 'كشف'}
                        >
                          {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom spacer for sticky player */}
          <div className="h-44" />
        </div>
      </div>

      {/* ── Audio Player (sticky bottom) ──────────────────────── */}
      <QuranAudioPlayer
        audio={audio}
        surahName={surah?.name}
        totalSurahVerses={totalVerses}
      />

      {/* ── Mutashabihat Ayah Detail Popover / Modal ─────────── */}
      <AnimatePresence>
        {selectedMutashabih && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-2 border-amber-300 text-right"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">ضابط المتشابهات اللفظية 💡</h3>
                    <p className="text-[11px] text-gray-400">{selectedMutashabih.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMutashabih(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Verses comparison box */}
              <div className="space-y-3 mb-5">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                  <p className="font-bold text-primary-700 mb-1">
                    📖 سورة {surah?.name || ''} [آية {selectedMutashabih.verseNumber}]:
                  </p>
                  <p className="text-gray-900 text-sm font-semibold leading-relaxed" style={{ fontFamily: "'Amiri', serif" }}>
                    «{selectedMutashabih.verseText}»
                  </p>
                </div>

                <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 text-xs">
                  <p className="font-bold text-amber-800 mb-1">
                    📖 الموضع المشابه في سورة {selectedMutashabih.similarSurahName} [آية {selectedMutashabih.similarVerseNumber}]:
                  </p>
                  <p className="text-gray-900 text-sm font-semibold leading-relaxed" style={{ fontFamily: "'Amiri', serif" }}>
                    «{selectedMutashabih.similarVerseText}»
                  </p>
                </div>
              </div>

              {/* Golden Rule / Memory Hook */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-2xl shadow-md mb-4 text-xs sm:text-sm leading-relaxed">
                <p className="font-black text-amber-100 mb-1 flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> الفارق والضابط التثبيتي:
                </p>
                <p className="font-bold">{selectedMutashabih.rule}</p>
                {selectedMutashabih.difference && (
                  <p className="text-xs text-amber-100 mt-2 opacity-95">{selectedMutashabih.difference}</p>
                )}
              </div>

              <button
                onClick={() => setSelectedMutashabih(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
              >
                فهمت الضابط، إغلاق
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Mutashabihat Full Bank Modal ────────────────────── */}
      <AnimatePresence>
        {isMutashabihatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl text-right"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                    <BookMarked className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">بنك المتشابهات والضوابط الذهبية 🧠</h3>
                    <p className="text-xs text-gray-400">دليلك لضبط وتثبيت الآيات المتشابهة وحمايتها من التداخل</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMutashabihatModalOpen(false)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
                {MUTASHABIHAT_ITEMS.map((item, idx) => (
                  <div key={item.id} className="p-4 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                      <span>{item.category}</span>
                      <span className="text-[10px] bg-amber-100 px-2.5 py-0.5 rounded-full">ضابط #{idx + 1}</span>
                    </div>
                    <div className="text-xs space-y-1 text-gray-800">
                      <p><span className="font-bold text-primary-700">الموضع 1:</span> «{item.verseText}»</p>
                      <p><span className="font-bold text-amber-700">الموضع 2:</span> «{item.similarVerseText}»</p>
                    </div>
                    <div className="bg-amber-100/70 p-2.5 rounded-xl text-xs text-amber-950 font-bold">
                      {item.rule}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setIsMutashabihatModalOpen(false)}
                  className="btn-primary py-2 px-6 text-xs font-bold"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Recorders modals ─────────────────────────────────── */}
      <AnimatePresence>
        {isRecorderOpen && (
          <RecitationRecorder
            surah={surah}
            onClose={() => setIsRecorderOpen(false)}
          />
        )}
        {isHistoryOpen && (
          <RecitationHistory
            onClose={() => setIsHistoryOpen(false)}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
