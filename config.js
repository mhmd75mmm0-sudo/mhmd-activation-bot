// config.js
// إعدادات المشروع - يتم جلب القيم الحساسة من Secrets

export default {
  // يتم جلبها من environment variables (Secrets)
  get BOT_TOKEN() {
    return globalThis.BOT_TOKEN_SECRET;
  },
  get ADMIN_BOT_TOKEN() {
    return globalThis.ADMIN_BOT_TOKEN_SECRET;
  },
  get ADMIN_ID() {
    return globalThis.ADMIN_ID_SECRET;
  },
  get GRIZZLY_API_KEY() {
    return globalThis.GRIZZLY_API_KEY_SECRET;
  },

  // إعدادات المزود
  GRIZZLY_BASE_URL: 'https://api.grizzlysms.com/stubs/handler_api.php',

  // إعدادات هامش الربح الافتراضية
  DEFAULT_PROFIT_TIERS: [
    { min: 0, max: 1.5, add: 0.5 },
    { min: 1.5, max: 3, add: 1 },
    { min: 3, max: 6, add: 1.5 },
    { min: 6, max: 10, add: 2 },
  ],

  // حدود الوقت
  ACTIVATION_TIMEOUT_MINUTES: 20,
  CANCEL_COOLDOWN_MINUTES: 3,

  // Webhook paths
  CUSTOMER_WEBHOOK_PATH: '/customer',
  ADMIN_WEBHOOK_PATH: '/admin',
};
