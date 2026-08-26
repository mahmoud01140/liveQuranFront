import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, CheckCircle2, AlertCircle, Clock, Search, Filter,
  Eye, Check, X, Settings, RefreshCw, Smartphone, Building2,
  DollarSign, Users, ShieldAlert, ArrowUpRight, Phone, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../../components/shared/Navbar';
import Sidebar from '../../components/shared/Sidebar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import api from '../../services/api';
import { formatDateAr, getInitials, getAvatarColor } from '../../utils/helpers';

export default function AdminPaymentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'settings'

  // Data states
  const [isLoading, setIsLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  });

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);
  const [approveModalPayment, setApproveModalPayment] = useState(null);
  const [rejectModalPayment, setRejectModalPayment] = useState(null);
  const [customDays, setCustomDays] = useState(30);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Settings states
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settings, setSettings] = useState({
    vodafoneCashNumbers: ['01012345678'],
    vodafoneInstructions: '',
    vodafoneEnabled: true,
    instaPayAddress: 'quran-academy@instapay',
    instaPayPhone: '01012345678',
    instaPayAccountName: 'أكاديمية تحفيظ القرآن الكريم',
    instaPayInstructions: '',
    instaPayEnabled: true,
    plan: {
      name: 'الاشتراك الشهري في حلقات القرآن الكريم',
      description: 'اشتراك شهري شامل لحضور كافة الحلقات المباشرة ومتابعة خطة الحفظ',
      priceEGP: 250,
      priceSAR: 49,
      quarterlyDiscountPercent: 10,
      annualDiscountPercent: 20,
    },
    freeTrialSessionsCount: 1,
    reminderDaysBeforeExpiry: 3,
    supportPhone: '01012345678',
    supportWhatsapp: '201012345678',
  });

  useEffect(() => {
    fetchPayments();
    fetchSettings();
  }, [statusFilter, methodFilter]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/payments/admin/all', {
        params: {
          status: statusFilter,
          method: methodFilter,
          search: searchQuery,
        },
      });

      if (res.data) {
        setPayments(res.data.payments || []);
        setStats(res.data.stats || {
          totalRevenue: 0,
          pendingCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
        });
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      toast.error('حدث خطأ أثناء جلب طلبات الدفع');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/payments/admin/settings');
      if (res.data?.settings) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleApprove = async () => {
    if (!approveModalPayment) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/payments/admin/${approveModalPayment._id}/approve`, {
        customDurationDays: customDays,
      });

      toast.success(res.data?.message || 'تم اعتماد الدفعة وتفعيل الاشتراك بنجاح!');
      setApproveModalPayment(null);
      await fetchPayments();
    } catch (err) {
      console.error('Approve error:', err);
      toast.error(err.response?.data?.message || 'خطأ في اعتماد الدفعة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModalPayment) return;
    if (!rejectReason.trim()) {
      toast.error('يرجى ذكر سبب الرفض لتوضيحه للطالب');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post(`/payments/admin/${rejectModalPayment._id}/reject`, {
        reason: rejectReason,
      });

      toast.success(res.data?.message || 'تم رفض طلب الدفع وإشعار الطالب');
      setRejectModalPayment(null);
      setRejectReason('');
      await fetchPayments();
    } catch (err) {
      console.error('Reject error:', err);
      toast.error(err.response?.data?.message || 'خطأ في رفض الدفعة');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const res = await api.put('/payments/admin/settings', settings);
      toast.success(res.data?.message || 'تم تحديث إعدادات الدفع بنجاح!');
    } catch (err) {
      console.error('Save settings error:', err);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSettingsLoading(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const studentName = `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.toLowerCase();
    const email = (p.user?.email || '').toLowerCase();
    const ref = (p.referenceNumber || '').toLowerCase();
    const phone = (p.senderPhone || '').toLowerCase();
    return studentName.includes(q) || email.includes(q) || ref.includes(q) || phone.includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50/60 font-sans" dir="rtl">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:mr-64 pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-green text-xs">إدارة النظام والمالية</span>
                <span className="badge-purple text-xs">فودافون كاش & انستاباي</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                إدارة المدفوعات والاشتراكات 💳
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                مراجعة إيصالات التحويل، تفعيل باقات الطلاب، وضبط بيانات محافظ فودافون كاش وحسابات انستاباي
              </p>
            </div>

            {/* Tab navigation buttons */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl self-start md:self-auto">
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'requests'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CreditCard className="w-4 h-4 text-primary-500" />
                طلبات التحويل ({stats.pendingCount > 0 ? `${stats.pendingCount} معلق` : payments.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'settings'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="w-4 h-4 text-purple-600" />
                إعدادات الحسابات والأسعار
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Revenue */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">
                  {stats.totalRevenue.toLocaleString()} <span className="text-xs font-normal text-gray-500">ج.م</span>
                </p>
                <p className="text-xs text-gray-500 font-semibold">إجمالي المبيعات المعتمدة</p>
              </div>
            </div>

            {/* Pending Requests */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
              {stats.pendingCount > 0 && (
                <span className="absolute top-3 left-3 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              )}
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-amber-700">{stats.pendingCount}</p>
                <p className="text-xs text-gray-500 font-semibold">طلبات بانتظار المراجعة</p>
              </div>
            </div>

            {/* Approved Subscriptions */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-primary-800">{stats.approvedCount}</p>
                <p className="text-xs text-gray-500 font-semibold">اشتراكات مفعلة</p>
              </div>
            </div>

            {/* Rejected Requests */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-black text-red-700">{stats.rejectedCount}</p>
                <p className="text-xs text-gray-500 font-semibold">طلبات مرفوضة</p>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              TAB 1: REQUESTS & TRANSACTIONS
          ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'requests' && (
            <div className="space-y-6">

              {/* Filters & Search */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث باسم الطالب، الإيميل، رقم المحفظة..."
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none"
                  />
                </div>

                {/* Filter buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Status filter */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                    {[
                      { id: 'all', label: 'الكل' },
                      { id: 'pending', label: `بانتظار المراجعة (${stats.pendingCount})` },
                      { id: 'approved', label: 'المعتمدة' },
                      { id: 'rejected', label: 'المرفوضة' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setStatusFilter(st.id)}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          statusFilter === st.id
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* Method filter */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                    {[
                      { id: 'all', label: 'جميع الطرق' },
                      { id: 'vodafone_cash', label: '🔴 فودافون كاش' },
                      { id: 'instapay', label: '🟣 انستاباي' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMethodFilter(m.id)}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          methodFilter === m.id
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={fetchPayments}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
                    title="تحديث"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                  <div className="py-20 flex justify-center">
                    <LoadingSpinner size="lg" text="جارٍ جلب طلبات الدفع..." />
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-300 stroke-1" />
                    <p className="font-bold text-sm text-gray-600">لا توجد طلبات تطابق الفلتر المختار</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 text-xs font-bold">
                          <th className="py-3.5 pr-6">الطالب</th>
                          <th className="py-3.5">الباقة والمدة</th>
                          <th className="py-3.5">المبلغ</th>
                          <th className="py-3.5">طريقة التحويل</th>
                          <th className="py-3.5">بيانات المحول</th>
                          <th className="py-3.5">إيصال التحويل</th>
                          <th className="py-3.5">الحالة</th>
                          <th className="py-3.5 pl-6 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {filteredPayments.map((payment) => {
                          const isVodafone = payment.method === 'vodafone_cash';
                          const userName = `${payment.user?.firstName || ''} ${payment.user?.lastName || ''}`.trim() || 'طالب';

                          return (
                            <tr key={payment._id} className="hover:bg-gray-50/50 transition-colors">
                              {/* Student info */}
                              <td className="py-4 pr-6">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: getAvatarColor(userName) }}
                                  >
                                    {getInitials(payment.user?.firstName, payment.user?.lastName)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 text-sm">{userName}</p>
                                    <p className="text-xs text-gray-400">{payment.user?.email || '—'}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Plan & cycle */}
                              <td className="py-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800">
                                  الاشتراك الموحد ⭐
                                </span>
                                <span className="text-xs text-gray-400 block mt-1">
                                  {payment.billingCycle === 'annual' ? 'اشتراك سنوي (365 يوم)'
                                    : payment.billingCycle === 'quarterly' ? '3 شهور (90 يوم)'
                                    : 'شهري (30 يوم)'}
                                </span>
                              </td>

                              {/* Amount */}
                              <td className="py-4 font-black text-gray-900">
                                {payment.amount} {payment.currency === 'EGP' ? 'ج.م' : 'ر.س'}
                              </td>

                              {/* Method */}
                              <td className="py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                  isVodafone ? 'bg-red-50 text-red-700 border border-red-200/50' : 'bg-purple-50 text-purple-700 border border-purple-200/50'
                                }`}>
                                  {isVodafone ? '🔴 فودافون كاش' : '🟣 انستاباي'}
                                </span>
                              </td>

                              {/* Sender details */}
                              <td className="py-4 text-xs">
                                <p className="font-mono font-bold text-gray-800">
                                  {payment.senderPhone || payment.senderName || '—'}
                                </p>
                                {payment.referenceNumber && (
                                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                                    مرجع: {payment.referenceNumber}
                                  </p>
                                )}
                              </td>

                              {/* Receipt preview button */}
                              <td className="py-4">
                                {payment.receiptUrl ? (
                                  <button
                                    onClick={() => setPreviewReceiptUrl(payment.receiptUrl)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-bold transition-all shadow-sm"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    معاينة الإيصال
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400">لا يوجد صورة</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-4">
                                {payment.status === 'approved' ? (
                                  <span className="badge-green text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    معتمد ومفعل
                                  </span>
                                ) : payment.status === 'rejected' ? (
                                  <div>
                                    <span className="badge-red text-xs">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      مرفوض
                                    </span>
                                    {payment.rejectionReason && (
                                      <p className="text-[11px] text-red-600 mt-1 max-w-xs truncate" title={payment.rejectionReason}>
                                        {payment.rejectionReason}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="badge-gold text-xs animate-pulse">
                                    <Clock className="w-3.5 h-3.5" />
                                    قيد المراجعة
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-4 pl-6 text-center">
                                {payment.status === 'pending' ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => {
                                        setApproveModalPayment(payment);
                                        setCustomDays(payment.activationDurationDays || 30);
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                                      title="اعتماد وتفعيل الاشتراك"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      قبول
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRejectModalPayment(payment);
                                        setRejectReason('');
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition-all flex items-center gap-1"
                                      title="رفض الطلب"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      رفض
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    تمت المراجعة بواسطة {payment.reviewedBy?.firstName || 'المسؤول'}
                                  </span>
                                )}
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

          {/* ═════════════════════════════════════════════════════════════════════
              TAB 2: PAYMENT SETTINGS (VODAFONE & INSTAPAY ACCOUNTS)
          ═════════════════════════════════════════════════════════════════════ */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-8">

              {/* Vodafone Cash Configuration Card */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">إعدادات فودافون كاش (Vodafone Cash) 🔴</h2>
                    <p className="text-xs text-gray-500 mt-0.5">تحديد أرقام المحافظ المعتمدة للتحويل والتعليمات المعروضة للطلاب</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      أرقام فودافون كاش (مفصولة بفاصلة إن وجد أكثر من رقم) *
                    </label>
                    <input
                      type="text"
                      required
                      value={Array.isArray(settings.vodafoneCashNumbers) ? settings.vodafoneCashNumbers.join(', ') : settings.vodafoneCashNumbers}
                      onChange={(e) => setSettings({ ...settings, vodafoneCashNumbers: e.target.value.split(',').map(s => s.trim()) })}
                      placeholder="01012345678, 01098765432"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-400 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      حالة فودافون كاش
                    </label>
                    <div className="flex items-center gap-4 mt-3">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={settings.vodafoneEnabled}
                          onChange={(e) => setSettings({ ...settings, vodafoneEnabled: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-600 focus:ring-primary-400"
                        />
                        تفعيل فودافون كاش كطريقة دفع نشطة
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      إرشادات التحويل للطلاب
                    </label>
                    <textarea
                      rows={3}
                      value={settings.vodafoneInstructions}
                      onChange={(e) => setSettings({ ...settings, vodafoneInstructions: e.target.value })}
                      placeholder="قم بالتحويل عبر كود *9*7*الرقم*المبلغ# أو تطبيق أنا فودافون..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* InstaPay Configuration Card */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-md">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">إعدادات انستاباي (InstaPay Egypt) 🟣</h2>
                    <p className="text-xs text-gray-500 mt-0.5">تحديد العنوان اللحظي (IPA) ورقم الهاتف واسم الحساب المستلم</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      عنوان الدفع اللحظي للانستاباي (IPA Address) *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.instaPayAddress}
                      onChange={(e) => setSettings({ ...settings, instaPayAddress: e.target.value })}
                      placeholder="academy@instapay"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-400 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      اسم صاحب الحساب المستلم *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.instaPayAccountName}
                      onChange={(e) => setSettings({ ...settings, instaPayAccountName: e.target.value })}
                      placeholder="أكاديمية تحفيظ القرآن الكريم"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      رقم الهاتف المرتبط بانستاباي
                    </label>
                    <input
                      type="text"
                      value={settings.instaPayPhone}
                      onChange={(e) => setSettings({ ...settings, instaPayPhone: e.target.value })}
                      placeholder="01012345678"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-400 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      حالة انستاباي
                    </label>
                    <div className="flex items-center gap-4 mt-3">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={settings.instaPayEnabled}
                          onChange={(e) => setSettings({ ...settings, instaPayEnabled: e.target.checked })}
                          className="w-4 h-4 rounded text-primary-600 focus:ring-primary-400"
                        />
                        تفعيل انستاباي كطريقة دفع نشطة
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      إرشادات التحويل عبر انستاباي للطلاب
                    </label>
                    <textarea
                      rows={3}
                      value={settings.instaPayInstructions}
                      onChange={(e) => setSettings({ ...settings, instaPayInstructions: e.target.value })}
                      placeholder="قم بالتحويل عبر تطبيق انستاباي إلى العنوان اللحظي أو رقم الهاتف الموضح..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Single Plan Pricing & Discounts */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">إعدادات الخطة الموحدة والأسعار 💰</h2>
                    <p className="text-xs text-gray-500 mt-0.5">تحديد رسوم الاشتراك الشهري الموحد ونسب الخصومات</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">اسم الخطة / الباقة</label>
                      <input
                        type="text"
                        value={settings.plan?.name || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          plan: { ...settings.plan, name: e.target.value }
                        })}
                        placeholder="الاشتراك الشهري في حلقات القرآن الكريم"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">وصف الخطة</label>
                      <input
                        type="text"
                        value={settings.plan?.description || ''}
                        onChange={(e) => setSettings({
                          ...settings,
                          plan: { ...settings.plan, description: e.target.value }
                        })}
                        placeholder="اشتراك شهري شامل لكافة الحلقات والمتابعة"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">السعر الشهري (EGP)</label>
                      <input
                        type="number"
                        value={settings.plan?.priceEGP ?? 250}
                        onChange={(e) => setSettings({
                          ...settings,
                          plan: { ...settings.plan, priceEGP: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">السعر الشهري (SAR)</label>
                      <input
                        type="number"
                        value={settings.plan?.priceSAR ?? 49}
                        onChange={(e) => setSettings({
                          ...settings,
                          plan: { ...settings.plan, priceSAR: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">خصم 3 شهور (%)</label>
                      <input
                        type="number"
                        value={settings.plan?.quarterlyDiscountPercent ?? 10}
                        onChange={(e) => setSettings({
                          ...settings,
                          plan: { ...settings.plan, quarterlyDiscountPercent: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">خصم السنوي (%)</label>
                      <input
                        type="number"
                        value={settings.plan?.annualDiscountPercent ?? 20}
                        onChange={(e) => setSettings({
                          ...settings,
                          plan: { ...settings.plan, annualDiscountPercent: Number(e.target.value) }
                        })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Free Trial & Expiry Reminder Rules */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">قواعد المحاضرة التجريبية وتنبيهات نهاية الشهر ⏰</h2>
                    <p className="text-xs text-gray-500 mt-0.5">تحديد عدد الجلسات المجانية المتاحة قبل طلب الاشتراك وأيام التنبيه قبل الانتهاء</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-200/60">
                    <label className="block text-xs font-bold text-gray-900 mb-1.5">
                      عدد المحاضرات التجريبية المجانية للطالب الجديد 🎁
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={settings.freeTrialSessionsCount ?? 1}
                      onChange={(e) => setSettings({ ...settings, freeTrialSessionsCount: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-black bg-white"
                    />
                    <p className="text-[11px] text-emerald-800 mt-2">
                      💡 الافتراضي (1 محاضرة): يسجل الطالب ويحضر أول جلسة مجاناً، ثم يُطلب منه الاشتراك لمتابعة الحضور.
                    </p>
                  </div>

                  <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200/60">
                    <label className="block text-xs font-bold text-gray-900 mb-1.5">
                      بدء تنبيه السداد قبل انتهاء الاشتراك بـ (أيام) ⚠️
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={settings.reminderDaysBeforeExpiry ?? 3}
                      onChange={(e) => setSettings({ ...settings, reminderDaysBeforeExpiry: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-black bg-white"
                    />
                    <p className="text-[11px] text-amber-800 mt-2">
                      💡 الافتراضي (3 أيام): يظهر تنبيه للمستخدم بالسداد عند اقتراب نهاية الشهر. وإذا لم يدفع يُعلّق وصوله للحلقات مؤقتاً حتى السداد.
                    </p>
                  </div>

                  {/* Support info */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">رقم واتساب المساعدة والدعم</label>
                    <input
                      type="text"
                      value={settings.supportWhatsapp || ''}
                      onChange={(e) => setSettings({ ...settings, supportWhatsapp: e.target.value })}
                      placeholder="201012345678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">هاتف خدمة العملاء</label>
                    <input
                      type="text"
                      value={settings.supportPhone || ''}
                      onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                      placeholder="01012345678"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-8 py-3.5 rounded-2xl bg-gradient-quran text-white font-bold text-sm shadow-green hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {settingsLoading ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />}
                  حفظ وتحديث الإعدادات
                </button>
              </div>

            </form>
          )}

        </div>
      </main>

      {/* ═════════════════════════════════════════════════════════════════════════
          APPROVE PAYMENT MODAL
      ═════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {approveModalPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !actionLoading && setApproveModalPayment(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full z-10 relative border border-gray-100 shadow-2xl"
            >
              <h3 className="text-lg font-black text-gray-900 mb-2">
                تأكيد اعتماد الدفعة وتفعيل الاشتراك 🎉
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                سيتم تفعيل باقة ({approveModalPayment.plan === 'premium' ? 'المميزة' : 'الأساسية'}) للطالب{' '}
                <span className="font-bold text-gray-800">{approveModalPayment.user?.firstName} {approveModalPayment.user?.lastName}</span>{' '}
                وإرسال إشعار لحظي له.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    مدة الاشتراك الممنوحة بالأيام:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { days: 30, label: '30 يوماً' },
                      { days: 90, label: '90 يوماً' },
                      { days: 365, label: 'سنة كاملة' },
                    ].map((d) => (
                      <button
                        key={d.days}
                        type="button"
                        onClick={() => setCustomDays(d.days)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          customDays === d.days
                            ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">أو حدد عدد أيام مخصص:</label>
                  <input
                    type="number"
                    value={customDays}
                    onChange={(e) => setCustomDays(Number(e.target.value))}
                    min={1}
                    max={1000}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />}
                  تأكيد القبول والتفعيل
                </button>
                <button
                  type="button"
                  onClick={() => setApproveModalPayment(null)}
                  disabled={actionLoading}
                  className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════════
          REJECT PAYMENT MODAL
      ═════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {rejectModalPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !actionLoading && setRejectModalPayment(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full z-10 relative border border-gray-100 shadow-2xl"
            >
              <h3 className="text-lg font-black text-red-700 mb-2">
                رفض طلب الدفع ⚠️
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                يرجى كتابة سبب الرفض بوضوح ليتم إرساله للطالب في الإشعارات ليتمكن من معالجة المشكلة.
              </p>

              {/* Quick reason options */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  'صورة الإيصال غير واضحة',
                  'المبلغ المحول غير مطابق',
                  'رقم العملية غير موجود',
                  'لم يتم استلام التحويل بالمحفظة',
                ].map((reasonText) => (
                  <button
                    key={reasonText}
                    type="button"
                    onClick={() => setRejectReason(reasonText)}
                    className="text-[11px] bg-red-50 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors font-medium"
                  >
                    {reasonText}
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-700 mb-1">سبب الرفض *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="اكتب سبب الرفض هنا..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-red-400 outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? <LoadingSpinner size="sm" /> : <X className="w-4 h-4" />}
                  تأكيد الرفض
                </button>
                <button
                  type="button"
                  onClick={() => setRejectModalPayment(null)}
                  disabled={actionLoading}
                  className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═════════════════════════════════════════════════════════════════════════
          RECEIPT PREVIEW MODAL
      ═════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {previewReceiptUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewReceiptUrl(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-4 max-w-2xl w-full z-10 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                <h4 className="font-bold text-gray-900 text-sm">معاينة صورة إيصال التحويل</h4>
                <button
                  onClick={() => setPreviewReceiptUrl(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[75vh] overflow-y-auto flex justify-center bg-gray-900 rounded-2xl p-2">
                <img
                  src={previewReceiptUrl}
                  alt="Receipt Full"
                  className="max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
