export function customerMainKeyboard() {
  return {
    keyboard: [
      [
        { text: "📱 شراء رقم" }
      ],
      [
        { text: "💰 رصيدي" },
        { text: "💳 شحن رصيد" }
      ],
      [
        { text: "📦 طلباتي" },
        { text: "🆘 الدعم" }
      ]
    ],
    resize_keyboard: true,
    persistent: true
  };
}

export function backKeyboard() {
  return {
    keyboard: [
      [
        { text: "⬅️ رجوع" }
      ]
    ],
    resize_keyboard: true,
    persistent: true
  };
}
