-- Directory booklet settings (cover/title assets + intro text)

-- Table
create table public.directory_settings (
  id uuid default gen_random_uuid() primary key,
  cover_image_url text,
  title_image_url text,
  intro_text text not null default '',
  date_label text not null default '',
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table public.directory_settings enable row level security;

create policy "Authenticated users can read directory_settings"
  on public.directory_settings for select
  to authenticated
  using (true);

create policy "Authenticated users can update directory_settings"
  on public.directory_settings for update
  to authenticated
  using (true);

create policy "Authenticated users can insert directory_settings"
  on public.directory_settings for insert
  to authenticated
  with check (true);

-- Seed a single settings row (new directories start with this content)
insert into public.directory_settings (intro_text, date_label)
values (
  'God gathers us not as individuals, but as a body joined together by His grace. As a church, we desire to be a community where no one walks alone; where each person is known, loved and seen.

This directory is a simple tool to help us live that out more faithfully. It exists to foster connection and help us call one another by name as we celebrate life together, bear one another''s burdens and grow together in the life of the church.

Jesus doesn''t value anonymity. He knows his people, calls them by name, and calls us as his church to carry out this mission as well. May this simple tool help you in that way to see others, pray for others (consider keeping this directory with your Bible and using it to pray for others in the church), and to welcome one another as Christ has welcomed you!',
  'April 2026'
);

-- Storage bucket (public)
-- Note: storage policies for uploads are typically managed in the Supabase dashboard.
-- This insert requires Supabase Storage to already be enabled.
insert into storage.buckets (id, name, public)
values ('directory-assets', 'directory-assets', true)
on conflict (id) do nothing;

