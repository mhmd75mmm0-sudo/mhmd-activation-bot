// handlers/customer.js
// معالجة أوامر بوت العملاء

import config from '../config.js';
import {
  sendMessage,
  answerCallback,
  editMessage,
} from '../telegram.js';
import {
  dbGetUser,
  dbCreateUser,
  dbGetActiveOrder,
  dbCreateOrder,
  dbUpdateOrderStatus,
  dbGetOrders,
  dbUpdateBalance,
  dbCreatePayment,
  dbGetPendingPayment,
  dbUpdatePaymentProof,
  dbGetServices,
  dbGetCountries,
  dbGetSetting,
} from '../database.js';
import {
  mainMenuKeyboard,
  servicesKeyboard,
  countriesKeyboard,
  confirmPurchaseKeyboard,
  activeOrderKeyboard,
  rechargeMethodKeyboard,
  rechargeAmountKeyboard,
  cancelPaymentKeyboard,
} from '../keyboards.js';
import {
  getBalance,
  getNumberV2,
  setStatus,
  getStatusV2,
  getPricesV3,
} from './grizzly.js';

const BOT_TOKEN = () => config.BOT_TOKEN;
const ADMIN_BOT_TOKEN = () => config.ADMIN_BOT_TOKEN;
const ADMIN_ID = () => config.ADMIN_ID;

// دالة حساب السعر النهائي مع هامش الربح
async function calculateFinalPrice(price) {
  const tiersStr = await dbGetSetting('profit_margin_tiers');
  let tiers;
  if (tiersStr) {
    try {
      tiers = JSON.parse(tiersStr);
    } catch (e) {
      tiers = config.DEFAULT_PROFIT_TIERS;
    }
  } else {
    tiers = config.DEFAULT_PROFIT_TIERS;
  }

  for (const tier of tiers) {
    if (price >= tier.min && price < tier.max) {
      return price + tier.add;
    }
  }
  return price + (tiers[tiers.length - 1]?.add || 2);
}

// الحصول على أقل سعر من المزود
async function getLowestPrice(serviceCode, countryCode) {
  const pricesData = await getPricesV3(serviceCode, countryCode);
  if (!pricesData || !pricesData[countryCode]) return null;

  const countryData = pricesData[countryCode];
  const serviceData = countryData[serviceCode];
  if (!serviceData || !serviceData.providers) return null;

  let lowestPrice = Infinity;
  for (const [, pdata] of Object.entries(serviceData.providers)) {
    if (pdata.prices && pdata.prices.length > 0) {
      const minPrice = Math.min(...pdata.prices);
      if (minPrice < lowestPrice) lowestPrice = minPrice;
    }
  }

  return lowestPrice === Infinity ? null : lowestPrice;
}

// ==================== معالجة الرسائل ====================

