import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, FileText, Video, Image, Music, Download, Filter, RefreshCw, Eye
} from 'lucide-react';
import PageLayout from '../../components/shared/PageLayout';
import useAuthStore from '../../store/authStore';
import useResourceStore from '../../store/resourceStore';
import { timeAgoAr, formatFileSize } from '../../utils/helpers';
import InteractivePdfViewer from '../../components/shared/InteractivePdfViewer';

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

export default function StudentResourcesPage() {
  const { user } = useAuthStore();
  const { resources, isLoading, fetchGroupResources, trackDownload } = useResourceStore();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activePdf, setActivePdf] = useState(null); // { fileUrl, title, id }

  const groupId = user?.group?._id || user?.group;

  useEffect(() => {
    if (groupId) fetchGroupResources(groupId, { category: categoryFilter !== 'all' ? categoryFilter : undefined });
  }, [groupId, categoryFilter]);

  const handleDownload = (resource) => {
    trackDownload(resource._id);
    window.open(resource.fileUrl, '_blank');
  };

  return (
    <PageLayout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="section-title flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-primary-400" /> المكتبة التعليمية
        </h1>
        <p className="section-subtitle">ملفات ومراجع تعليمية من المعلم لمساعدتك في الحفظ والتجويد</p>
      </motion.div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={() => setCategoryFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            categoryFilter === 'all' ? 'bg-primary-400 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
          }`}>
          <Filter className="w-4 h-4 inline ml-1" /> الكل
        </button>
        {Object.entries(CATEGORIES).map(([key, val]) => (
          <button key={key} onClick={() => setCategoryFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              categoryFilter === key ? 'bg-primary-400 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
            }`}>
            {val.emoji} {val.label}
          </button>
        ))}
      </div>

      {!groupId ? (
        <div className="card-base p-12 text-center text-gray-400">
          <FolderOpen className="w-14 h-14 mx-auto mb-3 text-gray-200" />
          <p className="font-semibold">لم يتم تعيينك في مجموعة بعد</p>
        </div>
      ) : isLoading ? (
        <div className="card-base p-12 text-center">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary-300" />
        </div>
      ) : resources.length === 0 ? (
        <div className="card-base p-12 text-center text-gray-400">
          <FolderOpen className="w-14 h-14 mx-auto mb-3 text-gray-200" />
          <p className="font-semibold">لا توجد موارد{categoryFilter !== 'all' ? ` في هذا التصنيف` : ' بعد'}</p>
          <p className="text-sm mt-1">سيقوم المعلم بإضافة الملفات قريباً 📚</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {resources.map(resource => {
            const fi = FILE_ICONS[resource.fileType] || FILE_ICONS.other;
            const cat = CATEGORIES[resource.category] || CATEGORIES.other;
            return (
              <motion.div key={resource._id} whileHover={{ y: -2 }}
                className="card-base p-5 hover:shadow-md transition-all">
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
                  <span>رفع بواسطة {resource.uploadedBy?.firstName}</span>
                  <span>{formatFileSize(resource.fileSize)}</span>
                </div>

                <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                  {resource.fileType === 'pdf' ? (
                    <>
                      <button
                        onClick={() => {
                          trackDownload(resource._id);
                          setActivePdf({
                            fileUrl: resource.fileUrl,
                            title: resource.title,
                            id: resource._id
                          });
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary-400 hover:bg-primary-500 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                      >
                        <Eye className="w-4 h-4" /> عرض الملف
                      </button>
                      <button
                        onClick={() => handleDownload(resource)}
                        className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-xl text-sm font-bold transition-all"
                        title="تحميل الملف"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleDownload(resource)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-sm font-bold transition-all"
                    >
                      <Download className="w-4 h-4" /> تحميل الملف
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-gray-300 text-center mt-2">{timeAgoAr(resource.createdAt)}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Interactive PDF Viewer overlay */}
      <AnimatePresence>
        {activePdf && (
          <InteractivePdfViewer
            pdfUrl={activePdf.fileUrl}
            title={activePdf.title}
            resourceId={activePdf.id}
            onClose={() => setActivePdf(null)}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
