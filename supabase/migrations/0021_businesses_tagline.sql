-- Free-text merchant intro shown under the business name on the public booking
-- page (e.g. "استشاري تغذية علاجية"). Replaces the misleading fixed-category
-- badge when set. Optional; existing rows default to NULL (no badge shown).
alter table public.businesses
  add column if not exists tagline text;

-- Table-level grants already cover this new column (grants are per-table, not
-- per-column), so no additional GRANT is required for authenticated/service_role.