export async function handleCustomerMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const telegramId = String(msg.from.id);
  const username = msg.from.username || '';
  const firstName = msg.from.first_name || '';

  let user = await dbGetUser(telegramId);
  if (!user) {
    user = await dbCreateUser(telegramId, username, firstName);
  }

  // التحقق من وجود عملية شحن معلقة - استلام صورة الإثبات
  const pendingPayment = await dbGetPendingPayment(user.id);
  if (pendingPayment && (msg.photo || msg.document)) {
    const fileId = msg.photo
      ? msg.photo[msg.photo.length - 1].file_id
      : msg.document.file_id;

    await dbUpdatePaymentProof(pendingPayment.id, fileId);

    // إشعار الأدمن
    const adminMsg = `
🔔 <b>طلب شحن جديد</b>

📌 رقم الطلب: <code>${pendingPayment.payment_number}</code>
👤 العميل: ${firstName}
🆔 معرف تيليجرام: <code>${telegramId}</code>
📧 اليوزر: @${username}
💰 الرصيد الحالي: <b>${user.balance.toFixed(2)}$</b>
💳 طريقة الدفع: <b>${pendingPayment.method}</b>
💵 المبلغ: <b>${pendingPayment.amount}$</b>
    `;

    const { paymentActionKeyboard } = await import('../keyboards.js');
    await sendMessage(ADMIN_BOT_TOKEN(), ADMIN_ID(), adminMsg, paymentActionKeyboard(pendingPayment.id));

    // إعادة إرسال الصورة للأدمن
    const photoUrl = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN()}/sendPhoto`;
    await fetch(photoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_ID(), photo: fileId }),
    });

    return sendMessage(BOT_TOKEN(), chatId, '✅ تم استلام إثبات الدفع، سيتم مراجعة طلبك قريباً.', mainMenuKeyboard());
  }

  // ==================== الأوامر النصية ====================

  if (text === '/start' || text === '🔙 رجوع' || text === '🔙 رجوع للقائمة الرئيسية') {
    const welcome = await dbGetSetting('welcome_message') || 'مرحباً بك في بوت شراء أرقام التفعيل! 🎉';
    return sendMessage(BOT_TOKEN(), chatId, welcome, mainMenuKeyboard());
  }

  if (text === '🛒 شراء رقم') {
    const services = await dbGetServices('active');
    if (services.length === 0) {
      return sendMessage(BOT_TOKEN(), chatId, '⚠️ لا توجد خدمات متاحة حالياً.', mainMenuKeyboard());
    }
    return sendMessage(BOT_TOKEN(), chatId, '📱 <b>اختر الخدمة المطلوبة:</b>', servicesKeyboard(services));
  }

  if (text === '💰 رصيدي') {
    const refreshedUser = await dbGetUser(telegramId);
    const balance = refreshedUser ? refreshedUser.balance.toFixed(2) : '0.00';
    return sendMessage(BOT_TOKEN(), chatId, `💰 <b>رصيدك الحالي:</b> <code>${balance}$</code>`, mainMenuKeyboard());
  }

  if (text === '💳 شحن رصيد') {
    return sendMessage(BOT_TOKEN(), chatId, '💳 <b>اختر وسيلة الدفع:</b>', rechargeMethodKeyboard());
  }

  if (text === '📋 طلباتي') {
    const orders = await dbGetOrders(user.id, 10);
    if (!orders || orders.length === 0) {
      return sendMessage(BOT_TOKEN(), chatId, '📋 لا يوجد لديك طلبات سابقة.', mainMenuKeyboard());
    }

    let msg = '<b>📋 آخر طلباتك:</b>\n\n';
    for (const o of orders) {
      const statusEmoji =
        o.status === 'active' ? '🟢' :
        o.status === 'completed' ? '✅' :
        o.status === 'cancelled' ? '❌' : '⏳';
      msg += `${statusEmoji} <code>${o.order_number}</code>\n`;
      msg += `📱 ${o.service_code} | 🌍 ${o.country_code}\n`;
      msg += `💵 ${o.cost}$ | 📞 ${o.phone_number || '—'}\n`;
      if (o.sms_code) msg += `🔑 الكود: <code>${o.sms_code}</code>\n`;
      msg += `📅 ${o.created_at}\n\n`;
    }
    return sendMessage(BOT_TOKEN(), chatId, msg, mainMenuKeyboard());
  }

  if (text === '📞 الدعم') {
    const support = await dbGetSetting('support_contact') || '@mhmd_support';
    return sendMessage(BOT_TOKEN(), chatId, `📞 <b>للتواصل مع الدعم:</b>\n${support}`, mainMenuKeyboard());
  }
}

// ==================== معالجة Callback Queries ====================

export async function handleCustomerCallback(cb) {
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const data = cb.data;
  const telegramId = String(cb.from.id);

  let user = await dbGetUser(telegramId);
  if (!user) {
    user = await dbCreateUser(telegramId, cb.from.username || '', cb.from.first_name || '');
  }

  // ===== الرجوع للقائمة الرئيسية =====
  if (data === 'back_to_main') {
    await answerCallback(BOT_TOKEN(), cb.id);
    const welcome = await dbGetSetting('welcome_message') || 'مرحباً بك في بوت شراء أرقام التفعيل! 🎉';
    return sendMessage(BOT_TOKEN(), chatId, welcome, mainMenuKeyboard());
  }

  // ===== اختيار الخدمة =====
  if (data.startsWith('service_')) {
    const serviceCode = data.replace('service_', '');
    const countries = await dbGetCountries('active');
    if (countries.length === 0) {
      await answerCallback(BOT_TOKEN(), cb.id, 'لا توجد دول متاحة حالياً', true);
      return;
    }
    await answerCallback(BOT_TOKEN(), cb.id);
    return editMessage(BOT_TOKEN(), chatId, messageId, `🌍 <b>اختر الدولة لخدمة ${serviceCode}:</b>`, countriesKeyboard(countries, serviceCode));
  }

  // ===== الرجوع لقائمة الخدمات =====
  if (data === 'back_to_services') {
    const services = await dbGetServices('active');
    await answerCallback(BOT_TOKEN(), cb.id);
    return editMessage(BOT_TOKEN(), chatId, messageId, '📱 <b>اختر الخدمة المطلوبة:</b>', servicesKeyboard(services));
  }

  // ===== الرجوع لقائمة الدول =====
  if (data.startsWith('back_to_countries_')) {
    const serviceCode = data.replace('back_to_countries_', '');
    const countries = await dbGetCountries('active');
    await answerCallback(BOT_TOKEN(), cb.id);
    return editMessage(BOT_TOKEN(), chatId, messageId, `🌍 <b>اختر الدولة لخدمة ${serviceCode}:</b>`, countriesKeyboard(countries, serviceCode));
  }

  // ===== اختيار الدولة =====
  if (data.startsWith('country_')) {
    const parts = data.split('_');
    const serviceCode = parts[1];
    const countryCode = parts.slice(2).join('_');

    await answerCallback(BOT_TOKEN(), cb.id, '⏳ جاري جلب السعر...');

    const lowestPrice = await getLowestPrice(serviceCode, countryCode);
    if (lowestPrice === null) {
      return editMessage(BOT_TOKEN(), chatId, messageId, '⚠️ الخدمة غير متوفرة حالياً في هذه الدولة.\n\nحاول مرة أخرى لاحقاً أو اختر دولة أخرى.', null);
    }

    const finalPrice = await calculateFinalPrice(lowestPrice);

    // تخزين السعر مؤقتاً في KV
    await KV.put(`price_${telegramId}`, JSON.stringify({
      serviceCode,
      countryCode,
      cost: lowestPrice,
      finalPrice,
    }), { expirationTtl: 600 }); // 10 دقائق

    return editMessage(BOT_TOKEN(), chatId, messageId,
      `📋 <b>تفاصيل الشراء:</b>\n\n📱 الخدمة: <b>${serviceCode}</b>\n🌍 الدولة: <b>${countryCode}</b>\n💰 السعر الإجمالي: <b>${finalPrice.toFixed(2)}$</b>\n\nهل تريد تأكيد الشراء؟`,
      confirmPurchaseKeyboard(serviceCode, countryCode)
    );
  }

  // ===== تأكيد الشراء =====
  if (data.startsWith('confirm_')) {
    const parts = data.split('_');
    const serviceCode = parts[1];
    const countryCode = parts.slice(2).join('_');

    const priceDataStr = await KV.get(`price_${telegramId}`);
    if (!priceDataStr) {
      await answerCallback(BOT_TOKEN(), cb.id, '⏰ انتهت الجلسة، حاول مرة أخرى', true);
      return;
    }

    const priceData = JSON.parse(priceDataStr);
    const finalPrice = priceData.finalPrice;
    const cost = priceData.cost;

    // تحديث الرصيد للتأكد
    user = await dbGetUser(telegramId);
    const userBalance = user ? user.balance : 0;

    if (userBalance < finalPrice) {
      await answerCallback(BOT_TOKEN(), cb.id, '⚠️ رصيدك غير كافٍ، يرجى شحن الرصيد أولاً', true);
      return sendMessage(BOT_TOKEN(), chatId,
        `⚠️ <b>رصيدك غير كافٍ</b>\n\n💰 رصيدك: <code>${userBalance.toFixed(2)}$</code>\n💵 المطلوب: <code>${finalPrice.toFixed(2)}$</code>\n\nقم بشحن رصيدك أولاً.`,
        rechargeMethodKeyboard()
      );
    }

    // التحقق من وجود طلب نشط
    const activeOrder = await dbGetActiveOrder(user.id);
    if (activeOrder) {
      await answerCallback(BOT_TOKEN(), cb.id, '⚠️ لديك طلب نشط بالفعل، لا يمكن شراء أكثر من رقم في نفس الوقت', true);
      return;
    }

    await answerCallback(BOT_TOKEN(), cb.id, '🔄 جاري شراء الرقم...');

    const numberData = await getNumberV2(serviceCode, countryCode, cost);

    if (!numberData || !numberData.activationId) {
      return editMessage(BOT_TOKEN(), chatId, messageId, '⚠️ الخدمة غير متوفرة حالياً.\n\nحاول مرة أخرى لاحقاً أو اختر دولة أخرى.', null);
    }

    try {
      // خصم الرصيد
      await dbUpdateBalance(user.id, -finalPrice, 'debit', 'order', null, `شراء رقم ${serviceCode} - ${countryCode}`);

      // إنشاء الطلب
      const order = await dbCreateOrder(
        user.id, serviceCode, countryCode, finalPrice,
        numberData.activationId, numberData.phoneNumber, 1
      );

      // تفعيل استقبال الرسائل
      await setStatus(numberData.activationId, 1);

      await KV.delete(`price_${telegramId}`);

      const orderMsg = `
