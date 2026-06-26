// database.js
// جميع استعلامات قاعدة البيانات D1

// ==================== المستخدمين ====================

export async function dbGetUser(telegramId) {
  return DB.prepare('SELECT * FROM users WHERE telegram_id = ?').bind(String(telegramId)).first();
}

export async function dbCreateUser(telegramId, username, firstName) {
  await DB.prepare(
    'INSERT OR IGNORE INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)'
  ).bind(String(telegramId), username || '', firstName || '').run();
  return dbGetUser(telegramId);
}

export async function dbGetAllUsers() {
  const result = await DB.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  return result.results || [];
}

export async function dbGetUsersCount() {
  const result = await DB.prepare('SELECT COUNT(*) as count FROM users').first();
  return result ? result.count : 0;
}

// ==================== الرصيد والمعاملات ====================

export async function dbUpdateBalance(userId, amount, type, refType, refId, desc) {
  const user = await DB.prepare('SELECT balance FROM users WHERE id = ?').bind(userId).first();
  if (!user) return null;

  const balanceBefore = Number(user.balance);
  const balanceAfter = balanceBefore + Number(amount);

  await DB.batch([
    DB.prepare('UPDATE users SET balance = ?, updated_at = datetime("now") WHERE id = ?').bind(balanceAfter, userId),
    DB.prepare(
      'INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(userId, type, amount, balanceBefore, balanceAfter, refType || null, refId || null, desc || ''),
  ]);

  return balanceAfter;
}

export async function dbGetTransactions(userId, limit = 20) {
  const result = await DB.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).bind(userId, limit).all();
  return result.results || [];
}

// ==================== الطلبات ====================

