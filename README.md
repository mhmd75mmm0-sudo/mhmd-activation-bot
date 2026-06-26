# MHMD Activation Bot

بوت تيليجرام لبيع أرقام التفعيل باستخدام GrizzlySMS API.

## الهيكل

- بوت العملاء (Customer Bot)
- بوت الإدارة (Admin Bot)
- Cloudflare Worker + D1 + KV

## المتطلبات

- حساب Cloudflare مع Workers Paid Plan
- بوتين تيليجرام من BotFather
- حساب GrizzlySMS API

## النشر

1. `npm install`
2. عدل `wrangler.jsonc` بمعرفات D1 و KV
3. أضف Secrets في Cloudflare Dashboard
4. `npm run deploy`
