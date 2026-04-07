-- Allow families to opt into displaying full names when surnames differ (e.g. spouses).
alter table public.families
add column if not exists different_last_names boolean not null default false;
