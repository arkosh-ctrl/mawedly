-- Reusable email templates for the Contacts email composer. Business-scoped,
-- RLS via business ownership. Body/subject may contain {name} which the UI
-- substitutes with the contact's name when a template is applied.
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  subject text not null,
  body text not null,
  created_at timestamptz default now()
);
alter table public.email_templates enable row level security;
drop policy if exists "owner manages email_templates" on public.email_templates;
create policy "owner manages email_templates"
  on public.email_templates for all
  using (business_id in (select id from public.businesses where user_id = auth.uid()))
  with check (business_id in (select id from public.businesses where user_id = auth.uid()));
grant select, insert, update, delete on public.email_templates to authenticated;
create index if not exists email_templates_business_idx on public.email_templates (business_id);
