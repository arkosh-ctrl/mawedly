#!/usr/bin/env python3
"""Generate one cover image per article, per language.

    python3 scripts/generate-blog-covers.py

Reads every folder in content/drafts/, takes each language's title from
meta.json, and writes public/covers/<slug>-<locale>.png at 1200x630.

Why one cover PER LANGUAGE: the title is drawn into the artwork, and a title
can only be correct in one language. Migration 0029 put cover_image on
blog_post_translations for exactly this reason — the Arabic card shows Arabic
and the English card shows English, on the page and in the share preview.

Why PNG: the cover doubles as the Open Graph image and WhatsApp, LinkedIn and X
do not render SVG. A cover that looks fine on the page and shows nothing when
shared is worse than no cover.

Why a generator instead of committed art: re-run after a copy or palette change
and every cover updates. Binary assets with no source are a dead end.

Arabic shaping: Pillow is built with Raqm here, so passing direction="rtl"
gives correctly joined, right-to-left text. Without Raqm the letters would come
out disconnected and reversed — check `PIL.features.check("raqm")` before
debugging anything else.
"""

import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont, features

W, H = 1200, 630
DRAFTS = "content/drafts"
OUT = "public/covers"

CANVAS = (255, 255, 255)
INK = (17, 24, 39)
MUTED = (107, 114, 128)
PRIMARY = (0, 107, 255)
PRIMARY_SOFT = (230, 240, 255)
LINE = (229, 231, 235)
AMBER = (245, 158, 11)
AMBER_SOFT = (255, 251, 235)

