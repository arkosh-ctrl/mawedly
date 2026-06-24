# Mawedly (موعدلي) — المستند المرجعي النهائي الموحّد

> **هذا الملف يحل محل كل المستندات السابقة المتناثرة.** اعتمده مرجعاً وحيداً في Cowork. آخر تحديث يشمل: الاسم النهائي، نموذج الدفع، ثنائية اللغة، وكل إصلاحات الأمان.

---

## 0. القرارات المحسومة (لا رجوع فيها)

| القرار | المعتمد |
|---|---|
| **الاسم + الدومين** | Mawedly — mawedly.com (مُشترى ✅) |
| **النوع** | SaaS مستقل لحجز المواعيد بعربون، للصالونات والخدمات الشخصية في الخليج |
| **نموذج الدفع** | ج — تحويل بنكي يدوي + رفع إيصال + تأكيد التاجر. لا بوابة دفع |
| **الواتساب** | روابط wa.me اليدوية (بضغطة من التاجر). لا WhatsApp Business API |
| **الإشعارات الآلية** | إيميل عبر Resend (للتاجر أساساً، للعميل اختياري) |
| **اللغات** | العربية (افتراضية، RTL) + الإنجليزية (LTR) — **فقط** |
| **العمودية في V1** | الصالونات/الخدمات الشخصية. تأجيل العيادات الطبية (حساسية بيانات صحية) |
| **الستاك** | Next.js 15 (App Router) + TypeScript + Tailwind + Supabase + Shadcn UI |
| **التدفق المالي للمنتج** | اشتراك شهري بطبقات (49/99/199 ريال) + تجربة 14 يوماً |

**سؤال معلّق (لم يُحسم):** استلامك أنت لدخل الاشتراكات كمقيم غير سعودي. بما أن فوترتك مباشرة (لا منصة سلة)، الوضع مختلف — لكن تأكد من الطريقة النظامية لقبول المدفوعات (حساب بنكي/كيان) بالتوازي مع البناء. لا يوقف البناء، لكن يُحسم قبل الإطلاق التجاري.

---

## 1. نظرة عامة

**المشكلة:** الصالونات تفقد دخلاً من عملاء يحجزون ولا يحضرون، وتدير مواعيدها يدوياً عبر واتساب/دفاتر. الحلول العالمية (Fresha) إنجليزية، تعتمد بطاقة ائتمان، ولا تستخدم واتساب.

**الحل:** منصة حجز مباشرة (رابط مخصص لكل صالون) + عربون بتحويل بنكي يدوي + تذكير واتساب + تقويم مرئي + ثنائية اللغة.

**عرض القيمة:** "نظام حجز احترافي لصالونك، بعربون يحمي مواعيدك، بضغطة — عربي وإنجليزي."

**المنافس:** "حجزلي" (hajezly.com) — صفحة "قريباً" فقط، لم يُطلق بعد. السرعة سلاحك: اسبقه بمنتج يعمل.

---

## 2. ثنائية اللغة (i18n) — أساسية من اليوم الأول

**المبدأ الأصعب: الاتجاه لا الترجمة.** العربية RTL والإنجليزية LTR — التخطيط ينقلب، لا النص فقط.

- مكتبة **next-intl** مع توجيه `/ar` و`/en`.
- `dir="rtl"/"ltr"` يتبدّل تلقائياً حسب اللغة على مستوى الصفحة.
- خصائص Tailwind **المنطقية** (`ps`/`pe`، `start`/`end`) لا (`pl`/`pr`، `left`/`right`) — ليعمل التخطيط في الاتجاهين بلا كود مزدوج.
- كل النصوص في ملفات ترجمة (`ar.json`، `en.json`) — لا نصوص ثابتة في المكونات.
- **لوحة التاجر:** اللغة اختيار التاجر (زر تبديل، تُحفظ في `businesses.default_language`).
- **صفحة الحجز العامة `/[slug]`:** اللغة تتبع المتصفح تلقائياً + زر تبديل ظاهر (عميل قد يكون أجنبياً).
- خط عربي نظيف (IBM Plex Sans Arabic أو Tajawal) + خط لاتيني مناسب.
- **رسائل واتساب بنسختين** (ar/en) يختار التاجر حسب عميله.

---

## 3. مخطط قاعدة البيانات — Schema V3.2 (آمن + i18n + إيميل)

