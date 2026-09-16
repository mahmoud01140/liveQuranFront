import { Mic, ChevronDown, Hand } from 'lucide-react';
import { HqAvatar, HqStars, HQ } from './primitives';

/* Al-Halaqa live primitives. Presentation only — all data and handlers
   come from the page through props. No mock data anywhere. */

export function SpeakerStage({ speaker, isMe, teacherName, isLive, myTurnLabel = 'دورك الآن' }) {
  const statusText = speaker ? (isMe ? myTurnLabel : 'يُسمّع الآن') : null;
  return (
    <div className="halaqa-stage hq-speaker" role="status" aria-live="polite"
      aria-label={speaker ? `يُسمّع الآن: ${speaker.firstName}` : 'بانتظار بدء التسميع'}>
      <div className="hq-speaker-top">
        <span className="hq-speaker-live">
          <span className="hq-live-dot" aria-hidden />
          {isLive ? 'حلقة جارية الآن' : 'بانتظار البث'}
        </span>

        {speaker && (
          <span className="hq-speaker-avm" aria-hidden>
            <HqAvatar firstName={speaker.firstName} lastName={speaker.lastName} size={44} ring={isMe} />
          </span>
        )}
        {speaker && (
          <span className="hq-speaker-avd" aria-hidden>
            <HqAvatar firstName={speaker.firstName} lastName={speaker.lastName} size={72} ring={isMe} />
          </span>
        )}

        {speaker ? (
          <div className="hq-speaker-id">
            <p className="hq-speaker-name">
              {speaker.firstName} {speaker.lastName}
            </p>
            <p className="hq-speaker-sub" style={isMe ? { color: '#E2EFE7' } : undefined}>
              {statusText}
              {teacherName && <span className="hq-speaker-tsuffix"> • مع {teacherName}</span>}
            </p>
            {teacherName && (
              <p className="hq-speaker-teacher">
                مع {teacherName}
              </p>
            )}
          </div>
        ) : (
          <div className="hq-speaker-id">
            <p className="hq-speaker-name">لم يبدأ التسميع بعد</p>
            <p className="hq-speaker-sub">
              سيظهر هنا اسم من يُسمّع فور بدء الدور
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function CircleStrip({ members = [], currentId }) {
  if (!members.length) return null;
  return (
    <div aria-label="أعضاء الحلقة" style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '4px 2px' }} className="no-scrollbar">
      {members.map(m => {
        const id = (m.student?._id || m.student || m._id)?.toString();
        const s = m.student && typeof m.student === 'object' ? m.student : m;
        const active = id && id === currentId;
        return (
          <span key={id || s.firstName} title={`${s.firstName || ''} ${s.lastName || ''}`}
            style={{ flex: 'none', opacity: active ? 1 : 0.75 }}>
            <HqAvatar firstName={s.firstName} lastName={s.lastName} size={40} ring={active} />
          </span>
        );
      })}
    </div>
  );
}

/* One ordered queue — list, never cards */
export function QueueList({ queue = [], myId, currentId, onRaiseHand, raisingHand, compact = false }) {
  const handFirst = [...queue].sort((a, b) => {
    const rank = s => (s === 'reciting' ? 0 : s === 'hand_raised' ? 1 : s === 'completed' ? 3 : 2);
    return rank(a.status) - rank(b.status);
  });
  if (!handFirst.length) {
    return (
      <div style={{ padding: '20px 8px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: HQ.INK }}>الطابور فارغ الآن</p>
        <p style={{ margin: '4px 0 12px', fontSize: 13, color: HQ.MUTED }}>ارفع يدك ليضعك المعلم في الدور</p>
        {onRaiseHand && (
          <button type="button" onClick={onRaiseHand} disabled={raisingHand}
            className="hq-action"
            style={{ background: HQ.MENTOR, color: '#fff', padding: '0 20px', fontSize: 14, opacity: raisingHand ? 0.6 : 1 }}>
            <Hand size={17} /> طلب التسميع
          </button>
        )}
      </div>
    );
  }
  const statusLabel = { reciting: 'يُسمّع الآن', hand_raised: 'رفع اليد', waiting: 'في الدور', completed: 'أتمّ التسميع' };
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {handFirst.map((item, i) => {
        const s = item.student && typeof item.student === 'object' ? item.student : {};
        const id = (s._id || item.student)?.toString();
        const mine = id === myId;
        const now = item.status === 'reciting' || id === currentId;
        return (
          <li key={id || i} style={{
            display: 'flex', alignItems: 'center', gap: 12, minHeight: 56,
            padding: compact ? '8px 4px' : '10px 4px',
            borderBottom: `1px solid ${HQ.LINE}`,
          }}>
            <span style={{
              flex: 'none', width: 32, height: 32, borderRadius: 9999,
              background: now ? HQ.MENTOR : HQ.PAPER, color: now ? '#fff' : HQ.MUTED,
              border: `1px solid ${now ? HQ.MENTOR : HQ.LINE}`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14,
            }} aria-hidden>{i + 1}</span>
            <HqAvatar firstName={s.firstName} lastName={s.lastName} size={36} ring={now} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 800, fontSize: 15, color: HQ.INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.firstName} {s.lastName}{mine ? ' (أنت)' : ''}
              </span>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: now ? HQ.MENTOR : HQ.MUTED }}>
                {statusLabel[item.status] || item.status}
                {item.status === 'completed' && item.evaluation?.score ? ` — ${item.evaluation.score}%` : ''}
              </span>
            </span>
            {now && <Mic size={17} color={HQ.MENTOR} aria-label="يتحدث الآن" />}
          </li>
        );
      })}
    </ol>
  );
}

