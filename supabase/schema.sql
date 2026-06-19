create table if not exists public.recipes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  notes text not null default '',
  ingredients text not null default '',
  steps jsonb not null default '[]'::jsonb,
  reflection text not null default '',
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

drop policy if exists "Users can read own recipes" on public.recipes;
create policy "Users can read own recipes"
on public.recipes for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own recipes" on public.recipes;
create policy "Users can insert own recipes"
on public.recipes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own recipes" on public.recipes;
create policy "Users can update own recipes"
on public.recipes for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own recipes" on public.recipes;
create policy "Users can delete own recipes"
on public.recipes for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'recipe-photos',
  'recipe-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own recipe photos" on storage.objects;
create policy "Users can read own recipe photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload own recipe photos" on storage.objects;
create policy "Users can upload own recipe photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own recipe photos" on storage.objects;
create policy "Users can update own recipe photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own recipe photos" on storage.objects;
create policy "Users can delete own recipe photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'recipe-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
