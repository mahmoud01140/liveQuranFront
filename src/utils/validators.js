// Form validators

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) ? null : 'البريد الإلكتروني غير صحيح';
};

export const validatePassword = (password) => {
  if (!password) return 'كلمة المرور مطلوبة';
  if (password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
  return null;
};

export const validatePhone = (phone) => {
  if (!phone) return null; // optional
  const re = /^[+]?[\d\s\-()]{8,15}$/;
  return re.test(phone) ? null : 'رقم الهاتف غير صحيح';
};

export const validateRequired = (value, fieldName = 'الحقل') => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} مطلوب`;
  }
  return null;
};

export const validateRegisterForm = (data) => {
  const errors = {};
  
  if (!data.firstName?.trim()) errors.firstName = 'الاسم الأول مطلوب';
  if (!data.lastName?.trim()) errors.lastName = 'اسم العائلة مطلوب';
  
  const emailErr = validateEmail(data.email);
  if (emailErr) errors.email = emailErr;
  
  const passErr = validatePassword(data.password);
  if (passErr) errors.password = passErr;
  
  if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
    errors.confirmPassword = 'كلمتا المرور غير متطابقتين';
  }
  
  if (data.phone) {
    const phoneErr = validatePhone(data.phone);
    if (phoneErr) errors.phone = phoneErr;
  }
  
  return errors;
};

export const validateLoginForm = (data) => {
  const errors = {};
  const emailErr = validateEmail(data.email);
  if (emailErr) errors.email = emailErr;
  if (!data.password) errors.password = 'كلمة المرور مطلوبة';
  return errors;
};

export const hasErrors = (errors) => Object.keys(errors).length > 0;