export function WirdCard({ task, evaluation, open, onToggle }) {
  const rows = [
    task?.newHifz?.surahName && { label: 'الحفظ الجديد', value: `سورة ${task.newHifz.surahName} — الآيات ${task.newHifz.fromVerse} إلى ${task.newHifz.toVerse}` },
    task?.nearRevision?.surahName && { label: 'الماضي القريب', value: `سورة ${task.nearRevision.surahName} — الآيات ${task.nearRevision.fromVerse} إلى ${task.nearRevision.toVerse}` },
    task?.cumulativeRevision?.surahName && { label: 'الورد التمكيني', value: `${task.cumulativeRevision.surahName}` },
    task?.additionalExercise?.details && { label: 'تدريب', value: task.additionalExercise.details },
  ].filter(Boolean);
  return (
    <section aria-label="وردك اليوم" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 16 }}>
      <button type="button" onClick={onToggle} aria-expanded={open}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: HQ.INK }}>وردك اليوم</span>
        <ChevronDown size={18} color={HQ.MUTED} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          {rows.length ? rows.map((r, i) => (
            <div key={i} style={{ padding: '8px 0', borderTop: i ? `1px solid ${HQ.LINE}` : 'none' }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: HQ.MENTOR }}>{r.label}</span>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: HQ.INK }}>{r.value}</span>
            </div>
          )) : (
            <p style={{ fontSize: 14, color: HQ.MUTED }}>تابع مع المعلم لتحديد وردك.</p>
          )}
          {evaluation && (
            <div style={{ marginTop: 8, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
              <HqStars value={evaluation.rating || 5} />
              <p style={{ margin: '4px 0 0', fontWeight: 900, color: HQ.MENTOR }}>درجة التسميع: {evaluation.score || 100}%</p>
              {evaluation.notes && <p style={{ margin: '4px 0 0', fontSize: 13, color: HQ.MUTED }}>{evaluation.notes}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* Compact presence — opens the drawer, never eats stage space */
export function PresenceBar({ state = 'joined', onOpen, pinging = false }) {
  const label = pinging ? 'المعلم ينادي الحضور — أكّد وجودك' : state === 'joined' ? 'أنت في الحلقة الآن' : 'بانتظار الانضمام';
  return (
    <button type="button" onClick={onOpen}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 48,
        background: HQ.SURFACE, border: `1px solid ${pinging ? HQ.MENTOR : HQ.LINE}`,
        borderRadius: 9999, padding: '8px 16px', fontSize: 14, fontWeight: 700, color: HQ.INK,
        cursor: 'pointer', width: '100%', justifyContent: 'center',
      }}>
      <span className={pinging ? '' : 'hq-live-dot'} aria-hidden
        style={pinging ? { width: 10, height: 10, borderRadius: 9999, background: HQ.MENTOR, flex: 'none' } : undefined} />
      {label}
    </button>
  );
}
