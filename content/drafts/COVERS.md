# اختيار صور الأغلفة

الأغلفة الحالية مولّدة برمجياً وهي حلّ احتياطي فقط. الصورة الفوتوغرافية تجذب
النقرة أكثر بكثير، خاصة في معاينة واتساب ولينكدإن.

## القاعدة

**صورة واحدة لكل مقال تكفي للغتين.** الصورة الفوتوغرافية لا تحمل نصاً، فلا
حاجة لنسخة عربية وأخرى إنجليزية — بخلاف الغلاف المولّد الذي يحمل العنوان
مرسوماً.

## من أين

Unsplash أو Pexels. كلاهما يسمح بالاستخدام التجاري بلا مقابل، ويسمح بالربط
المباشر بصورهما (hotlinking) — وهو ما تفعله المواقع الجادة: أسرع، وبلا نسخ
مخزّنة عندك.

**مهم:** انسخ رابط **الصورة** لا رابط الصفحة.

- على Unsplash: زر يمين على الصورة ← Copy Image Address. يبدأ الرابط بـ
  `https://images.unsplash.com/photo-...`
- رابط الصفحة `https://unsplash.com/photos/...` **خطأ** — يرجع HTML لا صورة،
  والسكربت سيرفضه.

## معايير الاختيار

- **أفقية** بنسبة قريبة من 1200×630، وإلا اقتُصّت أطرافها في المعاينة.
- **مساحة هادئة** — الصورة تظهر خلف/فوق عنوان، فالمزدحمة تشتّت.
- **واقعية لا مصطنعة.** صور "رجال أعمال يصفّقون" تقلّل المصداقية لا ترفعها.
- **مناسبة للخليج قدر الإمكان**، أو محايدة ثقافياً على الأقل.

## المقالات وكلمات البحث المقترحة

| المقال | ابحث في Unsplash عن |
|---|---|
| `clinic-no-show-appointments` | `empty clinic waiting room` · `dental chair empty` · `medical reception desk` |
| `salon-last-minute-cancellations` | `empty salon chair` · `hair salon interior` · `barber shop chair` |
| `free-consultation-no-shows` | `laptop video call empty chair` · `consultant desk` · `online meeting` |
| `private-tutor-rescheduling` | `tutoring student desk` · `study notebook math` · `teacher one on one` |
| `physio-treatment-plan-attendance` | `physiotherapy session` · `rehabilitation exercise` · `nutritionist consultation` |
| `photographer-date-holds` | `wedding photographer camera` · `event photography` · `camera calendar` |
| `counselling-cancellation-policy` | `therapy chairs room` · `counselling office` · `quiet consultation room` |

## الخطوات

```bash
node scripts/blog-set-cover.mjs clinic-no-show-appointments https://images.unsplash.com/photo-XXXX
```

السكربت يتحقق من الرابط قبل كتابته: يرفض ما يرجع 404، ويرفض ما ليس صورة. الغلاف
المكسور أسوأ من غيابه، لأنه يظهر كمربع فارغ في البطاقة ومعاينة بيضاء عند
المشاركة — ولا يعلن أيٌّ منهما عن نفسه.

بعد ضبط السبعة:

```bash
npm run verify:drafts
node scripts/blog-draft-push.mjs all
```

## الأغلفة المولّدة

`scripts/generate-blog-covers.py` يبقى كاحتياطي لمقال لم تجد له صورة مناسبة.
يولّد غلافاً لكل لغة يحمل العنوان مرسوماً. جودته أقل من صورة حقيقية، لكنه أفضل
من بطاقة بلا غلاف.
