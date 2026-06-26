// handlers/admin.js
// معالجة أوامر بوت الإدارة

import config from '../config.js';
import {
  sendMessage,
  answerCallback,
  editMessage,
} from '../telegram.js';
import {
  dbGetAllUsers,
  dbGetAllOrders,
  dbGetAllPayments,
  dbGetPaymentById,
  dbUpdatePaymentStatus,
  dbGetAllServices,
  dbGetAllCountries,
  dbGetStats,
  dbGetLogs,
  dbGetAllSettings,
  dbSetSetting,
  dbUpdateBalance,
  dbCreateBroadcast,
  dbGetSetting,
} from '../database.js';
import {
  adminMainKeyboard,
  paymentActionKeyboard,
  adminBackKeyboard,
} from '../keyboards.js';

const ADMIN_BOT_TOKEN = () => config.ADMIN_BOT_TOKEN;
const BOT_TOKEN = () => config.BOT_TOKEN;
const ADMIN_ID = () => config.ADMIN_ID;

// ==================== معالجة رسائل الإدارة ====================

export async function handleAdminMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const telegramId = String(msg.from.id);

  if (telegramId !== ADMIN_ID()) return;

  if (text === '/start' || text === '/admin') {
    return sendMessage(ADMIN_BOT_TOKEN(), chatId, '🛡️ <b>لوحة تحكم الإدارة</b>\n\nاختر من القائمة أدناه:', adminMainKeyboard());
  }
}

// ==================== معالجة Callback Queries الإدارة ====================

