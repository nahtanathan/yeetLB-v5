create table if not exists public.kv_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
insert into public.kv_settings (key, value) values
('ui', jsonb_build_object('title','Yeet Leaderboard','subtitle','Daily Wagers','timeframe','24h','timezone','America/Mexico_City','theme','dark','backgroundImage','/yeet-bg.jpg'))
on conflict (key) do nothing;
insert into public.kv_settings (key, value) values
('prizes', jsonb_build_array())
on conflict (key) do nothing;
insert into public.kv_settings (key, value) values
('chaos', jsonb_build_object('enabled', true, 'songUrl', '/chaos.wav', 'durationMs', 10000, 'intensity', 1.0))
on conflict (key) do nothing;
insert into public.kv_settings (key, value) values
('integrations', jsonb_build_object('yeetApis', jsonb_build_array()))
on conflict (key) do nothing;
create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  wagers numeric default 0,
  net_win numeric default 0,
  last_played timestamptz default now()
);
