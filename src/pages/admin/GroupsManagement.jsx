import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Users, BookOpen, CalendarDays, UserPlus, Check, RefreshCw, AlertCircle, Mic, MicOff, Award, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import useGroupStore from '../../store/groupStore';
import api from '../../services/api';
import { getLevelLabel, formatTime } from '../../utils/helpers';
import { DAYS_AR } from '../../utils/constants';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';
import '../../components/halaqa/halaqa.css';
import { HQ, HqAvatar, HqBadge } from '../../components/halaqa/primitives';

/* إدارة المجموعات والتسكين — same CRUD, days, and assignment flow.
   Groups as quiet rows; assignment as one ordered work list. */

const ALL_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const LEVELS = ['foundation', 'memorization', 'teacher_prep', 'senior'];
const LEVEL_TONE = { foundation: 'mentor', memorization: 'guide', teacher_prep: 'gold', senior: 'neutral' };

export default function GroupsManagement() {
  const { groups, fetchAllGroups, deleteGroup, updateDays, updateSchedule, isLoading } = useGroupStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('groups');

  // Groups state (logic unchanged)
  const [showModal, setShowModal] = useState(false);
  const [showDaysModal, setShowDaysModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editGroup, setEditGroup] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', level: 'foundation', maxStudents: 15 });
  const [selectedDays, setSelectedDays] = useState([]);
  const [dayTimes, setDayTimes] = useState({});
  const [saving, setSaving] = useState(false);

  // Student Assignment State (logic unchanged)
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [levelFilter, setLevelFilter] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [assignGroupState, setAssignGroupState] = useState({});
  const [assignLevelState, setAssignLevelState] = useState({});
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Pagination hooks (unchanged)
  const groupsPagination = usePagination(groups, 6);
  const studentsPagination = usePagination(unassignedStudents, 8);

  useEffect(() => {
    fetchAllGroups();
  }, []);

  useEffect(() => {
    if (activeTab === 'assign') {
      fetchUnassignedStudents();
    }
  }, [activeTab, levelFilter]);

  const fetchUnassignedStudents = async () => {
    setIsLoadingStudents(true);
    try {
      const res = await api.get('/users/students/unassigned', { params: levelFilter ? { level: levelFilter } : {} });
      const list = res.data.students || [];
      setUnassignedStudents(list);

      // Prepopulate level state with assignedLevel or default to foundation
      const initialLevels = {};
      list.forEach(s => {
        initialLevels[s._id] = s.assignedLevel || 'foundation';
      });
      setAssignLevelState(prev => ({ ...initialLevels, ...prev }));
    } catch {
      toast.error('خطأ في جلب الطلاب المنتظرين');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleAssignStudent = async (student) => {
    const groupId = assignGroupState[student._id];
    if (!groupId) { toast.error('الرجاء اختيار مجموعة'); return; }

    const level = assignLevelState[student._id] || student.assignedLevel || 'foundation';

    setAssigningId(student._id);
    try {
      if (!student.isApproved || student.assignedLevel !== level) {
        await api.put(`/users/${student._id}/approve`, { assignedLevel: level });
      }
      await api.post(`/groups/${groupId}/add-student`, { studentId: student._id });
      toast.success(`تم تسكين ${student.firstName} في المجموعة بنجاح`);
      fetchUnassignedStudents();
      fetchAllGroups();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'خطأ في التعيين');
    } finally {
      setAssigningId(null);
    }
  };

  const openCreate = () => {
    setEditGroup(null);
    setForm({ name: '', description: '', level: 'foundation', maxStudents: 15 });
    setSelectedDays([]);
    setShowModal(true);
  };

  const openEdit = (group) => {
    setEditGroup(group);
    setForm({ name: group.name, description: group.description || '', level: group.level, maxStudents: group.maxStudents });
    setSelectedDays(group.days || []);
    setShowModal(true);
  };

  const openDaysModal = (group) => {
    setSelectedGroup(group);
    setSelectedDays(group.days || []);
    // Prefill times from the saved schedule; new days start empty (required)
    const times = {};
    (group.schedule || []).forEach(s => {
      if (s.dayOfWeek && (s.startTime || s.endTime)) {
        times[s.dayOfWeek] = { start: s.startTime || '', end: s.endTime || '' };
      }
    });
    setDayTimes(times);
    setShowDaysModal(true);
  };

  const handleSaveDays = async () => {
    // Every selected day needs a valid time range
    for (const day of selectedDays) {
      const t = dayTimes[day] || {};
      if (!t.start || !t.end) {
        toast.error(`حدد ساعة البدء والانتهاء ليوم ${DAYS_AR[day] || day}`);
        return;
      }
      if (t.start >= t.end) {
        toast.error(`وقت البدء يجب أن يسبق وقت الانتهاء (${DAYS_AR[day] || day})`);
        return;
      }
    }
    setSaving(true);
    try {
      const schedule = selectedDays.map(day => ({
        dayOfWeek: day,
        startTime: dayTimes[day].start,
        endTime: dayTimes[day].end,
      }));
      await updateDays(selectedGroup._id, selectedDays);
      await updateSchedule(selectedGroup._id, schedule);
      await fetchAllGroups();
      toast.success('تم تحديث أيام الدراسة ومواعيدها للمجموعة');
      setShowDaysModal(false);
    } catch {
      toast.error('خطأ في تحديث الأيام');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day) => {
    setSelectedDays(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      // Drop times of deselected days; init empty times for newly added ones
      setDayTimes(prevTimes => {
        const t = { ...prevTimes };
        if (!next.includes(day)) delete t[day];
        else if (!t[day]) t[day] = { start: '', end: '' };
        return t;
      });
      return next;
    });
  };

  const setDayTime = (day, field, value) => {
    setDayTimes(prev => ({ ...prev, [day]: { ...(prev[day] || {}), [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editGroup) {
        await api.put(`/groups/${editGroup._id}`, { ...form, days: selectedDays });
        toast.success('تم تحديث المجموعة بنجاح');
      } else {
        await api.post('/groups', { ...form, days: selectedDays });
        toast.success('تم إنشاء المجموعة بنجاح');
      }
      fetchAllGroups();
      setShowModal(false);
    } catch { toast.error('خطأ في الحفظ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('حذف المجموعة نهائياً؟')) return;
    await deleteGroup(id);
    toast.success('تم الحذف');
  };

  const groupsForLevel = (level) =>
    level ? groups.filter(g => g.level === level) : groups;

  const selectStyle = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 12,
    padding: '0 12px', minHeight: 48, fontSize: 14, color: HQ.INK, fontFamily: 'inherit',
  };
  const inputStyle = { ...selectStyle, width: '100%' };
  const ghostBtn = {
    background: 'none', border: 'none', cursor: 'pointer', minWidth: 44, minHeight: 44,
    borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: HQ.MUTED,
  };

  return (
    <PageLayout>
      <div className="halaqa" style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: HQ.INK }}>المجموعات والتسكين</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: HQ.MUTED }}>
              {activeTab === 'groups' ? `${groups.length} مجموعة دراسية` : `${unassignedStudents.length} بانتظار التسكين`}
            </p>
          </div>
          {activeTab === 'groups' ? (
            <button type="button" onClick={openCreate} className="hq-action" style={{ background: HQ.MENTOR, color: '#fff', padding: '0 20px', fontSize: 14 }}>
              <Plus size={17} /> مجموعة جديدة
            </button>
          ) : (
            <button type="button" onClick={fetchUnassignedStudents} className="hq-action" style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, color: HQ.INK, padding: '0 16px', fontSize: 13 }}>
              <RefreshCw size={15} /> تحديث القائمة
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="hq-tabs" role="tablist" aria-label="أقسام المجموعات" style={{ marginBottom: 16 }}>
          <button type="button" role="tab" aria-selected={activeTab === 'groups'} onClick={() => setActiveTab('groups')}>
            المجموعات ({groups.length})
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'assign'} onClick={() => setActiveTab('assign')}>
            تسكين الجدد ({unassignedStudents.length})
          </button>
        </div>

        {/* ─── TAB 1: Groups ─── */}
        {activeTab === 'groups' && (
          isLoading ? (
            <div aria-label="جارٍ تحميل المجموعات">
              <div className="hq-skeleton" style={{ height: 120, width: '100%', marginBottom: 10 }} />
              <div className="hq-skeleton" style={{ height: 120, width: '100%' }} />
            </div>
          ) : (
            <div>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {groupsPagination.paginatedItems.map((group) => {
                  const fillPct = Math.round(((group.students?.length || 0) / (group.maxStudents || 15)) * 100);
                  return (
                    <li key={group._id} style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, marginBottom: 12, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <HqBadge tone={LEVEL_TONE[group.level] || 'neutral'}>{getLevelLabel(group.level)}</HqBadge>
                            <strong style={{ fontSize: 17, color: HQ.INK }}>{group.name}</strong>
                          </div>
                          {group.teacher && (
                            <p style={{ margin: '0 0 4px', fontSize: 13, color: HQ.MUTED }}>
                              المشرف: {group.teacher.firstName} {group.teacher.lastName}
                            </p>
                          )}
                          <p style={{ margin: '0 0 8px', fontSize: 13, color: HQ.MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Users size={14} /> {group.students?.length || 0}/{group.maxStudents}
                            <span style={{ flex: 1, maxWidth: 160, height: 6, borderRadius: 9999, background: HQ.LINE, overflow: 'hidden', display: 'inline-block' }}>
                              <span style={{ display: 'block', height: '100%', width: `${fillPct}%`, background: HQ.MENTOR }} />
                            </span>
                          </p>
                          {group.days?.length > 0 && (
                            <div style={{ margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {group.days.map((day, i) => {
                                const sched = (group.schedule || []).find(s => s.dayOfWeek === day);
                                return (
                                  <p key={i} style={{ margin: 0, fontSize: 13, color: HQ.MUTED }}>
                                    {DAYS_AR[day] || day}
                                    {sched?.startTime && sched?.endTime && (
                                      <span style={{ fontWeight: 800, color: HQ.INK, fontVariantNumeric: 'tabular-nums' }}>
                                        {' '}· {formatTime(sched.startTime)} — {formatTime(sched.endTime)}
                                      </span>
                                    )}
                                  </p>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 2, flex: 'none' }}>
                          <button type="button" onClick={() => openEdit(group)} aria-label={`تعديل ${group.name}`} style={ghostBtn}>
                            <Edit2 size={16} />
                          </button>
                          <button type="button" onClick={() => handleDelete(group._id)} aria-label={`حذف ${group.name}`}
                            style={{ ...ghostBtn, color: '#C2410C' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${HQ.LINE}`, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => openDaysModal(group)} className="hq-action"
                          style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, color: HQ.INK, padding: '0 16px', fontSize: 13, flex: 1 }}>
                          <CalendarDays size={15} /> الأيام والمواعيد
                        </button>
                        <button type="button" onClick={() => navigate(`/admin/groups/${group._id}/curriculum`)} className="hq-action"
                          style={{ background: HQ.MENTOR, color: '#fff', padding: '0 16px', fontSize: 13, flex: 1 }}>
                          <BookOpen size={15} /> المنهج
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Pagination
                currentPage={groupsPagination.currentPage}
                totalPages={groupsPagination.totalPages}
                totalItems={groupsPagination.totalItems}
                pageSize={groupsPagination.pageSize}
                onPageChange={groupsPagination.setCurrentPage}
                onPageSizeChange={groupsPagination.setPageSize}
                showPageSize={true}
                pageSizeOptions={[6, 12, 24]}
                itemName="مجموعة"
                className="mt-6"
              />
            </div>
          )
        )}

        {/* ─── TAB 2: Assign Students ─── */}
        {activeTab === 'assign' && (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }} role="group" aria-label="تصفية بالمستوى">
              {['', ...LEVELS].map((level) => (
                <button key={level} type="button" aria-pressed={levelFilter === level}
                  onClick={() => setLevelFilter(level)}
                  style={{
                    border: `1px solid ${levelFilter === level ? HQ.MENTOR : HQ.LINE}`, cursor: 'pointer',
                    minHeight: 44, padding: '0 16px', borderRadius: 12, fontSize: 13, fontWeight: 800,
                    background: levelFilter === level ? HQ.MENTOR : HQ.SURFACE,
                    color: levelFilter === level ? '#fff' : HQ.MUTED,
                  }}>
                  {level ? getLevelLabel(level) : 'الكل'}
                </button>
              ))}
            </div>

            {isLoadingStudents ? (
              <div aria-label="جارٍ تحميل الطلاب">
                <div className="hq-skeleton" style={{ height: 84, width: '100%', marginBottom: 10 }} />
                <div className="hq-skeleton" style={{ height: 84, width: '100%' }} />
              </div>
            ) : unassignedStudents.length === 0 ? (
              <div style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 48, textAlign: 'center' }}>
                <Check size={40} color={HQ.MENTOR} style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 900, color: HQ.INK }}>لا أحد بانتظار التسكين</p>
                <p style={{ margin: 0, fontSize: 14, color: HQ.MUTED }}>جميع الطلاب في مجموعاتهم</p>
              </div>
            ) : (
              <div>
                <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {studentsPagination.paginatedItems.map((student) => {
                    const currentLevel = assignLevelState[student._id] || student.assignedLevel || 'foundation';
                    const availableGroups = groupsForLevel(currentLevel);
                    const isPending = !student.isApproved;
                    const pInfo = student.placementExamInfo;
                    const hasTakenExam = Boolean(pInfo?.hasTakenExam ?? student.placementExamTaken);
                    const writtenScorePct = pInfo?.writtenPercentage ?? student.placementExamScore ?? null;
                    const audioList = pInfo?.audioRecordings || student.oralExamRecordings || [];
                    const hasOral = audioList.length > 0 || Boolean(pInfo?.hasOral);

                    return (
                      <li key={student._id} style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, marginBottom: 14, padding: 18 }}>
                        {/* Student Info Header */}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                          <HqAvatar firstName={student.firstName} lastName={student.lastName} size={48} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: 16, color: HQ.INK }}>{student.firstName} {student.lastName}</strong>
                              <HqBadge tone={isPending ? 'gold' : 'mentor'}>
                                {isPending ? 'بانتظار الموافقة والتسكين' : 'موافق عليه'}
                              </HqBadge>
                              {student.assignedLevel && (
                                <HqBadge tone={LEVEL_TONE[student.assignedLevel] || 'neutral'}>
                                  المستوى المقترح: {getLevelLabel(student.assignedLevel)}
                                </HqBadge>
                              )}
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: 13, color: HQ.MUTED, direction: 'ltr', textAlign: 'right' }}>{student.email}</p>
                          </div>
                        </div>

                        {/* Placement Exam Details Card */}
                        <div style={{
                          background: HQ.PAPER,
                          border: `1px solid ${HQ.LINE}`,
                          borderRadius: 14,
                          padding: '12px 14px',
                          marginBottom: 14,
                        }}>
                          {!hasTakenExam ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#C2410C' }}>
                              <AlertCircle size={18} />
                              <span style={{ fontSize: 13, fontWeight: 800 }}>لم يؤدِ امتحان تحديد المستوى بعد</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                {/* Written score */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 28, height: 28, borderRadius: 8, background: '#E2EFE7', color: '#0F5940',
                                  }}>
                                    <Award size={15} />
                                  </span>
                                  <div>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: HQ.INK }}>
                                      نتيجة التحريري (اختياري وصح/خطأ):
                                    </span>
                                    <span style={{
                                      marginRight: 6, fontSize: 14, fontWeight: 900,
                                      color: (writtenScorePct ?? 0) >= 60 ? '#177B58' : '#C2410C',
                                      fontVariantNumeric: 'tabular-nums',
                                    }}>
                                      {writtenScorePct !== null ? `${writtenScorePct}%` : '—'}
                                    </span>
                                    {pInfo?.writtenScore !== null && pInfo?.writtenScore !== undefined && (
                                      <span style={{ fontSize: 12, color: HQ.MUTED, marginRight: 4 }}>
                                        ({pInfo.writtenScore} نقطة)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Oral status badge */}
                                {hasOral ? (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: '#E2EFE7', color: '#0F5940', padding: '4px 10px',
                                    borderRadius: 9999, fontSize: 12, fontWeight: 800,
                                  }}>
                                    <Mic size={14} />
                                    تم تسليم التلاوة الشفهية ({audioList.length} تسجيل)
                                  </span>
                                ) : (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: '#FFF1EE', color: '#C2410C', padding: '4px 10px',
                                    borderRadius: 9999, fontSize: 12, fontWeight: 800,
                                  }}>
                                    <MicOff size={14} />
                                    لم يؤدِ الامتحان الشفهي
                                  </span>
                                )}
                              </div>

                              {/* Audio Player for oral recordings */}
                              {hasOral && audioList.length > 0 && (
                                <div style={{
                                  borderTop: `1px solid ${HQ.LINE}`,
                                  paddingTop: 8,
                                  marginTop: 2,
                                  display: 'flex', flexDirection: 'column', gap: 8,
                                }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: HQ.MUTED, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Volume2 size={14} color={HQ.MENTOR} />
                                    استمع لتسجيل صوت الطالب لتقييم مستواه:
                                  </span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {audioList.map((url, recIdx) => (
                                      <div key={recIdx} style={{
                                        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                                        background: HQ.SURFACE, padding: '6px 12px', borderRadius: 10,
                                        border: `1px solid ${HQ.LINE}`,
                                      }}>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: HQ.INK, flex: 'none' }}>
                                          {audioList.length > 1 ? `تسجيل ${recIdx + 1}:` : 'التسجيل الصوتي:'}
                                        </span>
                                        <audio
                                          controls
                                          src={url}
                                          preload="none"
                                          style={{ flex: 1, height: 32, minWidth: 220 }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Level and Group Assignment Controls */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                          <div style={{ flex: '1 1 150px' }}>
                            <label style={{ fontSize: 12, fontWeight: 800, color: HQ.MUTED, marginBottom: 4, display: 'block' }}>
                              المستوى:
                            </label>
                            <select
                              value={currentLevel}
                              onChange={e => setAssignLevelState(prev => ({ ...prev, [student._id]: e.target.value }))}
                              aria-label={`مستوى ${student.firstName}`}
                              style={{ ...selectStyle, width: '100%' }}
                            >
                              {LEVELS.map(l => (
                                <option key={l} value={l}>{getLevelLabel(l)}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ flex: '2 1 200px' }}>
                            <label style={{ fontSize: 12, fontWeight: 800, color: HQ.MUTED, marginBottom: 4, display: 'block' }}>
                              المجموعة الدراسية:
                            </label>
                            <select
                              value={assignGroupState[student._id] || ''}
                              onChange={e => setAssignGroupState(prev => ({ ...prev, [student._id]: e.target.value }))}
                              aria-label={`مجموعة ${student.firstName}`}
                              style={{ ...selectStyle, width: '100%' }}
                            >
                              <option value="">اختر المجموعة...</option>
                              {availableGroups.map(g => (
                                <option key={g._id} value={g._id} disabled={(g.students?.length || 0) >= g.maxStudents}>
                                  {g.name} ({g.students?.length || 0}/{g.maxStudents})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div style={{ flex: '1 1 130px' }}>
                            <button
                              type="button"
                              onClick={() => handleAssignStudent(student)}
                              disabled={assigningId === student._id || !assignGroupState[student._id]}
                              className="hq-action"
                              style={{
                                width: '100%',
                                background: HQ.MENTOR,
                                color: '#fff',
                                padding: '0 20px',
                                fontSize: 14,
                                opacity: (assigningId === student._id || !assignGroupState[student._id]) ? 0.5 : 1,
                              }}
                            >
                              {assigningId === student._id ? (
                                <LoadingSpinner size="sm" color="white" />
                              ) : (
                                <>
                                  <UserPlus size={16} /> {isPending ? 'موافقة وتسكين' : 'تسكين'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                <Pagination
                  currentPage={studentsPagination.currentPage}
                  totalPages={studentsPagination.totalPages}
                  totalItems={studentsPagination.totalItems}
                  pageSize={studentsPagination.pageSize}
                  onPageChange={studentsPagination.setCurrentPage}
                  onPageSizeChange={studentsPagination.setPageSize}
                  showPageSize={true}
                  pageSizeOptions={[8, 16, 32]}
                  itemName="طالب"
                  className="mt-6"
                />
              </div>
            )}
          </div>
        )}

        {/* Group Create/Edit Modal */}
        {showModal && (
          <div dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(12,12,29,0.72)' }}>
            <div role="dialog" aria-modal="true" aria-label={editGroup ? 'تعديل المجموعة' : 'مجموعة جديدة'}
              style={{ background: HQ.SURFACE, borderRadius: 18, padding: 24, width: '100%', maxWidth: 440, border: `1px solid ${HQ.LINE}` }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 19, fontWeight: 900, color: HQ.INK }}>{editGroup ? 'تعديل المجموعة' : 'مجموعة جديدة'}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="اسم المجموعة *" aria-label="اسم المجموعة" />
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: 'vertical', paddingTop: 10 }} placeholder="وصف المجموعة" aria-label="وصف المجموعة" />
                <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} style={selectStyle} aria-label="المستوى">
                  {LEVELS.map(l => <option key={l} value={l}>{getLevelLabel(l)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} className="hq-action" style={{ flex: 1, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, color: HQ.INK, fontSize: 14 }}>إلغاء</button>
                <button type="button" onClick={handleSave} disabled={saving || !form.name} className="hq-action" style={{ flex: 1, background: HQ.MENTOR, color: '#fff', fontSize: 14, opacity: (saving || !form.name) ? 0.5 : 1 }}>
                  {saving ? <LoadingSpinner size="sm" color="white" /> : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Days & Hours Selection Modal */}
        {showDaysModal && selectedGroup && (
          <div dir="rtl" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(12,12,29,0.72)' }}>
            <div role="dialog" aria-modal="true" aria-label="أيام الدراسة ومواعيدها"
              style={{ background: HQ.SURFACE, borderRadius: 18, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${HQ.LINE}` }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 900, color: HQ.INK }}>أيام الدراسة ومواعيدها</h2>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: HQ.MUTED }}>{selectedGroup.name}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }} role="group" aria-label="اختيار الأيام">
                {ALL_DAYS.map(day => (
                  <button key={day} type="button" aria-pressed={selectedDays.includes(day)} onClick={() => toggleDay(day)}
                    style={{
                      minHeight: 48, borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                      border: selectedDays.includes(day) ? 'none' : `1px solid ${HQ.LINE}`,
                      background: selectedDays.includes(day) ? HQ.MENTOR : HQ.PAPER,
                      color: selectedDays.includes(day) ? '#fff' : HQ.MUTED,
                    }}>
                    {DAYS_AR[day]}
                  </button>
                ))}
              </div>
              {selectedDays.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: HQ.INK }}>ساعة كل يوم (إجبارية)</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ALL_DAYS.filter(d => selectedDays.includes(d)).map(day => (
                      <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '8px 12px' }}>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: HQ.INK }}>{DAYS_AR[day]}</span>
                        <label style={{ fontSize: 12, color: HQ.MUTED }} htmlFor={`start-${day}`}>من</label>
                        <input id={`start-${day}`} type="time" required
                          value={dayTimes[day]?.start || ''}
                          onChange={e => setDayTime(day, 'start', e.target.value)}
                          aria-label={`ساعة بدء ${DAYS_AR[day]}`}
                          style={{ minHeight: 44, border: `1px solid ${HQ.LINE}`, borderRadius: 10, padding: '0 8px', fontSize: 14, color: HQ.INK, background: HQ.SURFACE, fontFamily: 'inherit' }} />
                        <label style={{ fontSize: 12, color: HQ.MUTED }} htmlFor={`end-${day}`}>إلى</label>
                        <input id={`end-${day}`} type="time" required
                          value={dayTimes[day]?.end || ''}
                          onChange={e => setDayTime(day, 'end', e.target.value)}
                          aria-label={`ساعة انتهاء ${DAYS_AR[day]}`}
                          style={{ minHeight: 44, border: `1px solid ${HQ.LINE}`, borderRadius: 10, padding: '0 8px', fontSize: 14, color: HQ.INK, background: HQ.SURFACE, fontFamily: 'inherit' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowDaysModal(false)} className="hq-action" style={{ flex: 1, background: HQ.PAPER, border: `1px solid ${HQ.LINE}`, color: HQ.INK, fontSize: 14 }}>إلغاء</button>
                <button type="button" onClick={handleSaveDays} disabled={saving} className="hq-action" style={{ flex: 1, background: HQ.MENTOR, color: '#fff', fontSize: 14, opacity: saving ? 0.5 : 1 }}>
                  {saving ? <LoadingSpinner size="sm" color="white" /> : 'حفظ الأيام والمواعيد'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
