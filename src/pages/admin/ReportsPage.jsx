import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, BookOpen, Clock, Download, Printer,
  Filter, Search, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Calendar, FileSpreadsheet, Sparkles, UserX, UserCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import Navbar from '../../components/shared/Navbar';
import Sidebar from '../../components/shared/Sidebar';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useGroupStore from '../../store/groupStore';
import { getAvatarColor, getInitials } from '../../utils/helpers';

export default function ReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    toast.success('📥 تم تصدير ملف كشف الحضور والغياب بنجاح!');
  };

  const handlePrint = () => {
    window.print();
  };

  const summaryCards = [
    { title: 'إجمالي ساعات التدريس', value: reportData.summary.totalHours.toLocaleString('ar-EG'), icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
    { title: 'معدل الحضور العام', value: reportData.summary.attendanceRate, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
    { title: 'ختمات مكتملة', value: reportData.summary.completedKhatmas, icon: BookOpen, color: 'text-primary-400', bg: 'bg-primary-50' },
    { title: 'طلاب نشطون', value: reportData.summary.totalStudents, icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-right" dir="rtl">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:mr-64 pt-16">
        <div className="page-container py-6">
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="section-title">التقارير والإحصاءات 📊</h1>
              <p className="section-subtitle">نظرة تحليلية شاملة وكشوفات الحضور والغياب المباشرة من قاعدة البيانات</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center bg-gray-200/80 p-1 rounded-2xl gap-1 self-start sm:self-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 الإحصاءات العامة
              </button>

              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'attendance'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>كشوفات الحضور والغياب</span>
              </button>
            </div>
          </div>

          {/* ══════════ TAB 1: OVERVIEW ══════════ */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
                {summaryCards.map((card, i) => (
                  <div key={i} className="stat-card">
                    <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center`}>
                      <card.icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-gray-900">{card.value}</p>
                      <p className="text-xs text-gray-500 font-bold">{card.title}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="card-base p-6">
                  <h2 className="font-bold text-gray-900 mb-4">نمو المستخدمين والجلسات شهرياً</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={reportData.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                      <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 12 }} />
                      <Bar dataKey="students" fill="#1D9E75" name="الطلاب الجدد" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="sessions" fill="#534AB7" name="الجلسات المباشرة" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card-base p-6">
                  <h2 className="font-bold text-gray-900 mb-4">معدل الحضور الأسبوعي</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={reportData.weeklyAttendance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                      <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: 12, border: 'none' }}
                        formatter={(v) => [`${v}%`, 'معدل الحضور']} />
                      <Line type="monotone" dataKey="rate" stroke="#1D9E75" strokeWidth={3} dot={{ fill: '#1D9E75', r: 5 }} name="الحضور %" />
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 text-center">
                <div className="card-base p-4">
                  <p className="text-xs text-gray-500 font-bold">الحصص المرصودة</p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{attendanceData.summary.totalSessionsCount}</p>
                </div>
                <div className="card-base p-4 bg-emerald-50/50 border-emerald-100">
                  <p className="text-xs text-emerald-700 font-bold">نسبة الحضور الإجمالية</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{attendanceData.summary.overallAttendanceRate}</p>
                </div>
                <div className="card-base p-4">
                  <p className="text-xs text-emerald-700 font-bold">حالات الحضور</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{attendanceData.summary.presentCount}</p>
                </div>
                <div className="card-base p-4 bg-amber-50/50 border-amber-100">
                  <p className="text-xs text-amber-700 font-bold">حالات التأخر</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{attendanceData.summary.lateCount}</p>
                </div>
                <div className="card-base p-4 bg-rose-50/50 border-rose-100 col-span-2 sm:col-span-1">
                  <p className="text-xs text-rose-700 font-bold">حالات الغياب</p>
                  <p className="text-2xl font-black text-rose-600 mt-1">{attendanceData.summary.absentCount}</p>
                </div>
              </div>

              {/* Filter & Export Bar */}
              <div className="card-base p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Timeframe selector */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    {[
                      { id: 'week', label: 'هذا الأسبوع' },
                      { id: 'month', label: 'هذا الشهر' },
                      { id: 'all', label: 'كل الفترات' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setFilterTimeframe(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          filterTimeframe === t.id
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Group Filter */}
                  <select
                    value={filterGroup}
                    onChange={e => setFilterGroup(e.target.value)}
                    className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary-400"
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
                    className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="absent">🚨 الغائبين فقط</option>
                    <option value="late">⏳ المتأخرين فقط</option>
                    <option value="present">✅ الحاضرين فقط</option>
                    <option value="excused">📝 المعذورين فقط</option>
                  </select>
                </div>

                {/* Search & Export Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="بحث باسم الطالب..."
                      className="w-full text-xs pr-9 pl-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                    title="تصدير ملف إكسل CSV"
                  >
                    <Download className="w-4 h-4" />
                    <span>تصدير كشف Excel</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="btn-outline py-2 px-3 text-xs font-bold flex items-center gap-1.5"
                    title="طباعة الكشف"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة</span>
                  </button>
                </div>
              </div>

              {/* Students Attendance Table */}
              <div className="card-base overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary-500" />
                    سجل الطلاب ومعدلات الحضور ({attendanceData.students?.length || 0} طالب)
                  </h3>
                  {loadingAttendance && <RefreshCw className="w-4 h-4 text-primary-500 animate-spin" />}
                </div>

                {loadingAttendance ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-3" />
                    <p className="text-xs font-bold">جارٍ إعداد كشوفات الحضور...</p>
                  </div>
                ) : attendanceData.students?.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <UserX className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-bold">لا توجد سجلات حضور مطابقة للفلاتر المحددة</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200/80">
                        <tr>
                          <th className="p-3.5">الطالب</th>
                          <th className="p-3.5">المجموعة</th>
                          <th className="p-3.5 text-center">إجمالي الحصص</th>
                          <th className="p-3.5 text-center">حاضر</th>
                          <th className="p-3.5 text-center">متأخر</th>
                          <th className="p-3.5 text-center">غائب</th>
                          <th className="p-3.5 text-center">نسبة الحضور</th>
                          <th className="p-3.5">آخر الجلسات والملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {attendanceData.students.map((item) => {
                          const s = item.student;
                          const rateColor =
                            item.attendanceRate >= 85
                              ? 'text-emerald-600 bg-emerald-50'
                              : item.attendanceRate >= 70
                              ? 'text-amber-600 bg-amber-50'
                              : 'text-rose-600 bg-rose-50';

                          return (
                            <tr key={s._id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="p-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                                    style={{ backgroundColor: getAvatarColor(s.name) }}
                                  >
                                    {getInitials(s.name, '')}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900">{s.name}</p>
                                    <p className="text-[10px] text-gray-400">{s.email}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5 font-semibold text-gray-700">
                                {s.groupName || '—'}
                              </td>

                              <td className="p-3.5 text-center font-bold text-gray-800">
                                {item.total}
                              </td>

                              <td className="p-3.5 text-center font-bold text-emerald-600">
                                {item.present}
                              </td>

                              <td className="p-3.5 text-center font-bold text-amber-600">
                                {item.late}
                              </td>

                              <td className="p-3.5 text-center font-bold text-rose-600">
                                {item.absent}
                              </td>

                              <td className="p-3.5 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-full font-black text-xs ${rateColor}`}>
                                  {item.attendanceRate}%
                                </span>
                              </td>

                              <td className="p-3.5">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {item.sessions.slice(0, 3).map((sess, idx) => (
                                    <span
                                      key={idx}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg truncate ${
                                        sess.status === 'present'
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : sess.status === 'late'
                                          ? 'bg-amber-50 text-amber-700'
                                          : sess.status === 'excused'
                                          ? 'bg-purple-50 text-purple-700'
                                          : 'bg-rose-50 text-rose-700'
                                      }`}
                                      title={`${sess.sessionTitle} - ${sess.notes || ''}`}
                                    >
                                      {sess.status === 'present' ? '✅' : sess.status === 'late' ? '⏳' : sess.status === 'excused' ? '📝' : '❌'} {sess.sessionTitle}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
