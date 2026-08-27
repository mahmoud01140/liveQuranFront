import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, CheckCircle, X, Volume2, Eye, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import api from '../../services/api';
import { getLevelLabel, getLevelColor, formatDateAr, getInitials, getAvatarColor } from '../../utils/helpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const LEVELS = ['foundation', 'memorization', 'teacher_prep', 'senior'];

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allRes, pendingRes] = await Promise.all([
        api.get('/users', { params: { limit: 50 } }),
        api.get('/users/pending-approval'),
      ]);
      setUsers(allRes.data.users || []);
      setPending(pendingRes.data.users || []);
    } catch { toast.error('خطأ في جلب البيانات'); }
    finally { setIsLoading(false); }
  };

  const handleApprove = async (userId) => {
    const level = selectedLevel[userId];
    if (!level) { toast.error('الرجاء تحديد المستوى أولاً'); return; }
    setApprovingId(userId);
    try {
      await api.put(`/users/${userId}/approve`, { assignedLevel: level });
      toast.success('تم قبول الطالب وتحديد مستواه!');
      await fetchData();
    } catch { toast.error('خطأ في القبول'); }
    finally { setApprovingId(null); }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('هل أنت متأكد من رفض هذا الطالب؟')) return;
    try {
      await api.put(`/users/${userId}`, { isActive: false });
      toast.success('تم رفض التسجيل');
      await fetchData();
    } catch { toast.error('خطأ'); }
  };

  const displayUsers = tab === 'pending' ? pending
    : users.filter(u => {
        const matchSearch = !search || `${u.firstName} ${u.lastName} ${u.email}`.includes(search);
        const matchRole = !roleFilter || u.role === roleFilter;
        return matchSearch && matchRole;
      });

  return (
    <PageLayout>
      <div className="mb-6">
        <h1 className="section-title">إدارة المستخدمين</h1>
        <p className="section-subtitle">مراجعة وإدارة حسابات الطلاب والمعلمين</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'pending', label: `بانتظار الموافقة (${pending.length})` },
          { id: 'all', label: 'كل المستخدمين' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              tab === t.id ? 'bg-primary-400 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-200'
            }`}
          >
            {t.label}
            {t.id === 'pending' && pending.length > 0 && (
              <span className="mr-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs inline-flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Filter (for all tab) */}
      {tab === 'all' && (
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-base pr-10" placeholder="بحث بالاسم أو البريد..." />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-base w-40">
            <option value="">الكل</option>
            <option value="student">طالب</option>
            <option value="teacher">معلم</option>
            <option value="admin">مدير</option>
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : displayUsers.length === 0 ? (
        <div className="card-base p-12 text-center text-gray-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>{tab === 'pending' ? 'لا يوجد طلاب بانتظار الموافقة' : 'لا يوجد مستخدمون'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayUsers.map((user, i) => {
            const levelColor = getLevelColor(user.assignedLevel);
            return (
              <motion.div key={user._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-base p-5"
              >
                <div className="flex flex-wrap items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(`${user.firstName}${user.lastName}`) }}>
                    {getInitials(user.firstName, user.lastName)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">{user.firstName} {user.lastName}</h3>
                      {user.registrationType && (
                        <span className="badge-gray text-xs">{
                          user.registrationType === 'student' ? 'طالب' :
                          user.registrationType === 'teacher' ? 'معلم' : 'كبار السن'
                        }</span>
                      )}
                      {user.assignedLevel && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: levelColor.bg, color: levelColor.text }}>
                          {getLevelLabel(user.assignedLevel)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                      {user.country && <span>🌍 {user.country}</span>}
                      {user.placementExamScore !== undefined && (
                        <span>📝 الاختبار: <strong>{user.placementExamScore}%</strong></span>
                      )}
                      <span>📅 {formatDateAr(user.createdAt)}</span>
                    </div>

                    {/* Oral recordings */}
                    {tab === 'pending' && user.oralExamRecordings?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500 mt-1">التسجيلات الشفهية:</span>
                        {user.oralExamRecordings.map((url, j) => (
                          <div key={j} className="flex items-center gap-2 bg-primary-50 rounded-xl px-3 py-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-primary-400" />
                            <audio src={url} controls className="h-6 w-32" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions (pending tab) */}
                  {tab === 'pending' && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <select
                        value={selectedLevel[user._id] || ''}
                        onChange={(e) => setSelectedLevel(prev => ({ ...prev, [user._id]: e.target.value }))}
                        className="input-base text-sm py-2 w-44"
                      >
                        <option value="">تحديد المستوى...</option>
                        {LEVELS.map(l => (
                          <option key={l} value={l}>{getLevelLabel(l)}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(user._id)}
                          disabled={approvingId === user._id || !selectedLevel[user._id]}
                          className="btn-primary text-sm py-2 flex-1 disabled:opacity-50">
                          {approvingId === user._id ? <LoadingSpinner size="sm" color="white" /> : (
                            <><CheckCircle className="w-4 h-4" /> قبول</>
                          )}
                        </button>
                        <button onClick={() => handleReject(user._id)} className="btn-danger text-sm py-2 px-3">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}


