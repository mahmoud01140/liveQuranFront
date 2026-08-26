import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Reciters ────────────────────────────────────────────────
export const RECITERS = [
  { id: 'ar.alafasy',              name: 'مشاري العفاسي' },
  { id: 'ar.abdurrahmaansudais',   name: 'عبدالرحمن السديس' },
  { id: 'ar.abdulsamad',           name: 'عبدالباسط عبدالصمد' },
  { id: 'ar.shaatree',             name: 'أبو بكر الشاطري' },
  { id: 'ar.abdullahbasfar',       name: 'عبدالله بصفر' },
  { id: 'ar.ahmedajamy',           name: 'أحمد العجمي' },
];

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ─── Hook ────────────────────────────────────────────────────
export default function useQuranAudio() {
  const audioRef = useRef(null);

  /* ── UI state ─────────────────────────────────────────────── */
  const [audioData, setAudioData]               = useState([]);
  const [isPlaying, setIsPlaying]               = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(-1);
  const [reciter, setReciter]                   = useState('ar.alafasy');
  const [playbackRate, setPlaybackRate]         = useState(1);
  const [isLoadingAudio, setIsLoadingAudio]     = useState(false);
  const [playMode, setPlayMode]                 = useState('continuous');
  const [repeatCount, setRepeatCount]           = useState(3);
  const [currentRepeat, setCurrentRepeat]       = useState(0);
  const [repeatRange, setRepeatRange]           = useState({ from: 1, to: 1 });
  const [isPausedForRepeat, setIsPausedForRepeat] = useState(false);
  const [audioProgress, setAudioProgress]       = useState(0);
  const [volume, setVolume]                     = useState(1);

  /* ── Live ref (avoids stale closures in audio callbacks) ─── */
  const live = useRef({
    audioData: [], currentVerseIndex: -1, playMode: 'continuous',
    repeatCount: 3, currentRepeat: 0, repeatRange: { from: 1, to: 1 },
    playbackRate: 1, volume: 1, isPlaying: false,
  });

  // Keep live ref in sync with every render
  useEffect(() => {
    live.current = {
      audioData, currentVerseIndex, playMode,
      repeatCount, currentRepeat, repeatRange,
      playbackRate, volume, isPlaying,
    };
  });

  /* ── Internal helpers ─────────────────────────────────────── */
  const playVerseByIndex = useCallback((index) => {
    const audio = audioRef.current;
    const data  = live.current.audioData;
    if (!audio || !data[index]) return;

    audio.src          = data[index].audio;
    audio.playbackRate = live.current.playbackRate;
    audio.volume       = live.current.volume;
    audio.play().catch(() => {});

    setCurrentVerseIndex(index);
    setIsPlaying(true);
    setIsPausedForRepeat(false);
    setAudioProgress(0);
  }, []);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    setIsPlaying(false);
    setCurrentVerseIndex(-1);
    setAudioProgress(0);
    setIsPausedForRepeat(false);
    setCurrentRepeat(0);
  }, []);

  /* ── Initialise <audio> & wire events (once) ──────────────── */
  useEffect(() => {
    const audio  = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const onEnded = () => {
      const s = live.current;

      if (s.playMode === 'continuous') {
        if (s.currentVerseIndex < s.audioData.length - 1) {
          playVerseByIndex(s.currentVerseIndex + 1);
        } else {
          stopPlayback();
        }

      } else if (s.playMode === 'repeat') {
        const rangeFrom = s.repeatRange.from - 1; // 0-based
        const rangeTo   = s.repeatRange.to   - 1;

        if (s.currentVerseIndex < rangeTo) {
          playVerseByIndex(s.currentVerseIndex + 1);
        } else if (s.currentRepeat + 1 < s.repeatCount) {
          const next = s.currentRepeat + 1;
          live.current.currentRepeat = next;
          setCurrentRepeat(next);
          playVerseByIndex(rangeFrom);
        } else {
          live.current.currentRepeat = 0;
          setCurrentRepeat(0);
          stopPlayback();
        }

      } else if (s.playMode === 'listen-repeat') {
        setIsPlaying(false);
        setIsPausedForRepeat(true);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended',      onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended',      onEnded);
      audio.pause();
      audio.src = '';
    };
  }, [playVerseByIndex, stopPlayback]);

  /* ── Load audio for a surah + reciter ─────────────────────── */
  const loadSurahAudio = useCallback(async (surahNumber, reciterId) => {
    stopPlayback();
    setIsLoadingAudio(true);
    try {
      const res  = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/${reciterId}`,
      );
      const json = await res.json();
      if (json.code === 200) {
        const verses = json.data.ayahs.map((a) => ({
          audio:         a.audio,
          numberInSurah: a.numberInSurah,
          number:        a.number,
        }));
        setAudioData(verses);
        live.current.audioData = verses;
      }
    } catch (err) {
      console.error('Failed to load audio:', err);
      setAudioData([]);
      live.current.audioData = [];
    }
    setIsLoadingAudio(false);
  }, [stopPlayback]);

  /* ── Public actions ───────────────────────────────────────── */
  const playVerse = useCallback(
    (verseNum) => playVerseByIndex(verseNum - 1),
    [playVerseByIndex],
  );

  const playAll = useCallback(
    (fromVerse = 1) => playVerseByIndex(fromVerse - 1),
    [playVerseByIndex],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && live.current.currentVerseIndex >= 0) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (live.current.isPlaying) { pause(); }
    else if (live.current.currentVerseIndex >= 0) { resume(); }
    else { playVerseByIndex(0); }
  }, [pause, resume, playVerseByIndex]);

  const nextVerse = useCallback(() => {
    const { currentVerseIndex: i, audioData: d } = live.current;
    if (i < d.length - 1) playVerseByIndex(i + 1);
  }, [playVerseByIndex]);

  const prevVerse = useCallback(() => {
    if (live.current.currentVerseIndex > 0)
      playVerseByIndex(live.current.currentVerseIndex - 1);
  }, [playVerseByIndex]);

  const continueAfterRepeat = useCallback(() => {
    const { currentVerseIndex: i, audioData: d } = live.current;
    if (i < d.length - 1) playVerseByIndex(i + 1);
    else stopPlayback();
  }, [playVerseByIndex, stopPlayback]);

  /* ── Setters (also update live ref / audio element) ──────── */
  const changeReciter = useCallback((id) => setReciter(id), []);

  const changePlaybackRate = useCallback((rate) => {
    setPlaybackRate(rate);
    live.current.playbackRate = rate;
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, []);

  const changeVolume = useCallback((v) => {
    setVolume(v);
    live.current.volume = v;
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const changePlayMode = useCallback((mode) => {
    setPlayMode(mode);
    live.current.playMode = mode;
    setCurrentRepeat(0);
    live.current.currentRepeat = 0;
    setIsPausedForRepeat(false);
  }, []);

  const changeRepeatCount = useCallback((n) => {
    setRepeatCount(n);
    live.current.repeatCount = n;
    setCurrentRepeat(0);
    live.current.currentRepeat = 0;
  }, []);

  const changeRepeatRange = useCallback((from, to) => {
    const r = { from, to };
    setRepeatRange(r);
    live.current.repeatRange = r;
    setCurrentRepeat(0);
    live.current.currentRepeat = 0;
  }, []);

  const seekTo = useCallback((pct) => {
    const a = audioRef.current;
    if (a && a.duration) a.currentTime = (pct / 100) * a.duration;
  }, []);

  /* ── Return ───────────────────────────────────────────────── */
  return {
    // state
    audioData, isPlaying, currentVerseIndex,
    currentVerseNumber: currentVerseIndex + 1,
    reciter, playbackRate, isLoadingAudio,
    playMode, repeatCount, currentRepeat,
    repeatRange, isPausedForRepeat, audioProgress, volume,
    totalVerses: audioData.length,

    // actions
    loadSurahAudio, playVerse, playAll,
    pause, resume, togglePlayPause, stop: stopPlayback,
    nextVerse, prevVerse, continueAfterRepeat,
    changeReciter, changePlaybackRate, changeVolume,
    changePlayMode, changeRepeatCount, changeRepeatRange, seekTo,
  };
}
