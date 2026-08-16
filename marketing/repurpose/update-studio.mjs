#!/usr/bin/env node
/**
 * update-studio.mjs — يحقن دفعة كاروسيلات جديدة في استوديو البطاقات.
 *
 *   node marketing/repurpose/update-studio.mjs marketing/repurpose/decks-2026-08-21.json
 *   node marketing/repurpose/update-studio.mjs <ملف> --check      # تحقّق بلا كتابة
 *
 * لماذا يوجد هذا السكربت:
 * المهمة المجدولة تنتج ملف دفعة نصياً، بينما الاستوديو يقرأ كتلة `DECKS`
 * داخل carousel-studio.html. بدون هذا السكربت يُنسخ سبعة كاروسيلات × خمس
 * بطاقات + الكابشنات يدوياً في كل أسبوع — نحو أربعين دقيقة، وأي فاصلة ناقصة
 * تعطّل الصفحة كلها.
 *
 * الاستبدال يتم بين علامتين صريحتين في الملف: DECKS:START و DECKS:END.
 * ما يُكتب بينهما هو JSON — وهو صياغة صالحة في JavaScript أيضاً، فالمتصفح
 * يقرأها بلا أي تحويل.
 *
 * بلا أي تبعية: Node وحده.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const START = "/* DECKS:START */";
const END = "/* DECKS:END */";

const TEMPLATES = ["quote", "stat", "tip"];
const THEMES = ["light", "brand", "ink"];
/** الحقل الذي لا معنى للبطاقة بدونه، لكل قالب. */
const REQUIRED = { quote: "text", stat: "value", tip: "title" };

const fail = (msg) => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

/**
 * تحقّق كامل قبل أي كتابة.
 *
 * المدخل يأتي من مخرجات نموذج لغوي، فالخطأ فيه وارد وصامت: مفتاح ناقص، أو
 * قالب غير موجود، أو بطاقة بلا نص. لو كُتب كما هو لظهر الخلل عند فتح الصفحة
 * — بعد أن يكون الملف الأصلي قد ضاع. لذا: تحقّق أولاً، ثم اكتب.
 */
function validate(decks) {
  if (!Array.isArray(decks)) fail("الجذر يجب أن يكون مصفوفة من الكاروسيلات.");
  if (decks.length === 0) fail("المصفوفة فارغة.");

  const slugs = new Set();
  decks.forEach((d, di) => {
    const at = `الكاروسيل ${di + 1}`;
    for (const key of ["slug", "title", "when", "caption"]) {
      if (typeof d[key] !== "string" || !d[key].trim())
        fail(`${at}: الحقل "${key}" مفقود أو فارغ.`);
    }
    if (!/^[a-z0-9-]+$/.test(d.slug))
      fail(`${at}: الـ slug "${d.slug}" يجب أن يكون حروفاً لاتينية صغيرة وأرقاماً وشرطات فقط.`);
    if (slugs.has(d.slug)) fail(`${at}: الـ slug "${d.slug}" مكرر.`);
    slugs.add(d.slug);

    if (!Array.isArray(d.cards) || d.cards.length === 0)
      fail(`${at}: لا توجد بطاقات.`);
    if (d.cards.length > 10)
      fail(`${at}: ${d.cards.length} بطاقة — إنستغرام يقبل 10 كحد أقصى.`);

    d.cards.forEach((c, ci) => {
      const cardAt = `${at} · البطاقة ${ci + 1}`;
      if (!TEMPLATES.includes(c.template))
        fail(`${cardAt}: قالب غير معروف "${c.template}". المتاح: ${TEMPLATES.join(" · ")}`);
      const need = REQUIRED[c.template];
      if (typeof c[need] !== "string" || !c[need].trim())
        fail(`${cardAt}: قالب ${c.template} يحتاج الحقل "${need}".`);
      if (c.theme && !THEMES.includes(c.theme))
        fail(`${cardAt}: ثيم غير معروف "${c.theme}". المتاح: ${THEMES.join(" · ")}`);
      if (c.points && !Array.isArray(c.points))
        fail(`${cardAt}: "points" يجب أن يكون مصفوفة.`);
      if (c.ratio) {
        const { filled, total } = c.ratio;
        if (!Number.isInteger(filled) || !Number.isInteger(total))
          fail(`${cardAt}: "ratio" يحتاج filled و total أعداداً صحيحة.`);
        if (total < 1 || total > 40)
          fail(`${cardAt}: ratio.total = ${total} — المدى المدعوم 1 إلى 40.`);
        if (filled < 0 || filled > total)
          fail(`${cardAt}: ratio.filled (${filled}) خارج المدى 0..${total}.`);
      }
    });
  });
}

/** أي ذكر لوسم إغلاق سكربت داخل النص يُنهي كتلة <script> في المتصفح. */
function guardScriptTag(json) {
  if (/<\/script/i.test(json))
    fail('المحتوى يحوي "</script" — احذفه، فهو يكسر الصفحة عند الحقن.');
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  // ملاحظة: indexOf يعيد -1 عند الغياب، و args[-1 + 1] هو args[0] — أي مسار
  // الـ JSON نفسه. لذا يُستبعد وسيط --html فقط حين تكون الراية موجودة فعلاً.
  const htmlFlag = args.indexOf("--html");
  const htmlValue = htmlFlag !== -1 ? args[htmlFlag + 1] : null;
  const htmlPath = path.resolve(htmlValue ?? "marketing/repurpose/carousel-studio.html");
  const jsonPath = args.find((a) => !a.startsWith("--") && a !== htmlValue);

  if (!jsonPath) {
    console.error("الاستخدام: node marketing/repurpose/update-studio.mjs <decks.json> [--check] [--html <path>]");
    process.exit(2);
  }

  let decks;
  try {
    decks = JSON.parse(await readFile(path.resolve(jsonPath), "utf8"));
  } catch (e) {
    fail(`تعذّرت قراءة ${jsonPath}: ${e.message}`);
  }

  validate(decks);

  const json = JSON.stringify(decks, null, 2);
  guardScriptTag(json);

  const cards = decks.reduce((n, d) => n + d.cards.length, 0);
  console.log(`\nتحقّق ناجح ✓  —  ${decks.length} كاروسيل · ${cards} بطاقة`);
  decks.forEach((d) => {
    const kinds = d.cards.map((c) => c.template[0]).join("");
    console.log(`  · ${d.slug.padEnd(42)} ${String(d.cards.length).padStart(2)} بطاقة  [${kinds}]  ${d.when}`);
  });

  if (check) {
    console.log("\n(--check: لم يُكتب شيء)\n");
    return;
  }

  const html = await readFile(htmlPath, "utf8");
  const from = html.indexOf(START);
  const to = html.indexOf(END);
  if (from === -1 || to === -1 || to < from)
    fail(`لم أجد العلامتين ${START} و ${END} في ${path.basename(htmlPath)}.`);

  const next =
    html.slice(0, from) +
    `${START}\nconst DECKS = ${json};\n${END}` +
    html.slice(to + END.length);

  await writeFile(htmlPath, next, "utf8");

  console.log(`\nحُدِّث ${path.relative(process.cwd(), htmlPath)} ✓`);
  console.log("افتح الملف في المتصفح واضغط «تحميل الكل».\n");
  console.log("للتراجع: git checkout -- " + path.relative(process.cwd(), htmlPath) + "\n");
}

main().catch((e) => fail(e.message));
