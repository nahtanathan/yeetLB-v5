// web/src/pages/Leaderboard.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useKV } from '../components/Shared'

/* -------------------- Theme runtime vars (from Admin → ui KV) -------------------- */
function ThemeVars({ ui }) {
  useEffect(() => {
    if (!ui) return
    const r = document.documentElement
    if (ui.bg) r.style.setProperty('--bg', ui.bg)
    if (ui.fg) r.style.setProperty('--fg', ui.fg)
    if (ui.primary) r.style.setProperty('--accent', ui.primary)
    if (ui.accent2) r.style.setProperty('--accent-2', ui.accent2)
    if (ui.radius) r.style.setProperty('--radius', `${ui.radius}px`)
    if (ui.borderOpacity != null) {
      r.style.setProperty('--border', `rgba(255,255,255,${ui.borderOpacity})`)
    }
  }, [ui])
  return null
}

/* ------------------------------ helpers ------------------------------ */
const normalize = (arr) =>
  (Array.isArray(arr) ? arr : []).map((d) => ({
    id: d.username,
    username: d.username,
    wagers: Number(d.volume || 0),
    net_win: 0,
    last_played: new Date().toISOString(),
    tier: d.tier,
    tierImage: d.tierImage,
  }))

async function fetchDirect(endpoint, apiKey, startDate, endDate) {
  const url = new URL(endpoint)
  if (startDate) url.searchParams.set('startDate', startDate)
  if (endDate) url.searchParams.set('endDate', endDate)
  const res = await fetch(url.toString(), { headers: { 'x-yeet-api-key': apiKey } })
  if (!res.ok) throw new Error('direct:' + res.status)
  return normalize(await res.json())
}

async function fetchProxy(base, endpoint, apiKey, startDate, endDate) {
  const url = new URL('/api/yeet/fetch', base)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forward-yeet-key': apiKey },
    body: JSON.stringify({ endpoint, startDate, endDate }),
  })
  if (!res.ok) throw new Error('proxy:' + res.status)
  return normalize(await res.json())
}

function mergeByUser(lists) {
  const map = new Map()
  lists.flat().forEach((r) => {
    const k = r.username
    const prev = map.get(k) || { ...r, wagers: 0 }
    prev.wagers += Number(r.wagers || 0)
    prev.tier ||= r.tier
    prev.tierImage ||= r.tierImage
    map.set(k, prev)
  })
  return [...map.values()].sort((a, b) => b.wagers - a.wagers)
}

function formatRemaining(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00:00'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = String(Math.floor((s % 86400) / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return d > 0 ? `${d}d ${h}:${m}:${sec}` : `${h}:${m}:${sec}`
}

