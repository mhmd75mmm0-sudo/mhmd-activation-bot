/**
 * MHMD DIGITAL
 * Telegram API Manager
 */

export class Telegram {

  constructor(token) {
    this.token = token;
    this.api = `https://api.telegram.org/bot${token}`;
  }

  // تنفيذ أي طلب إلى Telegram API
  async request(method, data = {}) {

    const response = await fetch(`${this.api}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    return await response.json();
  }

  // إرسال رسالة
  async sendMessage(chatId, text, keyboard = null) {

    return await this.request("sendMessage", {

      chat_id: chatId,

      text,

      parse_mode: "HTML",

      reply_markup: keyboard

    });

  }

  // تعديل رسالة
  async editMessage(chatId, messageId, text, keyboard = null) {

    return await this.request("editMessageText", {

      chat_id: chatId,

      message_id: messageId,

      text,

      parse_mode: "HTML",

      reply_markup: keyboard

    });

  }

  // حذف رسالة
  async deleteMessage(chatId, messageId) {

    return await this.request("deleteMessage", {

      chat_id: chatId,

      message_id: messageId

    });

  }

  // إرسال صورة
  async sendPhoto(chatId, photo, caption = "", keyboard = null) {

    return await this.request("sendPhoto", {

      chat_id: chatId,

      photo,

      caption,

      parse_mode: "HTML",

      reply_markup: keyboard

    });

  }

  // الرد على CallbackQuery
  async answerCallback(id, text = "") {

    return await this.request("answerCallbackQuery", {

      callback_query_id: id,

      text

    });

  }

}
