// keyboards.js
// جميع أزرار البوتين (العملاء والإدارة)

// ==================== بوت العملاء ====================

export function mainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: '🛒 شراء رقم' }],
      [{ text: '💰 رصيدي' }, { text: '💳 شحن رصيد' }],
      [{ text: '📋 طلباتي' }, { text: '📞 الدعم' }],
    ],
    resize_keyboard: true,
  };
}

export function backToMainKeyboard() {
  return {
    inline_keyboard: [[{ text: '🔙 رجوع للقائمة الرئيسية', callback_data: 'back_to_main' }]],
  };
}

export function servicesKeyboard(services) {
  const keyboard = services.map(s => [{ text: s.name, callback_data: `service_${s.code}` }]);
  keyboard.push([{ text: '🔙 رجوع', callback_data: 'back_to_main' }]);
  return { inline_keyboard: keyboard };
}

export function countriesKeyboard(countries, serviceCode) {
  const keyboard = [];
  // ترتيب الدول في صفوف كل صف دولتين
  for (let i = 0; i < countries.length; i += 2) {
    const row = [{ text: countries[i].name, callback_data: `country_${serviceCode}_${countries[i].code}` }];
    if (countries[i + 1]) {
      row.push({ text: countries[i + 1].name, callback_data: `country_${serviceCode}_${countries[i + 1].code}` });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: '🔙 رجوع', callback_data: 'back_to_services' }]);
  return { inline_keyboard: keyboard };
}

export function confirmPurchaseKeyboard(serviceCode, countryCode) {
  return {
    inline_keyboard: [
      [{ text: '✅ تأكيد الشراء', callback_data: `confirm_${serviceCode}_${countryCode}` }],
      [{ text: '🔙 رجوع', callback_data: `back_to_countries_${serviceCode}` }],
    ],
  };
}

export function activeOrderKeyboard(orderId) {
  return {
    inline_keyboard: [
      [{ text: '🔄 تحديث الحالة', callback_data: `check_status_${orderId}` }],
      [{ text: '❌ إلغاء الطلب', callback_data: `cancel_order_${orderId}` }],
      [{ text: '🔙 القائمة الرئيسية', callback_data: 'back_to_main' }],
    ],
  };
}

export function rechargeMethodKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '💵 شام كاش سوري', callback_data: 'recharge_sham_sy' }],
      [{ text: '💵 شام كاش دولار', callback_data: 'recharge_sham_usd' }],
      [{ text: '₮ USDT', callback_data: 'recharge_usdt' }],
      [{ text: '🔙 رجوع', callback_data: 'back_to_main' }],
    ],
  };
}

export function rechargeAmountKeyboard(method) {
  return {
    inline_keyboard: [
      [
        { text: '3$', callback_data: `amount_${method}_3` },
        { text: '5$', callback_data: `amount_${method}_5` },
      ],
      [
        { text: '10$', callback_data: `amount_${method}_10` },
        { text: '20$', callback_data: `amount_${method}_20` },
      ],
      [{ text: '🔙 رجوع', callback_data: 'back_to_recharge' }],
    ],
  };
}

export function cancelPaymentKeyboard() {
  return {
    inline_keyboard: [[{ text: '❌ إلغاء عملية الشحن', callback_data: 'cancel_payment' }]],
  };
}

// ==================== بوت الإدارة ====================

export function adminMainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📊 لوحة الإحصائيات', callback_data: 'admin_stats' }],
      [{ text: '👥 المستخدمون', callback_data: 'admin_users' }],
      [{ text: '📋 الطلبات', callback_data: 'admin_orders' }],
      [{ text: '💳 طلبات الشحن', callback_data: 'admin_payments' }],
      [{ text: '📢 الإذاعة', callback_data: 'admin_broadcast' }],
      [{ text: '🔧 إدارة المزودين', callback_data: 'admin_providers' }],
      [{ text: '📱 إدارة الخدمات', callback_data: 'admin_services' }],
      [{ text: '🌍 إدارة الدول', callback_data: 'admin_countries' }],
      [{ text: '💰 إدارة هامش الربح', callback_data: 'admin_margins' }],
      [{ text: '💵 إدارة وسائل الدفع', callback_data: 'admin_payment_methods' }],
      [{ text: '⚙️ الإعدادات العامة', callback_data: 'admin_settings' }],
      [{ text: '📝 السجلات', callback_data: 'admin_logs' }],
    ],
  };
}

export function adminBackKeyboard() {
  return {
    inline_keyboard: [[{ text: '🔙 رجوع للوحة الإدارة', callback_data: 'admin_back' }]],
  };
}

export function paymentActionKeyboard(paymentId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ تأكيد الشحن', callback_data: `approve_payment_${paymentId}` },
        { text: '❌ رفض الطلب', callback_data: `reject_payment_${paymentId}` },
      ],
      [{ text: '✏️ تعديل المبلغ', callback_data: `edit_payment_${paymentId}` }],
    ],
  };
        }
