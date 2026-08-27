import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Users, BookOpen, CalendarDays, UserPlus, Check, RefreshCw, AlertCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import PageLayout from '../../components/shared/PageLayout';
import useGroupStore from '../../store/groupStore';
import api from '../../services/api';
import { getLevelLabel, getLevelColor, getInitials, getAvatarColor } from '../../utils/helpers';
import { DAYS_AR } from '../../utils/constants';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

const ALL_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const LEVELS = ['foundation', 'memorization', 'teacher_prep', 'senior'];

export default function GroupsManagement() {
  const { groups, fetchAllGroups, deleteGroup, updateDays, isLoading } = useGroupStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('groups'); // 'groups' | 'assign'

  // Groups state
  const [showModal, setShowModal] = useState(false);
  const [showDaysModal, setShowDaysModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editGroup, setEditGroup] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', level: 'foundation', maxStudents: 15, teacher: '' });
  const [selectedDays, setSelectedDays] = useState([]);
  const [saving, setSaving] = useState(false);

  // Student Assignment State
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [levelFilter, setLevelFilter] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [assignGroupState, setAssignGroupState] = useState({});
  const [assignLevelState, setAssignLevelState] = useState({});
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  useEffect(() => {
    fetchAllGroups();
    api.get('/users', { params: { role: 'teacher', limit: 50 } })
      .then(r => setTeachers(r.data.users || []))
      .catch(() => {});
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
      setUnassignedStudents(res.data.students || []);
    } catch {
      toast.error('خطأ في جلب الطلاب المنتظرين');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleAssignStudent = async (student) => {
    const groupId = assignGroupState[student._id];
    if (!groupId) { toast.error('الرجاء اختيار مجموعة'); return; }

    const level = student.assignedLevel || assignLevelState[student._id];
    if (!level) { toast.error('الرجاء تحديد مستوى الطالب أولاً'); return; }

    setAssigningId(student._id);
    try {
      if (!student.isApproved || !student.assignedLevel) {
        await api.put(`/users/${student._id}/approve`, { assignedLevel: level });
      }
      await api.post(`/groups/${groupId}/add-student`, { studentId: student._id });
      toast.success(`تم تعيين ${student.firstName} في المجموعة بنجاح ✅`);
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
    setForm({ name: '', description: '', level: 'foundation', maxStudents: 15, teacher: '' });
    setSelectedDays([]);
    setShowModal(true);
  };

  const openEdit = (group) => {
    setEditGroup(group);
    setForm({ name: group.name, description: group.description || '', level: group.level, maxStudents: group.maxStudents, teacher: group.teacher?._id || '' });
    setSelectedDays(group.days || []);
    setShowModal(true);
  };

  const openDaysModal = (group) => {
    setSelectedGroup(group);
    setSelectedDays(group.days || []);
    setShowDaysModal(true);
  };

  const handleSaveDays = async () => {
    setSaving(true);
    try {
      await updateDays(selectedGroup._id, selectedDays);
      await fetchAllGroups();
      toast.success('تم تحديث أيام الدراسة للمجموعة');
      setShowDaysModal(false);
    } catch {
      toast.error('خطأ في تحديث الأيام');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editGroup) {
        await api.put(`/groups/${editGroup._id}`, { ...form, days: selectedDays });
        if (form.teacher) await api.put(`/groups/${editGroup._id}/assign-teacher`, { teacherId: form.teacher });
        toast.success('تم تحديث المجموعة');
      } else {
        const res = await api.post('/groups', { ...form, days: selectedDays });
        if (form.teacher) await api.put(`/groups/${res.data.group._id}/assign-teacher`, { teacherId: form.teacher });
        toast.success('تم إنشاء المجموعة');
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

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="section-title">إدارة وتسكين المجموعات 📚</h1>
              <p className="section-subtitle">إدارة المجموعات الدراسية وتوزيع الطلاب الجدد</p>
            </div>
            {activeTab === 'groups' ? (
              <button onClick={openCreate} className="btn-primary">
                <Plus className="w-4 h-4" />
                مجموعة جديدة
              </button>
            ) : (
              <button onClick={fetchUnassignedStudents} className="btn-ghost text-sm">
                <RefreshCw className="w-4 h-4" /> تحديث القائمة
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 mb-6 bg-white rounded-2xl p-1 shadow-sm overflow-x-auto">
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'groups' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              المجموعات القائمة ({groups.length})
            </button>

            <button
              onClick={() => setActiveTab('assign')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'assign' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              تسكين الطلاب الجدد
              {unassignedStudents.length > 0 && (
                <span className="bg-amber-400 text-gray-900 text-xs px-2 py-0.5 rounded-full font-black">
                  {unassignedStudents.length}
                </span>
              )}
            </button>
          </div>

          {/* ─── TAB 1: Groups ─── */}
          {activeTab === 'groups' && (
            isLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                {groups.map((group, i) => {
                  const levelColor = getLevelColor(group.level);
                  const fillPct = Math.round((group.students?.length / group.maxStudents) * 100);
                  return (
                    <motion.div key={group._id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="card-base p-5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <span className="text-xs font-bold px-2 py-1 rounded-lg mb-2 inline-block"
                            style={{ backgroundColor: levelColor.bg, color: levelColor.text }}>
                            {getLevelLabel(group.level)}
                          </span>
                          <h3 className="font-black text-gray-900 text-sm leading-snug">{group.name}</h3>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(group)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-primary-400 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(group._id)} className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {group.teacher && (
                        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: getAvatarColor(`${group.teacher.firstName}${group.teacher.lastName}`) }}>
                            {getInitials(group.teacher.firstName, group.teacher.lastName)}
                          </div>
                          <span>أ. {group.teacher.firstName} {group.teacher.lastName}</span>
                        </div>
                      )}

                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> الطلاب</span>
                          <span>{group.students?.length}/{group.maxStudents}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${fillPct}%` }} />
                        </div>
                      </div>

                      {group.days?.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>الأيام</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {group.days.map((day, j) => (
                              <span key={j} className="text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded-lg">
                                {DAYS_AR[day]}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                        <button onClick={() => openDaysModal(group)} className="flex-1 flex items-center justify-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg transition-colors">
                          <CalendarDays className="w-3.5 h-3.5" /> الأيام
                        </button>
                        <button onClick={() => navigate(`/admin/groups/${group._id}/curriculum`)} className="flex-1 flex items-center justify-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-2 rounded-lg transition-colors font-semibold">
                          <BookOpen className="w-3.5 h-3.5" /> المنهج
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          )}

          {/* ─── TAB 2: Assign Students ─── */}
          {activeTab === 'assign' && (
            <div>
              {/* Level Filter */}
              <div className="flex flex-wrap gap-2 mb-6">
                {['', ...LEVELS].map((level) => (
                  <button
                    key={level}
                    onClick={() => setLevelFilter(level)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      levelFilter === level
                        ? 'bg-primary-500 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-200'
                    }`}
                  >
                    {level ? getLevelLabel(level) : 'جميع المستويات'}
                  </button>
                ))}
              </div>

              {isLoadingStudents ? (
                <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
              ) : unassignedStudents.length === 0 ? (
                <div className="card-base p-16 text-center">
                  <Check className="w-14 h-14 text-green-400 mx-auto mb-4" />
                  <h3 className="font-black text-gray-900 mb-1">لا يوجد طلاب بانتظار التعيين</h3>
                  <p className="text-gray-400 text-sm">جميع الطلاب تم تسكينهم في المجموعات بنجاح</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unassignedStudents.map((student) => {
                    const level = student.assignedLevel || assignLevelState[student._id] || '';
                    const levelColor = getLevelColor(level);
                    const availableGroups = groupsForLevel(level);
                    const isPending = !student.isApproved;

                    return (
                      <div key={student._id} className={`card-base p-5 border-2 transition-all ${isPending ? 'border-amber-200 bg-amber-50/30' : 'border-transparent'}`}>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                            style={{ backgroundColor: getAvatarColor(`${student.firstName}${student.lastName}`) }}>
                            {getInitials(student.firstName, student.lastName)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <h3 className="font-bold text-gray-900">{student.firstName} {student.lastName}</h3>
                              {isPending ? (
                                <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                  <AlertCircle className="w-3 h-3" /> بانتظار الموافقة
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                  <Shield className="w-3 h-3" /> موافَق عليه
                                </span>
                              )}
                              {student.assignedLevel && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: levelColor.bg, color: levelColor.text }}>
                                  {getLevelLabel(student.assignedLevel)}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{student.email}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                            {!student.assignedLevel && (
                              <select value={assignLevelState[student._id] || ''} onChange={e => setAssignLevelState(prev => ({ ...prev, [student._id]: e.target.value }))} className="input-base text-sm py-2 w-40">
                                <option value="">— المستوى —</option>
                                {LEVELS.map(l => <option key={l} value={l}>{getLevelLabel(l)}</option>)}
                              </select>
                            )}

                            <select value={assignGroupState[student._id] || ''} onChange={e => setAssignGroupState(prev => ({ ...prev, [student._id]: e.target.value }))} className="input-base text-sm py-2 w-48">
                              <option value="">— اختر المجموعة —</option>
                              {availableGroups.map(g => (
                                <option key={g._id} value={g._id} disabled={(g.students?.length || 0) >= g.maxStudents}>
                                  {g.name} ({g.students?.length || 0}/{g.maxStudents})
                                </option>
                              ))}
                            </select>

                            <button onClick={() => handleAssignStudent(student)} disabled={assigningId === student._id || !assignGroupState[student._id]} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
                              {assigningId === student._id ? <LoadingSpinner size="sm" color="white" /> : <><UserPlus className="w-4 h-4" /> {isPending ? 'موافقة وتعين' : 'تعيين'}</>}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

      {/* Group Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-black text-gray-900 mb-4">{editGroup ? 'تعديل المجموعة' : 'إنشاء مجموعة جديدة'}</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-base text-sm" placeholder="اسم المجموعة *" />
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-base text-xs resize-none h-20" placeholder="وصف المجموعة" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.level} onChange={e => setForm(p => ({ ...p, level: e.target.value }))} className="input-base text-sm">
                  {LEVELS.map(l => <option key={l} value={l}>{getLevelLabel(l)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">إلغاء</button>
              <button onClick={handleSave} disabled={saving || !form.name} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? <LoadingSpinner size="sm" color="white" /> : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Days Selection Modal */}
      {showDaysModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-black text-gray-900 mb-3">أيام الدراسة - {selectedGroup.name}</h2>
            <div className="grid grid-cols-2 gap-2 my-4">
              {ALL_DAYS.map(day => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedDays.includes(day) ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {DAYS_AR[day]}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowDaysModal(false)} className="btn-ghost flex-1">إلغاء</button>
              <button onClick={handleSaveDays} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                {saving ? <LoadingSpinner size="sm" color="white" /> : 'حفظ الأيام'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
