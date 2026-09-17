import { useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle, XCircle, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useExamStore from '../../store/examStore';
import { formatDateAr, NO_GROUP_TITLE, NO_GROUP_HINT } from '../../utils/helpers';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';
import '../../components/halaqa/halaqa.css';
import { HQ, HqBadge } from '../../components/halaqa/primitives';

/* الاختبارات — what is required now, then what comes after.
   Same store calls, pagination, and navigation; only hierarchy changed.
   List-first: one required exam stands out, the rest are quiet rows. */

function examKind(exam) {
  if (exam.questions?.some(q => q.type === 'recitation')) return 'يشمل شفهيًا';
  if (exam.questions?.some(q => q.type === 'written')) return 'يشمل تحريريًا';
  return 'اختياري';
}

export default function ExamsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { results, availableExams, fetchMyResults, fetchAvailableExams } = useExamStore();
  const [tab, setTab] = useState('available');

  const availablePagination = usePagination(availableExams, 6);
  const resultsPagination = usePagination(results, 8);

  useEffect(() => {
    if (user) {
      fetchMyResults(user._id);
      // The unified assigned endpoint also serves groupless students
      // (individual + level-wide exams), so always fetch.
      const groupId = user.group?._id || user.group;
      fetchAvailableExams(groupId, user._id);
    }
  }, [user]);

  const sheet = { background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 'clamp(16px, 3vw, 28px)' };

  const tabs = [
    { key: 'available', label: 'المطلوب الآن', count: availableExams.length },
    { key: 'results', label: 'نتائجي', count: results.length },
  ];

  return (
    <PageLayout>
      <div className="halaqa" style={{ ...sheet, maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: HQ.INK }}>اختباراتي</h1>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: HQ.MUTED }}>
          {availableExams.length ? `لديك ${availableExams.length} اختبارًا مطلوبًا` : 'لا اختبارات معلقة عليك الآن'}
        </p>

        {/* Tabs: segmented, quiet */}
        <div role="tablist" aria-label="أقسام الاختبارات"
          style={{ display: 'inline-flex', gap: 4, background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 14, padding: 4, marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
              style={{
                border: 'none', cursor: 'pointer', minHeight: 44, padding: '0 20px',
                borderRadius: 10, fontSize: 14, fontWeight: 800,
                background: tab === t.key ? HQ.MENTOR : 'transparent',
                color: tab === t.key ? '#fff' : HQ.MUTED,
              }}>
              {t.label}{t.count > 0 ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        {tab === 'available' && (
          availableExams.length === 0 ? (
            <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 40, textAlign: 'center' }}>
              <FileText size={40} color={HQ.LINE} style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 16, color: HQ.INK }}>
                {!(user?.group?._id || user?.group) ? NO_GROUP_TITLE : 'لا اختبارات معلقة'}
              </p>
              <p style={{ margin: 0, fontSize: 14, color: HQ.MUTED }}>
                {!(user?.group?._id || user?.group) ? NO_GROUP_HINT : 'ستظهر هنا الاختبارات التي يضيفها المعلم لمجموعتك.'}
              </p>
            </div>
          ) : (
            <>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {availablePagination.paginatedItems.map((exam, i) => {
                  const required = i === 0 && availablePagination.currentPage === 1;
                  return (
                    <li key={exam._id} style={{
                      background: required ? '#E2EFE7' : HQ.SURFACE,
                      border: `1px solid ${required ? HQ.MENTOR : HQ.LINE}`,
                      borderRadius: 18, marginBottom: 12, padding: 14,
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 16, color: required ? HQ.MENTOR : HQ.INK }}>{exam.title}</strong>
                          {required && <HqBadge tone="mentor">ابدأ به</HqBadge>}
                        </span>
                        <span style={{ display: 'block', fontSize: 13, color: HQ.MUTED, marginTop: 2 }}>
                          {exam.lessonTitle ? `درس: ${exam.lessonTitle} · ` : ''}{exam.questions?.length || 0} أسئلة
                          {exam.duration ? ` · ${exam.duration} دقيقة` : ''} · {examKind(exam)}
                        </span>
                      </span>
                      <button type="button" onClick={() => navigate(`/student/exams/${exam._id}/take`)}
                        className="hq-action" aria-label={`ابدأ اختبار ${exam.title}`}
                        style={{ flex: 'none', background: HQ.MENTOR, color: '#fff', padding: '0 20px', fontSize: 14 }}>
                        <Play size={15} /> ابدأ
                      </button>
                    </li>
                  );
                })}
              </ol>
              <Pagination
                currentPage={availablePagination.currentPage}
                totalPages={availablePagination.totalPages}
                totalItems={availablePagination.totalItems}
                pageSize={availablePagination.pageSize}
                onPageChange={availablePagination.setCurrentPage}
                onPageSizeChange={availablePagination.setPageSize}
                showPageSize={true}
                pageSizeOptions={[6, 12, 24]}
                itemName="امتحان"
                className="mt-6"
              />
            </>
          )
        )}

        {tab === 'results' && (
          results.length === 0 ? (
            <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 40, textAlign: 'center' }}>
              <FileText size={40} color={HQ.LINE} style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: HQ.INK }}>لا نتائج بعد</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: HQ.MUTED }}>ستظهر هنا نتائجك فور أداء أول اختبار.</p>
            </div>
          ) : (
            <>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {resultsPagination.paginatedItems.map((result) => {
                  const score = result.totalPercentage ?? result.writtenPercentage ?? 0;
                  const isPending = result.status === 'pending_oral_review';
                  const state = isPending ? 'pending' : result.isPassed ? 'passed' : 'review';
                  const stateColor = { pending: '#B45309', passed: HQ.MENTOR, review: '#C2410C' }[state];
                  const stateLabel = { pending: 'قيد المراجعة', passed: 'ناجح', review: 'يحتاج مراجعة' }[state];
                  return (
                    <li key={result._id} style={{
                      background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18,
                      marginBottom: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <span aria-hidden style={{ width: 30, height: 30, borderRadius: 9999, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: state === 'passed' ? HQ.MENTOR : HQ.PAPER, border: `2px solid ${state === 'passed' ? HQ.MENTOR : HQ.LINE}`, color: state === 'passed' ? '#fff' : stateColor }}>
                        {state === 'passed' ? <CheckCircle size={15} /> : state === 'pending' ? <Clock size={14} /> : <XCircle size={14} />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: 16, color: HQ.INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {result.exam?.title || 'امتحان'}
                        </strong>
                        <span style={{ display: 'block', fontSize: 13, color: HQ.MUTED, marginTop: 2 }}>
                          {result.exam?.lessonTitle ? `درس: ${result.exam.lessonTitle} · ` : ''}{formatDateAr(result.createdAt)}
                          {isPending ? ' · بانتظار مراجعة المعلم للتسجيل الشفهي' : ''}
                        </span>
                      </span>
                      <span style={{ flex: 'none', textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: 20, color: score > 0 ? stateColor : HQ.MUTED }}>
                          {score > 0 ? `${score}%` : '—'}
                        </strong>
                        <span style={{ fontSize: 12, fontWeight: 800, color: stateColor }}>{stateLabel}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <Pagination
                currentPage={resultsPagination.currentPage}
                totalPages={resultsPagination.totalPages}
                totalItems={resultsPagination.totalItems}
                pageSize={resultsPagination.pageSize}
                onPageChange={resultsPagination.setCurrentPage}
                onPageSizeChange={resultsPagination.setPageSize}
                showPageSize={true}
                pageSizeOptions={[4, 8, 16]}
                itemName="نتيجة امتحان"
                className="mt-6"
              />
            </>
          )
        )}
      </div>
    </PageLayout>
  );
}
