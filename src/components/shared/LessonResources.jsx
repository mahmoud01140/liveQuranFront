import { useState } from 'react';
import { FileText, Download, Eye, ExternalLink, Paperclip } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import InteractivePdfViewer from './InteractivePdfViewer';
import '../../components/halaqa/halaqa.css';
import { HQ } from '../../components/halaqa/primitives';

export default function LessonResources({ resources, title, lessonId }) {
  const [activePdf, setActivePdf] = useState(null); // { fileUrl, title, id }

  const panel = {
    background: HQ.SURFACE, border: `1px solid ${HQ.LINE}`, borderRadius: 18, padding: 20,
  };

  const head = (
    <div className="flex items-center gap-2 mb-3 pb-2.5" style={{ borderBottom: `1px solid ${HQ.PAPER}` }}>
      <Paperclip size={15} color={HQ.MENTOR} aria-hidden />
      <h3 className="font-black text-sm" style={{ color: HQ.INK, margin: 0 }}>الملفات والمرفقات</h3>
    </div>
  );

  if (!resources) {
    return (
      <div className="halaqa" style={panel}>
        {head}
        <p className="text-xs text-center py-4" style={{ color: HQ.MUTED, margin: 0 }}>لا توجد ملفات مرفقة بهذا الدرس.</p>
      </div>
    );
  }

  const isPdf = resources.toLowerCase().endsWith('.pdf') || resources.includes('.pdf');
  const isVideo = resources.includes('youtube.com') || resources.includes('youtu.be') || resources.includes('vimeo.com') || resources.toLowerCase().endsWith('.mp4');

  // If resources is a video URL, it is already rendered in the main player, but we can show a reference
  if (isVideo) {
    return (
      <div className="halaqa" style={panel}>
        {head}
        <div className="rounded-xl p-3 text-center" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
          <p className="text-xs font-bold" style={{ color: HQ.INK, margin: 0 }}>
            تم توفير فيديو الشرح لهذا الدرس في عارض الفيديو بالأعلى.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="halaqa" style={panel}>
      {head}

      <div className="flex items-center gap-3 p-3 rounded-xl mb-3" style={{ background: HQ.PAPER, border: `1px solid ${HQ.LINE}` }}>
        <span aria-hidden style={{
          width: 40, height: 40, borderRadius: 12, flex: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: isPdf ? HQ.SURFACE : '#E2EFE7', color: isPdf ? '#C2410C' : HQ.MENTOR,
          border: `1px solid ${HQ.LINE}`,
        }}>
          <FileText size={19} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-xs truncate" dir="ltr" style={{ color: HQ.INK, margin: 0, textAlign: 'right' }}>
            {isPdf ? `${title}.pdf` : title}
          </p>
          <p className="mt-0.5" style={{ fontSize: '0.8125rem', color: HQ.MUTED, marginBottom: 0 }}>
            {isPdf ? 'ملف كتابي تفاعلي PDF' : 'رابط تعليمي خارجي'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isPdf ? (
          <>
            <button
              type="button"
              onClick={() => setActivePdf({
                fileUrl: resources,
                title: title,
                id: lessonId
              })}
              className="hq-action"
              style={{ flex: 1, background: HQ.MENTOR, color: '#fff', fontSize: '0.8125rem' }}
            >
              <Eye size={14} aria-hidden /> عرض الملف
            </button>
            <a
              href={resources}
              download={`${title}.pdf`}
              target="_blank"
              rel="noreferrer"
              className="hq-action"
              style={{ background: HQ.PAPER, color: HQ.INK, fontSize: '0.8125rem', textDecoration: 'none' }}
              title="تحميل الملف"
              aria-label="تحميل الملف"
            >
              <Download size={14} aria-hidden />
            </a>
          </>
        ) : (
          <a
            href={resources}
            target="_blank"
            rel="noreferrer"
            className="hq-action"
            style={{ flex: 1, background: '#E2EFE7', color: '#0F5940', fontSize: '0.8125rem', textDecoration: 'none' }}
          >
            <ExternalLink size={14} aria-hidden /> فتح الرابط
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
