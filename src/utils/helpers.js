import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import { ar } from 'date-fns/locale';

// Format date in Arabic
export const formatDateAr = (date, formatStr = 'dd MMMM yyyy') => {
  if (!date) return '';
  return format(new Date(date), formatStr, { locale: ar });
};

// Time ago in Arabic
export const timeAgoAr = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
};

// Format schedule day label
export const getSmartDateLabel = (date) => {
  const d = new Date(date);
  if (isToday(d)) return 'اليوم';
  if (isTomorrow(d)) return 'غداً';
  return formatDateAr(d, 'EEEE dd MMMM');
};

// Format time string "09:00" to "9:00 ص"
export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'م' : 'ص';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

// Get avatar initials
export const getInitials = (firstName, lastName) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

// Get avatar background color from name
export const getAvatarColor = (name = '') => {
  const colors = ['#1D9E75', '#534AB7', '#BA7517', '#3B82F6', '#EF4444', '#8B5CF6', '#F59E0B'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// Format file size
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميغابايت', 'غيغابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Format duration in minutes to Arabic
export const formatDuration = (minutes) => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} دقيقة`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ساعة و${m} دقيقة` : `${h} ساعة`;
};

// Calculate percentage circle path (SVG)
export const getCirclePath = (percentage, radius = 54) => {
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return { circumference, strokeDashoffset: offset };
};

// Truncate text
export const truncate = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Countdown timer format
export const formatCountdown = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Juz progress percentage
export const getJuzPercentage = (completedJuz = []) => {
  return Math.round((completedJuz.length / 30) * 100);
};

// Error message extractor
export const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'حدث خطأ غير متوقع';
};

// Generate color from level
export const getLevelColor = (level) => {
  const map = {
    foundation:  { bg: '#E1F5EE', text: '#1D9E75', border: '#1D9E75' },
    memorization: { bg: '#EDE9FF', text: '#534AB7', border: '#534AB7' },
    teacher_prep: { bg: '#FEF3E2', text: '#BA7517', border: '#BA7517' },
    senior:       { bg: '#FEFCE8', text: '#C9A227', border: '#C9A227' },
  };
  return map[level] || { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
};

export const getLevelLabel = (level) => {
  const map = {
    foundation:   'التأسيس',
    memorization: 'التحفيظ',
    teacher_prep: 'إعداد معلم',
    senior:       'كبار السن',
  };
  return map[level] || level;
};