✅ <b>تم شراء الرقم بنجاح!</b>

📌 رقم الطلب: <code>${order.order_number}</code>
📱 الخدمة: <b>${serviceCode}</b>
🌍 الدولة: <b>${countryCode}</b>
📞 الرقم: <b>${numberData.phoneNumber}</b>
💰 السعر: <b>${finalPrice.toFixed(2)}$</b>
⏰ مدة الانتظار: ${config.ACTIVATION_TIMEOUT_MINUTES} دقيقة

🔄 اضغط "تحديث الحالة" لاستلام الكود عند وصوله.
      `;

      return sendMessage(BOT_TOKEN(), chatId, orderMsg, activeOrderKeyboard(order.id));
    } catch (error) {
      console.error('Purchase error:', error);
      return sendMessage(BOT_TOKEN(), chatId, '⚠️ حدث خطأ أثناء الشراء، تم إعادة الرصيد. حاول مرة أخرى.', mainMenuKeyboard());
    }
  }

  // ===== تحديث حالة الطلب =====
  if (data.startsWith('check_status_')) {
    const orderId = parseInt(data.replace('check_status_', ''));
    const order = await dbGetOrderById(orderId);

    if (!order || order.user_id !== user.id) {
      await answerCallback(BOT_TOKEN(), cb.id, 'الطلب غير موجود', true);
      return;
    }

    if (order.status === 'completed') {
      await answerCallback(BOT_TOKEN(), cb.id, '✅ تم استلام الكود بالفعل');
      return sendMessage(BOT_TOKEN(), chatId,
        `✅ <b>تم استلام الكود!</b>\n\n📌 رقم الطلب: <code>${order.order_number}</code>\n📞 الرقم: <b>${order.phone_number}</b>\n🔑 الكود: <b>${order.sms_code}</b>`,
        mainMenuKeyboard()
      );
    }

    if (order.status === 'cancelled') {
      await answerCallback(BOT_TOKEN(), cb.id, '❌ تم إلغاء الطلب');
      return sendMessage(BOT_TOKEN(), chatId, '❌ تم إلغاء هذا الطلب.', mainMenuKeyboard());
    }

    await answerCallback(BOT_TOKEN(), cb.id, '🔄 جاري التحقق من وصول الكود...');

    const statusData = await getStatusV2(order.activation_id);

    if (statusData && statusData.sms && statusData.sms.code) {
      const code = statusData.sms.code;
      await dbUpdateOrderStatus(order.id, 'completed', code);
      await setStatus(order.activation_id, 6); // إنهاء التفعيل

      return sendMessage(BOT_TOKEN(), chatId,
        `✅ <b>تم استلام الكود!</b>\n\n📌 رقم الطلب: <code>${order.order_number}</code>\n📞 الرقم: <b>${order.phone_number}</b>\n🔑 الكود: <b>${code}</b>`,
        mainMenuKeyboard()
      );
    }

    // التحقق من الوقت المنقضي
    const createdAt = new Date(order.created_at + ' UTC');
    const now = new Date();
    const diffMinutes = (now - createdAt) / 60000;

    if (diffMinutes > config.ACTIVATION_TIMEOUT_MINUTES) {
      await dbUpdateOrderStatus(order.id, 'cancelled');
      await dbUpdateBalance(user.id, order.cost, 'refund', 'order', order.id, `استرداد - انتهاء مهلة الطلب ${order.order_number}`);
      await setStatus(order.activation_id, 8);

      return sendMessage(BOT_TOKEN(), chatId, `⏰ <b>انتهت مهلة الطلب (${config.ACTIVATION_TIMEOUT_MINUTES} دقيقة)</b>\n\nتم إلغاء الطلب وإعادة الرصيد إلى حسابك.`, mainMenuKeyboard());
    }

    const remainingMinutes = Math.round(config.ACTIVATION_TIMEOUT_MINUTES - diffMinutes);
    return sendMessage(BOT_TOKEN(), chatId,
      `⏳ <b>في انتظار الكود...</b>\n\n📞 الرقم: <b>${order.phone_number}</b>\n⏰ الوقت المتبقي: حوالي <b>${remainingMinutes} دقيقة</b>\n\n🔄 اضغط "تحديث الحالة" مرة أخرى.`,
      activeOrderKeyboard(order.id)
    );
  }

  // ===== إلغاء الطلب =====
  if (data.startsWith('cancel_order_')) {
    const orderId = parseInt(data.replace('cancel_order_', ''));
    const order = await dbGetOrderById(orderId);

    if (!order || order.user_id !== user.id || order.status !== 'active') {
      await answerCallback(BOT_TOKEN(), cb.id, '⚠️ لا يمكن إلغاء هذا الطلب', true);
      return;
    }

    // التحقق من مرور 3 دقائق
    const createdAt = new Date(order.created_at + ' UTC');
    const now = new Date();
    const diffMinutes = (now - createdAt) / 60000;

    if (diffMinutes < config.CANCEL_COOLDOWN_MINUTES) {
      const waitMinutes = Math.round(config.CANCEL_COOLDOWN_MINUTES - diffMinutes);
      await answerCallback(BOT_TOKEN(), cb.id, `⏰ لا يمكن الإلغاء قبل مرور ${config.CANCEL_COOLDOWN_MINUTES} دقائق. انتظر ${waitMinutes} دقيقة`, true);
      return;
    }

    await dbUpdateOrderStatus(order.id, 'cancelled');
    await dbUpdateBalance(user.id, order.cost, 'refund', 'order', order.id, `استرداد - إلغاء الطلب ${order.order_number}`);
    await setStatus(order.activation_id, 8);

    await answerCallback(BOT_TOKEN(), cb.id, '✅ تم إلغاء الطلب وإعادة الرصيد');
    return sendMessage(BOT_TOKEN(), chatId, '❌ <b>تم إلغاء الطلب وإعادة الرصيد إلى حسابك.</b>', mainMenuKeyboard());
  }

  // ===== شحن الرصيد - اختيار وسيلة الدفع =====
  if (data.startsWith('recharge_')) {
    const method = data.replace('recharge_', '');
    await answerCallback(BOT_TOKEN(), cb.id);
    return editMessage(BOT_TOKEN(), chatId, messageId, '💵 <b>اختر المبلغ المراد شحنه:</b>', rechargeAmountKeyboard(method));
  }

  // ===== الرجوع لقائمة وسائل الدفع =====
  if (data === 'back_to_recharge') {
    await answerCallback(BOT_TOKEN(), cb.id);
    return editMessage(BOT_TOKEN(), chatId, messageId, '💳 <b>اختر وسيلة الدفع:</b>', rechargeMethodKeyboard());
  }

  // ===== اختيار المبلغ =====
  if (data.startsWith('amount_')) {
    const parts = data.split('_');
    const method = parts[1];
    const amount = parseInt(parts[2]);

    // حفظ بيانات الشحن مؤقتاً
    await KV.put(`recharge_${telegramId}`, JSON.stringify({ method, amount }), { expirationTtl: 1800 }); // 30 دقيقة

    const methodNames = {
      'sham_sy': 'شام كاش سوري',
      'sham_usd': 'شام كاش دولار',
      'usdt': 'USDT',
    };

    const msg = `
💳 <b>تفاصيل الشحن:</b>

طريقة الدفع: <b>${methodNames[method] || method}</b>
المبلغ: <b>${amount}$</b>

📎 <b>يرجى إرسال صورة إثبات الدفع (سكرين شوت).</b>
    `;

    await answerCallback(BOT_TOKEN(), cb.id);
    return editMessage(BOT_TOKEN(), chatId, messageId, msg, cancelPaymentKeyboard());
  }

  // ===== إلغاء عملية الشحن =====
  if (data === 'cancel_payment') {
    await KV.delete(`recharge_${telegramId}`);
    await answerCallback(BOT_TOKEN(), cb.id, 'تم إلغاء عملية الشحن');
    return editMessage(BOT_TOKEN(), chatId, messageId, '❌ تم إلغاء عملية الشحن.', null);
  }
}

// دالة مساعدة للحصول على طلب معين
import { dbGetOrderById } from '../database.js';
