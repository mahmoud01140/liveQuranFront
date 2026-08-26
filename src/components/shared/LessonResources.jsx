import { useState } from 'react';
import { FileText, Download, Eye, ExternalLink, Paperclip } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import InteractivePdfViewer from './InteractivePdfViewer';

export default function LessonResources({ resources, title, lessonId }) {
  const [activePdf, setActivePdf] = useState(null); // { fileUrl, title, id }

  if (!resources) {
    return (
      <div className="card-base p-5 bg-white border border-gray-100">
        <div className="flex items-center gap-2 mb-3 border-b border-gray-50 pb-2.5">
          <Paperclip className="w-4 h-4 text-gray-400" />
          <h3 className="font-black text-gray-900 text-sm">الملفات والمرفقات</h3>
        </div>
        <p className="text-xs text-gray-400 text-center py-4">لا توجد ملفات مرفقة بهذا الدرس.</p>
      </div>
    );
  }

  const isPdf = resources.toLowerCase().endsWith('.pdf') || resources.includes('.pdf');
  const isVideo = resources.includes('youtube.com') || resources.includes('youtu.be') || resources.includes('vimeo.com') || resources.toLowerCase().endsWith('.mp4');

  // If resources is a video URL, it is already rendered in the main player, but we can show a reference
  if (isVideo) {
    return (
      <div className="card-base p-5 bg-white border border-gray-100">
        <div className="flex items-center gap-2 mb-3 border-b border-gray-50 pb-2.5">
          <Paperclip className="w-4 h-4 text-primary-500" />
          <h3 className="font-black text-gray-900 text-sm">الملفات والمرفقات</h3>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-xs text-blue-700 font-semibold leading-relaxed">
            🎥 تم توفير فيديو الشرح لهذا الدرس في عارض الفيديو بالأعلى.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-5 bg-white border border-gray-100">
      <div className="flex items-center gap-2 mb-3 border-b border-gray-50 pb-2.5">
        <Paperclip className="w-4 h-4 text-primary-500" />
        <h3 className="font-black text-gray-900 text-sm">الملفات والمرفقات</h3>
      </div>

      <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isPdf ? 'bg-red-50 text-red-500' : 'bg-primary-50 text-primary-600'
        }`}>
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-xs text-gray-800 truncate" dir="ltr">
            {isPdf ? `${title}.pdf` : title}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {isPdf ? 'ملف كتابي تفاعلي PDF' : 'رابط تعليمي خارجي'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isPdf ? (
          <>
            <button
              onClick={() => setActivePdf({
                fileUrl: resources,
                title: title,
                id: lessonId
              })}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary-400 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" /> عرض الملف
            </button>
            <a
              href={resources}
              download={`${title}.pdf`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all"
              title="تحميل الملف"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </>
        ) : (
          <a
            href={resources}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-xs font-bold transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> فتح الرابط
          </a>
        )}
      </div>

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
    </div>
  );
}
