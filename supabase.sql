-- Backend já aplicado no projeto Supabase fruit-seas.
create table if not exists public.fruit_seas_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Aventureiro',
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint fruit_seas_display_name_len check (char_length(display_name) between 3 and 20)
);
alter table public.fruit_seas_saves enable row level security;
grant select, insert, update on public.fruit_seas_saves to authenticated;
create policy "fruit_seas_select_own_save" on public.fruit_seas_saves for select to authenticated using ((select auth.uid())=user_id);
create policy "fruit_seas_insert_own_save" on public.fruit_seas_saves for insert to authenticated with check ((select auth.uid())=user_id);
create policy "fruit_seas_update_own_save" on public.fruit_seas_saves for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
