import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import {
  FolderOpen, Upload, FileText, Video, Image, Music, Trash2,
  Plus, X, ChevronLeft, Users, Download, Filter, Shield, RefreshCw, Check,
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import Pagination from '../../components/shared/Pagination';
import usePagination from '../../hooks/usePagination';
import useGroupStore from '../../store/groupStore';
import useResourceStore from '../../store/resourceStore';
import { timeAgoAr, getLevelLabel, formatFileSize } from '../../utils/helpers';
import toast from 'react-hot-toast';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

/* Resource library — groups, categories and uploads.
   Same filters, upload payload and actions as before; visual only. */

const CATEGORIES = {
  tajweed: { label: 'أحكام التجويد' },
  memorization: { label: 'خطط الحفظ' },
  summary: { label: 'ملخصات' },
  exam_prep: { label: 'تحضير امتحانات' },
  other: { label: 'أخرى' },
};

const LEVEL_TONE = {
  foundation: { wash: '#E2EFE7', fg: '#0F5940' },
  memorization: { wash: '#ECE9F4', fg: '#4A3F6B' },
  teacher_prep: { wash: '#ECE9F4', fg: '#4A3F6B' },
  senior: { wash: '#FBF7EE', fg: '#2A2438' },
};

const FILE_ICON = { pdf: FileText, video: Video, audio: Music, image: Image, other: FileText };

const field = {
  width: '100%', minHeight: 48, background: HQ.SURFACE, color: HQ.INK,
  border: `1px solid ${HQ.LINE}`, borderRadius: 12, padding: '12px 16px',
  fontSize: 14, fontFamily: 'inherit',
};

export default function AdminResourcesPage() {
  const { groups, fetchAllGroups } = useGroupStore();
  const { resources, isLoading, fetchGroupResources, uploadResource, deleteResource, trackDownload } = useResourceStore();

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'other' });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { fetchAllGroups(); }, []);

  const filteredGroups = groups.filter(g =>
    !searchQuery || g.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupsPagination = usePagination(filteredGroups, 6);
  const resourcesPagination = usePagination(resources, 6);

  useEffect(() => {
    if (selectedGroup) fetchGroupResources(selectedGroup._id, { category: categoryFilter !== 'all' ? categoryFilter : undefined });
  }, [selectedGroup?._id, categoryFilter]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.title || !selectedFile) return toast.error('العنوان والملف مطلوبان');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resource', selectedFile);
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('groupId', selectedGroup._id);
      formData.append('category', form.category);
      await uploadResource(formData);
      toast.success('تم رفع الملف بنجاح');
      setShowUpload(false);
      setForm({ title: '', description: '', category: 'other' });
      setSelectedFile(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'خطأ في رفع الملف');
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteResource(id);
      toast.success('تم حذف المورد');
    } catch { toast.error('خطأ في الحذف'); }
  };

  const handleDownload = (resource) => {
    trackDownload(resource._id);
    window.open(resource.fileUrl, '_blank');
  };

  const panel = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 20,
  };
  const emptyBox = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18,
    padding: 48, textAlign: 'center',
  };
  const primaryBtn = {
    minHeight: 48, padding: '12px 20px', borderRadius: 12, border: 'none',
    background: HQ.MENTOR, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
  const ghostBtn = {
    minHeight: 48, padding: '12px 20px', borderRadius: 12, border: 'none', background: 'transparent',
    color: HQ.MUTED, fontWeight: 800, fontSize: 14, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
  const iconBtn = {
    minWidth: 44, minHeight: 44, borderRadius: 12, border: 'none', background: 'transparent',
    color: HQ.MUTED, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  // Group selection
  if (!selectedGroup) {
    return (
      <PageLayout>
        <MotionConfig reducedMotion="user">
          <div className="halaqa" style={{ maxWidth: 1000, margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mb-6">
              <h1 className="flex items-center gap-2" style={{ fontSize: '1.5rem', fontWeight: 800, color: HQ.INK, margin: '0 0 4px' }}>
                <Shield size={22} color={HQ.MENTOR} aria-hidden /> مكتبة الموارد التعليمية
              </h1>
              <p className="text-sm" style={{ color: HQ.MUTED, margin: 0 }}>اختر مجموعة لإدارة الموارد التعليمية</p>
            </motion.div>
            <div className="mb-5" style={{ maxWidth: 448 }}>
              <div className="relative">
                <Search size={15} color={HQ.MUTED} aria-hidden className="absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="ابحث عن مجموعة..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} aria-label="بحث عن مجموعة"
                  className="pr-10 focus:border-[#177B58] focus:outline-none" style={field} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {groupsPagination.paginatedItems.map(group => {
                const tone = LEVEL_TONE[group.level] || { wash: HQ.PAPER, fg: HQ.MUTED };
                return (
                  <button key={group._id} type="button" onClick={() => setSelectedGroup(group)}
                    className="p-6 text-right w-full"
                    style={{ background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, cursor: 'pointer' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold px-2.5 py-1" style={{ backgroundColor: tone.wash, color: tone.fg, borderRadius: 8 }}>
                        {getLevelLabel(group.level)}
                      </span>
                      <span className="text-xs flex items-center gap-1" style={{ color: HQ.MUTED, fontVariantNumeric: 'tabular-nums' }}>
                        <Users size={13} aria-hidden /> {group.students?.length || 0}
                      </span>
                    </div>
                    <h3 className="font-extrabold" style={{ color: HQ.INK, margin: '0 0 8px' }}>{group.name}</h3>
                    <div className="flex items-center gap-2 text-sm font-bold" style={{ color: HQ.MENTOR }}>
                      <FolderOpen size={15} aria-hidden /> إدارة الموارد
                      <ChevronLeft size={15} aria-hidden style={{ marginRight: 'auto' }} />
                    </div>
                  </button>
                );
              })}
            </div>
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
        </MotionConfig>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <MotionConfig reducedMotion="user">
        <div className="halaqa" style={{ maxWidth: 1000, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setSelectedGroup(null)} aria-label="العودة لاختيار المجموعة" style={iconBtn}>
                  <ChevronLeft size={19} color={HQ.MUTED} aria-hidden style={{ transform: 'scaleX(-1)' }} />
                </button>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: HQ.INK, margin: '0 0 4px' }}>موارد {selectedGroup.name}</h1>
                  <p className="text-sm" style={{ color: HQ.MUTED, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{resources.length} مورد تعليمي</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowUpload(!showUpload)}
                style={showUpload ? { ...ghostBtn } : { ...primaryBtn }}>
                {showUpload ? <><X size={15} aria-hidden /> إغلاق</> : <><Upload size={15} aria-hidden /> رفع ملف</>}
              </button>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 flex-wrap" role="group" aria-label="تصفية حسب التصنيف">
              <button type="button" onClick={() => setCategoryFilter('all')}
                aria-pressed={categoryFilter === 'all'}
                className="px-4 text-sm font-bold"
                style={{
                  minHeight: 44, borderRadius: 12, cursor: 'pointer',
                  border: `1px solid ${categoryFilter === 'all' ? HQ.MENTOR : HQ.LINE}`,
                  background: categoryFilter === 'all' ? HQ.MENTOR : HQ.SURFACE,
                  color: categoryFilter === 'all' ? '#fff' : HQ.MUTED,
                }}>
                <Filter size={14} aria-hidden className="inline ml-1" /> الكل
              </button>
              {Object.entries(CATEGORIES).map(([key, val]) => (
                <button key={key} type="button" onClick={() => setCategoryFilter(key)}
                  aria-pressed={categoryFilter === key}
                  className="px-4 text-sm font-bold"
                  style={{
                    minHeight: 44, borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${categoryFilter === key ? HQ.MENTOR : HQ.LINE}`,
                    background: categoryFilter === key ? HQ.MENTOR : HQ.SURFACE,
                    color: categoryFilter === key ? '#fff' : HQ.MUTED,
                  }}>
                  {val.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Upload form */}
          <AnimatePresence initial={false}>
            {showUpload && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                onSubmit={handleUpload} className="p-5 mb-5 overflow-hidden" style={panel}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: HQ.INK, marginTop: 0 }}>
                  <Upload size={15} color={HQ.MENTOR} aria-hidden /> رفع مورد جديد
                </h3>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="res-title" className="block text-sm font-bold mb-1.5" style={{ color: HQ.INK }}>العنوان *</label>
                    <input id="res-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="focus:border-[#177B58] focus:outline-none" style={field}
                      placeholder="مثال: ملخص أحكام المد" required maxLength={200} />
                  </div>
                  <div>
                    <label htmlFor="res-cat" className="block text-sm font-bold mb-1.5" style={{ color: HQ.INK }}>التصنيف</label>
                    <select id="res-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="focus:border-[#177B58] focus:outline-none" style={field}>
                      {Object.entries(CATEGORIES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label htmlFor="res-desc" className="block text-sm font-bold mb-1.5" style={{ color: HQ.INK }}>الوصف (اختياري)</label>
                  <textarea id="res-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="focus:border-[#177B58] focus:outline-none" style={{ ...field, minHeight: 72 }} rows={2} maxLength={500} placeholder="وصف مختصر للمورد..." />
                </div>

                {/* File drop zone */}
                <div onClick={() => fileRef.current?.click()}
                  role="button" tabIndex={0} aria-label="اختيار ملف للرفع"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click(); } }}
                  className="rounded-xl p-6 text-center cursor-pointer mb-4"
                  style={{
                    border: `2px dashed ${selectedFile ? HQ.MENTOR : HQ.LINE}`,
                    background: selectedFile ? '#E2EFE7' : HQ.PAPER,
                  }}>
                  <input ref={fileRef} type="file" className="hidden"
                    accept=".pdf,.mp4,.webm,.mp3,.wav,.ogg,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => setSelectedFile(e.target.files[0])} />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText size={30} color={HQ.MENTOR} aria-hidden />
                      <div className="text-right">
                        <p className="font-bold text-sm" style={{ color: HQ.INK, margin: 0 }}>{selectedFile.name}</p>
                        <p className="text-xs" style={{ color: HQ.MUTED, margin: 0, fontVariantNumeric: 'tabular-nums' }}>{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                        aria-label="إزالة الملف"
                        style={{ ...iconBtn, background: HQ.SURFACE }}>
                        <X size={15} color="#C2410C" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={38} color={HQ.LINE} style={{ margin: '0 auto 8px' }} aria-hidden />
                      <p className="text-sm font-bold" style={{ color: HQ.MUTED, margin: 0 }}>اضغط لاختيار ملف</p>
                      <p className="text-xs mt-1" style={{ color: HQ.MUTED, marginBottom: 0 }}>PDF, فيديو, صوت, صورة — حد أقصى 50MB</p>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={uploading} style={{ ...primaryBtn, flex: 1, opacity: uploading ? 0.6 : 1 }}>
                    {uploading ? <RefreshCw size={15} className="animate-spin" aria-hidden /> : <Check size={15} aria-hidden />}
                    {uploading ? 'جارٍ الرفع...' : 'رفع المورد'}
                  </button>
                  <button type="button" onClick={() => setShowUpload(false)} style={ghostBtn}>إلغاء</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Resources list */}
          {isLoading ? (
            <div style={emptyBox} aria-label="جارٍ تحميل الموارد">
              <RefreshCw size={30} color={HQ.MENTOR} className="animate-spin" style={{ margin: '0 auto' }} aria-hidden />
            </div>
          ) : resources.length === 0 ? (
            <div style={emptyBox}>
              <FolderOpen size={52} color={HQ.LINE} style={{ margin: '0 auto 12px' }} aria-hidden />
              <p className="font-bold" style={{ color: HQ.MUTED, margin: 0 }}>لا توجد موارد{categoryFilter !== 'all' ? ` في تصنيف "${CATEGORIES[categoryFilter]?.label}"` : ''}</p>
            </div>
          ) : (
            <div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {resourcesPagination.paginatedItems.map(resource => {
                  const FIcon = FILE_ICONS[resource.fileType]?.icon || FILE_ICONS.other.icon;
                  const cat = CATEGORIES[resource.category] || CATEGORIES.other;
                  return (
                    <div key={resource._id} className="p-5" style={panel}>
                      <div className="flex items-start gap-3 mb-3">
                        <span aria-hidden style={{
                          width: 48, height: 48, borderRadius: 14, background: HQ.PAPER, color: HQ.MENTOR,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                        }}>
                          <FIcon size={23} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm truncate" style={{ color: HQ.INK, margin: 0 }}>{resource.title}</h3>
                          <p className="text-xs mt-0.5" style={{ color: HQ.MUTED, marginBottom: 0 }}>{cat.label}</p>
                        </div>
                      </div>

                      {resource.description && <p className="text-xs mb-3" style={{ color: HQ.MUTED, marginTop: 0 }}>{resource.description}</p>}

                      <div className="flex items-center justify-between text-xs mb-3" style={{ color: HQ.MUTED }}>
                        <span>{timeAgoAr(resource.createdAt)}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatFileSize(resource.fileSize)}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${HQ.LINE}` }}>
                        <button type="button" onClick={() => handleDownload(resource)}
                          className="flex-1 text-xs font-bold"
                          style={{
                            minHeight: 44, borderRadius: 12, cursor: 'pointer',
                            background: '#E2EFE7', color: '#0F5940', border: 'none',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}>
                          <Download size={14} aria-hidden /> تحميل
                          {resource.downloadCount > 0 && (
                            <span style={{ background: HQ.SURFACE, padding: '2px 8px', borderRadius: 9999, fontVariantNumeric: 'tabular-nums' }}>
                              {resource.downloadCount}
                            </span>
                          )}
                        </button>
                        <button type="button" onClick={() => handleDelete(resource._id)} aria-label={`حذف ${resource.title}`}
                          style={{ ...iconBtn, color: '#C2410C' }}>
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Pagination
                currentPage={resourcesPagination.currentPage}
                totalPages={resourcesPagination.totalPages}
                totalItems={resourcesPagination.totalItems}
                pageSize={resourcesPagination.pageSize}
                onPageChange={resourcesPagination.setCurrentPage}
                onPageSizeChange={resourcesPagination.setPageSize}
                showPageSize={true}
                pageSizeOptions={[6, 12, 24]}
                itemName="مورد"
                className="mt-6"
              />
            </div>
          )}
        </div>
      </MotionConfig>
    </PageLayout>
  );
}
