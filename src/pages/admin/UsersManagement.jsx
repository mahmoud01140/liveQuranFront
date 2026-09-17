import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, CheckCircle, X, Volume2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import api from '../../services/api';
import { getLevelLabel, formatDateAr } from '../../utils/helpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';
import '../../components/halaqa/halaqa.css';
import { HQ, HqAvatar, HqBadge } from '../../components/halaqa/primitives';

/* إدارة المستخدمين — approve fast, browse clearly.
   Same endpoints, approval flow, filters, and pagination. */

const LEVELS = ['foundation', 'memorization', 'teacher_prep', 'senior'];

const ROLE_LABEL = { admin: 'إدارة ومعلمون', teacher: 'إدارة ومعلمون', parent: 'ولي أمر', student: 'طالب' };
const ROLE_TONE = { admin: 'gold', teacher: 'gold', parent: 'neutral', student: 'mentor' };

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const [allRes, pendingRes] = await Promise.all([
        api.get('/users', { params: { limit: 200 } }),
        api.get('/users/pending-approval'),
      ]);
      setUsers(allRes.data.users || []);
      setPending(pendingRes.data.users || []);
    } catch {
      setLoadFailed(true);
      toast.error('خطأ في جلب البيانات');
    }
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

  const displayUsers = (tab === 'pending' ? pending
    : users.filter(u => {
        const matchRole = !roleFilter || u.role === roleFilter;
        return matchRole;
      })).filter(u => {
        const matchSearch = !search || `${u.firstName} ${u.lastName} ${u.email}`.includes(search);
        return matchSearch;
      });

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
          {pending.length ? `${pending.length} بانتظار موافقتك` : 'راجع الحسابات واعتمد المستويات'}
        </p>

        {/* Tabs */}
        <div className="hq-tabs" role="tablist" aria-label="قوائم المستخدمين" style={{ marginBottom: 16 }}>
          {[
            { id: 'pending', label: `بانتظار الموافقة (${pending.length})` },
            { id: 'all', label: 'الكل' },
          ].map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search & filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} color={HQ.MUTED} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد..." aria-label="بحث عن مستخدم"
              style={{ ...selectStyle, width: '100%', paddingRight: 38 }} />
          </div>
          {tab === 'all' && (
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} aria-label="تصفية بالدور" style={{ ...selectStyle, minWidth: 150 }}>
              <option value="">جميع الأدوار</option>
              <option value="student">الطلاب</option>
              <option value="parent">أولياء الأمور</option>
              <option value="admin">المعلم والمدير</option>
            </select>
          )}
        </div>

        {tab === 'pending' && pending.length > 0 && (
          <p style={{ margin: '0 0 16px', fontSize: 13, color: HQ.MUTED }}>
            بعد القبول سكّن الطالب في مجموعته من <Link to="/admin/groups" style={{ color: HQ.MENTOR, fontWeight: 800 }}>إدارة وتسكين الحلقات</Link>.
          </p>
        )}

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
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: HQ.INK }}>
              {tab === 'pending' ? 'لا أحد بانتظار الموافقة — عمل منجز' : 'لا نتائج مطابقة للبحث'}
            </p>
          </div>
        ) : (
          <>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {paginatedItems.map((u) => (
                <li key={u._id} style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, marginBottom: 12, padding: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <HqAvatar firstName={u.firstName} lastName={u.lastName} size={48} />
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                        <strong style={{ fontSize: 16, color: HQ.INK }}>{u.firstName} {u.lastName}</strong>
                        <HqBadge tone={ROLE_TONE[u.role] || 'neutral'}>{ROLE_LABEL[u.role] || u.role}</HqBadge>
                        {u.assignedLevel && <HqBadge tone="mentor">{getLevelLabel(u.assignedLevel)}</HqBadge>}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: HQ.MUTED, direction: 'ltr', textAlign: 'right' }}>{u.email}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: HQ.MUTED }}>
                        {u.country ? `${u.country} · ` : ''}
                        {u.placementExamScore !== undefined ? `الاختبار: ${u.placementExamScore}% · ` : ''}
                        {formatDateAr(u.createdAt)}
                      </p>
                      {tab === 'pending' && u.oralExamRecordings?.length > 0 && (
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
                    {tab === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                        <select value={selectedLevel[u._id] || ''}
                          onChange={(e) => setSelectedLevel(prev => ({ ...prev, [u._id]: e.target.value }))}
                          aria-label={`مستوى ${u.firstName}`}
                          style={{ ...selectStyle, flex: 1, minWidth: 150 }}>
                          <option value="">تحديد المستوى...</option>
                          {LEVELS.map(l => (
                            <option key={l} value={l}>{getLevelLabel(l)}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => handleApprove(u._id)}
                          disabled={approvingId === u._id || !selectedLevel[u._id]}
                          className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 20px', fontSize: 14, opacity: (approvingId === u._id || !selectedLevel[u._id]) ? 0.5 : 1 }}>
                          {approvingId === u._id ? <LoadingSpinner size="sm" color="white" /> : <><CheckCircle size={16} /> قبول</>}
                        </button>
                        <button type="button" onClick={() => handleReject(u._id)} aria-label={`رفض ${u.firstName}`}
                          className="hq-action" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, color: '#C2410C', padding: '0 14px', fontSize: 14 }}>
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
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
