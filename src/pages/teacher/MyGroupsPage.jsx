import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/shared/PageLayout';
import useGroupStore from '../../store/groupStore';
import { getLevelLabel } from '../../utils/helpers';
import { DAYS_AR } from '../../utils/constants';
import { Users, Video, Calendar } from 'lucide-react';
import '../../components/halaqa/halaqa.css';
import { HQ, HqBadge } from '../../components/halaqa/primitives';

/* مجموعاتي — same data and destination, quiet rows.
   Broadcast entry stays via the group curriculum, as before. */

const LEVEL_TONE = {
  foundation: 'mentor',
  memorization: 'guide',
  teacher_prep: 'gold',
  senior: 'neutral',
};

export default function MyGroupsPage() {
  const { groups, fetchAllGroups } = useGroupStore();

  useEffect(() => {
    fetchAllGroups();
  }, []);

  return (
    <PageLayout>
      <div className="halaqa" style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: HQ.INK }}>مجموعاتي</h1>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: HQ.MUTED }}>
          {groups.length ? `${groups.length} مجموعات — اختر واحدة للمنهج وبدء البث` : 'ستظهر مجموعاتك هنا فور تعيينك'}
        </p>

        {groups.length === 0 ? (
          <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 48, textAlign: 'center' }}>
            <Users size={40} color={HQ.LINE} style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: HQ.INK }}>لا مجموعات مخصصة بعد</p>
          </div>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {groups.map((group) => (
              <li key={group._id} style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, marginBottom: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <strong style={{ fontSize: 17, color: HQ.INK }}>{group.name}</strong>
                  <HqBadge tone={LEVEL_TONE[group.level] || 'neutral'}>{getLevelLabel(group.level)}</HqBadge>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: HQ.MUTED, marginRight: 'auto' }}>
                    <Users size={14} />
                    {group.students?.length || 0}/{group.maxStudents}
                  </span>
                </div>
                {group.description && (
                  <p style={{ margin: '0 0 8px', fontSize: 14, color: HQ.MUTED, lineHeight: 1.8 }}>{group.description}</p>
                )}
                {group.schedule?.slice(0, 2).length > 0 && (
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: HQ.MUTED, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Calendar size={14} />
                    {group.schedule.slice(0, 2).map(s => `${DAYS_AR[s.dayOfWeek]} ${s.startTime} - ${s.endTime}`).join(' · ')}
                  </p>
                )}
                <Link to={`/admin/groups/${group._id}/curriculum`} className="hq-action"
                  style={{ width: '100%', background: HQ.MENTOR, color: '#fff', fontSize: 15, textDecoration: 'none' }}>
                  <Video size={17} /> منهج المجموعة وبدء البث
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </PageLayout>
  );
}
