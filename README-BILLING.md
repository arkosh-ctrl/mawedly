# Mawedly — Subscriptions & Billing (Lemon Squeezy)

نظام الاشتراكات: 4 باقات (البداية المجانية، المحترف 49، المركز 99، المؤسسة 299)
معرّفة في `src/lib/billing/plans.ts` — قاعدة البيانات تخزن حالة اشتراك كل نشاط فقط
(migration `0020_subscriptions.sql`).

## 1) تطبيق قاعدة البيانات

الصق محتوى `supabase/migrations/0020_subscriptions.sql` في Supabase **SQL Editor**
وشغّله (ينشئ أعمدة الاشتراك على `businesses`، جدول `billing_webhook_events`،
وbucket خاص `brand-assets`).

## 2) إعداد Lemon Squeezy

1. أنشئ حساباً على lemonsqueezy.com وأنشئ **Store** — فعّل **Test Mode** أثناء التطوير
   (مفتاح التبديل أسفل يسار اللوحة).
2. أنشئ 3 منتجات (Products → New product)، كل منتج **Subscription** شهري بـ Variant واحد:
   - Mawedly Professional — بما يعادل 49 ر.س (≈ $13 USD)
   - Mawedly Center — بما يعادل 99 ر.س (≈ $26 USD)
   - Mawedly Enterprise — بما يعادل 299 ر.س (≈ $79 USD)
   > التحصيل بالدولار: Lemon Squeezy لا يسوّي بالريال ولا يدعم مدى — قرار موثّق.
3. خذ **Variant ID** لكل منتج: من صفحة المنتج → Variants → ID رقمي.
4. **API Key**: Settings → API → Create key.
5. **Store ID**: Settings → Stores → الرقم في العمود الأول.
6. **Webhook**: Settings → Webhooks → New:
   - URL: `https://www.mawedly.com/api/billing/webhook`
     (للتطوير المحلي استخدم نفق مثل `ngrok http 3000` وضع رابط النفق)
   - Signing secret: أنشئ نصاً عشوائياً قوياً (مثلاً `openssl rand -hex 32`)
   - Events: فعّل
     `subscription_created`, `subscription_updated`, `subscription_cancelled`,
     `subscription_expired`, `subscription_payment_success`, `subscription_payment_failed`

## 3) متغيرات البيئة

أضف إلى `.env.local` (وإلى Vercel → Project → Settings → Environment Variables):

```
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_PRO_VARIANT_ID=...
LEMONSQUEEZY_CENTER_VARIANT_ID=...
LEMONSQUEEZY_ENTERPRISE_VARIANT_ID=...
```

## 4) كيف يعمل

- **الترقية**: `/dashboard/billing` → زر الباقة → `POST /api/billing/checkout`
  → صفحة دفع Lemon Squeezy → webhook `subscription_created` يفعّل الباقة فوراً.
- **الحد الشهري**: `usage_reset_at` + **lazy reset** (بلا cron): أي قراءة/حجز في شهر
  جديد يصفّر العداد تلقائياً. `/api/book` يرفض بـ 403 عند اكتمال الحد
  (العميل يرى "الجدول ممتلئ"، والتاجر يرى شريط الاستخدام وCTA الترقية).
- **الترقية لا تصفّر العداد** — ترفع السقف فقط (منع التلاعب).
- **الإلغاء**: من Customer Portal (`GET /api/billing/portal`) — الباقة تبقى نشطة حتى
  نهاية الفترة (`subscription_cancelled`) ثم `subscription_expired` يعيدها مجانية.
- **فشل الدفع**: `past_due` → بانر تحذير في اللوحة؛ إعادة المحاولات تتبع دورة
  Lemon Squeezy نفسها (Dunning) حتى `expired`.
- **بوابات المميزات** (`src/lib/billing/plans.ts`): الإيميلات التلقائية، الفيديو،
  السوشال (بطاقات + روابط)، التحليلات، تقويم العميل، الـ branding — كلها تُفرض
  server-side.

## 5) الاختبار

```
npm run test:billing     # منطق الحدود والتصفير (8 اختبارات، node أصلي بلا مكتبات)
```

اختبار يدوي (Test Mode): بطاقة `4242 4242 4242 4242` بأي تاريخ مستقبلي وCVC.

## 6) النشر

1. طبّق 0020 على قاعدة الإنتاج.
2. أضف متغيرات env في Vercel ثم أعد النشر.
3. حدّث Webhook URL للدومين الحقيقي، وأوقف Test Mode في Lemon Squeezy عند الإطلاق.
