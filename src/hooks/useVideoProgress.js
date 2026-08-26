import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'quran_video_progress';

/* ── Storage helpers ──────────────────────────────────────── */
function getAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveAll(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function videoKey(url) {
  // Simple deterministic hash from URL
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) - h) + url.charCodeAt(i);
    h = h & h;
  }
  return 'v' + Math.abs(h).toString(36);
}

const EMPTY = { lastPosition: 0, watchedPercentage: 0, bookmarks: [], notes: [] };

/* ── Hook ─────────────────────────────────────────────────── */
export default function useVideoProgress(url) {
  const key = url ? videoKey(url) : null;

  const [progress, setProgress] = useState(() => {
    if (!key) return EMPTY;
    return getAll()[key] || { ...EMPTY };
  });

  // Re-sync when url changes
  useEffect(() => {
    if (!key) { setProgress({ ...EMPTY }); return; }
    setProgress(getAll()[key] || { ...EMPTY });
  }, [key]);

  /* helper: read → mutate → write → setState */
  const update = useCallback((mutator) => {
    if (!key) return;
    const all = getAll();
    const cur = all[key] || { ...EMPTY };
    const next = mutator(cur);
    all[key] = next;
    saveAll(all);
    setProgress(next);
  }, [key]);

  /* ── Public API ──────────────────────────────────────────── */
  const savePosition = useCallback((sec) =>
    update(p => ({ ...p, lastPosition: sec })),
  [update]);

  const saveWatchedPercentage = useCallback((pct) =>
    update(p => ({ ...p, watchedPercentage: Math.max(p.watchedPercentage || 0, pct) })),
  [update]);

  const addBookmark = useCallback((time, label) =>
    update(p => ({
      ...p,
      bookmarks: [...p.bookmarks, { id: Date.now(), time, label }]
        .sort((a, b) => a.time - b.time),
    })),
  [update]);

  const removeBookmark = useCallback((id) =>
    update(p => ({ ...p, bookmarks: p.bookmarks.filter(b => b.id !== id) })),
  [update]);

  const addNote = useCallback((time, text) =>
    update(p => ({
      ...p,
      notes: [...p.notes, { id: Date.now(), time, text, createdAt: new Date().toISOString() }]
        .sort((a, b) => a.time - b.time),
    })),
  [update]);

  const removeNote = useCallback((id) =>
    update(p => ({ ...p, notes: p.notes.filter(n => n.id !== id) })),
  [update]);

  const getLastPosition = useCallback(() => {
    if (!key) return 0;
    return (getAll()[key] || EMPTY).lastPosition || 0;
  }, [key]);

  return {
    progress, savePosition, saveWatchedPercentage,
    addBookmark, removeBookmark,
    addNote, removeNote, getLastPosition,
  };
}
