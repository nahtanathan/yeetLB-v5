# Yeet Leaderboard v5 — Render-ready (Static + Proxy)
- Glassy Yeet theme, Dark/Light toggle
- Top 3 cards + list (to 15)
- Admin: edit **all UI**, **prizes**, and **multiple Yeet API entries**
- Each API: name, endpoint, apiKey, startDate, endDate, useProxy, proxyBase
- Leaderboard merges results across all Yeet APIs; falls back to Supabase table if none
- Node proxy to avoid CORS; POST /api/yeet/fetch with header x-forward-yeet-key

## Deploy (Blueprint)
1) Render → Blueprints → New → select this repo (has render.yaml).
2) Services:
   - yeetlb-web-v5 (Static Site): build envs `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_PROXY_BASE`.
   - yeetlb-proxy-v5 (Node): optional `CORS_ALLOW_ORIGIN` (set to your static site URL to restrict).

## Supabase
- Run `web/supabase/schema.sql` once.
- Enable Email auth, add a user, log in at `/admin`.

## Use it
- In Admin → Integrations: add one or more Yeet API entries. Toggle **Use Proxy** and set **Proxy Base** (e.g., your proxy URL) or call direct.
