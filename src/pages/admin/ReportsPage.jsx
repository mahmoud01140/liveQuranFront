import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, BookOpen, Clock, Download, Printer,
  Filter, Search, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Calendar, FileSpreadsheet, Sparkles, UserX, UserCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import PageLayout from '../../components/shared/PageLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useGroupStore from '../../store/groupStore';
import { getAvatarColor, getInitials } from '../../utils/helpers';
import Pagination from '../../components/shared/Pagination';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';
import usePagination from '../../hooks/usePagination';

/* Reports — analytics charts and attendance sheets.
   Same fetches, filters, CSV export and print as before; visual only. */

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance'

  // Overview analytics
  const [reportData, setReportData] = useState({
    summary: {
      totalHours: 0,
      attendanceRate: '0%',
      completedKhatmas: 0,
      totalStudents: 0,
    },
    monthlyTrends: [],
    weeklyAttendance: [],
  });

  // Attendance & Absence reports state
  const { groups, fetchAllGroups } = useGroupStore();
  const [attendanceData, setAttendanceData] = useState({
    summary: {
      totalSessionsCount: 0,
      totalAttendanceRecords: 0,
      overallAttendanceRate: '100%',
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      excusedCount: 0,
    },
    students: [],
    records: [],
  });
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterTimeframe, setFilterTimeframe] = useState('month'); // 'week' | 'month' | 'all'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'absent' | 'present' | 'late' | 'excused'
  const [searchQuery, setSearchQuery] = useState('');

  const studentsPagination = usePagination(attendanceData.students || [], 10);

  useEffect(() => {
    fetchAnalytics();
    fetchAllGroups();
  }, []);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceReport();
    }
  }, [activeTab, filterGroup, filterTimeframe, filterStatus, searchQuery]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/reports/analytics');
      setReportData(res.data);
    } catch (_) {}
  };

  const fetchAttendanceReport = async () => {
    setLoadingAttendance(true);
    try {
      const params = {
        timeframe: filterTimeframe,
        groupId: filterGroup || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchQuery.trim() || undefined,
      };
      const res = await api.get('/reports/attendance', { params });
      setAttendanceData(res.data);
    } catch (err) {
      toast.error('خطأ في جلب كشف الحضور والغياب');
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Export to CSV with UTF-8 BOM for Excel Arabic support
  const handleExportCSV = () => {
    const records = attendanceData.records || [];
    if (records.length === 0) {
      toast.error('لا توجد سجلات لتصديرها');
      return;
    }

    const headers = ['التاريخ', 'المجموعة', 'المعلم', 'عنوان الحصة', 'اسم الطالب', 'البريد الإلكتروني', 'حالة الحضور', 'سجلت بواسطة', 'الملاحظات'];

    const statusMap = {
      present: 'حاضر',
      late: 'متأخر',
      absent: 'غائب',
      excused: 'معذور',
    };

    const rows = records.map(r => [
      `"${new Date(r.date).toLocaleDateString('ar-EG')}"`,
      `"${r.groupName || ''}"`,
      `"${r.teacherName || ''}"`,
      `"${r.sessionTitle || ''}"`,
      `"${r.studentName || ''}"`,
      `"${r.studentEmail || ''}"`,
      `"${statusMap[r.status] || r.status}"`,
      `"${r.markedByName || ''}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_الغياب_والحضور_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('تم تصدير ملف كشف الحضور والغياب بنجاح!');
  };

  const handlePrint = () => {
    window.print();
  };

  const summaryCards = [
    { title: 'إجمالي ساعات التدريس', value: reportData.summary.totalHours.toLocaleString('ar-EG'), icon: Clock },
    { title: 'معدل الحضور العام', value: reportData.summary.attendanceRate, icon: TrendingUp },
    { title: 'ختمات مكتملة', value: reportData.summary.completedKhatmas, icon: BookOpen },
    { title: 'طلاب نشطون', value: reportData.summary.totalStudents, icon: Users },
  ];

  const panel = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 20,
  };
  const iconBtn = {
    minWidth: 44, minHeight: 44, borderRadius: 12, border: `1px solid ${HQ.LINE}`, background: HQ.SURFACE,
    color: HQ.MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  const rateTone = (rate) => rate >= 85
    ? { bg: '#E2EFE7', fg: '#0F5940' }
    : rate >= 70
    ? { bg: '#FBF7EE', fg: '#B45309' }
    : { bg: '#FFFFFF', fg: '#C2410C' };

  const sessionTone = (status) => status === 'present'
    ? { bg: '#E2EFE7', fg: '#0F5940', label: 'حاضر' }
    : status === 'late'
    ? { bg: '#FBF7EE', fg: '#B45309', label: 'متأخر' }
    : status === 'excused'
    ? { bg: HQ.PAPER, fg: HQ.MUTED, label: 'معذور' }
    : { bg: '#FFFFFF', fg: '#C2410C', label: 'غائب' };

  return (
    <PageLayout>
      <div className="halaqa" style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: HQ.INK, margin: '0 0 4px' }}>التقارير والإحصاءات</h1>
            <p className="text-sm" style={{ color: HQ.MUTED, margin: 0 }}>نظرة تحليلية شاملة وكشوفات الحضور والغياب المباشرة من قاعدة البيانات</p>
          </div>

          {/* Tab Switcher */}
          <div className="hq-tabs" role="tablist" aria-label="أقسام التقارير" style={{ alignSelf: 'flex-start' }}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
            >
              الإحصاءات العامة
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'attendance'}
              onClick={() => setActiveTab('attendance')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
            >
              <UserCheck size={15} aria-hidden />
              <span>كشوفات الحضور والغياب</span>
            </button>
          </div>
        </div>

        {/* ══════════ TAB 1: OVERVIEW ══════════ */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" aria-label="ملخص الإحصاءات">
              {summaryCards.map((card) => (
                <div key={card.title} className="p-5 flex items-center gap-3" style={panel}>
                  <span aria-hidden style={{
                    width: 48, height: 48, borderRadius: 14, background: '#E2EFE7', color: HQ.MENTOR,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                  }}>
                    <card.icon size={22} />
                  </span>
                  <span>
                    <span className="block font-black" style={{ fontSize: '1.5rem', color: HQ.INK, fontVariantNumeric: 'tabular-nums' }}>{card.value}</span>
                    <span className="block text-xs font-bold" style={{ color: HQ.MUTED }}>{card.title}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="p-6" style={panel} dir="ltr">
                <h2 className="font-bold mb-4" dir="rtl" style={{ color: HQ.INK, marginTop: 0 }}>نمو المستخدمين والجلسات شهرياً</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={reportData.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D4" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: 'Tajawal' }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ fontFamily: 'Tajawal', borderRadius: 12, border: '1px solid #E8E2D4' }} />
                    <Legend wrapperStyle={{ fontFamily: 'Tajawal', fontSize: 12 }} />
                    <Bar dataKey="students" fill="#177B58" name="الطلاب الجدد" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sessions" fill="#4A3F6B" name="الجلسات المباشرة" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-6" style={panel} dir="ltr">
                <h2 className="font-bold mb-4" dir="rtl" style={{ color: HQ.INK, marginTop: 0 }}>معدل الحضور الأسبوعي</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={reportData.weeklyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D4" />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fontFamily: 'Tajawal' }} />
                    <YAxis domain={[50, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ fontFamily: 'Tajawal', borderRadius: 12, border: '1px solid #E8E2D4' }}
                      formatter={(v) => [`${v}%`, 'معدل الحضور']} />
                    <Line type="monotone" dataKey="rate" stroke="#177B58" strokeWidth={3} dot={{ fill: '#177B58', r: 5 }} name="الحضور %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* ══════════ TAB 2: ATTENDANCE & ABSENCE REPORTS ══════════ */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 text-center" aria-label="ملخص الحضور">
              <div className="p-4" style={panel}>
                <p className="text-xs font-bold" style={{ color: HQ.MUTED, margin: '0 0 4px' }}>الحصص المرصودة</p>
                <p className="font-black" style={{ fontSize: '1.5rem', color: HQ.INK, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{attendanceData.summary.totalSessionsCount}</p>
              </div>
              <div className="p-4" style={panel}>
                <p className="text-xs font-bold" style={{ color: HQ.MENTOR, margin: '0 0 4px' }}>نسبة الحضور الإجمالية</p>
                <p className="font-black" style={{ fontSize: '1.5rem', color: HQ.MENTOR, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{attendanceData.summary.overallAttendanceRate}</p>
              </div>
              <div className="p-4" style={panel}>
                <p className="text-xs font-bold" style={{ color: HQ.MENTOR, margin: '0 0 4px' }}>حالات الحضور</p>
                <p className="font-black" style={{ fontSize: '1.5rem', color: HQ.MENTOR, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{attendanceData.summary.presentCount}</p>
              </div>
              <div className="p-4" style={panel}>
                <p className="text-xs font-bold" style={{ color: '#B45309', margin: '0 0 4px' }}>حالات التأخر</p>
                <p className="font-black" style={{ fontSize: '1.5rem', color: '#B45309', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{attendanceData.summary.lateCount}</p>
              </div>
              <div className="p-4 col-span-2 sm:col-span-1" style={panel}>
                <p className="text-xs font-bold" style={{ color: '#C2410C', margin: '0 0 4px' }}>حالات الغياب</p>
                <p className="font-black" style={{ fontSize: '1.5rem', color: '#C2410C', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{attendanceData.summary.absentCount}</p>
              </div>
            </div>

            {/* Filter & Export Bar */}
            <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4" style={panel}>
              <div className="flex flex-wrap items-center gap-3">
                {/* Timeframe selector */}
                <div className="flex items-center gap-1 p-1" role="group" aria-label="الفترة الزمنية"
                  style={{ background: HQ.PAPER, borderRadius: 12 }}>
                  {[
                    { id: 'week', label: 'هذا الأسبوع' },
                    { id: 'month', label: 'هذا الشهر' },
                    { id: 'all', label: 'كل الفترات' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFilterTimeframe(t.id)}
                      aria-pressed={filterTimeframe === t.id}
                      className="px-3 text-xs font-bold"
                      style={{
                        minHeight: 40, borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: filterTimeframe === t.id ? HQ.MENTOR : 'transparent',
                        color: filterTimeframe === t.id ? '#fff' : HQ.MUTED,
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Group Filter */}
                <select
                  value={filterGroup}
                  onChange={e => setFilterGroup(e.target.value)}
                  aria-label="تصفية حسب المجموعة"
                  className="text-xs font-bold focus:border-[#177B58] focus:outline-none"
                  style={{
                    minHeight: 44, background: HQ.SURFACE, color: HQ.INK,
                    border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '8px 12px',
                  }}
                >
                  <option value="">جميع المجموعات ({groups.length})</option>
                  {groups.map(g => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  aria-label="تصفية حسب الحالة"
                  className="text-xs font-bold focus:border-[#177B58] focus:outline-none"
                  style={{
                    minHeight: 44, background: HQ.SURFACE, color: HQ.INK,
                    border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '8px 12px',
                  }}
                >
                  <option value="all">جميع الحالات</option>
                  <option value="absent">الغائبين فقط</option>
                  <option value="late">المتأخرين فقط</option>
                  <option value="present">الحاضرين فقط</option>
                  <option value="excused">المعذورين فقط</option>
                </select>
              </div>

              {/* Search & Export Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search size={15} color={HQ.MUTED} aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    aria-label="بحث باسم الطالب"
                    placeholder="بحث باسم الطالب..."
                    className="w-full text-sm pr-10 focus:border-[#177B58] focus:outline-none"
                    style={{
                      minHeight: 44, background: HQ.SURFACE, color: HQ.INK,
                      border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '8px 12px 8px 16px',
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="hq-action"
                  style={{ background: HQ.MENTOR, color: '#fff', fontSize: '0.8125rem' }}
                  title="تصدير ملف إكسل CSV"
                >
                  <Download size={15} aria-hidden />
                  <span>تصدير كشف Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="hq-action"
                  style={{ background: HQ.SURFACE, color: HQ.MENTOR, border: `1.5px solid ${HQ.MENTOR}`, fontSize: '0.8125rem' }}
                  title="طباعة الكشف"
                >
                  <Printer size={15} aria-hidden />
                  <span>طباعة</span>
                </button>
              </div>
            </div>

            {/* Students Attendance Table */}
            <div style={{ ...panel, padding: 0, overflow: 'hidden' }}>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${HQ.LINE}` }}>
                <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: HQ.INK, margin: 0 }}>
                  <UserCheck size={15} color={HQ.MENTOR} aria-hidden />
                  سجل الطلاب ومعدلات الحضور ({attendanceData.students?.length || 0} طالب)
                </h3>
                {loadingAttendance && <RefreshCw size={15} color={HQ.MENTOR} className="animate-spin" aria-hidden />}
              </div>

              {loadingAttendance ? (
                <div className="flex flex-col items-center justify-center py-16" style={{ color: HQ.MUTED }}>
                  <RefreshCw size={30} color={HQ.MENTOR} className="animate-spin mb-3" aria-hidden />
                  <p className="text-xs font-bold" style={{ margin: 0 }}>جارٍ إعداد كشوفات الحضور...</p>
                </div>
              ) : attendanceData.students?.length === 0 ? (
                <div className="text-center py-16" style={{ color: HQ.MUTED }}>
                  <UserX size={46} color={HQ.LINE} style={{ margin: '0 auto 8px' }} aria-hidden />
                  <p className="text-sm font-bold" style={{ margin: 0 }}>لا توجد سجلات حضور مطابقة للفلاتر المحددة</p>
                </div>
              ) : (
                <div className="hq-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="hq-table">
                    <thead>
                      <tr>
                        <th>الطالب</th>
                        <th>المجموعة</th>
                        <th style={{ textAlign: 'center' }}>إجمالي الحصص</th>
                        <th style={{ textAlign: 'center' }}>حاضر</th>
                        <th style={{ textAlign: 'center' }}>متأخر</th>
                        <th style={{ textAlign: 'center' }}>غائب</th>
                        <th style={{ textAlign: 'center' }}>نسبة الحضور</th>
                        <th>آخر الجلسات والملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsPagination.paginatedItems.map((item) => {
                        const s = item.student;
                        const tone = rateTone(item.attendanceRate);

                        return (
                          <tr key={s._id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <span aria-hidden className="avatar-circle"
                                  style={{
                                    width: 32, height: 32, fontSize: 11, flex: 'none',
                                    backgroundColor: getAvatarColor(s.name),
                                  }}>
                                  {getInitials(s.name.split(' ')[0] || '', s.name.split(' ')[1] || '')}
                                </span>
                                <span>
                                  <span className="font-bold text-xs" style={{ color: HQ.INK, display: 'block' }}>{s.name}</span>
                                  <span style={{ fontSize: '0.8125rem', color: HQ.MUTED, display: 'block' }}>{s.email}</span>
                                </span>
                              </div>
                            </td>

                            <td className="font-medium" style={{ color: HQ.MUTED }}>
                              {s.groupName || '—'}
                            </td>

                            <td className="text-center font-bold" style={{ color: HQ.INK, fontVariantNumeric: 'tabular-nums' }}>
                              {item.total}
                            </td>

                            <td className="text-center font-bold" style={{ color: HQ.MENTOR, fontVariantNumeric: 'tabular-nums' }}>
                              {item.present}
                            </td>

                            <td className="text-center font-bold" style={{ color: '#B45309', fontVariantNumeric: 'tabular-nums' }}>
                              {item.late}
                            </td>

                            <td className="text-center font-bold" style={{ color: '#C2410C', fontVariantNumeric: 'tabular-nums' }}>
                              {item.absent}
                            </td>

                            <td className="text-center">
                              <span className="font-black text-xs"
                                style={{
                                  display: 'inline-block', padding: '4px 12px', borderRadius: 9999,
                                  background: tone.bg, color: tone.fg, fontVariantNumeric: 'tabular-nums',
                                }}>
                                {item.attendanceRate}%
                              </span>
                            </td>

                            <td>
                              <div className="flex flex-wrap gap-1" style={{ maxWidth: 320 }}>
                                {item.sessions.slice(0, 3).map((sess, idx) => {
                                  const st = sessionTone(sess.status);
                                  return (
                                    <span
                                      key={idx}
                                      style={{
                                        fontSize: '0.8125rem', fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                                        background: st.bg, color: st.fg, overflow: 'hidden', textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap', maxWidth: '100%',
                                      }}
                                      title={`${sess.sessionTitle} - ${sess.notes || ''}`}
                                    >
                                      {st.label}: {sess.sessionTitle}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                currentPage={studentsPagination.currentPage}
                totalPages={studentsPagination.totalPages}
                totalItems={studentsPagination.totalItems}
                pageSize={studentsPagination.pageSize}
                onPageChange={studentsPagination.setCurrentPage}
                onPageSizeChange={studentsPagination.setPageSize}
                showPageSize={true}
                pageSizeOptions={[5, 10, 20, 50]}
                itemName="طالب"
                className="p-4"
              />
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
