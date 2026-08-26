import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Check, Clock, X, AlertCircle, Sparkles,
  Send, Bell, UserCheck, ShieldAlert, CheckCircle2,
  RefreshCw, FileSpreadsheet, Search, MessageSquare
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getAvatarColor, getInitials } from '../../utils/helpers';

export default function LiveAttendanceDrawer({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  groupName,
  socket,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [search, setSearch] = useState('');
  const [notifyParents, setNotifyParents] = useState(true);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0, excused: 0 });

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchAttendanceSheet();
    }
  }, [isOpen, sessionId]);

  // Real-time socket listener for student pongs and live presence updates
  useEffect(() => {
    if (!socket || !sessionId) return;

    const handlePongReceived = ({ studentId, studentName }) => {
      setRecords(prev => prev.map(item => {
        if (item.student._id === studentId) {
          return { ...item, status: 'present', isOnline: true };
        }
        return item;
      }));
      toast.success(`✋ استجاب الطالب ${studentName} لنداء الحضور!`, { duration: 3000 });
    };

    const handleAttendanceUpdated = ({ records: updatedRecs, updatedBy }) => {
      if (updatedRecs?.length) {
        setRecords(prev => prev.map(item => {
          const matching = updatedRecs.find(u => (u.studentId || u.student) === item.student._id);
          if (matching) {
            return { ...item, status: matching.status, notes: matching.notes || item.notes };
          }
          return item;
        }));
      }
    };

    socket.on('attendance-pong-received', handlePongReceived);
    socket.on('attendance-updated', handleAttendanceUpdated);

    return () => {
      socket.off('attendance-pong-received', handlePongReceived);
      socket.off('attendance-updated', handleAttendanceUpdated);
    };
  }, [socket, sessionId]);

  // Recalculate stats whenever records change
  useEffect(() => {
    const present = records.filter(r => r.status === 'present').length;
    const late = records.filter(r => r.status === 'late').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const excused = records.filter(r => r.status === 'excused').length;
    setStats({
      total: records.length,
      present,
      late,
      absent,
      excused,
    });
  }, [records]);

  const fetchAttendanceSheet = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/live/${sessionId}/attendance-sheet`);
      setRecords(res.data.sheet || []);
    } catch (err) {
      toast.error('حدث خطأ في جلب كشف الحضور');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, newStatus) => {
    setRecords(prev =>
      prev.map(r => (r.student._id === studentId ? { ...r, status: newStatus } : r))
    );
  };

  const handleNotesChange = (studentId, note) => {
    setRecords(prev =>
      prev.map(r => (r.student._id === studentId ? { ...r, notes: note } : r))
    );
  };

  // Auto-mark all currently connected students as 'present', disconnected as 'absent'
  const handleAutoMarkOnline = () => {
    let markedCount = 0;
    setRecords(prev =>
      prev.map(r => {
        if (r.isOnline && r.status !== 'present') {
          markedCount++;
          return { ...r, status: 'present' };
        }
        return r;
      })
    );
    toast.success(`⚡ تم تحضير ${markedCount} طالب متصل الآن بنجاح!`);
  };

  // Mark all as present
  const handleMarkAllPresent = () => {
    setRecords(prev => prev.map(r => ({ ...r, status: 'present' })));
    toast.success('تم تعيين جميع الطلاب كـ "حاضر"');
  };

  // Trigger Roll-Call Ping
  const handleSendPing = async () => {
    setPinging(true);
    try {
      await api.post(`/live/${sessionId}/attendance-ping`);
      toast.success('🔔 تم إرسال نداء التحقق لجميع الطلاب في القاعة!');
    } catch (err) {
      toast.error('فشل إرسال نداء التحقق');
    } finally {
      setPinging(false);
    }
  };

  // Save Attendance to Database
  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const payload = {
        records: records.map(r => ({
          studentId: r.student._id,
          status: r.status,
          notes: r.notes || '',
          durationMinutes: r.durationMinutes || 0,
        })),
        notifyParents,
      };

      const res = await api.put(`/live/${sessionId}/attendance-sheet`, payload);
      toast.success(res.data.message || 'تم تثبيت كشف الحضور بنجاح ✅');
      if (res.data.parentsNotifiedCount > 0) {
        toast(`📲 تم إرسال تنبيهات غياب لـ ${res.data.parentsNotifiedCount} من أولياء الأمور`, {
          icon: '⚠️',
          duration: 4000,
        });
      }
      onClose();
    } catch (err) {
      toast.error('خطأ في حفظ كشف الحضور');
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = records.filter(r => {
    if (!search.trim()) return true;
    const name = `${r.student.firstName} ${r.student.lastName}`.toLowerCase();
    const email = (r.student.email || '').toLowerCase();
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Drawer content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden text-right"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-l from-slate-900 to-slate-800 text-white border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-500/20 border border-primary-400/30 flex items-center justify-center text-primary-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
                    كشف الحضور والغياب اللحظي 📋
                    <span className="live-dot" />
                  </h2>
                  <p className="text-xs text-slate-300">
                    {groupName || 'المجموعة'} — {sessionTitle || 'الحصة المباشرة'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-5 gap-2 p-3 sm:p-4 bg-slate-50 border-b border-gray-100 text-center flex-shrink-0">
              <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold">المسجلين</p>
                <p className="text-base sm:text-lg font-black text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 shadow-sm">
                <p className="text-xs text-emerald-700 font-semibold">الحاضرين</p>
                <p className="text-base sm:text-lg font-black text-emerald-600">{stats.present}</p>
              </div>
              <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 shadow-sm">
                <p className="text-xs text-amber-700 font-semibold">المتأخرين</p>
                <p className="text-base sm:text-lg font-black text-amber-600">{stats.late}</p>
              </div>
              <div className="bg-rose-50 p-2 rounded-xl border border-rose-100 shadow-sm">
                <p className="text-xs text-rose-700 font-semibold">الغائبين</p>
                <p className="text-base sm:text-lg font-black text-rose-600">{stats.absent}</p>
              </div>
              <div className="bg-purple-50 p-2 rounded-xl border border-purple-100 shadow-sm">
                <p className="text-xs text-purple-700 font-semibold">معذورين</p>
                <p className="text-base sm:text-lg font-black text-purple-600">{stats.excused}</p>
              </div>
            </div>

            {/* Smart Actions Row */}
            <div className="p-3 sm:p-4 border-b border-gray-100 bg-white space-y-3 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoMarkOnline}
                  className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  تحضير المتواجدين الآن تلقائياً
                </button>

                <button
                  type="button"
                  onClick={handleSendPing}
                  disabled={pinging}
                  className="py-2 px-3.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Bell className="w-4 h-4 text-amber-600" />
                  {pinging ? 'جارٍ الإرسال...' : 'إرسال نداء التحقق (Roll-Call) ✋'}
                </button>

                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1 transition-colors mr-auto"
                >
                  <CheckCircle2 className="w-4 h-4 text-gray-500" />
                  تحضير الكل
                </button>
              </div>

              {/* Search & Parent Notification Toggle */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="بحث عن طالب بالاسم أو البريد..."
                    className="w-full text-xs pr-9 pl-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none bg-rose-50/70 border border-rose-100 px-3 py-1.5 rounded-xl text-rose-900 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={notifyParents}
                    onChange={e => setNotifyParents(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-400 accent-rose-600"
                  />
                  <span>📲 إرسال إشعار فوري لولي أمر الغائب</span>
                </label>
              </div>
            </div>

            {/* Students Attendance List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-3" />
                  <p className="text-xs font-bold">جارٍ تحميل كشف الطلاب...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm font-bold">لا يوجد طلاب مطابقين</p>
                </div>
              ) : (
                filteredRecords.map(item => {
                  const s = item.student;
                  const isPresent = item.status === 'present';
                  const isLate = item.status === 'late';
                  const isAbsent = item.status === 'absent';
                  const isExcused = item.status === 'excused';

                  return (
                    <motion.div
                      key={s._id}
                      layout
                      className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
                        isPresent
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isLate
                          ? 'bg-amber-50/40 border-amber-200'
                          : isExcused
                          ? 'bg-purple-50/40 border-purple-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Student Info & Online status */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                              style={{ backgroundColor: getAvatarColor(`${s.firstName}${s.lastName}`) }}
                            >
                              {getInitials(s.firstName, s.lastName)}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                item.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                              }`}
                              title={item.isOnline ? 'متصل داخل القاعة الآن' : 'غير متصل'}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-gray-900 text-sm truncate">
                                {s.firstName} {s.lastName}
                              </p>
                              {item.isOnline && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                  🟢 داخل القاعة
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 truncate">{s.email}</p>
                          </div>
                        </div>

                        {/* Status Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s._id, 'present')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              isPresent
                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                                : 'bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" /> حاضر
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s._id, 'late')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              isLate
                                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                                : 'bg-gray-100 hover:bg-amber-50 text-gray-600 hover:text-amber-700'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" /> متأخر
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s._id, 'absent')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              isAbsent
                                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                                : 'bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-700'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" /> غائب
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s._id, 'excused')}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              isExcused
                                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                                : 'bg-gray-100 hover:bg-purple-50 text-gray-600 hover:text-purple-700'
                            }`}
                          >
                            معذور
                          </button>
                        </div>
                      </div>

                      {/* Note Input */}
                      <div className="mt-2 pt-2 border-t border-gray-100/80">
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={e => handleNotesChange(s._id, e.target.value)}
                          placeholder="إضافة ملاحظة على حضور الطالب (اختياري)..."
                          className="w-full text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400 placeholder:text-gray-300"
                        />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="btn-outline py-2.5 px-4 text-xs font-bold"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving || loading}
                className="btn-primary py-2.5 px-6 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    حفظ وتثبيت كشف الحضور
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
