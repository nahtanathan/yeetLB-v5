import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useKV } from '../components/Shared'

/* ---------- data helpers ---------- */
const normalize = (arr) => (Array.isArray(arr)?arr:[]).map(d=>({
  id: d.username, username: d.username,
  wagers: Number(d.volume||0), net_win: 0,
  last_played: new Date().toISOString(),
  tier: d.tier, tierImage: d.tierImage
}))

async function fetchDirect(endpoint, apiKey, startDate, endDate){
  const url = new URL(endpoint)
  if (startDate) url.searchParams.set('startDate', startDate)
  if (endDate) url.searchParams.set('endDate', endDate)
  const res = await fetch(url.toString(), { headers: { 'x-yeet-api-key': apiKey } })
  if (!res.ok) throw new Error('direct:'+res.status)
  return normalize(await res.json())
}

async function fetchProxy(base, endpoint, apiKey, startDate, endDate){
  const url = new URL('/api/yeet/fetch', base)
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'content-type':'application/json', 'x-forward-yeet-key': apiKey },
    body: JSON.stringify({ endpoint, startDate, endDate })
  })
  if (!res.ok) throw new Error('proxy:'+res.status)
  return normalize(await res.json())
}

function mergeByUser(lists){
  const map = new Map()
  lists.flat().forEach(r=>{
    const key=r.username
    const prev=map.get(key)||{...r,wagers:0}
    prev.wagers += Number(r.wagers||0)
    prev.tier = prev.tier || r.tier
    prev.tierImage = prev.tierImage || r.tierImage
    map.set(key, prev)
  })
  return Array.from(map.values()).sort((a,b)=>b.wagers-a.wagers)
}

function formatRemaining(ms){
  if (ms <= 0) return '00:00:00'
  const s = Math.floor(ms/1000)
  const days = Math.floor(s/86400)
  const hrs  = Math.floor((s%86400)/3600).toString().padStart(2,'0')
  const mins = Math.floor((s%3600)/60).toString().padStart(2,'0')
  const secs = Math.floor(s%60).toString().padStart(2,'0')
  return days>0 ? `${days}d ${hrs}:${mins}:${secs}` : `${hrs}:${mins}:${secs}`
}

