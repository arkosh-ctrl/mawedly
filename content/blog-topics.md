# قائمة مواضيع مدونة موعدلي

كل سطر تحت "قيد الانتظار" موضوع جاهز للكتابة. عند نشر موضوع، انقله إلى "منشور"
مع الـ slug والتاريخ. لا تحذف السطور — السجل يمنع تكرار المواضيع.

الزاوية العامة: القارئ صاحب نشاط في الخليج (صالون، عيادة، استشارات، تدريب،
خدمات شخصية) يفقد وقتاً ومالاً بسبب عدم الحضور والفوضى في الحجز.

## خطة الثلاثين مقالاً (٩ أغسطس ٢٠٢٦) — الحالة

الثلاثون مقالاً كلها مكتوبة الآن بالعربية والإنجليزية في `content/drafts/<slug>/`،
منظمة في ستة عناقيد. `npm run verify:drafts` نظيف على الجميع باستثناء بند واحد
متبقٍّ يدوياً لكل مقال: **الغلاف**. راجع `content/drafts/COVERS.md` لخطوات
اختيار الصور وتشغيل `blog-set-cover.mjs` قبل الدفع.

تحديث الطول (بعد قرار عبدالله "التزام الحرفي يكون أفضل"): بعد جولة توسيع
ثالثة، كل المقالات الثلاثين — القديمة والجديدة — عند 1000-1090 كلمة عربية
و896-1323 كلمة إنجليزية، ضمن هدف 1000-1400 المذكور في معايير الخطة. كلها
تجتاز كل تحقق بنيوي (روابط داخلية، أطوال SEO، Markdown مدعوم، لا تكرار).

## حالة الجدولة (١٠ أغسطس ٢٠٢٦)

الأغلفة: الـ23 مقالاً الجديدة معها الآن صورة Pexels حقيقية حقيقية (hotlink،
مُتحقَّق منها فعلياً عبر أداة fetch خارجية — sandbox العمل لا يصل لشبكة
الإنترنت العامة إطلاقاً، لا لـ images.pexels.com ولا حتى لـ github.com عبر
git، فتحقق `blog-set-cover.mjs` و`verify:drafts` الداخلي يفشل محلياً بخطأ
"fetch failed" رغم أن الروابط سليمة فعلياً — استخدم `SKIP_REMOTE_COVERS=1`
عند التحقق محلياً). عبدالله اختار البدء بأغلفة حقيقية مباشرة (لا الأغلفة
المولّدة) رغم انقطاع أدوات الجلب مؤقتاً، فتم البحث والتحقق يدوياً قبل الكتابة.

الجدولة: الـ23 مقالاً مضبوطة status="scheduled" بنفس ترتيب العناقيد (ب ثم ج
ثم د ثم هـ ثم و)، بمعدل مقال واحد يومياً بدءاً من ١٣ أغسطس ٢٠٢٦ الساعة ٨:٠٠
بتوقيت الرياض (تكملة مباشرة بعد آخر مقال مجدول حالياً في ١٢ أغسطس)، وتنتهي
٤ سبتمبر ٢٠٢٦. لا حاجة لمهمة مجدولة أو cron — الموقع يُظهر كل مقال تلقائياً
عند بلوغ published_at (مؤكَّد من نص لوحة تحكم المدونة نفسها).

**الدفع للإنتاج لم يتم بعد.** sandbox العمل لا يملك اتصال شبكة عام إطلاقاً
(حتى git ووصول curl/fetch عادي يفشلان) — أداة web_fetch وحدها لديها وصول،
وهي GET فقط، لا تصلح لطلب POST مصادَق لـ `/api/blog/publish`. الأمر الجاهز
للتشغيل من جهاز فيه اتصال إنترنت حقيقي (BLOG_API_KEY موجود بالفعل في
`.env.local`):

```
node scripts/blog-draft-push.mjs all
```

بعد الدفع الفعلي، حدّث هذا القسم لنقل الـ23 مقالاً لقسم "منشور" تباعاً مع
تواريخها.

### عنقود أ — تكلفة عدم الحضور بحسب القطاع (٨)
- `clinic-no-show-appointments` — العيادات: تكلفة الكرسي الفارغ.
- `salon-last-minute-cancellations` — الصالونات: الساعة التي لا تُعاد بيعها.
- `free-consultation-no-shows` — المستشارون: المكالمة المجانية التي لا تُحضر.
- `private-tutor-rescheduling` — المعلمون: التأجيل المتكرر وأثره على الدخل.
- `physio-treatment-plan-attendance` — العلاج الطبيعي: انقطاع الخطة العلاجية.
- `photographer-date-holds` — المصورون: تثبيت التاريخ بلا عربون.
- `counselling-cancellation-policy` — الإرشاد النفسي: سياسة الإلغاء والخصوصية.
- `personal-trainer-session-no-shows` — المدرب الشخصي: الحصة التي لا تُعوَّض.

### عنقود ب — علم سلوك العميل والعربون (٥)
- `why-clients-cancel-last-minute` — التكلفة النفسية للحجز المجاني.
- `deposit-as-commitment-not-punishment` — صياغة طلب العربون.
- `calculate-your-no-show-cost` — شرح معادلة `/tools/no-show-calculator`.
- `does-asking-for-deposit-lose-clients` — معالجة اعتراض "بيهربون".
- `deposit-vs-full-prepayment` — عربون جزئي مقابل دفع كامل.

### عنقود ج — التشغيل اليومي (٥)
- `reminder-timing-and-wording` — توقيت وصياغة تذكير الموعد.
- `multi-provider-scheduling-conflicts` — تنظيم فريق مقدّمي خدمة بلا تعارض.
- `one-booking-page-not-many-chats` — صفحة حجز واحدة بدل محادثات متفرقة.
- `booking-confirmation-message-wording` — كتابة رسالة تأكيد حجز تُقرأ فعلاً.
- `merchant-receipt-confirmation-flow` — خطوات تأكيد التاجر بعد رفع الإيصال.

### عنقود د — الدفع والسياسة (٤)
- `bank-transfer-vs-payment-gateway` — التحويل البنكي بدل بوابة الدفع.
- `cancellation-refund-policy-template` — سياسة إلغاء واسترجاع بنموذج جاهز.
- `deposit-refund-rules` — استرجاع العربون: متى يستحقه العميل ومتى لا.
- `deposit-legal-questions-gulf` — أسئلة قانونية شائعة (تنويه: ليست استشارة قانونية).

### عنقود هـ — مقارنة الأدوات وصفحات القطاعات (٧)
- `english-booking-tools-arabic-rtl-gap` — فجوة RTL، بشاهد Calendly (٢٢ أكتوبر ٢٠٢٥) وCal.com.
- `salon-multi-stylist-scheduling` — صالون بأربع كوافيرات، يدعم `/use-cases/salons`.
- `tutor-schedule-messages-to-link` — جدول المعلّم الخصوصي، يدعم `/use-cases/tutors`.
- `professional-office-consultation-scheduling` — المكتب المهني، يدعم `/use-cases/professional-services`.
- `whatsapp-booking-vs-booking-link` — حجز واتساب مقابل رابط حجز، بالأرقام.
- `five-common-booking-tool-mistakes` — خمسة أخطاء عند اختيار نظام حجز.
- `excel-notebook-to-booking-link` — من دفتر/إكسل إلى رابط حجز واحد.

### عنقود و — السمعة (١)
- `attendance-and-reviews-connection` — علاقة انتظام الحضور بالتقييمات (يستغل `dashboard/reviews`).

## منشور

<!-- - slug — التاريخ — العنوان -->