/* ------------------------------ page ------------------------------ */
export default function Leaderboard() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')

  // KVs
  const { data: ui } = useKV('ui')
  const { data: integrations } = useKV('integrations')
  const { data: prizes } = useKV('prizes')
  const { data: countdown } = useKV('countdown')
  const { data: chaos } = useKV('chaos')
  const { data: reward } = useKV('reward') // NEW

  const timeframe = ui?.timeframe ?? '24h'
  const tz = ui?.timezone ?? 'CST'

  // countdown
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const remainingMs = useMemo(() => {
    if (!countdown?.enabled || !countdown?.endAt) return null
    const end = Date.parse(countdown.endAt)
    if (Number.isNaN(end)) return null
    return Math.max(0, end - now)
  }, [countdown, now])

  // data
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setErr('')
      const apis = integrations?.yeetApis || []
      const results = []
      for (const api of apis) {
        const { endpoint, apiKey, startDate, endDate, useProxy, proxyBase } = api || {}
        if (!endpoint || !apiKey) continue
        try {
          if (useProxy || proxyBase || import.meta.env.VITE_PROXY_BASE) {
            const base = proxyBase || import.meta.env.VITE_PROXY_BASE
            results.push(await fetchProxy(base, endpoint, apiKey, startDate, endDate))
          } else {
            results.push(await fetchDirect(endpoint, apiKey, startDate, endDate))
          }
        } catch (e) {
          console.warn('API failed', api?.name, e)
          setErr('Some API calls failed; showing what we could load.')
        }
      }
      if (cancelled) return
      if (results.length) {
        setRows(mergeByUser(results).slice(0, 15))
        return
      }
      const { data, error } = await supabase
        .from('leaderboard_entries')
        .select('*')
        .order('wagers', { ascending: false })
        .limit(15)
      if (cancelled) return
      if (!error && data?.length) setRows(data)
      else if (error) setErr('Supabase error: ' + error.message)
      else setErr('No data. Configure Yeet APIs in Admin or seed Supabase.')
    })()
    return () => { cancelled = true }
  }, [integrations])

  // slices
  const top1 = rows[0] ? [rows[0]] : []
  const top2and3 = rows.slice(1, 3)

  const prizeAt = (i) => (Array.isArray(prizes) && prizes[i] ? prizes[i] : null)
  const fmtPrize = (p) => (!p ? '' : [p.name, p.amount].filter(Boolean).join(' · '))

  // chaos trigger
  const audioRef = useRef(null)
  const [isChaos, setIsChaos] = useState(false)
  const triggerChaos = async () => {
    if (!chaos?.enabled) return
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.volume = 0.8
        await audioRef.current.play()
      }
    } catch {}
    setIsChaos(true)
    setTimeout(() => setIsChaos(false), Math.max(2000, chaos?.durationMs || 10000))
  }

  // Reward visuals
  const logo = reward?.logoUrl || '/YEET-logo.png'
  const size = Number(reward?.logoSize ?? 72)
  const pad = Number(reward?.logoPadding ?? 8)
  const safeReqs = Array.isArray(reward?.requirements) ? reward.requirements : []

  return (
    <div
      className={isChaos ? 'chaos-mode' : ''}
      style={{
        '--shake-intensity': `${(chaos?.intensity || 1) * 8}px`,
        '--flash-intensity': `${Math.min(1, (chaos?.intensity || 1) * 0.6)}`
      }}
    >
      <ThemeVars ui={ui} />

      {/* subheader & big timer */}
      <div className="glass card subheader">
        <h2 className="title">Top Wagerers</h2>
        <div className="small-note">Live from Yeet API · Timeframe: {timeframe} · TZ: {tz}</div>
        {remainingMs !== null && (
          <div className="timer-pill">
            <span className="timer-icon">⏳</span>
            <span className="timer-label">{countdown?.label || 'Ends in'}</span>
            <span className="timer-value">{formatRemaining(remainingMs)}</span>
          </div>
        )}
      </div>

      {/* Reward / Promo Card */}
      {reward?.enabled && (
        <div className="glass card" style={{ marginBottom: 16, padding: 18 }}>
          {/* Top row */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* Logo bubble */}
            <div style={{
              width: size, height: size, borderRadius: 16, overflow: 'hidden',
              background: 'rgba(255,255,255,.06)', display: 'grid', placeItems: 'center', flex: '0 0 auto',
              border: '1px solid var(--border)', padding: pad
            }}>
              <img src={logo} alt="Reward" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            {/* Title + subtitle */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: .2 }}>
                {reward.title || '$10 Free Balance'}
              </div>
              <div className="small-note" style={{ opacity: .9 }}>
                {reward.subtitle || 'Claim a free $10 on-site balance'}
              </div>
            </div>

            {/* Frequency pill + copy */}
            <div className="pill" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                {reward.frequencyLabel || 'DAILY'}
              </span>
              {reward.copyText && (
                <button
                  className="btn"
                  onClick={() => navigator.clipboard.writeText(reward.copyText)}
                  title="Copy"
                  style={{ padding: '4px 6px' }}
                >
                  📋
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="section-divider" />

          {/* Checklist */}
          {safeReqs.length > 0 && (
            <>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>How to claim this reward:</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {safeReqs.map((r, i) => (
                  <div key={i} className="check-item">
                    <span className="check-dot">✔</span>
                    <div>{r?.text || ''}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CTA */}
          <div style={{ marginTop: 16 }}>
            <a
              className="btn accent"
              href={reward?.ctaHref || '#'}
              target={reward?.ctaTarget || '_blank'}
              rel="noreferrer"
              style={{ width: '100%', display: 'inline-block', textAlign: 'center', fontWeight: 800 }}
            >
              {reward?.ctaLabel || 'REDEEM REWARD'}
            </a>
          </div>
        </div>
      )}

      {/* #1 */}
      {top1.length > 0 && (
        <div className="top3" style={{ justifyContent: 'center' }}>
          {top1.map((r) => (
            <div key={r.id || r.username} className="hero-card glass glow">
              <div className="mega-badge">
                <span className="rank">#1</span> <span className="crown">👑</span>
              </div>
              {prizeAt(0) && (
                <div className="prize-ribbon">
                  <span className="ribbon-icon">🏆</span>
                  <span className="ribbon-text">{fmtPrize(prizeAt(0))}</span>
                </div>
              )}
              <div className="hero-inner">
                {r.tierImage && <img src={r.tierImage} alt={r.tier || 'tier'} className="tier-img-lg" />}
                <div className="handle-lg">@{r.username}</div>
                <div className="metric-label">Volume</div>
                <div className="metric-lg">${Number(r.wagers || 0).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* #2 & #3 */}
      {top2and3.length > 0 && (
        <div className="top3" style={{ justifyContent: 'center' }}>
          {top2and3.map((r, i) => (
            <div key={r.id || r.username} className="hero-card small glass glow">
              <div className="mega-badge sm">
                <span className="rank">#{i + 2}</span> <span className="crown">👑</span>
              </div>
              {prizeAt(i + 1) && (
                <div className="prize-ribbon sm">
                  <span className="ribbon-icon">🎁</span>
                  <span className="ribbon-text">{fmtPrize(prizeAt(i + 1))}</span>
                </div>
              )}
              <div className="hero-inner">
                {r.tierImage && <img src={r.tierImage} alt={r.tier || 'tier'} className="tier-img-sm" />}
                <div className="handle-sm">@{r.username}</div>
                <div className="metric-label">Volume</div>
                <div className="metric-sm">${Number(r.wagers || 0).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* prize chips row */}
      {Array.isArray(prizes) && prizes.length > 0 && (
        <div className="glass card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {prizes.map((p, idx) => (
              <div key={idx} className="chip">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️'} {fmtPrize(p)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* rest table */}
      <div className="glass card">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: '0 0 4px' }}>Leaderboard</h2>
            <div className="small-note">Top 15 overall</div>
          </div>
        </div>
        {rows.length === 0 && err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: .7 }}>
              <th style={{ padding: '8px 6px' }}>#</th>
              <th style={{ padding: '8px 6px' }}>User</th>
              <th style={{ padding: '8px 6px' }}>Volume</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(3).length === 0 && rows.length > 0 && (
              <tr><td colSpan={3} style={{ padding: 12, opacity: .75 }}>Add more than 3 entries to see the list view.</td></tr>
            )}
            {rows.slice(3).map((r, idx) => (
              <tr key={r.id || r.username}>
                <td style={{ padding: '10px 6px' }}>{idx + 4}</td>
                <td style={{ padding: '10px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {r.tierImage && <img src={r.tierImage} alt="" style={{ height: 18, borderRadius: 4 }} />}
                  @{r.username}
                </td>
                <td style={{ padding: '10px 6px' }}>${Number(r.wagers || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* chaos trigger */}
      {chaos?.enabled && (
        <div className="glass card" style={{ marginTop: 24, textAlign: 'center' }}>
          <audio ref={audioRef} src={chaos?.songUrl || '/chaos.wav'} preload="auto" />
          <button
            className="btn"
            style={{ background: 'rgba(255,0,0,.25)', borderColor: 'rgba(255,0,0,.5)', fontWeight: 800, fontSize: 18 }}
            onClick={triggerChaos}
          >
            🚫 Don’t press this
          </button>
        </div>
      )}
    </div>
  )
}
