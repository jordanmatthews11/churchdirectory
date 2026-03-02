-- Families table
create table public.families (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  mailing_address text,
  city text,
  state text,
  zip text,
  photo_url text,
  notes text,
  created_at timestamptz default now() not null
);

-- Members table
create table public.members (
  id uuid default gen_random_uuid() primary key,
  family_id uuid references public.families(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  role text not null default 'other' check (role in ('head', 'spouse', 'child', 'other')),
  bio text,
  member_since date,
  phone text,
  email text,
  photo_url text,
  created_at timestamptz default now() not null
);

-- Indexes
create index members_family_id_idx on public.members(family_id);
create index families_name_idx on public.families(name);

-- Row Level Security
alter table public.families enable row level security;
alter table public.members enable row level security;

-- Policies: only authenticated users (admins) can read/write
create policy "Authenticated users can read families"
  on public.families for select
  to authenticated
  using (true);

create policy "Authenticated users can insert families"
  on public.families for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update families"
  on public.families for update
  to authenticated
  using (true);

create policy "Authenticated users can delete families"
  on public.families for delete
  to authenticated
  using (true);

create policy "Authenticated users can read members"
  on public.members for select
  to authenticated
  using (true);

create policy "Authenticated users can insert members"
  on public.members for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update members"
  on public.members for update
  to authenticated
  using (true);

create policy "Authenticated users can delete members"
  on public.members for delete
  to authenticated
  using (true);

-- Storage buckets (run after enabling storage in Supabase dashboard)
-- insert into storage.buckets (id, name, public) values ('family-photos', 'family-photos', false);
-- insert into storage.buckets (id, name, public) values ('member-photos', 'member-photos', false);
