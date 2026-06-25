import { sendMessage } from "../telegram.js";
import { customerMainKeyboard } from "../keyboards.js";

export async function handleCustomerUpdate(update, env) {

  if (!update.message) return;

  const message = update.message;
  const chatId = message.chat.id;
  const text = message.text || "";

  if (text === "/start") {

    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "👋 أهلاً بك في بوت MHMD لتفعيل الأرقام.\n\nاختر الخدمة من القائمة بالأسفل.",
      customerMainKeyboard()
    );

    return;
  }

}
