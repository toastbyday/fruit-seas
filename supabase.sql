-- Fruit Seas Online - Supabase setup
create table if not exists public.fruit_seas_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Aventureiro',
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint fruit_seas_display_name_len check (char_length(display_name) between 3 and 20)
);

alter table public.fruit_seas_saves enable row level security;
grant select, insert, update on public.fruit_seas_saves to authenticated;

drop policy if exists "fruit_seas_select_own_save" on public.fruit_seas_saves;
create policy "fruit_seas_select_own_save"
on public.fruit_seas_saves for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "fruit_seas_insert_own_save" on public.fruit_seas_saves;
create policy "fruit_seas_insert_own_save"
on public.fruit_seas_saves for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "fruit_seas_update_own_save" on public.fruit_seas_saves;
create policy "fruit_seas_update_own_save"
on public.fruit_seas_saves for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "fruit_seas_realtime_receive" on realtime.messages;
create policy "fruit_seas_realtime_receive"
on realtime.messages for select to authenticated
using (
  (select realtime.topic()) like 'fruit-seas:%'
  and realtime.messages.extension in ('broadcast','presence')
);

drop policy if exists "fruit_seas_realtime_send" on realtime.messages;
create policy "fruit_seas_realtime_send"
on realtime.messages for insert to authenticated
with check (
  (select realtime.topic()) like 'fruit-seas:%'
  and realtime.messages.extension in ('broadcast','presence')
);
