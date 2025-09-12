import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useKV } from '../components/Shared'

/* ... (normalize, fetchDirect, fetchProxy, mergeByUser, formatRemaining unchanged) ... */

export default function Leaderboard(){
  const [rows,setRows]=useState([])
  const [err,setErr]=useState('')
  const {data:ui}=useKV('ui')
  const {data:integrations}=useKV('integrations')
  const {data:prizes}=useKV('prizes')
  const {data:countdown}=useKV('countdown')
  const {data:chaos}=useKV('chaos')

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

  // fetch leaderboard data (same as before)
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

  // chaos
  const audioRef=useRef(null)
  const [isChaos,setIsChaos]=useState(false)
  const triggerChaos=async()=>{
    if(!chaos?.enabled) return
    try{audioRef.current.volume=0.8;await audioRef.current.play()}catch(e){}
    setIsChaos(true)
    setTimeout(()=>setIsChaos(false),Math.max(2000,chaos?.durationMs||10000))
  }

  return (
    <div className={isChaos?'chaos-mode':''}>

      {/* Top section + timer (unchanged) */}
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

      {/* top1 / top2&3 / prize bar / rest table → same as before */}

      {/* Chaos trigger at bottom */}
      {chaos?.enabled && (
        <div className="glass card" style={{marginTop:24, textAlign:'center'}}>
          <audio ref={audioRef} src={chaos?.songUrl||'/chaos.wav'} preload="auto"/>
          <h3>Secret Button</h3>
          <button
            className="btn"
            style={{background:'rgba(255,0,0,.25)',borderColor:'rgba(255,0,0,.5)',fontWeight:800,fontSize:18}}
            onClick={triggerChaos}
          >
            🚫 Don’t press this
          </button>
          <div className="small-note" style={{marginTop:8}}>Unleashes chaos for {Math.floor((chaos?.durationMs||10000)/1000)}s</div>
        </div>
      )}
    </div>
  )
}
