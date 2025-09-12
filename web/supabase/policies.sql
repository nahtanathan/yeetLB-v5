-- Admins table
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- kv_settings RLS
alter table public.kv_settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='kv_settings' and policyname='kv read for all') then
    create policy "kv read for all"
    on public.kv_settings
    for select
    to anon, authenticated
    using (true);
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='kv_settings' and policyname='kv write admins only') then
    create policy "kv write admins only"
    on public.kv_settings
    for all
    to authenticated
    using ( exists (select 1 from public.admins a where a.user_id = auth.uid()) )
    with check ( exists (select 1 from public.admins a where a.user_id = auth.uid()) );
  end if;
end$$;

-- leaderboard_entries RLS
alter table public.leaderboard_entries enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='leaderboard_entries' and policyname='lb read for all') then
    create policy "lb read for all"
    on public.leaderboard_entries
    for select
    to anon, authenticated
    using (true);
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='leaderboard_entries' and policyname='lb write admins only') then
    create policy "lb write admins only"
    on public.leaderboard_entries
    for all
    to authenticated
    using ( exists (select 1 from public.admins a where a.user_id = auth.uid()) )
    with check ( exists (select 1 from public.admins a where a.user_id = auth.uid()) );
  end if;
end$$;

-- After running, add yourself:
-- insert into public.admins (user_id) values ('YOUR-USER-UUID') on conflict (user_id) do nothing;
