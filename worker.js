// worker.js
// نقطة تشغيل المشروع بالكامل - الإصدار مع دعم ES Modules والاستيراد

import config from './config.js';
import { handleCustomerMessage, handleCustomerCallback } from './handlers/customer.js';
import { handleAdminMessage, handleAdminCallback } from './handlers/admin.js';
import { dbLog } from './database.js';

export default {
  async fetch(request, env, ctx) {
    // ربط الـ Bindings بالـ globalThis
    globalThis.DB = env.DB;
    globalThis.KV = env.KV;
    globalThis.BOT_TOKEN_SECRET = env.BOT_TOKEN;
    globalThis.ADMIN_BOT_TOKEN_SECRET = env.ADMIN_BOT_TOKEN;
    globalThis.ADMIN_ID_SECRET = env.ADMIN_ID;
    globalThis.GRIZZLY_API_KEY_SECRET = env.GRIZZLY_API_KEY;

    if (request.method !== 'POST') {
      return new Response('OK', { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response('Bad Request', { status: 400 });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ===== بوت العملاء =====
      if (path === config.CUSTOMER_WEBHOOK_PATH) {
        if (update.message) {
          await handleCustomerMessage(update.message);
        }
        if (update.callback_query) {
          await handleCustomerCallback(update.callback_query);
        }
        return new Response('OK', { status: 200 });
      }

      // ===== بوت الإدارة =====
      if (path === config.ADMIN_WEBHOOK_PATH) {
        if (update.message) {
          await handleAdminMessage(update.message);
        }
        if (update.callback_query) {
          await handleAdminCallback(update.callback_query);
        }
        return new Response('OK', { status: 200 });
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Worker Error:', error);
      await dbLog('error', 'Worker Error', {
        message: error.message,
        stack: error.stack,
        path: path,
      });
      return new Response('OK', { status: 200 });
    }
  },
};
