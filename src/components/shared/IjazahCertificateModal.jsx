import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Printer, Download, X, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto"
        >
          {/* Top action header (not printed) */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-sm">شهادة الإجازة القرآنية الرسمية بالسند المتصل</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة / حفظ PDF</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Certificate Printable Area */}
          <div ref={certificateRef} className="p-8 sm:p-12 bg-gradient-to-b from-[#FAF7EE] via-white to-[#FAF7EE] relative text-center border-[10px] border-[#D4AF37]/40 m-3 sm:m-4 rounded-2xl shadow-inner">
            {/* Ornate Corner Accents */}
            <div className="absolute top-3 right-3 text-[#D4AF37] font-serif text-2xl select-none">⚜️</div>
            <div className="absolute top-3 left-3 text-[#D4AF37] font-serif text-2xl select-none">⚜️</div>
            <div className="absolute bottom-3 right-3 text-[#D4AF37] font-serif text-2xl select-none">⚜️</div>
            <div className="absolute bottom-3 left-3 text-[#D4AF37] font-serif text-2xl select-none">⚜️</div>

            {/* Bismillah */}
            <p className="text-2xl text-gray-700 mb-2 font-bold" style={{ fontFamily: "'Amiri', serif" }}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
            <p className="text-xs text-amber-800 tracking-widest font-semibold mb-6">
              المملكة — منصة التعليم والمقارئ القرآنية العالمية
            </p>

            <div className="inline-block border-y-2 border-[#D4AF37] py-1 px-8 mb-6">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 font-serif" style={{ fontFamily: "'Amiri', serif" }}>
                📜 إِجَـازَةٌ قُـرْآنِـيَّـةٌ بِالسَّنَدِ المُتَّصِل 📜
              </h1>
            </div>

            <p className="text-sm text-gray-600 mb-4 leading-relaxed max-w-xl mx-auto">
              الحمد لله الذي نزّل الفرقان على عبده ليكون للعالمين نذيراً، والصلاة والسلام على رسول الله القائل: 
              <span className="font-bold text-amber-900"> «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»</span>.
            </p>

            <p className="text-sm text-gray-700 mb-4">
              فقد أتمّ الطالب المبارك:
            </p>

            <div className="bg-amber-50/70 border border-amber-200 py-2.5 px-6 rounded-2xl inline-block mb-4 shadow-sm">
              <h2 className="text-2xl sm:text-3xl font-black text-emerald-900" style={{ fontFamily: "'Amiri', serif" }}>
                {studentName}
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-xl mx-auto mb-6">
              قراءة القرآن الكريم كاملاً عن ظهر غيب من فاتحته إلى خاتمته، متقناً لأحكام التجويد ومخارج الحروف وضبط المتشابهات بـ:
              <br />
              <strong className="text-base text-amber-950 font-bold block mt-1">
                {riwayahLabels[ijazah.riwayah] || ijazah.riwayah}
              </strong>
            </p>

            <p className="text-xs text-gray-600 italic mb-8 max-w-md mx-auto">
              «{ijazah.sanadChain || 'بسنده المتصل إلى رسول الله صلى الله عليه وسلم عن الروح الأمين جبريل عن رب العزة جل جلاله'}»
            </p>

            {/* Signatures & Seal Row */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#D4AF37]/30 items-center text-xs">
              <div>
                <p className="text-gray-500 font-bold mb-1">الشيخ المقرئ المجيز</p>
                <p className="font-black text-gray-900 text-sm">{teacherName}</p>
                <div className="w-20 h-0.5 bg-gray-400 mx-auto mt-2 opacity-50" />
              </div>

              <div className="flex flex-col items-center">
                {/* Golden Stamp Badge */}
                <div className="w-16 h-16 rounded-full border-4 border-[#D4AF37] bg-gradient-to-br from-amber-100 to-amber-200 flex flex-col items-center justify-center text-amber-900 font-bold text-[9px] shadow-lg rotate-[-6deg]">
                  <Sparkles className="w-4 h-4 text-amber-700 mb-0.5" />
                  <span>معتمدة</span>
                  <span>رسمياً</span>
                </div>
              </div>

              <div>
                <p className="text-gray-500 font-bold mb-1">تاريخ الاعتماد والمنح</p>
                <p className="font-bold text-gray-900">
                  {ijazah.awardedAt
                    ? new Date(ijazah.awardedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
                    : new Date().toLocaleDateString('ar-EG')}
                </p>
                <p className="text-[10px] text-gray-400 font-mono mt-1">كود التحقق: {ijazah.certificateCode}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
