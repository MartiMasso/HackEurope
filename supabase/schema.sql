-- Paperwork OS schema + RLS + storage policies
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  filename text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value text not null default '',
  confidence real,
  source_document_id uuid references public.documents (id) on delete set null,
  source_page integer,
  updated_at timestamptz not null default now()
);

create table if not exists public.packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_type text not null,
  status text not null,
  pdf_storage_path text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists fields_user_key_unique on public.fields (user_id, key);
create index if not exists documents_user_created_idx on public.documents (user_id, created_at desc);
create index if not exists packs_user_created_idx on public.packs (user_id, created_at desc);

alter table public.documents enable row level security;
alter table public.fields enable row level security;
alter table public.packs enable row level security;

drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own"
on public.documents
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own"
on public.documents
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own"
on public.documents
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own"
on public.documents
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "fields_select_own" on public.fields;
create policy "fields_select_own"
on public.fields
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "fields_insert_own" on public.fields;
create policy "fields_insert_own"
on public.fields
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "fields_update_own" on public.fields;
create policy "fields_update_own"
on public.fields
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "fields_delete_own" on public.fields;
create policy "fields_delete_own"
on public.fields
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "packs_select_own" on public.packs;
create policy "packs_select_own"
on public.packs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "packs_insert_own" on public.packs;
create policy "packs_insert_own"
on public.packs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "packs_update_own" on public.packs;
create policy "packs_update_own"
on public.packs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "packs_delete_own" on public.packs;
create policy "packs_delete_own"
on public.packs
for delete
to authenticated
using (auth.uid() = user_id);

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('packs', 'packs', false)
on conflict (id) do nothing;

-- Storage policies (user owns objects under <uid>/...)
drop policy if exists "vault_select_own" on storage.objects;
create policy "vault_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vault'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "vault_insert_own" on storage.objects;
create policy "vault_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vault'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "vault_update_own" on storage.objects;
create policy "vault_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vault'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'vault'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "vault_delete_own" on storage.objects;
create policy "vault_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vault'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "packs_select_own_objects" on storage.objects;
create policy "packs_select_own_objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'packs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "packs_insert_own_objects" on storage.objects;
create policy "packs_insert_own_objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'packs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "packs_update_own_objects" on storage.objects;
create policy "packs_update_own_objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'packs'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'packs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "packs_delete_own_objects" on storage.objects;
create policy "packs_delete_own_objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'packs'
  and auth.uid()::text = (storage.foldername(name))[1]
);
