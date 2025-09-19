// web/src/pages/Leaderboard.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useKV } from '../components/Shared'

/* ---------- Theme bootstrap (keeps your toggle working if header includes it elsewhere) ---------- */
function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme) }
function ThemeBoot() { useEffect(() => { applyTheme(localStorage.getItem('theme') || 'dark') }, []); return null }

/* ---------- icon set ---------- */
const Icon = ({ kind, size=18 }) => {
  const s = { width:size, height:size, display:'inline-block' }
  switch ((kind||'').toLowerCase()) {
    case 'discord': return (
      <svg viewBox="0 0 24 24" style={s} aria-hidden="true"><path fill="currentColor" d="M20.3 4.6A17 17 0 0 0 15.9 3l-.2.4c1.3.3 2.3.8 3.3 1.5a13 13 0 0 0-10 0c1-.7 2-1.2 3.3-1.5L12.1 3a17 17 0 0 0-4.4 1.6C5 6.7 4 9.8 4 12.8a17 17 0 0 0 5.2 2.6l.6-.9c-1.1-.3-2-.7-2.8-1.3l.7.4a12 12 0 0 0 9 0l.7-.4c-.9.6-1.8 1-2.9 1.3l.6.9a17 17 0 0 0 5.2-2.6c0-3-.9-6.1-2.9-8.2ZM9.6 12.1c-.7 0-1.3-.6-1.3-1.3s.6-1.3 1.3-1.3c.7 0 1.3.6 1.3 1.3s-.6 1.3-1.3 1.3Zm4.8 0c-.7 0-1.3-.6-1.3-1.3s.6-1.3 1.3-1.3 1.3.6 1.3 1.3-.6 1.3-1.3 1.3Z"/></svg>
    )
    case 'x':
    case 'twitter': return (
      <svg viewBox="0 0 24 24" style={s}><path fill="currentColor" d="M17.6 3H21l-7.6 8.7L22.3 21h-6.1l-4.8-5.6L5.9 21H2.5l8.1-9.2L1.9 3h6.2l4.3 4.9L17.6 3Zm-1.1 16h1.7L7.6 5H5.8l10.7 14Z"/></svg>
    )
    case 'telegram': return (
      <svg viewBox="0 0 24 24" style={s}><path fill="currentColor" d="M9.7 14.9 9.5 19c.5 0 .7-.2.9-.5l2.1-2 4.3 3.1c.8.4 1.3.2 1.5-.7l2.7-12.7c.2-1-.4-1.4-1.1-1.1L3.2 9.5c-1 .4-1 1 0 1.3l4.7 1.5 10.8-6.8-9 9.4Z"/></svg>
    )
    case 'youtube': return (
      <svg viewBox="0 0 24 24" style={s}><path fill="currentColor" d="M23 12s0-3-1-4c-1-1-3-1-6-1H8C5 7 3 7 2 8c-1 1-1 4-1 4s0 3 1 4 3 1 6 1h8c3 0 5 0 6-1s1-4 1-4Zm-13 3V9l5 3-5 3Z"/></svg>
    )
    case 'tiktok': return (
      <svg viewBox="0 0 24 24" style={s}><path fill="currentColor" d="M16.5 3a5.7 5.7 0 0 0 .3 1.6c.5 1.6 1.8 2.9 3.4 3.4.6.2 1.1.3 1.7.3V11a9 9 0 0 1-5.1-1.6v5.4a6.9 6.9 0 1 1-6.9-6.9c.4 0 .8 0 1.2.1v3a3.8 3.8 0 1 0 2.8 3.6V3h2.6Z"/></svg>
    )
    case 'instagram': return (
      <svg viewBox="0 0 24 24" style={s}><path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Zm0 2a3.5 3.5 0 1 0 .001 7.001A3.5 3.5 0 0 0 12 9.5Zm5.8-.9a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z"/></svg>
    )
    default: // website / other
      return (<svg viewBox="0 0 24 24" style={s}><path fill="currentColor" d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm6.9 6H16c-.4-1.6-1-3-1.8-4A8 8 0 0 1 18.9 8ZM12 4c.9 1 1.7 2.5 2.1 4H9.9c.4-1.5 1.2-3 2.1-4ZM4 12c0-1.4.4-2.8 1.1-4H8c-.3 1.3-.4 2.6-.4 4s.1 2.7.4 4H5.1A8 8 0 0 1 4 12Zm8 8c-.9-1-1.7-2.5-2.1-4h4.2c-.4 1.5-1.2 3-2.1 4Zm2.9-6H9.1c-.3-1.3-.4-2.6-.4-4s.1-2.7.4-4h5.8c.3 1.3.4 2.6.4 4s-.1 2.7-.4 4Zm.9 4c.8-1 1.4-2.4 1.8-4h2.9A8 8 0 0 1 15.8 18ZM8 4c-.8 1-1.4 2.4-1.8 4H3.3A8 8 0 0 1 8 4Zm-4.7 10H6c.4 1.6 1 3 1.8 4A8 8 0 0 1 3.3 14Zm12.7 4c.8-1 1.4-2.4 1.8-4h2.9a8 8 0 0 1-4.7 4Z"/></svg>)
  }
}

/* ---------- helpers ---------- */
const normalize = (arr) =>
  (Array.isArray(arr) ? arr : []).map((d) => ({
    id: d.username, username: d.username,
    wagers: Number(d.volume || 0), net_win: 0,
    last_played: new Date().toISOString(),
    tier: d.tier, tierImage: d.tierImage,
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

const detectKind = (url='')=>{
  const u = url.toLowerCase()
  if (u.includes('discord.gg')||u.includes('discord.com')) return 'discord'
  if (u.includes('t.me')||u.includes('telegram.')) return 'telegram'
  if (u.includes('youtube.')) return 'youtube'
  if (u.includes('tiktok.')) return 'tiktok'
  if (u.includes('instagram.')) return 'instagram'
  if (u.includes('x.com')||u.includes('twitter.')) return 'x'
  return 'website'
}

/* ---------- page ---------- */
export default function Leaderboard() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState('')

  // KV configs
  const { data: ui }          = useKV('ui')
  const { data: integrations} = useKV('integrations')
  const { data: prizes }      = useKV('prizes')
  const { data: countdown }   = useKV('countdown')
  const { data: chaos }       = useKV('chaos')
  const { data: links }       = useKV('links')       // <— NEW

  const timeframe = ui?.timeframe ?? '24h'
  const tz = ui?.timezone ?? 'CST'

  // countdown tick
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  const remainingMs = useMemo(() => {
    if (!countdown?.enabled || !countdown?.endAt) return null
    const end = Date.parse(countdown.endAt)
    if (Number.isNaN(end)) return null
    return Math.max(0, end - now)
  }, [countdown, now])

  // fetch leaderboard data
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

  // computed links
  const safeLinks = (Array.isArray(links) ? links : []).map(l => ({
    title: l?.title || 'Link',
    url: l?.url || '#',
    kind: (l?.kind && l.kind !== 'website') ? l.kind : detectKind(l?.url || '')
  }))

  return (
    <div
      className={isChaos ? 'chaos-mode' : ''}
      style={{
        '--shake-intensity': `${(chaos?.intensity || 1) * 8}px`,
        '--flash-intensity': `${Math.min(1, (chaos?.intensity || 1) * 0.6)}`
      }}
    >
      <ThemeBoot />

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

      {/* Reward/Top cards ... (unchanged from previous rewrite) */}

      {/* Links / Community — NEW */}
      {safeLinks.length > 0 && (
        <div className="glass card" style={{ marginBottom: 16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <h3 style={{ margin:0 }}>Community</h3>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            {safeLinks.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noreferrer"
                 className="btn pill"
                 style={{ display:'inline-flex', alignItems:'center', gap:8, textDecoration:'none' }}>
                <span style={{ lineHeight: 0, display:'grid', placeItems:'center' }}>
                  <Icon kind={l.kind} size={18} />
                </span>
                <span style={{ fontWeight:800 }}>{l.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ====== Existing sections from your page ====== */}
      {/* #1 */}
      {top1.length > 0 && (
        <div className="top3" style={{ justifyContent: 'center' }}>
          {top1.map((r) => (
            <div key={r.id || r.username} className="hero-card glass glow">
              <div className="mega-badge"><span className="rank">#1</span> <span className="crown">👑</span></div>
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
              <div className="mega-badge sm"><span className="rank">#{i + 2}</span> <span className="crown">👑</span></div>
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

      {/* table */}
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

      {/* chaos */}
      {chaos?.enabled && (
        <div className="glass card" style={{ marginTop: 24, textAlign: 'center' }}>
          <audio ref={audioRef} src={chaos?.songUrl || '/chaos.wav'} preload="auto" />
          <button className="btn" style={{ background: 'rgba(255,0,0,.25)', borderColor: 'rgba(255,0,0,.5)', fontWeight: 800, fontSize: 18 }} onClick={triggerChaos}>
            🚫 Don’t press this
          </button>
        </div>
      )}
    </div>
  )
}