/* ---------- UI ---------- */
export default function Leaderboard(){
  const [rows,setRows]=useState([])
  const [err,setErr]=useState('')
  const {data:ui}=useKV('ui')
  const {data:integrations}=useKV('integrations')
  const {data:prizes}=useKV('prizes')
  const {data:countdown}=useKV('countdown')

  const timeframe=ui?.timeframe??'24h'; const tz=ui?.timezone??'CST'

  // countdown tick
  const [now, setNow] = useState(Date.now())
  useEffect(()=>{ const id=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(id) },[])
  const remainingMs = useMemo(()=>{
    if (!countdown?.enabled || !countdown?.endAt) return null
    const end = Date.parse(countdown.endAt)
    if (isNaN(end)) return null
    return Math.max(0, end - now)
  }, [countdown, now])

  // load data
  useEffect(()=>{(async()=>{
    setErr('')
    const apis = integrations?.yeetApis || []
    const results = []
    for (const api of apis){
      const { endpoint, apiKey, startDate, endDate, useProxy, proxyBase } = api || {}
      if (!endpoint || !apiKey) continue
      try{
        if (useProxy || proxyBase || import.meta.env.VITE_PROXY_BASE){
          const base = proxyBase || import.meta.env.VITE_PROXY_BASE
          results.push(await fetchProxy(base, endpoint, apiKey, startDate, endDate))
        } else {
          results.push(await fetchDirect(endpoint, apiKey, startDate, endDate))
        }
      }catch(e){ console.warn('API failed', api?.name, e); setErr('Some API calls failed; showing what we could load.') }
    }
    if (results.length){
      setRows(mergeByUser(results).slice(0,15))
      return
    }
    const { data, error } = await supabase.from('leaderboard_entries').select('*').order('wagers',{ascending:false}).limit(15)
    if (!error && data?.length) setRows(data)
    else if (error) setErr('Supabase error: '+error.message)
    else setErr('No data. Configure Yeet APIs in Admin or seed Supabase.')
  })()},[integrations])

  const top1 = rows[0] ? [rows[0]] : []
  const top2and3 = rows.slice(1,3)
  const rest = rows.slice(3)

  const prizeAt = (i) => Array.isArray(prizes) && prizes[i] ? prizes[i] : null
  const fmtPrize = (p) => !p ? '' : [p.name, p.amount].filter(Boolean).join(' · ')

  return (
    <div>

      {/* Subheader + big timer */}
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

      {/* #1 */}
      {top1.length>0 && (
        <div className="top3" style={{justifyContent:'center'}}>
          {top1.map((r)=>(
            <div key={r.id||r.username} className="hero-card glass glow">
              {/* Big rank badge */}
              <div className="mega-badge">
                <span className="rank">#1</span> <span className="crown">👑</span>
              </div>

              {/* Big prize ribbon */}
              {prizeAt(0) && (
                <div className="prize-ribbon">
                  <span className="ribbon-icon">🏆</span>
                  <span className="ribbon-text">{fmtPrize(prizeAt(0))}</span>
                </div>
              )}

              {/* Content */}
              <div className="hero-inner">
                {r.tierImage && <img src={r.tierImage} alt={r.tier||'tier'} className="tier-img-lg"/>}
                <div className="handle-lg">@{r.username}</div>
                <div className="metric-label">Volume</div>
                <div className="metric-lg">${Number(r.wagers||0).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* #2 & #3 */}
      {top2and3.length>0 && (
        <div className="top3" style={{justifyContent:'center'}}>
          {top2and3.map((r, i)=>(
            <div key={r.id||r.username} className="hero-card small glass glow">
              <div className="mega-badge sm">
                <span className="rank">#{i+2}</span> <span className="crown">👑</span>
              </div>

              {prizeAt(i+1) && (
                <div className="prize-ribbon sm">
                  <span className="ribbon-icon">🎁</span>
                  <span className="ribbon-text">{fmtPrize(prizeAt(i+1))}</span>
                </div>
              )}

              <div className="hero-inner">
                {r.tierImage && <img src={r.tierImage} alt={r.tier||'tier'} className="tier-img-sm"/>}
                <div className="handle-sm">@{r.username}</div>
                <div className="metric-label">Volume</div>
                <div className="metric-sm">${Number(r.wagers||0).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prize bar */}
      {Array.isArray(prizes) && prizes.length > 0 && (
        <div className="glass card" style={{marginBottom:24}}>
          <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'center'}}>
            {prizes.map((p,idx)=>(
              <div key={idx} className="chip">
                {idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':'🎖️'} {fmtPrize(p)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rest of leaderboard */}
      <div className="glass card">
        <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between'}}>
          <div>
            <h2 style={{margin:'0 0 4px'}}>Leaderboard</h2>
            <div className="small-note">Top 15 overall</div>
          </div>
        </div>
        {rows.length===0 && err && <div className="err" style={{marginTop:10}}>{err}</div>}
        <table style={{width:'100%', marginTop:12, borderCollapse:'collapse'}}>
          <thead>
            <tr style={{textAlign:'left', opacity:.7}}>
              <th style={{padding:'8px 6px'}}>#</th>
              <th style={{padding:'8px 6px'}}>User</th>
              <th style={{padding:'8px 6px'}}>Volume</th>
            </tr>
          </thead>
          <tbody>
            {rest.length===0 && rows.length>0 && (
              <tr><td colSpan={3} style={{padding:12,opacity:.75}}>Add more than 3 entries to see the list view.</td></tr>
            )}
            {rest.map((r, idx) => (
              <tr key={r.id || r.username}>
                <td style={{padding:'10px 6px'}}>{idx+4}</td>
                <td style={{padding:'10px 6px', display:'flex', alignItems:'center', gap:8}}>
                  {r.tierImage && <img src={r.tierImage} alt="" style={{height:18, borderRadius:4}}/>}
                  @{r.username}
                </td>
                <td style={{padding:'10px 6px'}}>${Number(r.wagers||0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
