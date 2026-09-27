import { useState, useEffect } from 'react';
import { Search, CheckCircle, Trash2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import { getLevelLabel, formatDateAr } from '../../utils/helpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';
import '../../components/halaqa/halaqa.css';
import { HQ, HqAvatar, HqBadge } from '../../components/halaqa/primitives';

/* إدارة المستخدمين — قائمة واحدة للجميع: بحث، أدوار، حذف نهائي.
   القبول يتم من مراجعة التحديد الشفهي، لا من هنا. */

const ROLE_OPTIONS = [
  { value: 'student', label: 'طالب' },
  { value: 'teacher', label: 'معلم' },
  { value: 'parent', label: 'ولي أمر' },
  { value: 'admin', label: 'مدير' },
];

const ROLE_LABEL = { admin: 'مدير', teacher: 'معلم', parent: 'ولي أمر', student: 'طالب' };
const ROLE_TONE = { admin: 'gold', teacher: 'guide', parent: 'neutral', student: 'mentor' };

export default function UsersManagement() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const res = await api.get('/users', { params: { limit: 200 } });
      setUsers(res.data.users || []);
    } catch {
      setLoadFailed(true);
      toast.error('خطأ في جلب البيانات');
    }
    finally { setIsLoading(false); }
  };

  const isSelf = (u) => me?._id && u._id === me._id;

  const handleRoleChange = async (u, newRole) => {
    if (!newRole || newRole === u.role) return;
    const roleLabel = ROLE_OPTIONS.find(r => r.value === newRole)?.label || newRole;
    if (!window.confirm(`تغيير دور ${u.firstName} ${u.lastName} إلى "${roleLabel}"؟`)) return;
    setActingId(u._id);
    try {
      await api.put(`/users/${u._id}`, { role: newRole });
      toast.success(`تم تغيير الدور إلى ${roleLabel}`);
      await fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'خطأ في تغيير الدور');
    }
    finally { setActingId(null); }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`حذف ${u.firstName} ${u.lastName} نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    setActingId(u._id);
    try {
      await api.delete(`/users/${u._id}`);
      toast.success('تم حذف المستخدم نهائياً');
      await fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'خطأ في الحذف');
    }
    finally { setActingId(null); }
  };

  const statusOf = (u) => {
    if (u.isActive === false) return { key: 'inactive', label: 'معطل', tone: 'neutral' };
    if (u.role === 'student' && !u.isApproved) return { key: 'pending', label: 'بانتظار الاعتماد', tone: 'gold' };
    return { key: 'active', label: 'نشط', tone: 'mentor' };
  };

  const displayUsers = users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && statusOf(u).key !== statusFilter) return false;
    if (search && !`${u.firstName} ${u.lastName} ${u.email}`.includes(search)) return false;
    return true;
  });

  const pendingCount = users.filter(u => statusOf(u).key === 'pending').length;

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedItems,
  } = usePagination(displayUsers, 10);

  const selectStyle = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 12,
    padding: '0 12px', minHeight: 48, fontSize: 14, color: HQ.INK, fontFamily: 'inherit',
  };

  return (
    <PageLayout>
      <div className="halaqa" style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: HQ.INK }}>المستخدمون</h1>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: HQ.MUTED }}>
          {users.length} مستخدم مسجل{pendingCount ? ` · ${pendingCount} بانتظار الاعتماد` : ''} — قبول، تغيير أدوار، وحذف نهائي من مكان واحد
        </p>

        {/* Search & filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} color={HQ.MUTED} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد..." aria-label="بحث عن مستخدم"
              style={{ ...selectStyle, width: '100%', paddingRight: 38 }} />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} aria-label="تصفية بالدور" style={{ ...selectStyle, minWidth: 140 }}>
            <option value="">جميع الأدوار</option>
            <option value="student">الطلاب</option>
            <option value="teacher">المعلمون</option>
            <option value="parent">أولياء الأمور</option>
            <option value="admin">المديرون</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="تصفية بالحالة" style={{ ...selectStyle, minWidth: 140 }}>
            <option value="">جميع الحالات</option>
            <option value="pending">بانتظار الاعتماد</option>
            <option value="active">نشط</option>
            <option value="inactive">معطل</option>
          </select>
        </div>

        {isLoading ? (
          <div aria-label="جارٍ تحميل المستخدمين">
            <div className="hq-skeleton" style={{ height: 76, width: '100%', marginBottom: 10 }} />
            <div className="hq-skeleton" style={{ height: 76, width: '100%', marginBottom: 10 }} />
            <div className="hq-skeleton" style={{ height: 76, width: '100%' }} />
          </div>
        ) : loadFailed && displayUsers.length === 0 ? (
          <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 40, textAlign: 'center' }} role="alert">
            <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 900, color: HQ.INK }}>تعذّر تحميل البيانات</p>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: HQ.MUTED }}>تحقق من الاتصال ثم حاول مرة أخرى.</p>
            <button type="button" onClick={fetchData} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 24px', fontSize: 15 }}>
              <RotateCcw size={16} /> إعادة المحاولة
            </button>
          </div>
        ) : displayUsers.length === 0 ? (
          <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 40, textAlign: 'center' }}>
            <CheckCircle size={40} color={HQ.MENTOR} style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: HQ.INK }}>لا نتائج مطابقة للبحث</p>
          </div>
        ) : (
          <>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {paginatedItems.map((u) => {
                const st = statusOf(u);
                const self = isSelf(u);
                return (
                  <li key={u._id} style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, marginBottom: 12, padding: 16 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <HqAvatar firstName={u.firstName} lastName={u.lastName} size={48} />
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                          <strong style={{ fontSize: 16, color: HQ.INK }}>{u.firstName} {u.lastName}</strong>
                          <HqBadge tone={ROLE_TONE[u.role] || 'neutral'}>{ROLE_LABEL[u.role] || u.role}</HqBadge>
                          {u.assignedLevel && <HqBadge tone="mentor">{getLevelLabel(u.assignedLevel)}</HqBadge>}
                          <HqBadge tone={st.tone}>{st.label}</HqBadge>
                          {self && <HqBadge tone="gold">حسابك</HqBadge>}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: HQ.MUTED, direction: 'ltr', textAlign: 'right' }}>{u.email}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: HQ.MUTED }}>
                          {u.country ? `${u.country} · ` : ''}
                          {u.placementExamScore !== undefined ? `الاختبار: ${u.placementExamScore}% · ` : ''}
                          {formatDateAr(u.createdAt)}
                        </p>
                        {u.oralExamRecordings?.length > 0 && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            {u.oralExamRecordings.map((url, j) => (
                              <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 10, padding: '6px 10px', fontSize: 12, color: HQ.MUTED }}>
                                تسجيل {j + 1}
                                <audio src={url} controls style={{ height: 28, width: 130 }} />
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                        <select value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          disabled={self || actingId === u._id}
                          aria-label={`دور ${u.firstName}`}
                          title={self ? 'لا يمكنك تغيير دور حسابك الخاص' : 'تغيير الدور'}
                          style={{ ...selectStyle, minWidth: 130, opacity: self ? 0.5 : 1 }}>
                          {ROLE_OPTIONS.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => handleDelete(u)}
                          disabled={self || actingId === u._id}
                          aria-label={`حذف ${u.firstName} نهائياً`}
                          title={self ? 'لا يمكنك حذف حسابك الخاص' : 'حذف نهائي — لا يمكن التراجع'}
                          className="hq-action" style={{ background: HQ.PAPER, border: '1px solid #C2410C', color: '#C2410C', padding: '0 14px', fontSize: 14, opacity: self ? 0.5 : 1 }}>
                          {actingId === u._id ? <LoadingSpinner size="sm" /> : <><Trash2 size={16} /> حذف نهائي</>}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              showPageSize={true}
              pageSizeOptions={[5, 10, 20, 50]}
              itemName="مستخدم"
              className="pt-2"
            />
          </>
        )}
      </div>
    </PageLayout>
  );
}
