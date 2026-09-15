import { useState, useEffect } from 'react';
import { BookOpen, Check, Clock, AlertCircle, Trash2, RefreshCw, Mic } from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import useDailyRecordStore from '../../store/dailyRecordStore';
import { timeAgoAr } from '../../utils/helpers';
import toast from 'react-hot-toast';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';
import '../../components/halaqa/halaqa.css';
import { HQ, HqStars } from '../../components/halaqa/primitives';

/* سجل الإنجاز — what you completed, plainly. Same fetch/delete/pagination.
   No analytics dashboard, no streak/XP (never on this screen). */

const ACTIVITY = {
  memorization: { label: 'حفظ جديد', icon: BookOpen },
  review: { label: 'مراجعة', icon: RefreshCw },
  tajweed: { label: 'تجويد', icon: Mic },
};

const STATUS = {
  pending: { label: 'قيد المراجعة', color: '#B45309' },
  approved: { label: 'معتمد', color: HQ.MENTOR },
  needs_review: { label: 'يحتاج مراجعة', color: '#C2410C' },
};

export default function DailyTrackerPage() {
  const { records, isLoading, fetchMyRecords, deleteRecord } = useDailyRecordStore();
  const recordsPagination = usePagination(records, 10);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = () => {
    setLoadFailed(false);
    Promise.resolve(fetchMyRecords({ week: 'current' })).catch(() => setLoadFailed(true));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    try {
      await deleteRecord(id);
      toast.success('تم حذف السجل');
    } catch {
      toast.error('فشل في حذف السجل');
    }
  };

  return (
    <PageLayout>
      <div className="halaqa" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 'clamp(16px, 3vw, 28px)', maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: HQ.INK }}>سجل إنجازي</h1>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: HQ.MUTED }}>
          ما أنجزته في الحصص — يعتمده المعلم بعد كل تسميع
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: HQ.INK }}>هذا الأسبوع ({records.length})</h2>
          <button type="button" onClick={load} className="hq-action"
            style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, color: HQ.INK, padding: '0 16px', fontSize: 13 }}>
            <RefreshCw size={15} /> تحديث
          </button>
        </div>

        {isLoading ? (
          <div aria-label="جارٍ تحميل السجل">
            <div className="hq-skeleton" style={{ height: 64, width: '100%', marginBottom: 10 }} />
            <div className="hq-skeleton" style={{ height: 64, width: '100%', marginBottom: 10 }} />
            <div className="hq-skeleton" style={{ height: 64, width: '100%' }} />
          </div>
        ) : loadFailed && records.length === 0 ? (
          <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 40, textAlign: 'center' }} role="alert">
            <p style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 900, color: HQ.INK }}>تعذّر تحميل السجل</p>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: HQ.MUTED }}>تحقق من الاتصال ثم حاول مرة أخرى.</p>
            <button type="button" onClick={load} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 24px', fontSize: 15 }}>
              <RefreshCw size={16} /> إعادة المحاولة
            </button>
          </div>
        ) : records.length === 0 ? (
          <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 40, textAlign: 'center' }}>
            <BookOpen size={40} color={HQ.LINE} style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 900, color: HQ.INK }}>لا سجلات بعد</p>
            <p style={{ margin: 0, fontSize: 14, color: HQ.MUTED }}>يُسجَّل إنجازك تلقائيًا بعد أول حصة تسميع مع المعلم.</p>
          </div>
        ) : (
          <>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {recordsPagination.paginatedItems.map((record) => {
                const st = STATUS[record.status] || STATUS.pending;
                const act = ACTIVITY[record.activityType] || ACTIVITY.memorization;
                const ActIcon = act.icon;
                const StatusIcon = record.status === 'approved' ? Check : record.status === 'needs_review' ? AlertCircle : Clock;
                return (
                  <li key={record._id} style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, marginBottom: 12, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span aria-hidden style={{ width: 40, height: 40, borderRadius: 12, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                        <ActIcon size={18} color={HQ.MENTOR} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: 16, color: HQ.INK }}>
                          سورة {record.surahName} · الآيات {record.fromVerse} - {record.toVerse}
                        </strong>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4, fontSize: 13 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 800, color: st.color }}>
                            <StatusIcon size={14} /> {st.label}
                          </span>
                          <span style={{ color: HQ.MUTED }}>{act.label}</span>
                          <span style={{ color: HQ.MUTED }}>{record.versesCount} آية</span>
                          <span style={{ color: HQ.MUTED }}>{timeAgoAr(record.date)}</span>
                        </span>
                      </span>
                      {record.status === 'pending' && (
                        <button type="button" onClick={() => handleDelete(record._id)} aria-label="حذف السجل"
                          style={{ flex: 'none', width: 44, height: 44, borderRadius: 12, border: 'none', background: 'none', color: HQ.MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    {record.studentNotes && (
                      <p style={{ margin: '8px 0 0', fontSize: 14, color: HQ.MUTED }}>ملاحظتك: {record.studentNotes}</p>
                    )}
                    {record.teacherNotes && (
                      <p style={{ margin: '8px 0 0', fontSize: 14, color: HQ.INK, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 10, padding: '8px 12px' }}>
                        <strong>ملاحظة المعلم:</strong> {record.teacherNotes}
                      </p>
                    )}
                    {record.rating ? (
                      <div style={{ marginTop: 8 }}><HqStars value={record.rating} /></div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            <Pagination
              currentPage={recordsPagination.currentPage}
              totalPages={recordsPagination.totalPages}
              totalItems={recordsPagination.totalItems}
              pageSize={recordsPagination.pageSize}
              onPageChange={recordsPagination.setCurrentPage}
              onPageSizeChange={recordsPagination.setPageSize}
              showPageSize={true}
              pageSizeOptions={[5, 10, 20, 50]}
              itemName="سجل"
            />
          </>
        )}
      </div>
    </PageLayout>
  );
}
