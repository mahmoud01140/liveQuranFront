import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Clock, Award, Star, Mail, Plus, Trash2,
  AlertTriangle, CheckCircle2, XCircle, ChevronLeft, Calendar,
  TrendingUp, BookOpen, AlertCircle, RefreshCw, Volume2, ShieldAlert
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import PageLayout from '../../components/shared/PageLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { timeAgoAr, getInitials, getAvatarColor, getLevelLabel, getLevelColor } from '../../utils/helpers';

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [childProgress, setChildProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(false);
  
  // Link child states
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [childEmail, setChildEmail] = useState('');
  const [linking, setLinking] = useState(false);

  // Unlink states
  const [confirmUnlinkId, setConfirmUnlinkId] = useState(null);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchChildProgress(selectedChildId);
    } else {
      setChildProgress(null);
    }
  }, [selectedChildId]);

  const fetchChildren = async () => {
    setLoadingChildren(true);
    try {
      const res = await api.get('/parents/children');
      const kids = res.data.children || [];
      setChildren(kids);
      if (kids.length > 0 && !selectedChildId) {
        setSelectedChildId(kids[0]._id);
      }
    } catch {
      toast.error('خطأ في جلب بيانات الأبناء المربوطين');
    } finally {
      setLoadingChildren(false);
    }
  };

  const fetchChildProgress = async (childId) => {
    setLoadingProgress(true);
    try {
      const res = await api.get(`/parents/children/${childId}/progress`);
      setChildProgress(res.data);
    } catch {
      toast.error('خطأ في جلب تقرير تقدم الابن');
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleLinkChild = async (e) => {
    e.preventDefault();
    if (!childEmail.trim()) return;

    setLinking(true);
    try {
      const res = await api.post('/parents/children', { childEmail: childEmail.trim() });
      toast.success(res.data.message || 'تم ربط الابن بنجاح! 🎉');
      setChildEmail('');
      setLinkModalOpen(false);
      
      // Refresh list
      const kids = [...children, res.data.child];
      setChildren(kids);
      setSelectedChildId(res.data.child._id);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'خطأ في ربط الابن');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkChild = async () => {
    if (!confirmUnlinkId) return;

    setUnlinking(true);
    try {
      await api.delete(`/parents/children/${confirmUnlinkId}`);
      toast.success('تم إلغاء ربط الابن بنجاح');
      const updatedKids = children.filter(k => k._id !== confirmUnlinkId);
      setChildren(updatedKids);
      if (updatedKids.length > 0) {
        setSelectedChildId(updatedKids[0]._id);
      } else {
        setSelectedChildId(null);
      }
      setConfirmUnlinkId(null);
    } catch {
      toast.error('خطأ في إلغاء ربط الابن');
    } finally {
      setUnlinking(false);
    }
  };

  // Convert child records to chart data format
  const getChartData = () => {
    if (!childProgress || !childProgress.recentRecords) return [];
    
    // Group records of last 7 days
    const days = [];
    const localeDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = localeDays[d.getDay()];
      const dayDateStr = d.toDateString();
      
      let memorizationVerses = 0;
      let reviewVerses = 0;

      childProgress.recentRecords.forEach(record => {
        const recordDate = new Date(record.date).toDateString();
        if (recordDate === dayDateStr && record.status === 'approved') {
          if (record.activityType === 'memorization') {
            memorizationVerses += record.versesCount || 0;
          } else if (record.activityType === 'review') {
            reviewVerses += record.versesCount || 0;
          }
        }
      });

      days.push({
        day: dayName,
        'آيات الحفظ': memorizationVerses,
        'آيات المراجعة': reviewVerses,
      });
    }

    return days;
  };

  const chartData = getChartData();

  return (
    <PageLayout>
      <div>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="section-title flex items-center gap-2">
                👨‍👩‍👦 لوحة ولي الأمر
              </h1>
              <p className="section-subtitle">تابع أداء وتحصيل أبنائك الدراسي وحضورهم في الحلقات</p>
            </div>
            
            <button
              onClick={() => setLinkModalOpen(true)}
              className="btn-primary flex items-center gap-2 text-sm py-2 px-4 shadow-sm self-start md:self-auto"
              style={{ backgroundColor: '#1D9E75' }}
            >
              <Plus className="w-4 h-4" />
              <span>ربط حساب ابن جديد</span>
            </button>
          </div>

          {loadingChildren ? (
            <div className="card-base p-16 text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-400" />
              <p className="text-sm text-gray-500">جاري تحميل بيانات الأبناء...</p>
            </div>
          ) : children.length === 0 ? (
            /* Empty state when no children linked */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-base p-8 md:p-12 text-center max-w-2xl mx-auto mt-8 border-dashed border-2 border-gray-200"
            >
              <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">أهلاً بك في لوحة ولي الأمر!</h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                لمتابعة تقدم ابنك وحضوره اليومي ونتائج اختباراته وتلقي التنبيهات، يرجى ربط حسابه عن طريق إدخال البريد الإلكتروني الذي يستخدمه في المنصة.
              </p>
              <button
                onClick={() => setLinkModalOpen(true)}
                className="btn-primary px-8 py-3 text-base shadow-md inline-flex items-center gap-2"
                style={{ backgroundColor: '#1D9E75' }}
              >
                <Plus className="w-5 h-5" />
                <span>ربط حساب الابن الآن</span>
              </button>
            </motion.div>
          ) : (
            /* Dashboard view with children */
            <div className="grid lg:grid-cols-4 gap-6">
              
              {/* Children list tab sidebar */}
              <div className="lg:col-span-1 space-y-2.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2 px-1">الأبناء المربوطون</span>
                <div className="flex lg:flex-col gap-2.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
                  {children.map((kid) => {
                    const isSelected = selectedChildId === kid._id;
                    const avatarBg = getAvatarColor(`${kid.firstName}${kid.lastName}`);
                    
                    return (
                      <button
                        key={kid._id}
                        onClick={() => setSelectedChildId(kid._id)}
                        className={`card-base p-3.5 flex items-center gap-3 text-right transition-all w-64 lg:w-full flex-shrink-0 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-primary-400 shadow-sm border-primary-100 bg-primary-50/20'
                            : 'hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: avatarBg }}
                        >
                          {getInitials(kid.firstName, kid.lastName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 truncate text-sm">
                            {kid.firstName} {kid.lastName}
                          </p>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                            {getLevelLabel(kid.assignedLevel)}
                          </span>
                        </div>
                        <ChevronLeft className={`w-4 h-4 text-gray-400 mr-auto transition-transform ${isSelected ? 'translate-x-1 text-primary-500' : ''}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress details container */}
              <div className="lg:col-span-3 space-y-6">
                
                {loadingProgress || !childProgress ? (
                  <div className="card-base p-24 text-center">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-300" />
                    <p className="text-sm text-gray-500">جاري تحميل تقرير أداء الطالب...</p>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    
                    {/* Performance Alerts section */}
                    {childProgress.alerts && childProgress.alerts.length > 0 && (
                      <div className="space-y-2">
                        {childProgress.alerts.map((alert, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ x: 15, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`flex items-start gap-3 p-4 rounded-2xl border text-sm ${
                              alert.severity === 'danger'
                                ? 'bg-red-50/70 border-red-100 text-red-700'
                                : 'bg-amber-50/70 border-amber-100 text-amber-700'
                            }`}
                          >
                            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block">{alert.title}</span>
                              <span className="text-xs opacity-90 mt-0.5 block leading-relaxed">{alert.message}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Today's Live Session Attendance Status Card */}
                    {childProgress.attendance?.todaySession && (
                      <div className="mb-6">
                        {(() => {
                          const today = childProgress.attendance.todaySession;
                          const isPres = today.attendanceStatus === 'present';
                          const isLate = today.attendanceStatus === 'late';
                          const isAbs = today.attendanceStatus === 'absent';
                          const isLiveNow = today.attendanceStatus === 'in_progress' || today.sessionStatus === 'live';
                          const isExc = today.attendanceStatus === 'excused';

                          let bgClass = 'bg-slate-50 border-slate-200 text-slate-700';
                          let title = `حصة اليوم: ${today.title}`;
                          let statusLabel = 'قيد المتابعة';
                          let icon = <Clock className="w-5 h-5" />;

                          if (isPres) {
                            bgClass = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                            statusLabel = 'حاضر اليوم ✅';
                            icon = <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
                          } else if (isLate) {
                            bgClass = 'bg-amber-50 border-amber-200 text-amber-900';
                            statusLabel = 'حضر متأخراً ⏳';
                            icon = <Clock className="w-5 h-5 text-amber-600" />;
                          } else if (isAbs) {
                            bgClass = 'bg-rose-50 border-rose-200 text-rose-900';
                            statusLabel = 'غائب عن حصة اليوم ❌';
                            icon = <XCircle className="w-5 h-5 text-rose-600" />;
                          } else if (isLiveNow) {
                            bgClass = 'bg-primary-50 border-primary-200 text-primary-900';
                            statusLabel = 'الحصة منعقدة الآن 🔴';
                            icon = <div className="live-dot" />;
                          } else if (isExc) {
                            bgClass = 'bg-purple-50 border-purple-200 text-purple-900';
                            statusLabel = 'معذور 📝';
                            icon = <CheckCircle2 className="w-5 h-5 text-purple-600" />;
                          }

                          return (
                            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${bgClass}`}>
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                  {icon}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm">{title}</span>
                                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-white shadow-sm">
                                      {statusLabel}
                                    </span>
                                  </div>
                                  <p className="text-xs opacity-80 mt-0.5">
                                    {today.notes ? `ملاحظة المعلم: "${today.notes}"` : `تاريخ الحصة: ${new Date(today.startedAt).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Stats metrics widgets */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      
                      <div className="stat-card p-4">
                        <div className="w-10 h-10 bg-primary-50 text-primary-500 rounded-xl flex items-center justify-center">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-gray-900">{childProgress.stats?.totalVersesMemorized || 0}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">آيات حفظت هذا الأسبوع</p>
                        </div>
                      </div>

                      <div className="stat-card p-4">
                        <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-gray-900">{childProgress.stats?.totalVersesReviewed || 0}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">آيات روجعت هذا الأسبوع</p>
                        </div>
                      </div>

                      <div className="stat-card p-4">
                        <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-gray-900">{childProgress.student?.totalStudyHours || 0} س</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">إجمالي ساعات الدراسة</p>
                        </div>
                      </div>

                      <div className="stat-card p-4">
                        <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-gray-900">{childProgress.student?.points || 0}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">مجموع نقاط التميز</p>
                        </div>
                      </div>

                    </div>

                    {/* Chart Row */}
                    <div className="grid md:grid-cols-3 gap-6">
                      
                      {/* Weekly progress chart */}
                      <div className="md:col-span-2 card-base p-5">
                        <h3 className="font-bold text-gray-900 text-sm mb-4">نشاط الحفظ والمراجعة الأسبوعي (المعتمد)</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="colorMemorization" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorReview" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                              <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'Cairo' }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: 12, border: 'none', fontSize: 11 }} />
                              <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'Cairo' }} />
                              <Area type="monotone" dataKey="آيات الحفظ" stroke="#1D9E75" fillOpacity={1} fill="url(#colorMemorization)" strokeWidth={2} />
                              <Area type="monotone" dataKey="آيات المراجعة" stroke="#3B82F6" fillOpacity={1} fill="url(#colorReview)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Attendance Report Card */}
                      <div className="card-base p-5 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm mb-3">حضور الحلقات المباشرة</h3>
                          <span className="text-[10px] text-gray-400 block mb-4">معدل حضور الحلقات لآخر 20 جلسة منتهية للمجموعة</span>
                        </div>

                        <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                          {/* SVG Circular Progress Bar */}
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="54" strokeWidth="8" stroke="#f3f4f6" fill="transparent" />
                            <circle cx="64" cy="64" r="54" strokeWidth="8"
                              stroke={childProgress.attendance?.rate < 75 ? '#EF4444' : '#1D9E75'}
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 54}
                              strokeDashoffset={2 * Math.PI * 54 * (1 - (childProgress.attendance?.rate || 0) / 100)}
                              strokeLinecap="round"
                              className="transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute text-center">
                            <span className="text-2xl font-black text-gray-900">{childProgress.attendance?.rate || 0}%</span>
                            <span className="text-[9px] text-gray-400 block mt-0.5">نسبة الحضور</span>
                          </div>
                        </div>

                        <div className="text-center mt-4">
                          <p className="text-xs text-gray-600 font-semibold">
                            حضر <span className="text-primary-500 font-bold">{childProgress.attendance?.attendedClasses || 0}</span> من أصل <span className="font-bold">{childProgress.attendance?.totalClasses || 0}</span> جلسات
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Attendance Logs & Test Results tabs */}
                    <div className="grid md:grid-cols-2 gap-6">
                      
                      {/* Attendance Logs list */}
                      <div className="card-base p-5">
                        <h3 className="font-bold text-gray-900 text-sm mb-4">سجل حضور الحلقات الأخير</h3>
                        
                        {childProgress.attendance?.history && childProgress.attendance.history.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-8">لا يوجد سجل حضور مسجل بعد</p>
                        ) : (
                          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                            {childProgress.attendance?.history?.map((session, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-gray-800 truncate">{session.title}</p>
                                  <span className="text-[9px] text-gray-400 flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(session.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                                    {session.notes && <span className="text-gray-500 truncate">({session.notes})</span>}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  session.status === 'present'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : session.status === 'late'
                                    ? 'bg-amber-50 text-amber-600'
                                    : session.status === 'excused'
                                    ? 'bg-purple-50 text-purple-600'
                                    : 'bg-rose-50 text-rose-600'
                                }`}>
                                  {session.status === 'present' ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3" /> حاضر
                                    </>
                                  ) : session.status === 'late' ? (
                                    <>
                                      <Clock className="w-3 h-3" /> متأخر
                                    </>
                                  ) : session.status === 'excused' ? (
                                    <>
                                      معذور
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3" /> غائب
                                    </>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Exam results list */}
                      <div className="card-base p-5">
                        <h3 className="font-bold text-gray-900 text-sm mb-4">نتائج الاختبارات والتقييمات الشفهية</h3>
                        
                        {childProgress.examResults && childProgress.examResults.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-8">لم يتم تسليم أي اختبارات بعد</p>
                        ) : (
                          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                            {childProgress.examResults?.map((result) => {
                              const examTitle = result.exam?.title || 'امتحان مستوى';
                              const scorePercentage = result.totalPercentage || 0;
                              
                              return (
                                <div key={result._id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-gray-800 truncate max-w-[70%]">{examTitle}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      result.status !== 'reviewed'
                                        ? 'bg-amber-50 text-amber-600'
                                        : result.isPassed
                                          ? 'bg-green-50 text-green-600'
                                          : 'bg-red-50 text-red-600'
                                    }`}>
                                      {result.status !== 'reviewed'
                                        ? 'قيد تصحيح الشفهي'
                                        : result.isPassed
                                          ? `ناجح (${scorePercentage}%)`
                                          : `لم يجتز (${scorePercentage}%)`
                                      }
                                    </span>
                                  </div>
                                  
                                  <div className="text-[10px] text-gray-500 space-y-1">
                                    <p>📈 درجة الحريري: {result.writtenScore} / {result.exam?.totalPoints}</p>
                                    {result.oralScore !== undefined && <p>🎙️ درجة الشفهي: {result.oralScore} / 100</p>}
                                    {result.teacherNotes && (
                                      <p className="text-slate-600 bg-white p-2 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                                        👨‍🏫 <strong>ملاحظة المعلم:</strong> {result.teacherNotes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                     </div>

                    {/* Homework Tracker Section */}
                    <div className="card-base p-5">
                      <h3 className="font-bold text-gray-900 text-sm mb-4">الواجبات الدراسية والتزام الابن</h3>
                      
                      {!childProgress.homework || childProgress.homework.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">لا توجد واجبات دراسية مسجلة بعد</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {childProgress.homework.map((hw) => {
                            return (
                              <div key={hw.sessionId} className={`p-4 bg-white rounded-xl border border-gray-100 flex flex-col justify-between hover:shadow-sm transition-shadow border-r-4 ${
                                hw.submitted ? 'border-r-green-400' : hw.overdue ? 'border-r-red-400' : 'border-r-amber-400'
                              }`}>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-bold text-gray-800 truncate">{hw.title}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      hw.submitted
                                        ? 'bg-green-50 text-green-600'
                                        : hw.overdue
                                          ? 'bg-red-50 text-red-600'
                                          : 'bg-amber-50 text-amber-600'
                                    }`}>
                                      {hw.submitted ? 'مكتمل' : hw.overdue ? 'متأخر' : 'بانتظار التسليم'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-gray-600 line-clamp-2">{hw.homework}</p>
                                  
                                  {/* Quranic structured homework */}
                                  {hw.quranHomework && hw.quranHomework.surahNumber && (
                                    <div className="bg-primary-50/50 p-2 rounded-lg border border-primary-50 text-[10px] text-primary-700">
                                      📖 <strong>الواجب القرآني:</strong> سورة {hw.quranHomework.surahName} (الآيات {hw.quranHomework.fromVerse} - {hw.quranHomework.toVerse})
                                    </div>
                                  )}
                                </div>

                                <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400">
                                  <span>📅 الموعد: {hw.deadline ? new Date(hw.deadline).toLocaleDateString('ar-EG') : 'غير محدد'}</span>
                                  {hw.submitted && (
                                    <span className="text-green-600">✓ تم التسليم في {new Date(hw.submittedAt).toLocaleDateString('ar-EG')}</span>
                                  )}
                                </div>

                                {hw.submitted && hw.isChecked && (
                                  <div className="mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px]">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-gray-700">تقييم المعلم:</span>
                                      {hw.rating && (
                                        <div className="flex gap-0.5">
                                          {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} className={`w-3 h-3 ${star <= hw.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    {hw.teacherFeedback && (
                                      <p className="text-gray-600 mt-1 leading-relaxed">💬 {hw.teacherFeedback}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Recent memorization activity logs */}
                    <div className="card-base p-5">
                      <h3 className="font-bold text-gray-900 text-sm mb-4">سجل نشاطات الحفظ والتسميع التفصيلي</h3>
                      
                      {childProgress.recentRecords && childProgress.recentRecords.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-8">لا توجد سجلات حفظ يومية مسجلة بعد</p>
                      ) : (
                        <div className="space-y-3">
                          {childProgress.recentRecords.map((record) => {
                            const dateStr = new Date(record.date).toLocaleDateString('ar-EG', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });
                            
                            return (
                              <div key={record._id} className="p-4 bg-white rounded-xl border border-gray-100 space-y-3 hover:shadow-sm transition-shadow">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-gray-800">سورة {record.surahName}</span>
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                      الآيات: {record.fromVerse} - {record.toVerse}
                                    </span>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    record.status === 'pending'
                                      ? 'bg-amber-50 text-amber-600'
                                      : record.status === 'approved'
                                        ? 'bg-green-50 text-green-600'
                                        : 'bg-red-50 text-red-600'
                                  }`}>
                                    {record.status === 'pending' ? 'قيد المراجعة' : record.status === 'approved' ? 'تم الاعتماد' : 'تطلب المراجعة'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-[10px] text-gray-500">
                                  <p>📅 التاريخ: {dateStr}</p>
                                  <p>📌 النوع: {record.activityType === 'memorization' ? 'حفظ جديد' : record.activityType === 'review' ? 'مراجعة' : 'تجويد'}</p>
                                  {record.rating && (
                                    <div className="flex items-center gap-0.5">
                                      <span>⭐ التقييم:</span>
                                      <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map(star => (
                                          <Star key={star} className={`w-3 h-3 ${star <= record.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {record.studentNotes && (
                                  <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                                    📝 <strong>ملاحظة الطالب:</strong> {record.studentNotes}
                                  </p>
                                )}

                                {record.teacherNotes && (
                                  <p className="text-[10px] text-primary-700 bg-primary-50/50 p-2 rounded-lg border border-primary-50">
                                    👨‍🏫 <strong>ملاحظات المعلم:</strong> {record.teacherNotes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Unlink child button */}
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => setConfirmUnlinkId(childProgress.student._id)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>إلغاء ربط حساب الابن ({childProgress.student.firstName})</span>
                      </button>
                    </div>

                  </motion.div>
                )}
              </div>

            </div>
          )}
      </div>

      {/* Link Child Modal */}
      <AnimatePresence>
        {linkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <h3 className="text-base font-black text-gray-900 mb-2">ربط حساب الابن</h3>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                أدخل البريد الإلكتروني الذي سجل به ابنك في المنصة لنتمكن من مطابقة الحسابين والربط الفوري.
              </p>

              <form onSubmit={handleLinkChild} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">البريد الإلكتروني للابن *</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={childEmail}
                      onChange={(e) => setChildEmail(e.target.value)}
                      className="input-base pr-9 text-sm"
                      placeholder="student@quran.com"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={linking || !childEmail.trim()}
                    className="btn-primary flex-1 text-sm py-2"
                    style={{ backgroundColor: '#1D9E75' }}
                  >
                    {linking ? 'جاري الربط...' : 'تأكيد الربط'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLinkModalOpen(false); setChildEmail(''); }}
                    className="btn-ghost text-sm py-2"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unlink confirmation Modal */}
      <AnimatePresence>
        {confirmUnlinkId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-gray-900 mb-2">إلغاء ربط الحساب</h3>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                هل أنت متأكد من رغبتك في إلغاء ربط حساب الابن؟ لن تتمكن من متابعة أدائه أو تلقي التنبيهات الخاصة به.
              </p>

              <div className="flex gap-2.5">
                <button
                  onClick={handleUnlinkChild}
                  disabled={unlinking}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex-1 transition-colors"
                >
                  {unlinking ? 'جاري إلغاء الربط...' : 'نعم، إلغاء الربط'}
                </button>
                <button
                  onClick={() => setConfirmUnlinkId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex-1 transition-colors"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