# A brand Arabic face is preferred; DejaVu is the always-present fallback. Drop
# Tajawal-Bold.ttf into assets/fonts/ and every Arabic cover upgrades on the
# next run, with no code change.
AR_FONTS = [
    "assets/fonts/Tajawal-Bold.ttf",
    "assets/fonts/IBMPlexSansArabic-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
EN_FONTS = [
    "assets/fonts/Poppins-Bold.ttf",
    "/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
SMALL_EN_FONTS = [
    "/usr/share/fonts/truetype/google-fonts/Poppins-Medium.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
# The Arabic wordmark needs an Arabic face — Poppins would draw empty boxes.
SMALL_AR_FONTS = [
    "assets/fonts/Tajawal-Bold.ttf",
    "assets/fonts/IBMPlexSansArabic-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def pick(paths):
    for p in paths:
        if os.path.isfile(p):
            return p
    raise SystemExit(f"no usable font among: {paths}")


def font(paths, size):
    return ImageFont.truetype(pick(paths), size)


def wrap(draw, text, fnt, max_width, direction):
    """Greedy word wrap measured with the real font and text direction."""
    words = text.split()
    lines, current = [], ""
    for word in words:
        trial = f"{current} {word}".strip()
        w = draw.textlength(trial, font=fnt, direction=direction)
        if w <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


LEADING = 1.34


def fit(draw, text, paths, max_width, max_height, direction, max_lines=4,
        start=70, floor=38):
    """Largest size where the title fits the box in BOTH axes.

    Height matters as much as line count: four lines at 70px overflow the band
    and collide with the strip, which is how a cover ends up looking broken
    only for the one article with a long title.
    """
    size = start
    while size >= floor:
        fnt = font(paths, size)
        lines = wrap(draw, text, fnt, max_width, direction)
        if len(lines) <= max_lines and len(lines) * size * LEADING <= max_height:
            return fnt, lines, size
        size -= 3
    fnt = font(paths, floor)
    return fnt, wrap(draw, text, fnt, max_width, direction), floor


# ---------------------------------------------------------------------------
# The strip along the bottom is the same idea in every cover: solid blue is
# time that got used, the dashed amber block is time that was reserved and then
# wasted. Each article varies the pattern so the seven are distinguishable.
# ---------------------------------------------------------------------------
PATTERNS = {
    "clinic-no-show-appointments": [1, 1, 0, 2, 1, 1, 0, 1],
    "salon-last-minute-cancellations": [1, 1, 2, 2, 2, 0, 1, 1],
    "free-consultation-no-shows": [2, 1, 2, 0, 1, 2, 1, 0],
    "private-tutor-rescheduling": [1, 2, 1, 1, 0, 1, 2, 1],
    "physio-treatment-plan-attendance": [1, 1, 2, 1, 2, 0, 1, 1],
    "photographer-date-holds": [0, 1, 2, 0, 1, 1, 2, 1],
    "counselling-cancellation-policy": [1, 1, 1, 2, 1, 1, 0, 1],
}
DEFAULT_PATTERN = [1, 1, 2, 1, 0, 1, 1, 2]


def strip(d, slug, y, rtl):
    """1 = used (solid), 2 = wasted (dashed amber), 0 = free (outline)."""
    cells = PATTERNS.get(slug, DEFAULT_PATTERN)
    if rtl:
        cells = list(reversed(cells))
    x, w, h, gap = 80, 120, 56, 18
    for kind in cells:
        box = [x, y, x + w, y + h]
        if kind == 1:
            d.rounded_rectangle(box, 12, fill=PRIMARY)
        elif kind == 2:
            d.rounded_rectangle(box, 12, fill=AMBER_SOFT)
            dash(d, box, AMBER, 12)
        else:
            d.rounded_rectangle(box, 12, fill=CANVAS, outline=LINE, width=3)
        x += w + gap


def dash(d, box, colour, radius, width=4):
    x0, y0, x1, y1 = box
    step, on = 22, 12
    x = x0 + radius
    while x < x1 - radius:
        d.line([x, y0, min(x + on, x1 - radius), y0], fill=colour, width=width)
        d.line([x, y1, min(x + on, x1 - radius), y1], fill=colour, width=width)
        x += step
    y = y0 + radius
    while y < y1 - radius:
        d.line([x0, y, x0, min(y + on, y1 - radius)], fill=colour, width=width)
        d.line([x1, y, x1, min(y + on, y1 - radius)], fill=colour, width=width)
        y += step


def cover(slug, title, locale):
    rtl = locale == "ar"
    direction = "rtl" if rtl else "ltr"
    anchor_x = W - 80 if rtl else 80
    align = "right" if rtl else "left"

    img = Image.new("RGB", (W, H), CANVAS)
    d = ImageDraw.Draw(img)

    # A soft field behind the type keeps large covers from feeling empty. It
    # mirrors with the text so the composition reads the same in both scripts.
    if rtl:
        d.rounded_rectangle([W - 520, -220, W + 160, 300], 220, fill=PRIMARY_SOFT)
    else:
        d.rounded_rectangle([-160, -220, 520, 300], 220, fill=PRIMARY_SOFT)

    small = font(SMALL_AR_FONTS if rtl else SMALL_EN_FONTS, 26)
    label = "موعدلي" if rtl else "mawedly.com"
    d.ellipse([anchor_x - (18 if rtl else 0), 74, anchor_x + (0 if rtl else 18), 92], fill=PRIMARY)
    d.text(
        (anchor_x - 30 if rtl else anchor_x + 30, 68),
        label,
        font=small,
        fill=PRIMARY,
        direction=direction,
        anchor="ra" if rtl else "la",
    )

    # Amber rule as an eyebrow above the type: fixed position, so it can never
    # collide with a title that turned out longer than expected.
    if rtl:
        d.rounded_rectangle([W - 80 - 96, 138, W - 80, 146], 4, fill=AMBER)
    else:
        d.rounded_rectangle([80, 138, 80 + 96, 146], 4, fill=AMBER)

    BAND_TOP, BAND_BOTTOM = 186, 462
    fnt, lines, size = fit(
        d, title, AR_FONTS if rtl else EN_FONTS,
        max_width=W - 160, max_height=BAND_BOTTOM - BAND_TOP, direction=direction,
    )

    leading = int(size * LEADING)
    block = leading * len(lines)
    y = BAND_TOP + max(0, ((BAND_BOTTOM - BAND_TOP) - block) // 2)
    for ln in lines:
        d.text((anchor_x, y), ln, font=fnt, fill=INK, direction=direction,
               anchor="ra" if rtl else "la", align=align)
        y += leading

    strip(d, slug, 500, rtl)

    img.save(f"{OUT}/{slug}-{locale}.png", optimize=True)
    print(f"wrote {OUT}/{slug}-{locale}.png  ({size}px, {len(lines)} lines)")


def main():
    if not features.check("raqm"):
        sys.exit("Pillow has no Raqm support — Arabic would render unshaped. Aborting.")
    os.makedirs(OUT, exist_ok=True)
    for slug in sorted(os.listdir(DRAFTS)):
        meta_path = os.path.join(DRAFTS, slug, "meta.json")
        if not os.path.isfile(meta_path):
            continue
        meta = json.load(open(meta_path, encoding="utf-8"))
        for locale in ("ar", "en"):
            cover(meta["slug"], meta[locale]["title"], locale)


if __name__ == "__main__":
    main()
