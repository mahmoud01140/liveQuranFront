// App constants

export const LEVELS = {
  foundation: { label: 'التأسيس', color: '#1D9E75', bg: '#E1F5EE' },
  memorization: { label: 'التحفيظ', color: '#534AB7', bg: '#EDE9FF' },
  teacher_prep: { label: 'إعداد معلم', color: '#BA7517', bg: '#FEF3E2' },
  senior: { label: 'كبار السن', color: '#C9A227', bg: '#FEFCE8' },
};

export const REGISTRATION_TYPES = {
  student: { label: 'طالب تأسيس', icon: '📖', description: 'للمبتدئين وطلاب تعلم القراءة والتجويد' },
  teacher: { label: 'إعداد معلم', icon: '👨‍🏫', description: 'للراغبين في إعداد أنفسهم لتدريس القرآن' },
  senior: { label: 'كبار السن', icon: '🌙', description: 'برنامج خاص مناسب لكبار السن بوتيرة هادئة' },
};

export const DAYS_AR = {
  sunday:    'الأحد',
  monday:    'الاثنين',
  tuesday:   'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday:  'الخميس',
  friday:    'الجمعة',
  saturday:  'السبت',
};

export const SESSION_TYPES = {
  live:    { label: 'مباشر', color: 'text-primary-400' },
  review:  { label: 'مراجعة', color: 'text-blue-500' },
  exam:    { label: 'امتحان', color: 'text-red-500' },
};

export const LESSON_TYPES_AR = {
  reading:      'قراءة',
  writing:      'كتابة',
  dictation:    'إملاء',
  memorization: 'حفظ',
  tajweed:      'تجويد',
  recitation:   'تلاوة',
  live_class:   'حصة مباشرة',
  review:       'مراجعة',
  exam:         'امتحان',
};

export const NOTIFICATION_TYPES = {
  live_starting:  { icon: '🔴', color: 'text-red-500' },
  exam_scheduled: { icon: '📝', color: 'text-blue-500' },
  result_ready:   { icon: '📋', color: 'text-green-500' },
  group_assigned: { icon: '🎉', color: 'text-primary-400' },
  plan_updated:   { icon: '📅', color: 'text-purple-500' },
  message:        { icon: '💬', color: 'text-gray-500' },
  general:        { icon: '🔔', color: 'text-gray-500' },
};

export const SURVEY_QUESTIONS = {
  student: [
    {
      id: 'prev_quran',
      text: 'هل سبق الالتحاق بحلقة قرآنية؟',
      options: ['نعم، لفترة طويلة', 'نعم، لفترة قصيرة', 'لا لم أسبق'],
    },
    {
      id: 'reading_level',
      text: 'مستوى القراءة الحالي؟',
      options: ['أقرأ بطلاقة', 'أقرأ ببطء', 'لا أستطيع القراءة'],
    },
    {
      id: 'daily_time',
      text: 'الوقت المتاح يومياً للدراسة؟',
      options: ['أقل من 30 دقيقة', '30 دقيقة إلى ساعة', 'أكثر من ساعة'],
    },
    {
      id: 'main_goal',
      text: 'الهدف الرئيسي من الانضمام؟',
      options: ['تعلم القراءة', 'حفظ القرآن', 'تحسين التجويد', 'تحقيق الأهداف الثلاثة جميعاً'],
    },
    {
      id: 'internet_quality',
      text: 'جودة اتصال الإنترنت؟',
      options: ['جيد دائماً', 'جيد أحياناً', 'ضعيف في الغالب'],
    },
  ],
  teacher: [
    {
      id: 'qualification',
      text: 'المؤهل العلمي في القرآن؟',
      options: ['إجازة برواية حفص', 'دراسة أزهرية متخصصة', 'تعلم ذاتي مستمر', 'لا يوجد مؤهل رسمي'],
    },
    {
      id: 'experience_years',
      text: 'سنوات خبرة التدريس؟',
      options: ['أكثر من 3 سنوات', 'أقل من 3 سنوات', 'مبتدئ في التدريس'],
    },
    {
      id: 'preferred_age',
      text: 'الفئة المفضلة للتدريس؟',
      options: ['الأطفال', 'المراهقون', 'البالغون', 'جميع الفئات'],
    },
    {
      id: 'weekly_hours',
      text: 'الساعات الأسبوعية المتاحة للتدريس؟',
      options: ['أقل من 5 ساعات', '5 إلى 10 ساعات', 'أكثر من 10 ساعات'],
    },
    {
      id: 'development_need',
      text: 'الجانب الأحوج للتطوير في التدريس؟',
      options: ['أساليب تفاعلية', 'أحكام التجويد المتقدمة', 'إدارة الفصل', 'التعامل مع ذوي الاحتياجات'],
    },
  ],
  senior: [
    {
      id: 'reading_ability',
      text: 'مستوى القراءة الحالي؟',
      options: ['لا أستطيع القراءة', 'أقرأ ببطء شديد', 'أقرأ بأخطاء كثيرة', 'قرائتي مقبولة'],
    },
    {
      id: 'daily_time',
      text: 'الوقت المتاح يومياً؟',
      options: ['أقل من 20 دقيقة', '20 إلى 45 دقيقة', 'أكثر من 45 دقيقة'],
    },
    {
      id: 'tech_help',
      text: 'هل تحتاج مساعدة في استخدام التطبيق؟',
      options: ['لا، أتعامل مع التكنولوجيا بسهولة', 'نعم، أحتاج بعض المساعدة', 'نعم، أحتاج مساعدة كثيرة'],
    },
    {
      id: 'main_goal',
      text: 'الهدف الرئيسي؟',
      options: ['قراءة القرآن بشكل صحيح', 'حفظ السور', 'تحسين الصلاة', 'تحقيق جميع الأهداف'],
    },
  ],
};
