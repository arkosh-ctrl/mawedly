#!/usr/bin/env python3
"""Generate the site-wide Open Graph card, one per language.

    python3 scripts/generate-og.py

Writes public/og-ar.png and public/og-en.png at 1200x630 — the image every
page's og:image and twitter:image points at (src/lib/seo/metadata.ts).

WHY A COMMITTED PNG AND NOT next/og
ImageResponse from next/og is powered by satori, which has no RTL support and
no complex-script shaping. Arabic comes out as unjoined, isolated letters in
the wrong order, and feeding it a real Arabic font can fail the build outright
inside opentype.js ("lookupType: 5 - substFormat: 3 is not yet supported" —
that is opentype.js refusing the contextual-substitution tables Arabic needs to
join letters). The brand card changes roughly never, so a pre-rendered file is
both correct and cheaper.

Pillow shapes Arabic correctly ONLY when built with Raqm (HarfBuzz + FriBiDi).
This asserts it below rather than silently writing a broken card: with Raqm
missing the output looks wrong in a way that is easy to miss until someone
shares a link.

FONT FALLBACK IS NOT A THING HERE
Pillow does no font fallback. A Latin word inside an Arabic line renders as
tofu boxes, so every line below is drawn single-script with its matching face.
Same convention as scripts/generate-blog-covers.py: drop a brand face into
assets/fonts/ and both cards upgrade on the next run, with no code change.
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont, features

W, H = 1200, 630
OUT = "public"

# Palette lifted from src/app/globals.css so the card cannot drift from the UI.
CANVAS = (255, 255, 255)
INK = (17, 24, 39)          # --color-ink
MUTED = (107, 114, 128)     # --color-muted
PRIMARY = (0, 107, 255)     # --color-primary
PRIMARY_DEEP = (0, 82, 204) # --color-primary-hover
PRIMARY_SOFT = (230, 240, 255)  # --color-primary-light
LINE = (229, 231, 235)      # --color-line

AR_FONTS = [
    "assets/fonts/IBMPlexSansArabic-Bold.ttf",
    "assets/fonts/Tajawal-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
AR_FONTS_REG = [
    "assets/fonts/IBMPlexSansArabic-Regular.ttf",
    "assets/fonts/Tajawal-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
EN_FONTS = [
    "assets/fonts/IBMPlexSans-Bold.ttf",
    "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
EN_FONTS_REG = [
    "assets/fonts/IBMPlexSans-Regular.ttf",
    "/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]

COPY = {
    "ar": {
        "headline": "رابط حجز ذكي لوقتك",
        "sub": "يختار عميلك وقتاً متاحاً فعلاً، ويصلك إشعار فوري.",
        "wordmark": "موعدلي",
    },
    "en": {
        "headline": "A smart booking link for your time",
        "sub": "Your customer picks a genuinely open slot. You get notified instantly.",
        "wordmark": "Mawedly",
    },
}
DOMAIN = "mawedly.com"  # Latin in both cards — always drawn with a Latin face.


def pick(paths):
    for p in paths:
        if os.path.isfile(p):
            return p
    raise SystemExit(f"no usable font among: {paths}")


def font(paths, size):
    return ImageFont.truetype(pick(paths), size)


def wrap(draw, text, fnt, max_width, direction):
    """Greedy word wrap measured with the real font AND the real direction."""
    words, lines, current = text.split(), [], ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=fnt, direction=direction) <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def fit(draw, text, paths, max_width, max_lines, start, floor, direction):
    """Largest size at which the text still fits the box in both axes."""
    size = start
    while size >= floor:
        fnt = font(paths, size)
        lines = wrap(draw, text, fnt, max_width, direction)
        if len(lines) <= max_lines:
            return fnt, lines
        size -= 3
    fnt = font(paths, floor)
    return fnt, wrap(draw, text, fnt, max_width, direction)


def app_tile(d, cx, cy, size):
    """The Mawedly mark, redrawn from src/app/icon.svg at arbitrary scale.

    Redrawn rather than rasterised because the sandbox has no SVG renderer, and
    a second copy of the artwork is cheaper than a second dependency. Geometry
    is the 512-unit viewBox scaled by k.
    """
    k = size / 512.0
    x0, y0 = cx - size / 2, cy - size / 2

    def p(*vals):
        return [x0 + vals[0] * k, y0 + vals[1] * k, x0 + vals[2] * k, y0 + vals[3] * k]

    # Rounded blue tile. Pillow has no gradient fill, so the deep end of the
    # brand ramp is approximated with a band behind the flat primary.
    d.rounded_rectangle(p(0, 0, 512, 512), radius=120 * k, fill=PRIMARY_DEEP)
    d.rounded_rectangle(p(0, 0, 512, 470), radius=120 * k, fill=PRIMARY)

    white55 = (255, 255, 255)
    # The day card + its header band.
    d.rounded_rectangle(p(128, 132, 384, 380), radius=40 * k,
                        outline=white55, width=max(2, int(20 * k)))
    d.rounded_rectangle(p(128, 132, 384, 200), radius=40 * k, fill=white55)
    d.rectangle(p(128, 172, 384, 192), fill=white55)
    # Binding pegs.
    d.rounded_rectangle(p(188, 104, 208, 156), radius=10 * k, fill=(255, 255, 255))
    d.rounded_rectangle(p(304, 104, 324, 156), radius=10 * k, fill=(255, 255, 255))
    # The signature: a confirmed slot locked in.
    d.line(
        [x0 + 196 * k, y0 + 268 * k, x0 + 240 * k, y0 + 314 * k,
         x0 + 326 * k, y0 + 210 * k],
        fill=(255, 255, 255), width=max(3, int(34 * k)), joint="curve",
    )
    d.ellipse(p(344, 336, 376, 368), fill=(255, 255, 255))


def card(locale):
    rtl = locale == "ar"
    direction = "rtl" if rtl else "ltr"
    copy = COPY[locale]

    img = Image.new("RGB", (W, H), CANVAS)
    d = ImageDraw.Draw(img)

    # Soft brand field on the side the text flows FROM, so the composition
    # reads identically in both scripts instead of mirroring into imbalance.
    if rtl:
        d.rounded_rectangle([W - 560, -260, W + 200, 260], 240, fill=PRIMARY_SOFT)
    else:
        d.rounded_rectangle([-200, -260, 560, 260], 240, fill=PRIMARY_SOFT)

    # Bottom rule in brand blue — a flat, printable edge for the card.
    d.rectangle([0, H - 14, W, H], fill=PRIMARY)

    margin = 80
    anchor_x = W - margin if rtl else margin
    anchor = "ra" if rtl else "la"
    text_width = W - margin * 2 - 190  # leave room for the tile

    # --- Wordmark row: mark + brand name, single-script ---
    tile = 84
    tile_cx = (W - margin - tile / 2) if rtl else (margin + tile / 2)
    app_tile(d, tile_cx, 92, tile)

    mark_font = font(AR_FONTS if rtl else EN_FONTS, 40)
    mark_x = (W - margin - tile - 22) if rtl else (margin + tile + 22)
    d.text((mark_x, 70), copy["wordmark"], font=mark_font, fill=INK,
           direction=direction, anchor=anchor)

    # --- Headline ---
    head_font, head_lines = fit(
        d, copy["headline"], AR_FONTS if rtl else EN_FONTS,
        text_width, max_lines=2, start=82, floor=54, direction=direction,
    )
    y = 250
    for line in head_lines:
        d.text((anchor_x, y), line, font=head_font, fill=INK,
               direction=direction, anchor=anchor)
        y += int(head_font.size * 1.28)

    # --- Sub ---
    sub_font, sub_lines = fit(
        d, copy["sub"], AR_FONTS_REG if rtl else EN_FONTS_REG,
        text_width, max_lines=2, start=34, floor=26, direction=direction,
    )
    y += 18
    for line in sub_lines:
        d.text((anchor_x, y), line, font=sub_font, fill=MUTED,
               direction=direction, anchor=anchor)
        y += int(sub_font.size * 1.4)

    # --- Domain, always Latin, always LTR, on the opposite edge ---
    dom_font = font(EN_FONTS_REG, 28)
    d.text(
        (margin if rtl else W - margin, H - 88),
        DOMAIN, font=dom_font, fill=PRIMARY,
        direction="ltr", anchor="la" if rtl else "ra",
    )

    path = os.path.join(OUT, f"og-{locale}.png")
    img.save(path, "PNG", optimize=True)
    print(f"wrote {path}  ({os.path.getsize(path) // 1024} KB)")


if __name__ == "__main__":
    if not features.check("raqm"):
        sys.exit(
            "Pillow is not built with Raqm — Arabic would render as unjoined, "
            "reversed letters. Refusing to write a broken card.\n"
            "Check with: python3 -c \"from PIL import features; "
            "print(features.check('raqm'))\""
        )
    os.makedirs(OUT, exist_ok=True)
    for loc in ("ar", "en"):
        card(loc)
