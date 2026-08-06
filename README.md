# Mawedly 

Bilingual (ar/en) appointment scheduling for Gulf businesses — salons, tutors,
consultants, coaches and professional firms. A scheduling tool only: Mawedly
never handles money. Payment happens directly between provider and customer.
Domain: mawedly.com (canonical host is **www**).

## Required dashboard setup

Two things live outside the repo and fail SILENTLY when missing — nothing in the
app errors, the data simply never arrives.

1. **Vercel Web Analytics must be enabled for the project.**
   `src/components/analytics/web-analytics.tsx` loads Vercel's own
   `/_vercel/insights/script.js` (no npm package), and fires a custom
   `ai_referral_*` event when a visit arrives from ChatGPT, Perplexity, Claude,
   Gemini or Copilot. Until Web Analytics is turned on in the Vercel dashboard
   that script 404s and no answer-engine traffic is ever recorded — and a
   baseline you did not capture cannot be reconstructed later.
2. **`NEXT_PUBLIC_APP_URL` must be the www origin.** The apex 308s to www; if
   this is unset or set to the apex, every canonical, hreflang and sitemap URL
   points at a redirect.

## AI crawlers

`src/app/robots.ts` names GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot,
Claude-SearchBot, Google-Extended and Applebot-Extended explicitly, allowed.
Being cited inside AI answers is a goal here. **robots.txt is not the only
place this can be undone** — a CDN or WAF rule blocking those user agents
overrides it and is invisible from inside the app.

> **Reference:** `docs/mawedly-master-spec-final.md` is the single source of truth
> (Schema V3.2, RLS, i18n). Do not use any schema from memory.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · next-intl v4 · Supabase
(@supabase/ssr) · pnpm. (Resend, react-hook-form/zod, and Shadcn UI are added in
later week-1 steps.)

## Week 1 — Step 1 (done)

Project scaffold + internationalization + fonts:

- next-intl routing with `/ar` (default, RTL) and `/en` (LTR); `dir` switches per locale.
- Tailwind v4 (CSS-first, no `tailwind.config`); use logical utilities (`ps`/`pe`, `start`/`end`).
- Fonts: IBM Plex Sans Arabic (Arabic) + IBM Plex Sans (Latin) via `next/font`.
- All UI text lives in `messages/ar.json` and `messages/en.json` — no hardcoded strings.
- Visible language switcher.

## Week 1 — Step 2 (done)

Supabase client + Magic Link auth + database (Schema V3.2) + RLS + Storage:

- `@supabase/ssr` clients for browser, server, and middleware.
- Composed middleware: next-intl locale routing **then** Supabase session refresh
  (`getClaims()`), protecting `/(ar|en)/dashboard/*` and leaving `/[locale]/[slug]` public.
- Passwordless Magic Link login (`/[locale]/login`) with a `/auth/confirm` callback.
- Protected dashboard shell at `/[locale]/dashboard`.
- Full SQL setup at `supabase/migrations/0001_init_schema_v3_2.sql`.

### One-time Supabase setup

1. **Env:** copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`
   and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).
2. **Database:** open the Supabase **SQL Editor**, paste the entire contents of
   `supabase/migrations/0001_init_schema_v3_2.sql`, and run it once. It creates all
   tables, the end-time trigger, every RLS policy, and the private `bank-qrs` /
   `deposits` buckets.
3. **Auth redirect URLs:** Authentication → URL Configuration → add
   `http://localhost:3000/**` (and your production URL) to **Redirect URLs**.
4. (Optional) To use the `token_hash` flow instead of the default PKCE `code`
   flow, edit the Magic Link email template to point to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. The
   default template works as-is via `?code` — no template edit required.

## Getting started

```bash
pnpm install
pnpm dev      # http://localhost:3000  ->  redirects to /ar
```

Verify:

```bash
pnpm lint
pnpm build
```

Then open `/ar` (should render `dir="rtl"`, Arabic font, side border on the right)
and `/en` (should render `dir="ltr"`, side border on the left). Visiting
`/ar/dashboard` while signed out should redirect to `/ar/login`; after a Magic
Link sign-in it should render the dashboard.

## Structure

```
docs/mawedly-master-spec-final.md   # spec (single source of truth)
messages/{ar,en}.json               # translation catalogs
supabase/migrations/0001_init_schema_v3_2.sql
src/
  middleware.ts                     # i18n + Supabase session/protection
  i18n/{routing,navigation,request}.ts
  lib/supabase/{client,server,middleware}.ts + database.types.ts
  app/[locale]/{layout,page}.tsx    # html lang+dir, fonts, provider
  app/[locale]/login/              # magic link page + form + action
  app/[locale]/dashboard/          # protected layout + page + signout
  app/auth/confirm/route.ts        # auth callback (code / token_hash)
  app/globals.css                   # Tailwind v4 + font stack
  components/locale-switcher.tsx
```