```sql
-- 1. BUSINESSES
create table businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  type text not null default 'salon',        -- salon | consulting | other
  phone text not null,                        -- واتساب المنشأة (روابط wa.me)
  notification_email text,                    -- إيميل إشعارات التاجر (قد يختلف عن إيميل الدخول)
  default_language text default 'ar',         -- ar | en
  bank_name text,
  bank_iban text,
  bank_account_name text,
  bank_qr_path text,                          -- مسار في bucket خاص (لا URL عام)
  is_active boolean default true,
  plan text not null default 'free',          -- free | starter | growth | pro
  trial_ends_at timestamptz default now() + interval '14 days',
  created_at timestamptz default now()
);
create index on businesses (user_id);
create index on businesses (slug);

-- 2. PROVIDERS
create table providers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  title text,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index on providers (business_id);

-- 3. SERVICES
create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  duration_minutes int not null default 30,
  price numeric(10,2) not null,
  deposit_amount numeric(10,2) not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index on services (business_id);

-- 4. CUSTOMERS
create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  phone text not null,                        -- 9665xxxxxxxx
  email text,                                 -- اختياري (لإيصال الإيميل)
  notes text,
  created_at timestamptz default now(),
  unique (business_id, phone)
);
create index on customers (business_id);

-- 5. APPOINTMENTS (آلة الحالات)
create table appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  provider_id uuid references providers(id) not null,
  service_id uuid references services(id) not null,
  customer_id uuid references customers(id) not null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,                      -- يُحسب تلقائياً
  status text not null default 'pending_verification',
    -- pending_verification | confirmed | canceled | no_show | completed
  deposit_screenshot_path text,                -- مسار خاص في Storage
  deposit_verified boolean default false,
  customer_notes text,
  created_at timestamptz default now()
);
create index on appointments (business_id, appointment_date);
create index on appointments (provider_id, appointment_date);

-- 6. AUDIT_LOG (لحل النزاعات مع التعديل اليدوي)
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade not null,
  appointment_id uuid references appointments(id) on delete set null,
  action text not null,
  actor text,                                  -- merchant | customer | system
  meta jsonb,
  created_at timestamptz default now()
);
create index on audit_log (business_id, created_at);

-- دالة حساب وقت الانتهاء تلقائياً
create or replace function calculate_end_time()
returns trigger as $$
declare service_duration int;
begin
  select duration_minutes into service_duration from services where id = NEW.service_id;
  NEW.end_time := NEW.start_time + (service_duration || ' minutes')::interval;
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_calculate_end_time
  before insert or update on appointments
  for each row execute function calculate_end_time();
```

---

## 4. سياسات RLS الآمنة (شغّلها بعد الجداول — إلزامية)

```sql
alter table businesses   enable row level security;
alter table providers    enable row level security;
alter table services     enable row level security;
alter table customers    enable row level security;
alter table appointments enable row level security;
alter table audit_log    enable row level security;

create policy "owner manages own business"
  on businesses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "public can read active businesses"
  on businesses for select using (is_active = true);

create policy "owner manages providers"
  on providers for all
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));
create policy "public reads active providers"
  on providers for select using (is_active = true);

create policy "owner manages services"
  on services for all
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));
create policy "public reads active services"
  on services for select using (is_active = true);

create policy "owner manages customers"
  on customers for all
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));

create policy "owner manages appointments"
  on appointments for all
  using (business_id in (select id from businesses where user_id = auth.uid()))
  with check (business_id in (select id from businesses where user_id = auth.uid()));

create policy "owner reads own audit"
  on audit_log for select
  using (business_id in (select id from businesses where user_id = auth.uid()));
```

**حرج:** لا إدراج عام مباشر للحجوزات. صفحة الحجز ترسل لـ API route على الخادم (service-role) يتحقق من الـ slug، تداخل الوقت، صيغة الجوال، وحد المحاولات (rate limit)، ثم يُدرج.

---

## 5. التخزين (Storage) — خاص لا عام

- bucket `bank-qrs` و`deposits` كلاهما **private**.
- صور الإيصالات وQR البنوك بيانات حساسة — وصول عبر **signed URLs** مؤقتة للمالك فقط.
- احذف صور الإيصالات بعد التحقق بفترة (مثلاً 90 يوماً) — PDPL.

---

## 6. التدفقات

**إعداد التاجر:** تسجيل (Magic Link) → بيانات النشاط + slug + واتساب + بنك + رفع QR → إضافة موظفين وخدمات → اختيار لغة اللوحة.

**حجز العميل (`/[slug]`):** اللغة تتبع المتصفح → اختيار خدمة → موظف → وقت متاح (يستثني المتداخل) → اسم/جوال (+إيميل اختياري) → شاشة التحويل (آيبان + QR) → رفع لقطة الإيصال → حجز بحالة `pending_verification`.

**التحقق (التاجر):** يرى الإيصال في لوحته → يتأكد من بنكه → "تأكيد الموعد ✅" → `confirmed`.

**واتساب (يدوي):** زر بجانب الموعد يفتح `wa.me` برسالة جاهزة (بلغة العميل) → التاجر يضغط إرسال.

**إيميل (آلي عبر Resend):** حجز جديد → إيميل **للتاجر** (الأهم). استلام/تأكيد → إيميل **للعميل** لو أعطى إيميله. (المفتاح سرّي على الخادم فقط.)

**تقويم التاجر:** مرئي ملوّن (أصفر بانتظار/أخضر مؤكد/أحمر ملغي) + ملف عميل (تاريخ + ملاحظات) + تعديل/إلغاء/no-show يدوياً.