export async function handleAdminCallback(cb) {
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const data = cb.data;
  const adminId = String(cb.from.id);

  if (adminId !== ADMIN_ID()) {
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id, '⛔ غير مصرح لك', true);
    return;
  }

  // ===== الرجوع للوحة الإدارة =====
  if (data === 'admin_back') {
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id);
    return editMessage(ADMIN_BOT_TOKEN(), chatId, messageId, '🛡️ <b>لوحة تحكم الإدارة</b>\n\nاختر من القائمة أدناه:', adminMainKeyboard());
  }

  // ===== الإحصائيات =====
  if (data === 'admin_stats') {
    const stats = await dbGetStats();
    const msg = `
📊 <b>لوحة الإحصائيات</b>

👥 عدد المستخدمين: <b>${stats.totalUsers}</b>
📋 إجمالي الطلبات: <b>${stats.totalOrders}</b>
🟢 الطلبات النشطة: <b>${stats.activeOrders}</b>
✅ الطلبات المكتملة: <b>${stats.completedOrders}</b>
💰 إجمالي الإيرادات: <b>${stats.totalRevenue.toFixed(2)}$</b>
💵 إجمالي الشحنات: <b>${stats.totalCredits.toFixed(2)}$</b>
    `;
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id);
    return editMessage(ADMIN_BOT_TOKEN(), chatId, messageId, msg, adminBackKeyboard());
  }

  // ===== المستخدمون =====
  if (data === 'admin_users') {
    const users = await dbGetAllUsers();
    let msg = `👥 <b>آخر 30 مستخدم:</b>\n\n`;
    for (const u of users.slice(0, 30)) {
      msg += `🆔 <code>${u.telegram_id}</code> | ${u.first_name || '—'}\n`;
      msg += `💰 الرصيد: ${u.balance.toFixed(2)}$ | 📅 ${u.created_at}\n\n`;
    }
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id);
    return editMessage(ADMIN_BOT_TOKEN(), chatId, messageId, msg, adminBackKeyboard());
  }

  // ===== الطلبات =====
  if (data === 'admin_orders') {
    const orders = await dbGetAllOrders(20);
    if (orders.length === 0) {
      await answerCallback(ADMIN_BOT_TOKEN(), cb.id, 'لا توجد طلبات');
      return;
    }
    let msg = `📋 <b>آخر 20 طلب:</b>\n\n`;
    for (const o of orders) {
      const statusEmoji = o.status === 'active' ? '🟢' : o.status === 'completed' ? '✅' : '❌';
      msg += `${statusEmoji} <code>${o.order_number}</code>\n`;
      msg += `📱 ${o.service_code} | 🌍 ${o.country_code} | 💵 ${o.cost}$\n`;
      msg += `📞 ${o.phone_number || '—'} | 📅 ${o.created_at}\n\n`;
    }
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id);
    return editMessage(ADMIN_BOT_TOKEN(), chatId, messageId, msg, adminBackKeyboard());
  }

  // ===== طلبات الشحن =====
  if (data === 'admin_payments') {
    const payments = await dbGetAllPayments('pending', 20);
    if (payments.length === 0) {
      await answerCallback(ADMIN_BOT_TOKEN(), cb.id, 'لا توجد طلبات شحن معلقة');
      return;
    }
    let msg = `💳 <b>طلبات الشحن المعلقة:</b>\n\n`;
    for (const p of payments) {
      msg += `📌 <code>${p.payment_number}</code>\n`;
      msg += `👤 المستخدم: ${p.user_id} | 💵 ${p.amount}$\n`;
      msg += `💳 ${p.method} | 📅 ${p.created_at}\n\n`;
    }
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id);
    return editMessage(ADMIN_BOT_TOKEN(), chatId, messageId, msg, adminBackKeyboard());
  }

  // ===== تأكيد الشحن =====
  if (data.startsWith('approve_payment_')) {
    const paymentId = parseInt(data.replace('approve_payment_', ''));
    const payment = await dbGetPaymentById(paymentId);

    if (!payment || payment.status !== 'pending') {
      await answerCallback(ADMIN_BOT_TOKEN(), cb.id, '⚠️ تم معالجة هذا الطلب مسبقاً', true);
      return;
    }

    await dbUpdatePaymentStatus(payment.id, 'approved', parseInt(adminId));
    await dbUpdateBalance(payment.user_id, payment.amount, 'credit', 'payment', payment.id, `شحن رصيد - ${payment.payment_number}`);

    // إشعار العميل
    await sendMessage(BOT_TOKEN(), payment.user_id,
      `✅ <b>تم تأكيد الشحن!</b>\n\n💰 المبلغ: <b>${payment.amount}$</b>\n📌 رقم العملية: <code>${payment.payment_number}</code>\n\nشكراً لثقتك! 🤍`,
      { keyboard: [[{ text: '🛒 شراء رقم' }]], resize_keyboard: true }
    );

    await answerCallback(ADMIN_BOT_TOKEN(), cb.id, '✅ تم تأكيد الشحن بنجاح');
    return sendMessage(ADMIN_BOT_TOKEN(), chatId, `✅ <b>تم تأكيد الشحن وإضافة ${payment.amount}$ للمستخدم.</b>`);
  }

  // ===== رفض الشحن =====
  if (data.startsWith('reject_payment_')) {
    const paymentId = parseInt(data.replace('reject_payment_', ''));
    const payment = await dbGetPaymentById(paymentId);

    if (!payment || payment.status !== 'pending') {
      await answerCallback(ADMIN_BOT_TOKEN(), cb.id, '⚠️ تم معالجة هذا الطلب مسبقاً', true);
      return;
    }

    await dbUpdatePaymentStatus(payment.id, 'rejected', parseInt(adminId), 'مرفوض');

    await sendMessage(BOT_TOKEN(), payment.user_id,
      `❌ <b>تم رفض طلب الشحن</b>\n\n📌 رقم العملية: <code>${payment.payment_number}</code>\n\nيرجى التواصل مع الدعم للمراجعة.`
    );

    await answerCallback(ADMIN_BOT_TOKEN(), cb.id, '❌ تم رفض الطلب');
    return sendMessage(ADMIN_BOT_TOKEN(), chatId, `❌ <b>تم رفض طلب الشحن.</b>`);
  }

  // ===== تعديل المبلغ =====
  if (data.startsWith('edit_payment_')) {
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id, '✏️ سيتم إضافة ميزة تعديل المبلغ قريباً', true);
  }

  // ===== الخدمات =====
  if (data === 'admin_services') {
    const services = await dbGetAllServices();
    let msg = `📱 <b>قائمة الخدمات:</b>\n\n`;
    for (const s of services) {
      const statusEmoji = s.status === 'active' ? '🟢' : '🔴';
      msg += `${statusEmoji} <b>${s.code}</b> - ${s.name}\n`;
    }
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id);
    return editMessage(ADMIN_BOT_TOKEN(), chatId, messageId, msg, adminBackKeyboard());
  }

  // ===== الدول =====
  if (data === 'admin_countries') {
    const countries = await dbGetAllCountries();
    let msg = `🌍 <b>قائمة الدول (أول 40):</b>\n\n`;
    for (const c of countries.slice(0, 40)) {
      const statusEmoji = c.status === 'active' ? '🟢' : '🔴';
      msg += `${statusEmoji} <b>${c.code}</b> - ${c.name}\n`;
    }
    msg += `\n... وإجمالي ${countries.length} دولة`;
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id);
    return editMessage(ADMIN_BOT_TOKEN(), chatId, messageId, msg, adminBackKeyboard());
  }

  // ===== هامش الربح =====
  if (data === 'admin_margins') {
    const tiersStr = await dbGetSetting('profit_margin_tiers');
    let msg = `💰 <b>هامش الربح الحالي:</b>\n\n`;
    if (tiersStr) {
      const tiers = JSON.parse(tiersStr);
      for (const t of tiers) {
        msg += `• من ${t.min}$ إلى ${t.max}$ ➜ <b>+${t.add}$</b>\n`;
      }
    } else {
      msg += `لم يتم تعيين شرائح مخصصة.\n`;
    }
    msg += `\nللتعديل، استخدم الأمر /setmargins`;
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id);
    return editMessage(ADMIN_BOT_TOKEN(), chatId, messageId, msg, adminBackKeyboard());
  }

  // ===== الإعدادات =====
  if (data === 'admin_settings') {
    const settings = await dbGetAllSettings();
    let msg = `⚙️ <b>الإعدادات الحالية:</b>\n\n`;
    for (const s of settings.slice(0, 15)) {
      msg += `• <b>${s.key}</b>: ${s.value}\n`;
    }
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id);
    return editMessage(ADMIN_BOT_TOKEN(), chatId, messageId, msg, adminBackKeyboard());
  }

  // ===== السجلات =====
  if (data === 'admin_logs') {
    const logs = await dbGetLogs(15);
    let msg = `📝 <b>آخر 15 سجل:</b>\n\n`;
    for (const l of logs) {
      const emoji = l.level === 'error' ? '🔴' : l.level === 'warn' ? '🟡' : '🔵';
      msg += `${emoji} ${l.message}\n📅 ${l.created_at}\n\n`;
    }
    await answerCallback(ADMIN_BOT_TOKEN(), cb.id);
    return editMessage(ADMIN_BOT_TOKEN(), chatId, messageId, msg, adminBackKeyboard());
  }
  }
