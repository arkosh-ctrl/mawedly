-- Mawedly migration 0002: one business per merchant (V1).
-- Enforce uniqueness on businesses.user_id at the DB level so that
-- upsert(..., onConflict: 'user_id') is well-defined. slug is already unique
-- (businesses_slug_key from the initial schema).

-- Drop the redundant non-unique index; the unique constraint creates its own.
drop index if exists businesses_user_id_idx;

alter table businesses drop constraint if exists businesses_user_id_key;
alter table businesses add constraint businesses_user_id_key unique (user_id);
