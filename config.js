// ================================
// MHMD Activation Bot Configuration
// ================================

export const CONFIG = {

  // اسم المشروع
  PROJECT_NAME: "MHMD Activation Bot",

  // لغة البوت
  DEFAULT_LANGUAGE: "ar",

  // العملة
  CURRENCY: "USD",

  // مدة انتظار وصول الكود (20 دقيقة)
  SMS_TIMEOUT: 20 * 60,

  // السماح بإلغاء الطلب بعد 3 دقائق
  CANCEL_AFTER: 3 * 60,

  // أقل مبلغ شحن
  MIN_DEPOSIT: 3,

  // عدد الطلبات في الصفحة
  PAGE_SIZE: 10,

  // وضع الصيانة
  MAINTENANCE: false,

  // هامش الربح
  PROFIT: {
    LEVEL1: {
      min: 0,
      max: 1.5,
      profit: 0.5
    },
    LEVEL2: {
      min: 1.5,
      max: 3,
      profit: 1
    },
    LEVEL3: {
      min: 3,
      max: 6,
      profit: 1.5
    },
    LEVEL4: {
      min: 6,
      max: 10,
      profit: 2
    },
    LEVEL5: {
      min: 10,
      max: 99999,
      profit: 3
    }
  }

};
