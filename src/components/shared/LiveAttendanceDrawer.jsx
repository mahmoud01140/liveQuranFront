import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Check, Clock, X, AlertCircle,
  Send, Bell, UserCheck, ShieldAlert, CheckCircle2,
  RefreshCw, FileSpreadsheet, Search, MessageSquare,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getAvatarColor, getInitials } from '../../utils/helpers';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

/* Attendance sheet — operational desk beside the stage.
   Same socket updates, statuses, ping and save flow; visual only. */

const STATUS_TONE = {
  present: { bg: '#E2EFE7', fg: '#0F5940', border: '#177B58' },
  late: { bg: '#FBF7EE', fg: '#B45309', border: '#B45309' },
  absent: { bg: '#FFFFFF', fg: '#C2410C', border: '#C2410C' },
  excused: { bg: '#FFFFFF', fg: '#756E85', border: '#E8E2D4' },
};

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
      toast.success(`استجاب الطالب ${studentName} لنداء الحضور!`, { duration: 3000 });
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

    const handleStudentLeftSession = ({ sessionId: leftSessionId, studentId, leftAt }) => {
      if (leftSessionId && leftSessionId.toString() !== sessionId.toString()) return;
      setRecords(prev => prev.map(item => {
        if (item.student._id === studentId) {
          return {
            ...item,
            status: item.status === 'excused' ? 'excused' : 'absent',
            isOnline: false,
            leftAt: leftAt || new Date(),
          };
        }
        return item;
      }));
    };

    socket.on('attendance-pong-received', handlePongReceived);
    socket.on('attendance-updated', handleAttendanceUpdated);
    socket.on('student-left-session', handleStudentLeftSession);

    return () => {
      socket.off('attendance-pong-received', handlePongReceived);
      socket.off('attendance-updated', handleAttendanceUpdated);
      socket.off('student-left-session', handleStudentLeftSession);
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
    toast.success(`تم تحضير ${markedCount} طالب متصل الآن بنجاح!`);
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
      toast.success('تم إرسال نداء التحقق لجميع الطلاب في القاعة!');
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
      toast.success(res.data.message || 'تم تثبيت كشف الحضور بنجاح');
      if (res.data.parentsNotifiedCount > 0) {
        toast(`تم إرسال تنبيهات غياب لـ ${res.data.parentsNotifiedCount} من أولياء الأمور`, {
          icon: '!',
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

  const iconBtn = {
    minWidth: 44, minHeight: 44, borderRadius: 12, border: 'none', background: 'transparent',
    color: HQ.MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  const statusBtn = (active, tone) => ({
    minHeight: 40, padding: '8px 12px', borderRadius: 12, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: '0.8125rem', fontWeight: 800,
    border: `1.5px solid ${active ? tone.border : HQ.LINE}`,
    background: active ? tone.border : HQ.SURFACE,
    color: active ? '#fff' : HQ.MUTED,
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
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(42,36,56,0.55)' }}
          />

          {/* Drawer content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="halaqa fixed inset-y-0 right-0 z-50 w-full flex flex-col overflow-hidden"
            style={{ maxWidth: 640, background: HQ.PAPER }}
            dir="rtl"
            role="dialog" aria-modal="true" aria-label="كشف الحضور والغياب"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 flex items-center justify-between flex-none"
              style={{ background: HQ.SURFACE, borderBottom: `1px solid ${HQ.LINE}` }}>
              <div className="flex items-center gap-3 min-w-0">
                <span aria-hidden style={{
                  width: 40, height: 40, borderRadius: 14, background: '#E2EFE7', color: HQ.MENTOR,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                }}>
                  <UserCheck size={19} />
                </span>
                <div className="min-w-0">
                  <h2 className="font-bold text-base sm:text-lg flex items-center gap-2" style={{ color: HQ.INK, margin: 0 }}>
                    كشف الحضور والغياب اللحظي
                    <span className="hq-live-dot" aria-hidden />
                  </h2>
                  <p className="text-xs" style={{ color: HQ.MUTED, margin: 0 }}>
                    {groupName || 'المجموعة'} — {sessionTitle || 'الحصة المباشرة'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-none">
                <button
                  type="button"
                  onClick={fetchAttendanceSheet}
                  disabled={loading}
                  style={{ ...iconBtn, opacity: loading ? 0.55 : 1 }}
                  title="إعادة تحميل الكشف"
                  aria-label="إعادة تحميل الكشف"
                >
                  <RefreshCw size={17} aria-hidden className={loading ? 'animate-spin' : ''} style={loading ? { color: HQ.MENTOR } : undefined} />
                  <span className="hidden sm:inline text-xs font-bold">إعادة تحميل</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={iconBtn}
                  title="إغلاق"
                  aria-label="إغلاق كشف الحضور"
                >
                  <X size={19} aria-hidden />
                </button>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-5 gap-2 p-3 sm:p-4 text-center flex-none"
              style={{ background: HQ.SURFACE, borderBottom: `1px solid ${HQ.LINE}` }}>
              {[
                { label: 'المسجلين', n: stats.total, fg: HQ.INK },
                { label: 'الحاضرين', n: stats.present, fg: HQ.MENTOR },
                { label: 'المتأخرين', n: stats.late, fg: '#B45309' },
                { label: 'الغائبين', n: stats.absent, fg: '#C2410C' },
                { label: 'معذورين', n: stats.excused, fg: HQ.MUTED },
              ].map(s => (
                <div key={s.label} className="p-2 rounded-xl" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
                  <p className="text-xs font-bold" style={{ color: HQ.MUTED, margin: '0 0 2px' }}>{s.label}</p>
                  <p className="font-black" style={{ fontSize: '1.25rem', color: s.fg, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{s.n}</p>
                </div>
              ))}
            </div>

            {/* Smart Actions Row */}
            <div className="p-3 sm:p-4 space-y-3 flex-none" style={{ borderBottom: `1px solid ${HQ.LINE}`, background: HQ.SURFACE }}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoMarkOnline}
                  className="text-xs font-bold flex items-center gap-1.5"
                  style={{
                    minHeight: 44, padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                    background: HQ.MENTOR, color: '#fff', border: 'none',
                  }}
                >
                  <CheckCircle2 size={15} aria-hidden />
                  تحضير المتواجدين الآن تلقائياً
                </button>

                <button
                  type="button"
                  onClick={handleSendPing}
                  disabled={pinging}
                  className="text-xs font-bold flex items-center gap-1.5"
                  style={{
                    minHeight: 44, padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                    border: '1.5px solid #B45309', background: HQ.SURFACE, color: '#B45309',
                    opacity: pinging ? 0.6 : 1,
                  }}
                >
                  <Bell size={15} aria-hidden />
                  {pinging ? 'جارٍ الإرسال...' : 'إرسال نداء التحقق (Roll-Call)'}
                </button>

                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="text-xs font-bold flex items-center gap-1"
                  style={{
                    minHeight: 44, padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${HQ.LINE}`, background: HQ.SURFACE, color: HQ.INK, marginRight: 'auto',
                  }}
                >
                  <CheckCircle2 size={15} color={HQ.MUTED} aria-hidden />
                  تحضير الكل
                </button>
              </div>

              {/* Search & Parent Notification Toggle */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="relative flex-1">
                  <Search size={15} color={HQ.MUTED} aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    aria-label="بحث عن طالب بالاسم أو البريد"
                    placeholder="بحث عن طالب بالاسم أو البريد..."
                    className="w-full text-sm pr-10 focus:border-[#177B58] focus:outline-none"
                    style={{
                      minHeight: 44, background: HQ.SURFACE, color: HQ.INK,
                      border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '8px 40px 8px 12px',
                    }}
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold"
                  style={{ color: HQ.INK, minHeight: 44 }}>
                  <input
                    type="checkbox"
                    checked={notifyParents}
                    onChange={e => setNotifyParents(e.target.checked)}
                    style={{ width: 20, height: 20, accentColor: HQ.MENTOR }}
                  />
                  <span>إرسال إشعار فوري لولي أمر الغائب</span>
                </label>
              </div>
            </div>

            {/* Students Attendance List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16" style={{ color: HQ.MUTED }}>
                  <RefreshCw size={30} color={HQ.MENTOR} className="animate-spin mb-3" aria-hidden />
                  <p className="text-xs font-bold" style={{ margin: 0 }}>جارٍ تحميل كشف الطلاب...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12" style={{ color: HQ.MUTED }}>
                  <Users size={46} color={HQ.LINE} style={{ margin: '0 auto 8px' }} aria-hidden />
                  <p className="text-sm font-bold" style={{ margin: 0 }}>لا يوجد طلاب مطابقين</p>
                </div>
              ) : (
                filteredRecords.map(item => {
                  const s = item.student;
                  const tone = STATUS_TONE[item.status] || STATUS_TONE.absent;

                  return (
                    <div
                      key={s._id}
                      className="p-3 sm:p-3.5 rounded-2xl"
                      style={{ background: HQ.SURFACE, border: `1px solid ${tone.border}` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Student Info & Online status */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex-none">
                            <span aria-hidden className="avatar-circle"
                              style={{
                                width: 40, height: 40, fontSize: 13,
                                backgroundColor: getAvatarColor(`${s.firstName}${s.lastName}`),
                              }}>
                              {getInitials(s.firstName, s.lastName)}
                            </span>
                            <span
                              aria-hidden
                              title={item.isOnline ? 'متصل داخل القاعة الآن' : 'غير متصل'}
                              style={{
                                position: 'absolute', bottom: -2, right: -2, width: 14, height: 14,
                                borderRadius: 9999, border: `2px solid ${HQ.SURFACE}`,
                                background: item.isOnline ? HQ.MENTOR : HQ.LINE,
                              }}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm truncate" style={{ color: HQ.INK, margin: 0 }}>
                                {s.firstName} {s.lastName}
                              </p>
                              {item.isOnline && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  fontSize: '0.8125rem', fontWeight: 800, padding: '2px 10px', borderRadius: 9999,
                                  background: '#E2EFE7', color: '#0F5940',
                                }}>
                                  <span aria-hidden style={{ width: 7, height: 7, borderRadius: 9999, background: HQ.MENTOR }} />
                                  داخل القاعة
                                </span>
                              )}
                            </div>
                            <p className="truncate" style={{ fontSize: '0.8125rem', color: HQ.MUTED, margin: 0 }}>{s.email}</p>
                          </div>
                        </div>

                        {/* Status Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label={`حالة حضور ${s.firstName}`}>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s._id, 'present')}
                            aria-pressed={item.status === 'present'}
                            style={statusBtn(item.status === 'present', STATUS_TONE.present)}
                          >
                            <Check size={13} aria-hidden /> حاضر
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s._id, 'late')}
                            aria-pressed={item.status === 'late'}
                            style={statusBtn(item.status === 'late', STATUS_TONE.late)}
                          >
                            <Clock size={13} aria-hidden /> متأخر
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s._id, 'absent')}
                            aria-pressed={item.status === 'absent'}
                            style={statusBtn(item.status === 'absent', STATUS_TONE.absent)}
                          >
                            <X size={13} aria-hidden /> غائب
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusChange(s._id, 'excused')}
                            aria-pressed={item.status === 'excused'}
                            style={statusBtn(item.status === 'excused', STATUS_TONE.excused)}
                          >
                            معذور
                          </button>
                        </div>
                      </div>

                      {/* Note Input */}
                      <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${HQ.LINE}` }}>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={e => handleNotesChange(s._id, e.target.value)}
                          aria-label={`ملاحظة على حضور ${s.firstName}`}
                          placeholder="إضافة ملاحظة على حضور الطالب (اختياري)..."
                          className="w-full text-xs focus:border-[#177B58] focus:outline-none"
                          style={{
                            minHeight: 40, background: HQ.SURFACE, color: HQ.INK,
                            border: `1px solid ${HQ.LINE}`, borderRadius: 8, padding: '8px 12px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="p-4 flex items-center justify-between gap-3 flex-none"
              style={{ background: HQ.SURFACE, borderTop: `1px solid ${HQ.LINE}` }}>
              <button
                type="button"
                onClick={onClose}
                className="hq-action"
                style={{ background: HQ.PAPER, color: HQ.INK, fontSize: '0.8125rem' }}
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving || loading}
                className="hq-action"
                style={{ background: HQ.MENTOR, color: '#fff', fontSize: 14, padding: '0 24px', opacity: (saving || loading) ? 0.6 : 1 }}
              >
                {saving ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" aria-hidden />
                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Check size={15} aria-hidden />
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
