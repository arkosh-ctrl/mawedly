#!/usr/bin/env python3
"""Generate the blog cover images.

    python3 scripts/generate-blog-covers.py

Writes 1200x630 PNGs into public/covers/, one per article.

Why PNG and not SVG: the cover doubles as the Open Graph image, and WhatsApp,
LinkedIn and X do not render SVG previews. A cover that looks fine on the page
but shows nothing when shared is worse than no cover.

Why no text in the artwork: cover_image lives on blog_posts, not on a
translation, so ONE image serves both the Arabic and the English article. Any
wording baked into the picture would be wrong in one of the two languages.

Why a generator instead of committed art: a binary asset with no source is a
dead end. Re-run this after a palette change and every cover updates.

Each cover states the article's problem geometrically: solid blue marks time
that was actually used, a hollow amber outline marks time that was reserved and
then wasted. That single visual grammar is shared across all seven.
"""

from PIL import Image, ImageDraw

W, H = 1200, 630
S = 2  # supersampling factor — PIL does not antialias shapes, so draw big and shrink

CANVAS = (249, 250, 251)
INK = (17, 24, 39)
PRIMARY = (0, 107, 255)
PRIMARY_SOFT = (230, 240, 255)
LINE = (229, 231, 235)
AMBER = (245, 158, 11)
AMBER_SOFT = (255, 251, 235)
MUTED = (156, 163, 175)

OUT = "public/covers"


def canvas():
    img = Image.new("RGB", (W * S, H * S), CANVAS)
    return img, ImageDraw.Draw(img)


def rr(d, box, radius, fill=None, outline=None, width=3, dash=False):
    """Rounded rectangle in supersampled space. `dash` fakes a dashed outline."""
    x0, y0, x1, y1 = [v * S for v in box]
    r = radius * S
    if not dash:
        d.rounded_rectangle([x0, y0, x1, y1], r, fill=fill, outline=outline, width=width * S)
        return
    d.rounded_rectangle([x0, y0, x1, y1], r, fill=fill)
    step, on = 14 * S, 8 * S
    x = x0
    while x < x1:
        d.line([x, y0, min(x + on, x1), y0], fill=outline, width=width * S)
        d.line([x, y1, min(x + on, x1), y1], fill=outline, width=width * S)
        x += step
    y = y0
    while y < y1:
        d.line([x0, y, x0, min(y + on, y1)], fill=outline, width=width * S)
        d.line([x1, y, x1, min(y + on, y1)], fill=outline, width=width * S)
        y += step


