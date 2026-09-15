import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Lock, ChevronDown } from 'lucide-react';
import { HQ } from './primitives';

/* JourneyNode — one stage of the student's journey on the RTL thread.
   status: completed | current | upcoming | locked */

const DOT = 28;

export default function JourneyNode({ index, title, proof, status = 'upcoming', action, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const isCurrent = status === 'current';
  const isDone = status === 'completed';
  const isLocked = status === 'locked';
  const hasBody = Boolean(children);

  return (
    <div className="hq-node" style={{ display: 'flex', gap: 16, padding: '16px 0' }}>
      <span
        className={isCurrent ? 'hq-now-pulse' : ''}
        aria-hidden
        style={{
          width: DOT, height: DOT, borderRadius: 9999, flex: 'none', zIndex: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, background: HQ.SURFACE,
          border: `2px solid ${isDone || isCurrent ? HQ.MENTOR : HQ.LINE}`,
          color: isDone ? '#fff' : isCurrent ? HQ.MENTOR : HQ.MUTED,
          backgroundColor: isDone ? HQ.MENTOR : HQ.SURFACE,
        }}
      >
        {isDone ? <Check size={15} strokeWidth={3.5} /> : isLocked ? <Lock size={13} /> : index}
      </span>

      <div style={{ flex: 1, minWidth: 0, opacity: status === 'upcoming' ? 0.72 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: HQ.INK }}>{title}</h3>
            {proof && <p style={{ margin: '4px 0 0', fontSize: 14, color: HQ.MUTED }}>{proof}</p>}
          </div>
          {hasBody && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              style={{
                flex: 'none', minWidth: 48, minHeight: 48, borderRadius: 12,
                border: `1px solid ${HQ.LINE}`, background: HQ.SURFACE, color: HQ.INK,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronDown size={18} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            </button>
          )}
        </div>

        {hasBody && open && (
          <div style={{ marginTop: 12 }}>{children}</div>
        )}

        {action && <div style={{ marginTop: 12 }}>{action}</div>}
      </div>
    </div>
  );
}

export function HqActionLink({ to, children, primary = true, onClick }) {
  const style = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 48, padding: '12px 24px', borderRadius: 12, fontWeight: 800, fontSize: 15,
    background: primary ? HQ.MENTOR : HQ.SURFACE,
    color: primary ? '#fff' : HQ.MENTOR,
    border: primary ? 'none' : `1.5px solid ${HQ.MENTOR}`,
    textDecoration: 'none', cursor: 'pointer',
  };
  if (to) return <Link to={to} style={style}>{children}</Link>;
  return <button type="button" onClick={onClick} style={style}>{children}</button>;
}
