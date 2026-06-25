/**
 * MHMD DIGITAL
 * Telegram Keyboards
 */

export const Keyboards = {

  // القائمة الرئيسية للعميل
  home() {

    return {
      inline_keyboard: [

        [
          {
            text: "📱 شراء رقم",
            callback_data: "buy_number"
          }
        ],

        [
          {
            text: "💰 رصيدي",
            callback_data: "wallet"
          },
          {
            text: "💳 شحن رصيد",
            callback_data: "deposit"
          }
        ],

        [
          {
            text: "📦 طلباتي",
            callback_data: "orders"
          }
        ],

        [
          {
            text: "☎️ الدعم",
            callback_data: "support"
          }
        ]

      ]
    };

  },

  // اختيار الخدمة
  services() {

    return {

      inline_keyboard: [

        [
          {
            text: "🟢 واتساب",
            callback_data: "service_wa"
          }
        ],

        [
          {
            text: "🔵 تيليجرام",
            callback_data: "service_tg"
          }
        ],

        [
          {
            text: "⬅️ رجوع",
            callback_data: "home"
          }
        ]

      ]

    };

  },

  // زر رجوع فقط
  back(callback = "home") {

    return {

      inline_keyboard: [

        [
          {
            text: "⬅️ رجوع",
            callback_data: callback
          }
        ]

      ]

    };

  }

};
