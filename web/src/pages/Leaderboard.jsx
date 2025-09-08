import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useKV } from '../components/Shared'

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

export default function Leaderboard(){
  const [rows,setRows]=useState([])
  const [err,setErr]=useState('')
  const {data:ui}=useKV('ui')
  const {data:integrations}=useKV('integrations')
  const timeframe=ui?.timeframe??'24h'; const tz=ui?.timezone??'America/Mexico_City'

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
          const r = await fetchProxy(base, endpoint, apiKey, startDate, endDate)
          results.push(r)
        } else {
          const r = await fetchDirect(endpoint, apiKey, startDate, endDate)
          results.push(r)
        }
      }catch(e){ console.warn('API failed', api?.name, e); setErr('Some API calls failed; showing what we could load.') }
    }
    if (results.length){
      const merged = mergeByUser(results)
      setRows(merged.slice(0,15))
      return
    }
    const { data, error } = await supabase.from('leaderboard_entries').select('*').order('wagers',{ascending:false}).limit(15)
    if (!error && data?.length) setRows(data)
    else if (error) setErr('Supabase error: '+error.message)
    else setErr('No data. Configure Yeet APIs in Admin or seed Supabase.')
  })()},[integrations])

  const top3 = useMemo(()=> rows.slice(0,3),[rows])
  const rest = useMemo(()=> rows.slice(3),[rows])

  return (
    <div>
      <div className="top3">
        {top3.map((r,i)=>(
          <div key={r.id||r.username} className="top-card glass">
            <div className="top-rank">#{i+1} <span className="crown">👑</span></div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {r.tierImage && <img src={r.tierImage} alt={r.tier} style={{height:26,borderRadius:6}}/>}
              <div style={{fontSize:20,fontWeight:800,color:'var(--accent)'}}>@{r.username}</div>
            </div>
            <div style={{marginTop:6,opacity:.85}}>Volume</div>
            <div style={{fontSize:28,fontWeight:900}}>${Number(r.wagers||0).toLocaleString()}</div>
            <div style={{display:'flex',gap:12,marginTop:8,opacity:.9}}>
              {r.tier && <div>Tier: <b>{r.tier}</b></div>}
              <div>Last: {new Date(r.last_played).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass card">
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
          <div><h2 style={{margin:'0 0 4px'}}>Leaderboard</h2><div className="small-note">Timeframe: {timeframe} · TZ: {tz}</div></div>
        </div>

        {err && <div className="err" style={{marginTop:10}}>{err}</div>}

        <table style={{width:'100%',marginTop:12,borderCollapse:'collapse'}}>
          <thead>
            <tr style={{textAlign:'left',opacity:.7}}>
              <th style={{padding:'8px 6px'}}>#</th>
              <th style={{padding:'8px 6px'}}>User</th>
              <th style={{padding:'8px 6px'}}>Volume</th>
              <th style={{padding:'8px 6px'}}>Tier</th>
              <th style={{padding:'8px 6px'}}>Last Played</th>
            </tr>
          </thead>
          <tbody>
            {rest.length===0 && <tr><td colSpan={5} style={{padding:12,opacity:.75}}>Add more than 3 entries to see the list view.</td></tr>}
            {rest.map((r,idx)=>(
              <tr key={r.id||r.username}>
                <td style={{padding:'10px 6px'}}>{idx+4}</td>
                <td style={{padding:'10px 6px',display:'flex',alignItems:'center',gap:8}}>
                  {r.tierImage && <img src={r.tierImage} alt={r.tier} style={{height:18, borderRadius:4}}/>}
                  @{r.username}
                </td>
                <td style={{padding:'10px 6px'}}>${Number(r.wagers||0).toLocaleString()}</td>
                <td style={{padding:'10px 6px'}}>{r.tier||'—'}</td>
                <td style={{padding:'10px 6px'}}>{new Date(r.last_played).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
