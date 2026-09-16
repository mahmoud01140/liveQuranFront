import { useState, useEffect } from 'react';
import { Users, Calendar, Clock, AlertTriangle, Lock, CreditCard, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useSocket from '../../hooks/useSocket';
import { joinGroupRoom } from '../../services/socket';
import { DAYS_AR, SESSION_TYPES } from '../../utils/constants';
import { getInitials, getAvatarColor, formatTime } from '../../utils/helpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../services/api';
import '../../components/halaqa/halaqa.css';
import { HQ, HqBadge } from '../../components/halaqa/primitives';
import { HqActionLink } from '../../components/halaqa/JourneyNode';

/* My group — people and rhythm. Same data, socket updates and links
   as before; only the visual layer changed. */

export default function MyGroupPage() {
  const { user } = useAuthStore();
  const { group, students, fetchMyGroup, fetchGroupStudents, isLoading } = useGroupStore();
  const [subscription, setSubscription] = useState(null);

  const groupId = user?.group?._id || user?.group;

  // Listen for real-time group updates (days / schedule)
  useSocket({
    'group-updated': ({ type }) => {
      if (groupId) fetchMyGroup(groupId);
      const label = type === 'days' ? 'أيام الدراسة' : 'الجدول الأسبوعي';
      toast(`تم تحديث ${label} من قِبَل الإدارة`, { duration: 4000 });
    },
    'subscription-updated': () => {
      fetchSubscriptionStatus();
    }
  });

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await api.get('/payments/my-history');
      if (res.data?.subscription) {
        setSubscription(res.data.subscription);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (groupId) {
      joinGroupRoom(groupId);
      fetchMyGroup(groupId);
      fetchGroupStudents(groupId);
    }
    fetchSubscriptionStatus();
  }, [user?.group]);

  const sheet = {
    background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 18,
    padding: 'clamp(16px, 3vw, 28px)',
  };
  const h2 = { margin: '0 0 12px', fontSize: 18, fontWeight: 800, color: HQ.INK };
  const panel = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18,
    padding: 'clamp(16px, 3vw, 24px)',
  };

  if (isLoading) return (
    <PageLayout>
      <div className="halaqa" style={{ ...sheet, maxWidth: 820, margin: '0 auto' }}>
        <div aria-label="جارٍ تحميل مجموعتك">
          <div className="hq-skeleton" style={{ height: 24, width: '40%', marginBottom: 16 }} />
          <div className="hq-skeleton" style={{ height: 52, width: '100%', marginBottom: 8 }} />
          <div className="hq-skeleton" style={{ height: 52, width: '100%', marginBottom: 8 }} />
          <div className="hq-skeleton" style={{ height: 52, width: '100%' }} />
        </div>
      </div>
    </PageLayout>
  );

  if (!group) return (
    <PageLayout>
      <div className="halaqa" style={{ ...sheet, maxWidth: 820, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
          <Users size={44} color={HQ.LINE} style={{ margin: '0 auto 12px' }} aria-hidden />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: HQ.INK, margin: '0 0 8px' }}>لم تُعيَّن في مجموعة بعد</h1>
          <p style={{ color: HQ.MUTED, fontSize: 14, margin: 0 }}>سيتم تعيينك في مجموعة من قِبَل الإدارة قريباً</p>
        </div>
      </div>
    </PageLayout>
  );

  const isExpired = subscription?.isExpired;
  const isExpiringSoon = subscription?.isExpiringSoon;
  const isTrial = subscription?.isTrial;
  const trialUsed = (subscription?.trialSessionsAttended || 0) >= (subscription?.trialSessionsAllowed || 1);

  const alertRow = {
    display: 'flex', alignItems: 'center', gap: 12,
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 12,
    padding: '10px 14px', marginBottom: 12,
  };
  const chip = {
    width: 34, height: 34, borderRadius: 10, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', flex: 'none',
  };

  return (
    <PageLayout>
      <div className="halaqa" style={{ ...sheet, maxWidth: 820, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 14, color: HQ.MUTED }}>حلقتك ومعلمك وزملاؤك</p>
        <h1 style={{ margin: '2px 0 4px', fontSize: 32, fontWeight: 800, color: HQ.INK }}>مجموعتي الدراسية</h1>
        <p style={{ margin: '0 0 20px', fontSize: 15, color: HQ.MUTED }}>{group.name}</p>

        {/* ─── Subscription Status Alerts ─────────────────────────────── */}
        {isExpiringSoon && (
          <div role="status" style={alertRow}>
            <span style={{ ...chip, background: HQ.PAPER }}>
              <AlertTriangle size={17} color="#B45309" aria-hidden />
            </span>
            <span style={{ flex: 1, fontSize: 14, color: HQ.INK }}>
              يتبقى <strong>{subscription?.daysRemaining} أيام</strong> على انتهاء اشتراكك — جدّد لضمان عدم تعليق الحضور.
            </span>
            <Link to="/student/subscription" style={{ fontSize: 14, fontWeight: 800, color: '#B45309', whiteSpace: 'nowrap' }}>التجديد</Link>
          </div>
        )}

        {isExpired && (
          <div role="alert" style={alertRow}>
            <span style={{ ...chip, background: HQ.PAPER }}>
              <Lock size={17} color="#C2410C" aria-hidden />
            </span>
            <span style={{ flex: 1, fontSize: 14, color: HQ.INK }}>توقّف حضور الجلسات لانتهاء الاشتراك.</span>
            <Link to="/student/subscription" style={{ fontSize: 14, fontWeight: 800, color: '#C2410C', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <CreditCard size={15} aria-hidden /> السداد
            </Link>
          </div>
        )}

        {isTrial && !trialUsed && (
          <div role="status" style={alertRow}>
            <span style={{ ...chip, background: '#E2EFE7' }}>
              <Gift size={17} color={HQ.MENTOR} aria-hidden />
            </span>
            <span style={{ flex: 1, fontSize: 14, color: HQ.INK }}>متاح لك حضور أول محاضرة مباشرة مجاناً — جرّب الجلسة الأولى مع المعلم.</span>
            <HqActionLink to="/student/live">الانتقال للبث</HqActionLink>
          </div>
        )}

        {/* ─── Group & teacher ────────────────────────────────────────── */}
        <section aria-label="معلومات المجموعة" style={{ ...panel, marginBottom: 16 }}>
          <h2 style={h2}>معلومات المجموعة</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
              <span aria-hidden style={{ ...chip, background: HQ.PAPER }}>
                <Users size={17} color={HQ.MUTED} />
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '0.8125rem', color: HQ.MUTED }}>عدد الطلاب</span>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 15, color: HQ.INK, fontVariantNumeric: 'tabular-nums' }}>
                  {group.students?.length || 0} / {group.maxStudents}
                </span>
              </span>
            </li>
            {group.teacher && (
              <li style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${HQ.LINE}` }}>
                <span aria-hidden
                  className="avatar-circle"
                  style={{
                    width: 40, height: 40, fontSize: 13, flex: 'none',
                    backgroundColor: getAvatarColor(`${group.teacher.firstName}${group.teacher.lastName}`),
                  }}>
                  {getInitials(group.teacher.firstName, group.teacher.lastName)}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 800, fontSize: 15, color: HQ.INK }}>
                    أ. {group.teacher.firstName} {group.teacher.lastName}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.8125rem', color: HQ.MUTED }}>معلم الحلقة</span>
                </span>
                <HqBadge tone="guide">المعلم</HqBadge>
              </li>
            )}
          </ul>
          {group.description && (
            <p style={{ background: HQ.PAPER, borderRadius: 12, padding: 12, fontSize: 14, color: HQ.INK, lineHeight: 1.8, margin: '12px 0 0' }}>
              {group.description}
            </p>
          )}
        </section>

        {/* ─── Days of study ──────────────────────────────────────────── */}
        <section aria-label="أيام الدراسة" style={{ ...panel, marginBottom: 16 }}>
          <h2 style={{ ...h2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color={HQ.MENTOR} aria-hidden />
            أيام الدراسة
          </h2>
          {group.days?.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {group.days.map((day, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 9999,
                  background: '#E2EFE7', color: '#0F5940', fontSize: '0.8125rem', fontWeight: 700,
                }}>
                  {DAYS_AR[day] || day}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: HQ.MUTED, fontSize: 14, margin: 0 }}>لم تُحدد أيام الدراسة بعد</p>
          )}
        </section>

        {/* ─── Weekly schedule ────────────────────────────────────────── */}
        <section aria-label="الجدول الأسبوعي" style={{ ...panel, marginBottom: 16 }}>
          <h2 style={{ ...h2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} color={HQ.MENTOR} aria-hidden />
            الجدول الأسبوعي
          </h2>
          {group.schedule?.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {group.schedule.map((s, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${HQ.LINE}`, fontSize: 14,
                }}>
                  <span style={{ fontWeight: 800, color: HQ.INK }}>{DAYS_AR[s.dayOfWeek]}</span>
                  <span style={{ color: HQ.MUTED, fontVariantNumeric: 'tabular-nums' }}>{formatTime(s.startTime)} — {formatTime(s.endTime)}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 9999,
                    background: '#E2EFE7', color: '#0F5940', fontSize: '0.8125rem', fontWeight: 700, flex: 'none',
                  }}>
                    {SESSION_TYPES[s.sessionType] || s.sessionType}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: HQ.MUTED, fontSize: 14, margin: 0 }}>لم يُحدد الجدول بعد</p>
          )}
        </section>

        {/* ─── Classmates ─────────────────────────────────────────────── */}
        <section aria-label="زملاء المجموعة" style={panel}>
          <h2 style={h2}>زملاء المجموعة ({students.length})</h2>
          {students.length === 0 ? (
            <p style={{ color: HQ.MUTED, fontSize: 14, margin: 0 }}>لا يوجد زملاء بعد</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {students.map((student, i) => (
                <li key={student._id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${HQ.LINE}`,
                }}>
                  <span aria-hidden
                    className="avatar-circle"
                    style={{
                      width: 40, height: 40, fontSize: 13, flex: 'none',
                      backgroundColor: getAvatarColor(`${student.firstName}${student.lastName}`),
                    }}>
                    {getInitials(student.firstName, student.lastName)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 800, fontSize: 15, color: HQ.INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {student.firstName} {student.lastName}
                      {student._id === user?._id && <span style={{ color: HQ.MENTOR, fontSize: '0.8125rem' }}> (أنت)</span>}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.8125rem', color: HQ.MUTED, fontVariantNumeric: 'tabular-nums' }}>
                      {student.memorizedVerses || 0} آية محفوظة
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
