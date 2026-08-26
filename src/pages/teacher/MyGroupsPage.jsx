import { Link } from 'react-router-dom';
import PageLayout from '../../components/shared/PageLayout';
import useGroupStore from '../../store/groupStore';
import { getLevelLabel, getLevelColor } from '../../utils/helpers';
import { DAYS_AR } from '../../utils/constants';
import { Users, Video, Calendar } from 'lucide-react';

export default function MyGroupsPage() {
  const { groups } = useGroupStore();

  return (
    <PageLayout>
      <div className="mb-4 sm:mb-6">
        <h1 className="section-title">مجموعاتي الدراسية</h1>
        <p className="section-subtitle">{groups.length} مجموعة دراسية مسجلة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        {groups.map((group) => {
          const lc = getLevelColor(group.level);
          return (
            <div key={group._id} className="card-base p-4 sm:p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: lc.bg, color: lc.text }}>
                  {getLevelLabel(group.level)}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {group.students?.length || 0}/{group.maxStudents}
                </span>
              </div>
              <h3 className="font-black text-gray-900 text-base mb-2">{group.name}</h3>
              {group.description && <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 leading-relaxed">{group.description}</p>}

              <div className="space-y-2 mb-4">
                {group.schedule?.slice(0, 2).map((s, j) => (
                  <div key={j} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                    <Calendar className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                    <span className="truncate">{DAYS_AR[s.dayOfWeek]} — {s.startTime} إلى {s.endTime}</span>
                  </div>
                ))}
              </div>

              <Link to="/teacher/broadcast" state={{ groupId: group._id }}
                className="btn-primary w-full text-xs sm:text-sm py-2.5">
                <Video className="w-4 h-4" />
                بدء بث لهذه المجموعة
              </Link>
            </div>
          );
        })}
      </div>
    </PageLayout>
  );
}