def circle(d, cx, cy, r, fill=None, outline=None, width=3):
    box = [(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S]
    d.ellipse(box, fill=fill, outline=outline, width=width * S)


def line(d, x0, y0, x1, y1, fill, width=3):
    d.line([x0 * S, y0 * S, x1 * S, y1 * S], fill=fill, width=width * S)


def brandmark(d):
    """Small consistent signature bottom-left: a filled dot and a short rule."""
    circle(d, 72, H - 66, 9, fill=PRIMARY)
    rr(d, (96, H - 70, 168, H - 62), 4, fill=INK)


def save(img, name):
    img.resize((W, H), Image.LANCZOS).save(f"{OUT}/{name}.png", optimize=True)
    print(f"wrote {OUT}/{name}.png")


# ---------------------------------------------------------------------------
# 1. Clinic — a week of booked slots with one hollow gap: the empty chair.
# ---------------------------------------------------------------------------
def clinic():
    img, d = canvas()
    cols, rows = 6, 4
    x0, y0, cw, ch, gap = 150, 120, 140, 78, 20
    hole = (3, 1)
    for r in range(rows):
        for c in range(cols):
            x = x0 + c * (cw + gap)
            y = y0 + r * (ch + gap)
            if (c, r) == hole:
                rr(d, (x, y, x + cw, y + ch), 12, fill=AMBER_SOFT, outline=AMBER, width=4, dash=True)
            else:
                shade = PRIMARY if (r + c) % 3 else PRIMARY_SOFT
                rr(d, (x, y, x + cw, y + ch), 12, fill=shade)
    brandmark(d)
    save(img, "clinic-no-show-appointments")


# ---------------------------------------------------------------------------
# 2. Salon — short bars refill easily; the one long bar cannot. It is hollow.
# ---------------------------------------------------------------------------
def salon():
    img, d = canvas()
    y = 130
    widths = [220, 300, 260]
    for w in widths:
        rr(d, (150, y, 150 + w, y + 62), 12, fill=PRIMARY)
        y += 86
    rr(d, (150, y, 1050, y + 62), 12, fill=AMBER_SOFT, outline=AMBER, width=4, dash=True)
    y += 86
    for w in [240, 200]:
        rr(d, (150, y, 150 + w, y + 62), 12, fill=PRIMARY_SOFT)
        y += 86
    brandmark(d)
    save(img, "salon-last-minute-cancellations")


# ---------------------------------------------------------------------------
# 3. Consulting — three booked calls, one attended. Two are hollow outlines.
# ---------------------------------------------------------------------------
def consulting():
    img, d = canvas()
    for i, cx in enumerate([340, 600, 860]):
        if i == 1:
            circle(d, cx, 300, 108, fill=PRIMARY)
            circle(d, cx, 300, 42, fill=CANVAS)
        else:
            circle(d, cx, 300, 108, fill=AMBER_SOFT, outline=AMBER, width=5)
    rr(d, (340, 470, 860, 480), 5, fill=LINE)
    rr(d, (492, 470, 708, 480), 5, fill=PRIMARY)
    brandmark(d)
    save(img, "free-consultation-no-shows")


# ---------------------------------------------------------------------------
# 4. Tutoring — one moved lesson pushes the rest of the week sideways.
# ---------------------------------------------------------------------------
def tutoring():
    img, d = canvas()
    top, bottom = 170, 400
    for i in range(5):
        x = 170 + i * 175
        rr(d, (x, top, x + 130, top + 74), 12, fill=PRIMARY_SOFT)
    for i in range(5):
        x = 170 + i * 175 + (0 if i == 0 else 60)
        fill = AMBER_SOFT if i == 1 else PRIMARY
        outline = AMBER if i == 1 else None
        rr(d, (x, bottom, x + 130, bottom + 74), 12, fill=fill, outline=outline,
           width=4, dash=(i == 1))
    for i in range(1, 5):
        x = 170 + i * 175 + 130
        line(d, x + 6, top + 118, x + 52, top + 118, MUTED, 4)
        line(d, x + 40, top + 106, x + 54, top + 118, MUTED, 4)
        line(d, x + 40, top + 130, x + 54, top + 118, MUTED, 4)
    brandmark(d)
    save(img, "private-tutor-rescheduling")


# ---------------------------------------------------------------------------
# 5. Physio — a plan is a chain. Missed sessions break the line.
# ---------------------------------------------------------------------------
def physio():
    img, d = canvas()
    y = 315
    xs = [150 + i * 100 for i in range(10)]
    missed = {4, 5, 8}
    for i in range(9):
        colour = LINE if (i in missed or i + 1 in missed) else PRIMARY
        line(d, xs[i], y, xs[i + 1], y, colour, 8)
    for i, x in enumerate(xs):
        if i in missed:
            circle(d, x, y, 30, fill=AMBER_SOFT, outline=AMBER, width=5)
        else:
            circle(d, x, y, 30, fill=PRIMARY)
    brandmark(d)
    save(img, "physio-treatment-plan-attendance")


# ---------------------------------------------------------------------------
# 6. Photography — a month of dates; a few held but never confirmed.
# ---------------------------------------------------------------------------
def photography():
    img, d = canvas()
    cols, rows = 7, 4
    x0, y0, c, gap = 195, 130, 100, 18
    held = {(5, 0), (2, 2), (6, 3)}
    booked = {(5, 1), (1, 1), (5, 2)}
    for r in range(rows):
        for col in range(cols):
            x = x0 + col * (c + gap)
            y = y0 + r * (c + gap)
            if (col, r) in held:
                rr(d, (x, y, x + c, y + c), 14, fill=AMBER_SOFT, outline=AMBER, width=4, dash=True)
            elif (col, r) in booked:
                rr(d, (x, y, x + c, y + c), 14, fill=PRIMARY)
            else:
                rr(d, (x, y, x + c, y + c), 14, fill=CANVAS, outline=LINE, width=3)
    brandmark(d)
    save(img, "photographer-date-holds")


# ---------------------------------------------------------------------------
# 7. Counselling — a steady frame around a repeating, equal session.
# ---------------------------------------------------------------------------
def counselling():
    img, d = canvas()
    rr(d, (150, 110, 1050, 520), 28, fill=None, outline=PRIMARY, width=6)
    rr(d, (196, 156, 1004, 474), 20, fill=PRIMARY_SOFT)
    y = 210
    for i in range(4):
        fill = AMBER_SOFT if i == 2 else PRIMARY
        outline = AMBER if i == 2 else None
        rr(d, (250, y, 950, y + 46), 10, fill=fill, outline=outline, width=4, dash=(i == 2))
        y += 66
    brandmark(d)
    save(img, "counselling-cancellation-policy")


if __name__ == "__main__":
    for fn in (clinic, salon, consulting, tutoring, physio, photography, counselling):
        fn()
