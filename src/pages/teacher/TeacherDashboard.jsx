import { useState, useEffect } from 'react';
import { Users, Calendar, Video, Bell, Plus, ChevronLeft, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import useNotifications from '../../hooks/useNotifications';
import { getLevelLabel } from '../../utils/helpers';
import { DAYS_AR } from '../../utils/constants';
import api from '../../services/api';
import '../../components/halaqa/halaqa.css';
import { HQ, HqBadge } from '../../components/halaqa/primitives';

/* لوحة المعلم — who do I have today, what is on me, who needs follow-up.
   Same fetches and links; operational, never an admin dashboard.
   LiveBroadcastPage already speaks the majlis language — untouched here. */

const LEVEL_TONE = {
  foundation: 'mentor',
  memorization: 'guide',
  teacher_prep: 'gold',
  senior: 'neutral',
};

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const { groups, fetchAllGroups } = useGroupStore();
  const [todayStats, setTodayStats] = useState({ pendingReviews: 0, attendanceRate: '—' });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  useNotifications();

  const loadAll = () => {
    setLoading(true);
    setLoadFailed(false);
    if (user?.role === 'admin') {
      fetchAllGroups();
    } else {
      fetchAllGroups({ teacher: user?._id });
    }
    fetchStats().finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const fetchStats = async () => {
    try {
      const [pendingRes, reportsRes] = await Promise.all([
        api.get(`/exams/results/pending-review?teacherId=${user._id}`),
        api.get('/reports/analytics').catch(() => null),
      ]);
      const attendanceRate = reportsRes?.data?.summary?.attendanceRate;
      setTodayStats({
        pendingReviews: pendingRes.data.results?.length || 0,
        attendanceRate: attendanceRate || '—',
      });
    } catch {
      setLoadFailed(true);
    }
  };

  const myGroups = (user?.role === 'admin' || user?.role === 'teacher')
    ? groups
    : groups.filter(g => g.teacher?._id === user?._id || g.teacher === user?._id);
  const totalStudents = myGroups.reduce((sum, g) => sum + (g.students?.length || 0), 0);

  return (
    <PageLayout>
      <div className="halaqa" style={{ maxWidth: 860, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 14, color: HQ.MUTED }}>يومك التعليمي</p>
        <h1 style={{ margin: '2px 0 16px', fontSize: 26, fontWeight: 900, color: HQ.INK }}>
          أهلًا {user?.firstName || 'أستاذنا'}
        </h1>

        {loading ? (
          <div aria-label="جارٍ تحميل لوحتك">
            <div className="hq-skeleton" style={{ height: 64, width: '100%', marginBottom: 12 }} />
            <div className="hq-skeleton" style={{ height: 64, width: '100%', marginBottom: 12 }} />
            <div className="hq-skeleton" style={{ height: 64, width: '100%' }} />
          </div>
        ) : loadFailed && myGroups.length === 0 ? (
          <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 40, textAlign: 'center' }} role="alert">
            <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 900, color: HQ.INK }}>تعذّر تحميل لوحتك</p>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: HQ.MUTED }}>تحقق من الاتصال ثم حاول مرة أخرى.</p>
            <button type="button" onClick={loadAll} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 24px', fontSize: 15 }}>
              <RotateCcw size={16} /> إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {/* Today facts — one quiet line each, never stat tiles */}
            <section aria-label="وضع اليوم"
              style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, marginBottom: todayStats.pendingReviews > 0 ? 12 : 0 }}>
                <span><strong style={{ color: HQ.INK, fontSize: 18 }}>{totalStudents}</strong> <span style={{ color: HQ.MUTED }}>طالبًا</span></span>
                <span><strong style={{ color: HQ.INK, fontSize: 18 }}>{myGroups.length}</strong> <span style={{ color: HQ.MUTED }}>مجموعات</span></span>
                <span><strong style={{ color: HQ.INK, fontSize: 18 }}>{todayStats.attendanceRate}</strong> <span style={{ color: HQ.MUTED }}>حضور</span></span>
              </div>
              {todayStats.pendingReviews > 0 && (
                <Link to="/teacher/review"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 14px', textDecoration: 'none', minHeight: 56 }}>
                  <Bell size={18} color="#B45309" style={{ flex: 'none' }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: HQ.INK }}>
                    {todayStats.pendingReviews} بانتظار مراجعتك
                  </span>
                  <ChevronLeft size={18} color={HQ.MUTED} />
                </Link>
              )}
            </section>

            {/* Primary actions */}
            <section aria-label="إجراءاتك" style={{ marginBottom: 16 }}>
              {[
                { to: '/teacher/groups', icon: Video, title: 'مجموعاتي وبدء البث', hint: 'اختر المجموعة ثم الدرس للانطلاق', primary: true },
                { to: '/teacher/review', icon: Bell, title: 'مركز المراجعة', hint: 'الواجبات والتسميعات بانتظار التصحيح' },
                { to: '/teacher/create-exam', icon: Plus, title: 'نشاط أو اختبار جديد', hint: 'قيّم مجموعتك بتكليف جديد' },
              ].map(a => (
                <Link key={a.to + a.title} to={a.to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
                    background: a.primary ? HQ.MENTOR : HQ.SURFACE, color: a.primary ? '#fff' : HQ.INK,
                    border: a.primary ? 'none' : `1px solid ${HQ.LINE}`,
                    borderRadius: 14, padding: '12px 16px', marginBottom: 8, minHeight: 60,
                  }}>
                  <a.icon size={19} style={{ flex: 'none' }} />
                  <span style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: 15 }}>{a.title}</strong>
                    <span style={{ display: 'block', fontSize: 13, opacity: 0.75 }}>{a.hint}</span>
                  </span>
                  <ChevronLeft size={18} style={{ opacity: 0.6 }} />
                </Link>
              ))}
            </section>

            {/* Groups — rows, mobile-safe (no wide tables) */}
            <section aria-label={`مجموعاتي (${myGroups.length})`}
              style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 16 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: HQ.INK, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} color={HQ.MENTOR} /> مجموعاتي ({myGroups.length})
              </h2>
              {myGroups.length === 0 ? (
                <p style={{ fontSize: 14, color: HQ.MUTED, margin: '8px 0 0' }}>لا مجموعات مخصصة لك بعد — ستظهر هنا فور تعيينك.</p>
              ) : (
                <ol style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                  {myGroups.map((group) => (
                    <li key={group._id} style={{ padding: '12px 0', borderTop: `1px solid ${HQ.LINE}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <strong style={{ fontSize: 16, color: HQ.INK }}>{group.name}</strong>
                        <HqBadge tone={LEVEL_TONE[group.level] || 'neutral'}>{getLevelLabel(group.level)}</HqBadge>
                        <span style={{ fontSize: 13, color: HQ.MUTED, marginRight: 'auto' }}>
                          {group.students?.length || 0}/{group.maxStudents} طالب
                        </span>
                      </div>
                      {group.schedule?.slice(0, 2).length > 0 && (
                        <p style={{ margin: '0 0 8px', fontSize: 13, color: HQ.MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={14} />
                          {group.schedule.slice(0, 2).map(s => `${DAYS_AR[s.dayOfWeek]} ${s.startTime}`).join(' · ')}
                        </p>
                      )}
                      <Link to={`/admin/groups/${group._id}/curriculum`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: HQ.MENTOR, textDecoration: 'none', minHeight: 44 }}>
                        <Video size={15} /> المنهج وبدء البث
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </PageLayout>
  );
}
