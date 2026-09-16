import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Printer, X, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

/* Ijazah certificate — a real achievement document, so achievement
   gold is correct here. Flat gold only: no gradients, no ornaments. */

const GOLD = '#D9A441';
const GOLD_WASH = '#F8EDD3';
const INK = '#2A2438';
const MUTED = '#756E85';
const LINE = '#E8E2D4';
const PAPER = '#FBF7EE';

export default function IjazahCertificateModal({ isOpen, onClose, ijazah }) {
  const certificateRef = useRef(null);

  if (!isOpen || !ijazah) return null;

  const handlePrint = () => {
    window.print();
  };

  const riwayahLabels = {
    hafs_shatibiyyah: 'رواية حفص عن عاصم من طريق الشاطبية',
    hafs_tayyibah: 'رواية حفص عن عاصم من طريق طيبة النشر',
    warsh_azraq: 'رواية ورش عن نافع من طريق الأزرق',
    qalun_madani: 'رواية قالون عن نافع المدني',
    douri_basri: 'رواية الدوري عن أبي عمرو البصري',
  };

  const studentName = ijazah.student
    ? `${ijazah.student.firstName} ${ijazah.student.lastName}`
    : 'اسم الطالب المبارك';

  const teacherName = ijazah.sheikhName || (
    ijazah.teacher ? `${ijazah.teacher.firstName} ${ijazah.teacher.lastName}` : 'فضيلة الشيخ المقرئ'
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        style={{ background: 'rgba(42,36,56,0.6)' }} dir="rtl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="bg-white max-w-3xl w-full overflow-hidden my-auto"
          style={{ borderRadius: 18, border: `1px solid ${LINE}` }}
        >
          {/* Top action header (not printed) */}
          <div className="p-4 flex items-center justify-between no-print"
            style={{ background: PAPER, borderBottom: `1px solid ${LINE}` }}>
            <div className="flex items-center gap-2">
              <Award size={19} color={GOLD} aria-hidden />
              <span className="font-bold text-sm" style={{ color: INK }}>شهادة الإجازة القرآنية الرسمية بالسند المتصل</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 text-xs font-bold flex items-center gap-1.5"
                style={{
                  minHeight: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: GOLD, color: INK, padding: '8px 14px',
                }}
              >
                <Printer size={15} aria-hidden />
                <span>طباعة / حفظ PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق الشهادة"
                className="p-1.5 rounded-lg"
                style={{ minWidth: 44, minHeight: 44, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={19} aria-hidden />
              </button>
            </div>
          </div>

          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .printable-certificate, .printable-certificate * {
                visibility: visible !important;
              }
              .printable-certificate {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                margin: 0 !important;
                padding: 32px !important;
                box-shadow: none !important;
                background: #FAF7EE !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          {/* Certificate Printable Area */}
          <div ref={certificateRef} className="printable-certificate p-8 sm:p-12 relative text-center m-3 sm:m-4"
            style={{ background: '#FAF7EE', border: `2px solid ${GOLD}`, borderRadius: 18 }}>
            {/* Bismillah */}
            <p className="text-2xl mb-2 font-bold" style={{ color: INK, fontFamily: "'Amiri', serif" }}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
            <p className="text-xs font-semibold mb-6" style={{ color: MUTED }}>
              منصة الحلقة — الإجازات القرآنية بالسند المتصل
            </p>

            <div className="inline-block py-1 px-8 mb-6" style={{ borderTop: `2px solid ${GOLD}`, borderBottom: `2px solid ${GOLD}` }}>
              <h1 className="text-2xl sm:text-3xl font-black" style={{ color: INK, fontFamily: "'Amiri', serif" }}>
                إِجَـازَةٌ قُـرْآنِـيَّـةٌ بِالسَّنَدِ المُتَّصِل
              </h1>
            </div>

            <p className="text-sm mb-4 leading-relaxed max-w-xl mx-auto" style={{ color: MUTED }}>
              الحمد لله الذي نزّل الفرقان على عبده ليكون للعالمين نذيراً، والصلاة والسلام على رسول الله القائل:
              <span className="font-bold" style={{ color: INK }}> «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»</span>.
            </p>

            <p className="text-sm mb-4" style={{ color: MUTED }}>
              فقد أتمّ الطالب المبارك:
            </p>

            <div className="py-2.5 px-6 rounded-2xl inline-block mb-4" style={{ background: GOLD_WASH, border: `1px solid ${GOLD}` }}>
              <h2 className="text-2xl sm:text-3xl font-black" style={{ color: INK, fontFamily: "'Amiri', serif" }}>
                {studentName}
              </h2>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed max-w-xl mx-auto mb-6" style={{ color: MUTED }}>
              قراءة القرآن الكريم كاملاً عن ظهر غيب من فاتحته إلى خاتمته، متقناً لأحكام التجويد ومخارج الحروف وضبط المتشابهات بـ:
              <br />
              <strong className="text-base font-bold block mt-1" style={{ color: INK }}>
                {riwayahLabels[ijazah.riwayah] || ijazah.riwayah}
              </strong>
            </p>

            <p className="text-xs italic mb-8 max-w-md mx-auto" style={{ color: MUTED }}>
              «{ijazah.sanadChain || 'بسنده المتصل إلى رسول الله صلى الله عليه وسلم عن الروح الأمين جبريل عن رب العزة جل جلاله'}»
            </p>

            {/* Signatures & Seal Row */}
            <div className="grid grid-cols-3 gap-4 pt-6 items-center text-xs" style={{ borderTop: `1px solid ${GOLD}` }}>
              <div>
                <p className="font-bold mb-1" style={{ color: MUTED }}>الشيخ المقرئ المجيز</p>
                <p className="font-black text-sm" style={{ color: INK }}>{teacherName}</p>
                <div className="w-20 h-0.5 mx-auto mt-2" style={{ background: LINE }} />
              </div>

              <div className="flex flex-col items-center">
                {/* Achievement seal */}
                <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center font-bold"
                  style={{ border: `3px solid ${GOLD}`, background: GOLD_WASH, color: INK, fontSize: 9 }}>
                  <Sparkles size={15} color={GOLD} aria-hidden className="mb-0.5" />
                  <span>معتمدة</span>
                  <span>رسمياً</span>
                </div>
              </div>

              <div>
                <p className="font-bold mb-1" style={{ color: MUTED }}>تاريخ الاعتماد والمنح</p>
                <p className="font-bold" style={{ color: INK }}>
                  {ijazah.awardedAt
                    ? new Date(ijazah.awardedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
                    : new Date().toLocaleDateString('ar-EG')}
                </p>
                <p className="mt-1" style={{ fontSize: 10, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>كود التحقق: {ijazah.certificateCode}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
