/**
 * MHMD DIGITAL
 * Database Manager (D1)
 */

export class Database {

  constructor(db) {
    this.db = db;
  }

  // تنفيذ استعلام
  async query(sql, params = []) {
    return await this.db.prepare(sql).bind(...params).all();
  }

  // جلب صف واحد
  async first(sql, params = []) {
    return await this.db.prepare(sql).bind(...params).first();
  }

  // تنفيذ عملية INSERT / UPDATE / DELETE
  async run(sql, params = []) {
    return await this.db.prepare(sql).bind(...params).run();
  }

  // التحقق من وجود مستخدم
  async getUser(telegramId) {
    return await this.first(
      "SELECT * FROM users WHERE telegram_id = ?",
      [telegramId]
    );
  }

  // إنشاء مستخدم جديد
  async createUser(user) {

    return await this.run(

`INSERT INTO users
(
telegram_id,
username,
first_name,
last_name,
language
)
VALUES
(
?,
?,
?,
?,
?
)`,
[
user.id,
user.username || "",
user.first_name || "",
user.last_name || "",
user.language_code || "ar"
]

);

  }

  // تحديث بيانات المستخدم
  async updateUser(user){

return await this.run(

`UPDATE users
SET
username=?,
first_name=?,
last_name=?,
updated_at=CURRENT_TIMESTAMP
WHERE telegram_id=?`,
[
user.username || "",
user.first_name || "",
user.last_name || "",
user.id
]

);

  }

              }
