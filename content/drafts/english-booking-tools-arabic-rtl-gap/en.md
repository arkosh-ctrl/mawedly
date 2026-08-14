"90%+ of our userbase is Arabic speaking, and we're paying for a booking tool that doesn't show a single Arabic character in the calendar itself." That is not a hypothetical complaint. It is close to a direct quote from a post a business owner published on Calendly's community forum on October 22, 2025, explaining that while the event name and description appear in Arabic, the "Select a Day" title, the calendar's month and weekday names, the time-selection flow, the event details, and even the final confirmation page all stay in English without exception. The community manager, David, replied the same day: thanked them for the detailed feedback, promised to pass it to the product team, but gave no timeline for Arabic support specifically.

This article is not an attack on one specific tool. It is an explanation of why RTL is not a cosmetic detail — it is a whole structure that either works or breaks.

The irony is that most of these tools clearly market themselves as "multi-language" or "built for global use," and that's technically true — you can change some of the text. But "language support" and "building the direction in from the ground up" are entirely different things, and that gap is exactly what never shows up on a marketing page.

## RTL is not just "flip the direction"

The common assumption is that Arabic support simply means mirroring text from left to right. The reality is far more complex: month and weekday names need full translation, not mirroring; input fields need correct alignment for labels and buttons; directional icons (a "next" arrow, for instance) need to flip too; and Arabic text itself runs roughly 20-30% longer than its English equivalent, which means any layout built with fixed English measurements will visually break once Arabic is added.

In other words: a tool built for English first does not become Arabic by translating the text alone. It needs the direction rebuilt at the level of every single design element — a significant engineering investment no company makes "by the way."

## The problem repeats beyond Calendly

This is not a single-tool issue. The open-source booking tool Cal.com's repository carries an [open feature request](https://github.com/calcom/cal.diy/issues/21889) for RTL support for Arabic and Hebrew — not closed with a full fix as of this writing. The pattern is clear: major booking tools were built for an English-first market originally, and Arabic support stays a pending feature request, not an implemented priority.

## Where the layout specifically breaks for an Arabic-reading client

- **A booking page that feels "translated" rather than "Arabic."** A mix of Arabic text here and English there signals to the client that they are in a second-class experience, even if they understand every word.
- **A calendar with English months and weekdays inside an Arabic page.** A small detail, but it is the first thing a client sees when picking a time — and the first impression that sticks.
- **Buttons and motion only partially mirrored.** A "next" button that moves the wrong direction makes navigation unintuitive for a client used to reading the screen right to left.

## Why this matters commercially, not just aesthetically

A client facing a confusing booking page hesitates more before completing the booking, or abandons it midway. This is not opinion; as covered in [the article on a single booking page](/en/blog/one-booking-page-not-many-chats), every added friction point in a booking flow reduces completion rate. A page that feels like it was not designed for you in the first place is a different kind of friction: psychological, not just functional.

## A quick test checklist before subscribing to any tool

Don't just trust an "Arabic supported" label on the tool's website. Open a free trial, and test yourself:

1. **The calendar itself** — are the month and weekday names genuinely Arabic, or English inside an Arabic frame?
2. **The time-selection flow** — does it move right to left naturally, or does it feel partially mirrored?
3. **Data entry fields** — are labels and buttons correctly aligned, or left-aligned despite Arabic text?
4. **The final confirmation message** — as the Calendly complaint documented, this specific screen is often forgotten and stays fully English.

If a tool fails two or more of these four, that's not a minor detail you'll fix later — it's a sign Arabic was never a design priority to begin with.

## The impact on search visibility too

The RTL gap isn't just a user-experience problem; it also affects visibility in Arabic search results. A booking page that's half English confuses search engines about the content's actual language, and may rank weaker for Arabic search queries compared to a page that's genuinely Arabic at the code level, not just in visible translation. That means the RTL gap costs you twice: a weaker experience for the client who already arrived, and a weaker chance of a new client finding you through search in the first place.

## The gap repeats in small details that are easy to overlook

Even after the big issues get fixed — the calendar, the booking flow — smaller details still reveal the tool's non-Arabic origin: error messages that suddenly appear in English when invalid data is entered, or "loading" text that never gets translated because it's coded separately from the rest of the interface. These small details accumulate into the same impression the big mistake creates: that Arabic is a bolted-on addition, not a genuine part of the design.

## This doesn't mean every global tool is necessarily bad

Fairness requires saying that some major global tools may improve their Arabic support in the future — the documented feature requests here might get resolved one day, as Calendly's community manager promised to pass the feedback to the product team. But today's decision needs to be based on the actual current state, not a future promise with no defined timeline.

## Where Mawedly fits

[Mawedly](/en) is built Arabic-first, not translated after the fact. Arabic is the default language, with full RTL alignment at the design level — buttons, icons, motion direction, and a calendar with genuine Arabic month and weekday names, not English "left in for now." English is also available with full LTR alignment for anyone who prefers it, with a clear language toggle.

You can [start free](/en/pricing) and try a booking page built Arabic-first from the ground up.

---

**Start here:** open your current booking page on your phone, and count how many elements are still in English despite the rest of the page being Arabic. That number alone tells you the size of the gap your client sees every day.