**أزرار تقويم العميل:** بعد الحجز، روابط إضافة الموعد لـ Google/Apple Calendar (مجانية).

---

## 7. الميزات الدفاعية

عربون محلي حقيقي، واتساب أصيل، اختيار الموظف المفضل، ثنائية اللغة (RTL/LTR) من اليوم الأول، سياسة عربون واضحة بالعربي، وتصميم "التعديل اليدوي بالقصد" مع audit log. **(ضد شعار AI الفارغ عند المنافس: تميّزك ملموس لا شعارات.)**

---

## 8. خارطة الطريق (8 أسابيع)

- **أ1:** سكافولد + i18n (next-intl, RTL/LTR) + Supabase + Magic Link + الإعدادات + رفع QR.
- **أ2:** Schema + RLS كامل + CRUD خدمات/موظفين.
- **أ3:** صفحة الحجز العامة + خوارزمية الأوقات المتاحة + إدراج عبر الخادم.
- **أ4:** رفع الإيصال + حالة pending_verification + تأكيد التاجر.
- **أ5:** التقويم المرئي + ملف العميل.
- **أ6:** أزرار wa.me (نسختين) + روابط تقويم العميل.
- **أ7:** إشعارات Resend (تاجر/عميل) + تعديل/إلغاء/no-show + audit log.
- **أ8:** الاشتراك/الفوترة + تجربة 14 يوم + اختبار E2E + إطلاق.

---

## 9. متغيرات البيئة

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
TOKEN_ENCRYPTION_KEY=
APP_BASE_URL=https://mawedly.com
```

---

## 10. برومبت Claude Code — الأسبوع الأول (جاهز للصق في Cowork)

```
أنت مهندس Full-Stack خبير في Next.js 15 (App Router) و TypeScript و Tailwind و Supabase و Shadcn UI. نبني "Mawedly" (موعدلي) — منصة عربية/إنجليزية ثنائية اللغة لحجز المواعيد بعربون، الدومين mawedly.com.

نموذج الدفع: تحويل بنكي يدوي + رفع إيصال + تأكيد التاجر. لا بوابة دفع. لا WhatsApp API (روابط wa.me لاحقاً).
المرجع: اعتمد حصراً على Schema V3.2 المرفق في المشروع (الجداول + RLS + الربط عبر user_id/auth.uid + Storage خاص). لا تستخدم مخططاً من ذاكرتك.

نطاق الأسبوع الأول:
1. تهيئة Next.js (TypeScript, ESLint, Tailwind).
2. التدويل i18n من اليوم الأول: next-intl مع توجيه /ar و/en. العربية افتراضية RTL، الإنجليزية LTR. dir يتبدّل تلقائياً. استخدم خصائص Tailwind المنطقية (ps/pe، start/end). كل النصوص في ar.json/en.json (لا نصوص ثابتة). خط عربي (IBM Plex Sans Arabic أو Tajawal) + لاتيني نظيف.
3. عميل Supabase + middleware: حماية /[locale]/dashboard/* وإتاحة /[locale]/[slug] للعامة. تسجيل دخول Magic Link.
4. تطبيق migration الكامل (Schema V3.2) + كل سياسات RLS.
5. صفحة الإعدادات (/dashboard/settings) بـ react-hook-form و zod: اسم النشاط، slug، واتساب، notification_email، default_language، بيانات البنك، ورفع QR إلى bucket خاص bank-qrs (signed URLs فقط).
6. CRUD للخدمات (اسم، مدة، سعر، عربون) ومقدمي الخدمة.
7. هيكل لوحة تحكم RTL/LTR + زر تبديل اللغة، مع Skeleton وToast.

قيود:
- صفحة الحجز العامة لا تكتب في قاعدة البيانات مباشرة — الإدراج عبر API route على الخادم (service-role) مع تحقق من slug وتداخل الوقت وصيغة الجوال وحد المحاولات.
- لوحة التاجر: اللغة اختيار التاجر (تُحفظ في default_language). صفحة الحجز: اللغة تتبع المتصفح + زر تبديل.
- معمارية نظيفة (server actions/hooks منفصلة عن العرض). أنواع TypeScript كاملة بلا placeholders.
- اعرض عليّ خطة كل خطوة قبل تنفيذها (مراجعة-قبل-تنفيذ).
```

---

## 11. خطواتك الآن (بالترتيب)

1. أنشئ مشروع Cowork باسم **Mawedly**.
2. اسحب هذا الملف داخل المشروع كمرجع وحيد.
3. أنشئ مشروع **Supabase جديد** وانسخ مفاتيحه للـ `.env` (تفعلها أنت — الوكيل لا يدخل بياناتك).
4. الصق برومبت الأسبوع الأول (القسم 10).
5. راجع خطة Claude Code قبل الموافقة على التنفيذ.
```
```
```
