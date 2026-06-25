import { handleCustomerUpdate } from "./handlers/customer.js";
import { handleAdminUpdate } from "./handlers/admin.js";

export default {
  async fetch(request, env, ctx) {

    if (request.method !== "POST") {
      return new Response("MHMD Activation Bot", {
        status: 200
      });
    }

    let update;

    try {
      update = await request.json();
    } catch {
      return new Response("Invalid JSON", {
        status: 400
      });
    }

    const token = request.headers.get("x-telegram-bot-api-secret-token");

    try {

      if (token === env.BOT_TOKEN) {
        await handleCustomerUpdate(update, env);
      }

      else if (token === env.ADMIN_BOT_TOKEN) {
        await handleAdminUpdate(update, env);
      }

      else {
        return new Response("Unauthorized", {
          status: 401
        });
      }

    } catch (err) {

      console.log(err);

    }

    return new Response("OK");

  }
}