let generateOrderNumber;
try {
  const { v4: uuidv4 } = await import('uuid');
  generateOrderNumber = () => 'ORD-' + uuidv4().substring(0, 8).toUpperCase();
} catch (e) {
  generateOrderNumber = () => 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export { generateOrderNumber };

let generatePaymentNumber;
try {
  const { v4: uuidv4 } = await import('uuid');
  generatePaymentNumber = () => 'PAY-' + uuidv4().substring(0, 8).toUpperCase();
} catch (e) {
  generatePaymentNumber = () => 'PAY-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export { generatePaymentNumber };

export async function dbCreateOrder(userId, serviceCode, countryCode, cost, activationId, phoneNumber, providerId) {
  const orderNumber = generateOrderNumber();
  await DB.prepare(
    `INSERT INTO orders (order_number, user_id, service_code, country_code, cost, activation_id, phone_number, provider_id, status, activation_start)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))`
  ).bind(orderNumber, userId, serviceCode, countryCode, cost, activationId, phoneNumber, providerId || 1).run();
  return DB.prepare('SELECT * FROM orders WHERE order_number = ?').bind(orderNumber).first();
}

export async function dbGetActiveOrder(userId) {
  return DB.prepare('SELECT * FROM orders WHERE user_id = ? AND status = ?').bind(userId, 'active').first();
}

export async function dbGetOrderById(orderId) {
  return DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
}

export async function dbUpdateOrderStatus(orderId, status, smsCode = null) {
  await DB.prepare(
    'UPDATE orders SET status = ?, sms_code = ?, updated_at = datetime("now") WHERE id = ?'
  ).bind(status, smsCode || null, orderId).run();
}

export async function dbGetOrders(userId, limit = 10) {
  const result = await DB.prepare(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).bind(userId, limit).all();
  return result.results || [];
}

export async function dbGetAllOrders(limit = 50) {
  const result = await DB.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT ?'
  ).bind(limit).all();
  return result.results || [];
}

export async function dbGetOrdersCount(status = null) {
  let query = 'SELECT COUNT(*) as count FROM orders';
  if (status) {
    query += ' WHERE status = ?';
    const result = await DB.prepare(query).bind(status).first();
    return result ? result.count : 0;
  }
  const result = await DB.prepare(query).first();
  return result ? result.count : 0;
}

// ==================== المدفوعات ====================

export async function dbCreatePayment(userId, method, amount, proof = null) {
  const paymentNumber = generatePaymentNumber();
  await DB.prepare(
    'INSERT INTO payments (payment_number, user_id, method, amount, proof, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(paymentNumber, userId, method, amount, proof || '', 'pending').run();
  return DB.prepare('SELECT * FROM payments WHERE payment_number = ?').bind(paymentNumber).first();
}

export async function dbGetPendingPayment(userId) {
  return DB.prepare(
    'SELECT * FROM payments WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(userId, 'pending').first();
}

export async function dbGetPaymentById(paymentId) {
  return DB.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first();
}

export async function dbUpdatePaymentStatus(paymentId, status, adminId = null, note = null) {
  await DB.prepare(
    'UPDATE payments SET status = ?, processed_by = ?, admin_note = ?, updated_at = datetime("now") WHERE id = ?'
  ).bind(status, adminId || null, note || null, paymentId).run();
}

export async function dbUpdatePaymentProof(paymentId, proof) {
  await DB.prepare(
    'UPDATE payments SET proof = ?, updated_at = datetime("now") WHERE id = ?'
  ).bind(proof, paymentId).run();
}

export async function dbGetAllPayments(status = null, limit = 50) {
  let query = 'SELECT * FROM payments';
  if (status) {
    query += ' WHERE status = ?';
    const result = await DB.prepare(query + ' ORDER BY created_at DESC LIMIT ?').bind(status, limit).all();
    return result.results || [];
  }
  const result = await DB.prepare(query + ' ORDER BY created_at DESC LIMIT ?').bind(limit).all();
  return result.results || [];
}

// ==================== الخدمات ====================

export async function dbGetServices(status = 'active') {
  const result = await DB.prepare('SELECT * FROM services WHERE status = ?').bind(status).all();
  return result.results || [];
}

export async function dbGetAllServices() {
  const result = await DB.prepare('SELECT * FROM services ORDER BY id').all();
  return result.results || [];
}

export async function dbAddService(code, name) {
  await DB.prepare('INSERT OR IGNORE INTO services (code, name) VALUES (?, ?)').bind(code, name).run();
}

export async function dbUpdateServiceStatus(code, status) {
  await DB.prepare('UPDATE services SET status = ? WHERE code = ?').bind(status, code).run();
}

// ==================== الدول ====================

export async function dbGetCountries(status = 'active') {
  const result = await DB.prepare('SELECT * FROM countries WHERE status = ?').bind(status).all();
  return result.results || [];
}

export async function dbGetAllCountries() {
  const result = await DB.prepare('SELECT * FROM countries ORDER BY code').all();
  return result.results || [];
}

export async function dbAddCountry(code, name) {
  await DB.prepare('INSERT OR IGNORE INTO countries (code, name) VALUES (?, ?)').bind(code, name).run();
}

export async function dbUpdateCountryStatus(code, status) {
  await DB.prepare('UPDATE countries SET status = ? WHERE code = ?').bind(status, code).run();
}

// ==================== الإعدادات ====================

export async function dbGetSetting(key) {
  const result = await DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return result ? result.value : null;
}

export async function dbSetSetting(key, value) {
  await DB.prepare(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"))'
  ).bind(key, value).run();
}

export async function dbGetAllSettings() {
  const result = await DB.prepare('SELECT * FROM settings').all();
  return result.results || [];
}

// ==================== السجلات ====================

export async function dbLog(level, message, context = null) {
  await DB.prepare('INSERT INTO logs (level, message, context) VALUES (?, ?, ?)').bind(
    level,
    message,
    context ? JSON.stringify(context) : null
  ).run();
}

export async function dbGetLogs(limit = 50) {
  const result = await DB.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?').bind(limit).all();
  return result.results || [];
}

// ==================== الإذاعات ====================

export async function dbCreateBroadcast(message) {
  const result = await DB.prepare(
    'INSERT INTO broadcasts (message, status) VALUES (?, ?)'
  ).bind(message, 'pending').run();
  return result.meta?.last_row_id;
}

export async function dbUpdateBroadcastStatus(id, status, sentCount = 0) {
  await DB.prepare(
    'UPDATE broadcasts SET status = ?, sent_count = ? WHERE id = ?'
  ).bind(status, sentCount, id).run();
}

// ==================== الأكواد الترويجية ====================

export async function dbGetPromoCode(code) {
  return DB.prepare('SELECT * FROM promo_codes WHERE code = ? AND status = ?').bind(code, 'active').first();
}

export async function dbUsePromoCode(codeId) {
  await DB.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?').bind(codeId).run();
}

// ==================== الإحصائيات ====================

export async function dbGetStats() {
  const totalUsers = await dbGetUsersCount();
  const totalOrders = await dbGetOrdersCount();
  const activeOrders = await dbGetOrdersCount('active');
  const completedOrders = await dbGetOrdersCount('completed');

  const paymentsResult = await DB.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = ?'
  ).bind('approved').first();
  const totalRevenue = paymentsResult ? paymentsResult.total : 0;

  const transactionsResult = await DB.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = ?'
  ).bind('credit').first();
  const totalCredits = transactionsResult ? transactionsResult.total : 0;

  return {
    totalUsers,
    totalOrders,
    activeOrders,
    completedOrders,
    totalRevenue: Number(totalRevenue),
    totalCredits: Number(totalCredits),
  };
}
