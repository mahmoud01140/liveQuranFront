import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Clock, Video, ClipboardList, FileText, ChevronLeft, RotateCcw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PageLayout from '../../components/shared/PageLayout';
import api from '../../services/api';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

/* لوحة الإدارة — clarity, honest density, fast action.
   Same analytics endpoints and fallback; charts keep recharts. */

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, groups: 0, pending: 0, attendance: '0%' });
  const [levelData, setLevelData] = useState([]);
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadFailed(false);
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/reports/analytics');
        const data = res.data;
        setStats({
          users: data.summary.totalUsers || 0,
          groups: data.summary.activeGroups || 0,
          pending: data.summary.pendingApproval || 0,
          attendance: data.summary.attendanceRate || '0%',
        });
        setLevelData(data.levelDistribution || []);
        setWeekData(data.monthlyTrends || []);
      } catch (_) {
        try {
          const [usersRes, groupsRes, pendingRes] = await Promise.all([
            api.get('/users', { params: { limit: 1 } }),
            api.get('/groups'),
            api.get('/users/pending-approval'),
          ]);
          setStats({
            users: usersRes.data.total || 0,
            groups: groupsRes.data.groups?.length || 0,
            pending: pendingRes.data.users?.length || 0,
            attendance: '—',
          });
        } catch (__) {
          setLoadFailed(true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  };

  useEffect(() => { load(); }, []);

  return (
    <PageLayout>
      <div className="halaqa" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: HQ.INK }}>نظرة الإدارة</h1>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: HQ.MUTED }}>وضع المنصة الآن — وما يحتاج تدخلك</p>

        {loading ? (
          <div aria-label="جارٍ تحميل اللوحة">
            <div className="hq-skeleton" style={{ height: 90, width: '100%', marginBottom: 12 }} />
            <div className="hq-skeleton" style={{ height: 220, width: '100%' }} />
          </div>
        ) : loadFailed ? (
          <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 40, textAlign: 'center' }} role="alert">
            <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 900, color: HQ.INK }}>تعذّر تحميل البيانات</p>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: HQ.MUTED }}>تحقق من الاتصال ثم حاول مرة أخرى.</p>
            <button type="button" onClick={load} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 24px', fontSize: 15 }}>
              <RotateCcw size={16} /> إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {/* Facts + attention */}
            <section aria-label="وضع المنصة"
              style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 20, marginBottom: 16 }}>
              <div className="hq-facts" style={{ marginBottom: stats.pending > 0 ? 12 : 0 }}>
                <span><strong>{stats.users}</strong> <span>مستخدم</span></span>
                <span><strong>{stats.groups}</strong> <span>مجموعة نشطة</span></span>
                <span><strong>{stats.attendance}</strong> <span>حضور</span></span>
              </div>
              {stats.pending > 0 && (
                <Link to="/admin/users"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 14px', textDecoration: 'none', minHeight: 56 }}>
                  <span className="hq-live-dot" aria-hidden style={{ background: '#C2410C', animation: 'none', opacity: 1 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: HQ.INK }}>
                    {stats.pending} بانتظار الموافقة والتسكين
                  </span>
                  <ChevronLeft size={18} color={HQ.MUTED} />
                </Link>
              )}
            </section>

            {/* Charts — disciplined grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 16, marginBottom: 16 }}>
              <section aria-label="نمو الجلسات والطلاب" className="lg:col-span-2"
                style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 20 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 800, color: HQ.INK }}>النمو الشهري</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={weekData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D4" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="students" stroke="#177B58" fill="#E2EFE7" name="الطلاب النشطون" />
                  </AreaChart>
                </ResponsiveContainer>
              </section>

              <section aria-label="توزيع المستويات"
                style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 20 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 800, color: HQ.INK }}>المستويات</h2>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={levelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                      {levelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#177B58'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}>
                  {levelData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span aria-hidden style={{ width: 10, height: 10, borderRadius: 9999, background: d.color || '#177B58', flex: 'none' }} />
                      <span style={{ color: HQ.MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                      <strong style={{ color: HQ.INK, marginRight: 'auto' }}>{d.value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Fast actions */}
            <section aria-label="إجراءات سريعة">
              {[
                { label: 'إدارة وتسكين الحلقات', hint: 'المجموعات والطلاب الجدد', path: '/admin/groups', icon: BookOpen, primary: true },
                { label: 'مركز التصحيح', hint: 'الواجبات والتسجيلات', path: '/teacher/review', icon: ClipboardList },
                { label: 'طابور التسميع', hint: 'الورد اليومي', path: '/teacher/daily-review', icon: Clock },
                { label: 'بنك الامتحانات', hint: 'إدارة ونتائج', path: '/admin/exams', icon: FileText },
                { label: 'المدفوعات', hint: 'الإيصالات والاشتراكات', path: '/admin/payments', icon: Users },
                { label: 'البث المباشر', hint: 'بدء حصة', path: '/admin/groups', icon: Video },
              ].map((a) => (
                <Link key={a.label} to={a.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
                    background: a.primary ? HQ.MENTOR : HQ.SURFACE, color: a.primary ? '#fff' : HQ.INK,
                    border: a.primary ? 'none' : `1px solid ${HQ.LINE}`,
                    borderRadius: 14, padding: '12px 16px', marginBottom: 8, minHeight: 60,
                  }}>
                  <a.icon size={19} style={{ flex: 'none' }} />
                  <span style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: 15 }}>{a.label}</strong>
                    <span style={{ display: 'block', fontSize: 13, opacity: 0.75 }}>{a.hint}</span>
                  </span>
                  <ChevronLeft size={18} style={{ opacity: 0.6 }} />
                </Link>
              ))}
            </section>
          </>
        )}
      </div>
    </PageLayout>
  );
}
