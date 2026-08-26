import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, Upload, FileText, Video, Image, Music, Trash2,
  Plus, X, ChevronLeft, Users, Download, Filter, Shield, RefreshCw, Check
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import useGroupStore from '../../store/groupStore';
import useResourceStore from '../../store/resourceStore';
import { timeAgoAr, getLevelLabel, getLevelColor, formatFileSize } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES = {
  tajweed: { label: 'أحكام التجويد', emoji: '📖' },
  memorization: { label: 'خطط الحفظ', emoji: '🧠' },
  summary: { label: 'ملخصات', emoji: '📝' },
  exam_prep: { label: 'تحضير امتحانات', emoji: '📋' },
  other: { label: 'أخرى', emoji: '📁' },
};

const FILE_ICONS = {
  pdf: { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' },
  video: { icon: Video, color: 'text-blue-500', bg: 'bg-blue-50' },
  audio: { icon: Music, color: 'text-purple-500', bg: 'bg-purple-50' },
  image: { icon: Image, color: 'text-green-500', bg: 'bg-green-50' },
  other: { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50' },
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
      toast.success('تم رفع الملف بنجاح ✅');
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

  // Group selection
  if (!selectedGroup) {
    return (
      <PageLayout>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="section-title flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" /> مكتبة الموارد التعليمية
          </h1>
          <p className="section-subtitle">اختر مجموعة لإدارة الموارد التعليمية</p>
        </motion.div>
        <div className="mb-5">
          <input type="text" placeholder="ابحث عن مجموعة..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="input-base max-w-md" />
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
          {filteredGroups.map(group => {
            const lc = getLevelColor(group.level);
            return (
              <motion.button key={group._id} whileHover={{ y: -3 }} onClick={() => setSelectedGroup(group)}
                className="card-base p-6 text-right hover:shadow-md transition-all w-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: lc.bg, color: lc.text }}>
                    {getLevelLabel(group.level)}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {group.students?.length || 0}
                  </span>
                </div>
                <h3 className="font-black text-gray-900 mb-2">{group.name}</h3>
                <div className="flex items-center gap-2 text-amber-500 text-sm font-semibold mt-2">
                  <FolderOpen className="w-4 h-4" /> إدارة الموارد
                  <ChevronLeft className="w-4 h-4 mr-auto" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-400" style={{ transform: 'scaleX(-1)' }} />
            </button>
            <div>
              <h1 className="section-title">موارد {selectedGroup.name}</h1>
              <p className="section-subtitle">{resources.length} مورد تعليمي</p>
            </div>
          </div>
          <button onClick={() => setShowUpload(!showUpload)} className={showUpload ? 'btn-ghost' : 'btn-primary'}>
            {showUpload ? <><X className="w-4 h-4" /> إغلاق</> : <><Upload className="w-4 h-4" /> رفع ملف</>}
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              categoryFilter === 'all' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
            }`}>
            <Filter className="w-4 h-4 inline ml-1" /> الكل
          </button>
          {Object.entries(CATEGORIES).map(([key, val]) => (
            <button key={key} onClick={() => setCategoryFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                categoryFilter === key ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
              }`}>
              {val.emoji} {val.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Upload form */}
      <AnimatePresence>
        {showUpload && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleUpload} className="card-base p-5 mb-5 overflow-hidden">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-500" /> رفع مورد جديد
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">العنوان *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-base" placeholder="مثال: ملخص أحكام المد" required maxLength={200} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">التصنيف</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-base">
                  {Object.entries(CATEGORIES).map(([key, val]) => (
                    <option key={key} value={key}>{val.emoji} {val.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">الوصف (اختياري)</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-base" rows={2} maxLength={500} placeholder="وصف مختصر للمورد..." />
            </div>

            {/* File drop zone */}
            <div onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4 ${
                selectedFile ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/30'
              }`}>
              <input ref={fileRef} type="file" className="hidden"
                accept=".pdf,.mp4,.webm,.mp3,.wav,.ogg,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setSelectedFile(e.target.files[0])} />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-amber-500" />
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="p-1 hover:bg-red-100 rounded-lg"><X className="w-4 h-4 text-red-400" /></button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-500">اضغط لاختيار ملف</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, فيديو, صوت, صورة — حد أقصى 50MB</p>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={uploading} className="btn-primary flex-1" style={{ backgroundColor: '#D97706' }}>
                {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {uploading ? 'جارٍ الرفع...' : 'رفع المورد'}
              </button>
              <button type="button" onClick={() => setShowUpload(false)} className="btn-ghost">إلغاء</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Resources list */}
      {isLoading ? (
        <div className="card-base p-12 text-center">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-300" />
        </div>
      ) : resources.length === 0 ? (
        <div className="card-base p-12 text-center text-gray-400">
          <FolderOpen className="w-14 h-14 mx-auto mb-3 text-gray-200" />
          <p className="font-semibold">لا توجد موارد{categoryFilter !== 'all' ? ` في تصنيف "${CATEGORIES[categoryFilter]?.label}"` : ''}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {resources.map(resource => {
            const fi = FILE_ICONS[resource.fileType] || FILE_ICONS.other;
            const cat = CATEGORIES[resource.category] || CATEGORIES.other;
            return (
              <motion.div key={resource._id} whileHover={{ y: -2 }} className="card-base p-5 group">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 ${fi.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <fi.icon className={`w-6 h-6 ${fi.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{resource.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{cat.emoji} {cat.label}</p>
                  </div>
                </div>

                {resource.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{resource.description}</p>}

                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>{timeAgoAr(resource.createdAt)}</span>
                  <span>{formatFileSize(resource.fileSize)}</span>
                </div>

                <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                  <button onClick={() => handleDownload(resource)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-xs font-bold transition-colors">
                    <Download className="w-3.5 h-3.5" /> تحميل
                    {resource.downloadCount > 0 && <span className="bg-amber-100 px-1.5 rounded-full">{resource.downloadCount}</span>}
                  </button>
                  <button onClick={() => handleDelete(resource._id)}
                    className="p-2 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4 text-gray-300 group-hover:text-red-400" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
