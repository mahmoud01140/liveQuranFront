// Quranic Mutashabihat Data (المتشابهات القرآنية اللفظية والضوابط التثبيتية)

export const MUTASHABIHAT_ITEMS = [
  {
    id: 'm1',
    category: 'البقرة وآل عمران',
    surahNumber: 2,
    verseNumber: 136,
    verseText: 'قُولُوا آمَنَّا بِاللَّهِ وَمَا أُنزِلَ إِلَيْنَا...',
    similarSurah: 3,
    similarSurahName: 'آل عمران',
    similarVerseNumber: 84,
    similarVerseText: 'قُلْ آمَنَّا بِاللَّهِ وَمَا أُنزِلَ عَلَيْنَا...',
    difference: 'في البقرة: (قُولُوا ... إِلَيْنَا) بالجمع وإلى، وفي آل عمران: (قُلْ ... عَلَيْنَا) بالإفراد وعلى.',
    rule: '💡 الضابط: سورة البقرة خوطبت فيها الأمة جمعاء فقيل (قُولُوا)، بينما آل عمران خوطب فيها النبي صلى الله عليه وسلم بالتبليغ فقيل (قُلْ).'
  },
  {
    id: 'm2',
    category: 'خواتيم الآيات (خبير / بصير)',
    surahNumber: 2,
    verseNumber: 110,
    verseText: '... إِنَّ اللَّهَ بِمَا تَعْمَلُونَ بَصِيرٌ',
    similarSurah: 2,
    similarSurahName: 'البقرة',
    similarVerseNumber: 237,
    similarVerseText: '... وَاللَّهُ بِمَا تَعْمَلُونَ بَصِيرٌ',
    difference: 'التقديم والتأخير بين الرؤية والعمل، أو الاقتران بـ (إنّ) و (الواو).',
    rule: '💡 الضابط: إذا كان السياق في أعمال ظاهرة كالصلاة والإنفاق جاء الختم بـ (بَصِيرٌ).'
  },
  {
    id: 'm3',
    category: 'سورة الأعراف والشعراء',
    surahNumber: 7,
    verseNumber: 111,
    verseText: 'قَالُوا أَرْجِهْ وَأَخَاهُ وَأَرْسِلْ فِي الْمَدَائِنِ حَاشِرِينَ',
    similarSurah: 26,
    similarSurahName: 'الشعراء',
    similarVerseNumber: 36,
    similarVerseText: 'قَالُوا أَرْجِهْ وَأَخَاهُ وَابْعَثْ فِي الْمَدَائِنِ حَاشِرِينَ',
    difference: 'في الأعراف: (وَأَرْسِلْ)، وفي الشعراء: (وَابْعَثْ).',
    rule: '💡 الضابط: السين في (أَرْسِلْ) تسبق العين في (ابْعَثْ) حسب ترتيب السور في المصحف.'
  },
  {
    id: 'm4',
    category: 'قصة إبراهيم عليه السلام',
    surahNumber: 14,
    verseNumber: 35,
    verseText: 'رَبِّ اجْعَلْ هَٰذَا الْبَلَدَ آمِنًا...',
    similarSurah: 2,
    similarSurahName: 'البقرة',
    similarVerseNumber: 126,
    similarVerseText: 'رَبِّ اجْعَلْ هَٰذَا بَلَدًا آمِنًا...',
    difference: 'في البقرة: (بَلَدًا آمِنًا) نكرة لأن مكة لم تكن بلداً معموراً بعد، وفي إبراهيم: (الْبَلَدَ آمِنًا) معرفة لأنها صارت بلداً مقصوداً.',
    rule: '💡 الضابط: النكرة في الأسبق (البقرة)، والمعرفة في اللاحق (إبراهيم).'
  },
  {
    id: 'm5',
    category: 'سورة الحجر والنحل',
    surahNumber: 15,
    verseNumber: 2,
    verseText: 'رُّبَمَا يَوَدُّ الَّذِينَ كَفَرُوا لَوْ كَانُوا مُسْلِمِينَ',
    similarSurah: 15,
    similarSurahName: 'الحجر',
    similarVerseNumber: 2,
    similarVerseText: 'قراءة رُبَما بالتخفيف والتشديد',
    difference: 'حكم قرائي وضبط فريد في بداية السورة.',
    rule: '💡 الضابط: الموضع الوحيد لكلمة (رُّبَمَا) في القرآن الكريم.'
  },
  {
    id: 'm6',
    category: 'سورة يوسف',
    surahNumber: 12,
    verseNumber: 109,
    verseText: '... أَفَلَمْ يَسِيرُوا فِي الْأَرْضِ فَيَنظُرُوا كَيْفَ كَانَ عَاقِبَةُ الَّذِينَ مِن قَبْلِهِمْ ۗ وَلَدَارُ الْآخِرَةِ خَيْرٌ لِّلَّذِينَ اتَّقَوْا ۗ أَفَلَا تَعْقِلُونَ',
    similarSurah: 12,
    similarSurahName: 'يوسف',
    similarVerseNumber: 109,
    similarSurah2: 6,
    similarSurahName2: 'الأنعام',
    similarVerseNumber2: 32,
    difference: '(أَفَلَا تَعْقِلُونَ) في يوسف والأنعام والأعراف، مقابل (أَفَلَا تَتَّقُونَ) في مواضع أخرى.',
    rule: '💡 الضابط: السياق الذي يحث على التدبر والفكر يُختم بـ (أَفَلَا تَعْقِلُونَ).'
  }
];

// Helper: check if a specific surah/verse has a mutashabih item
export const getMutashabihForAyah = (surahNumber, verseNumber) => {
  return MUTASHABIHAT_ITEMS.find(
    item =>
      (item.surahNumber === parseInt(surahNumber) && item.verseNumber === parseInt(verseNumber)) ||
      (item.similarSurah === parseInt(surahNumber) && item.similarVerseNumber === parseInt(verseNumber))
  );
};
