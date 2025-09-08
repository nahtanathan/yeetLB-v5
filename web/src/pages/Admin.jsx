import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useKV } from '../components/Shared'

export default function Admin(){
  const [session,setSession]=useState(null)
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [authError,setAuthError]=useState('')
  useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session||null));const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>sub.subscription?.unsubscribe?.()},[])
  async function signIn(e){e.preventDefault();setAuthError('');const {error}=await supabase.auth.signInWithPassword({email,password});if(error) setAuthError(error.message||'Login failed')}
  async function signOut(){await supabase.auth.signOut()}

  const uiKV=useKV('ui'); const prizesKV=useKV('prizes'); const chaosKV=useKV('chaos'); const integrationsKV=useKV('integrations')
  const [ui,setUI]=useState(null); const [prizes,setPrizes]=useState([]); const [chaos,setChaos]=useState({enabled:true,songUrl:'/chaos.wav',durationMs:10000,intensity:1})
  const [integrations,setIntegrations]=useState({yeetApis:[]})
  useEffect(()=>{if(uiKV.data) setUI(uiKV.data)},[uiKV.data])
  useEffect(()=>{if(Array.isArray(prizesKV.data)) setPrizes(prizesKV.data)},[prizesKV.data])
  useEffect(()=>{if(chaosKV.data) setChaos(chaosKV.data)},[chaosKV.data])
  useEffect(()=>{if(integrationsKV.data) setIntegrations(integrationsKV.data)},[integrationsKV.data])

  const saveAll=async()=>{await uiKV.save(ui||{});await prizesKV.save(prizes||[]);await chaosKV.save(chaos||{});await integrationsKV.save(integrations||{yeetApis:[]});alert('Saved to Supabase ✅')}

  const addPrize=()=>setPrizes([...(prizes||[]),{name:'',amount:''}])
  const updatePrize=(i,f,v)=>{const n=prizes.slice();n[i]={...n[i],[f]:v};setPrizes(n)}
  const removePrize=(i)=>setPrizes(prizes.filter((_,idx)=>idx!==i))

  const addApi=()=>setIntegrations({...integrations, yeetApis:[...(integrations.yeetApis||[]),
    {name:'Referrals Volume', endpoint:'https://api.yeet.com/concierge/public/affiliate/referrals', apiKey:'', startDate:'', endDate:'', useProxy:true, proxyBase:(import.meta.env.VITE_PROXY_BASE||'')} ]})
  const updateApi=(i,f,v)=>{const n=(integrations.yeetApis||[]).slice();n[i]={...n[i],[f]:v};setIntegrations({...integrations, yeetApis:n})}
  const removeApi=(i)=>{const n=(integrations.yeetApis||[]).filter((_,idx)=>idx!==i);setIntegrations({...integrations, yeetApis:n})}

  const audioRef=useRef(null); const [isChaos,setIsChaos]=useState(false)
  const triggerChaos=async()=>{if(!chaos?.enabled) return;try{setIsChaos(true);audioRef.current.volume=0.8;await audioRef.current.play()}catch(e){};setTimeout(()=>setIsChaos(false),Math.max(2000,chaos?.durationMs||10000))}

  if(!session){
    return (<div className='glass card' style={{maxWidth:420,margin:'40px auto'}}>
      <h2 style={{marginTop:0}}>Admin Login</h2>
      <form onSubmit={signIn} style={{display:'grid',gap:10}}>
        <input className='input' type='email' placeholder='Email' value={email} onChange={e=>setEmail(e.target.value)} required/>
        <input className='input' type='password' placeholder='Password' value={password} onChange={e=>setPassword(e.target.value)} required/>
        {authError&&<div style={{color:'#ff6b6b'}}>{authError}</div>}
        <button className='btn accent' type='submit'>Sign in</button>
      </form>
      <div className='small-note' style={{marginTop:10}}>Enable Email auth in Supabase and create a user.</div>
    </div>)
  }

  return (<div className={isChaos?'chaos':''}>
    <audio ref={audioRef} src={chaos?.songUrl||'/chaos.wav'} preload='auto'/>
    <div className='glass card' style={{marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div><h2 style={{marginTop:0}}>Admin</h2><div className='small-note'>Signed in as {session.user.email}</div></div>
      <button className='btn' onClick={signOut}>Sign out</button>
    </div>

    <div className='grid'>
      <div className='glass card' style={{gridColumn:'span 6'}}>
        <h3>UI</h3>
        <div style={{display:'grid',gap:8}}>
          <label>Title <input className='input' value={ui?.title||''} onChange={e=>setUI({...ui,title:e.target.value})}/></label>
          <label>Subtitle <input className='input' value={ui?.subtitle||''} onChange={e=>setUI({...ui,subtitle:e.target.value})}/></label>
          <label>Timeframe <input className='input' value={ui?.timeframe||''} onChange={e=>setUI({...ui,timeframe:e.target.value})}/></label>
          <label>Timezone <input className='input' value={ui?.timezone||''} onChange={e=>setUI({...ui,timezone:e.target.value})}/></label>
          <label>Theme <select className='select' value={ui?.theme||'dark'} onChange={e=>setUI({...ui,theme:e.target.value})}><option value='dark'>dark</option><option value='light'>light</option></select></label>
          <label>Background Image URL <input className='input' value={ui?.backgroundImage||''} onChange={e=>setUI({...ui,backgroundImage:e.target.value})}/></label>
        </div>
      </div>

      <div className='glass card' style={{gridColumn:'span 6'}}>
        <h3>Prizes</h3>
        <div style={{display:'grid',gap:8}}>
          {(prizes||[]).map((p,i)=>(<div key={i} className='glass' style={{padding:10}}><div style={{display:'grid',gap:6}}>
            <input className='input' placeholder='Name' value={p.name||''} onChange={e=>updatePrize(i,'name',e.target.value)}/>
            <input className='input' placeholder='Amount' value={p.amount||''} onChange={e=>updatePrize(i,'amount',e.target.value)}/>
            <button className='btn' onClick={()=>removePrize(i)}>Remove</button>
          </div></div>))}
          <button className='btn' onClick={addPrize}>+ Add Prize</button>
        </div>
      </div>

      <div className='glass card' style={{gridColumn:'span 12'}}>
        <h3>Integrations — Yeet APIs</h3>
        <div className='small-note'>Add multiple APIs. Each can call directly or via proxy. The leaderboard merges results by username.</div>
        <div style={{display:'grid',gap:8}}>
          {(integrations.yeetApis||[]).map((api,i)=>(
            <div key={i} className='glass' style={{padding:10}}>
              <div style={{display:'grid',gap:6}}>
                <input className='input' placeholder='Name' value={api.name||''} onChange={e=>updateApi(i,'name',e.target.value)}/>
                <input className='input' placeholder='Endpoint URL' value={api.endpoint||''} onChange={e=>updateApi(i,'endpoint',e.target.value)}/>
                <input className='input' placeholder='API Key' value={api.apiKey||''} onChange={e=>updateApi(i,'apiKey',e.target.value)}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <input className='input' placeholder='startDate (YYYY-MM-DD)' value={api.startDate||''} onChange={e=>updateApi(i,'startDate',e.target.value)}/>
                  <input className='input' placeholder='endDate (YYYY-MM-DD)' value={api.endDate||''} onChange={e=>updateApi(i,'endDate',e.target.value)}/>
                </div>
                <label><input type='checkbox' checked={!!api.useProxy} onChange={e=>updateApi(i,'useProxy',e.target.checked)}/> Use Proxy</label>
                <input className='input' placeholder='Proxy Base (e.g., https://yeetlb-proxy-v5.onrender.com)' value={api.proxyBase||''} onChange={e=>updateApi(i,'proxyBase',e.target.value)}/>
                <button className='btn' onClick={()=>removeApi(i)}>Remove</button>
              </div>
            </div>
          ))}
          <button className='btn' onClick={addApi}>+ Add API</button>
        </div>
      </div>

      <div className='glass card' style={{gridColumn:'span 12'}}>
        <h3>Chaos Button</h3>
        <label style={{display:'block',marginBottom:8}}><input type='checkbox' checked={!!chaos?.enabled} onChange={e=>setChaos({...chaos,enabled:e.target.checked})}/> Enabled</label>
        <div style={{display:'grid',gap:8,maxWidth:600}}>
          <label>Song URL <input className='input' value={chaos?.songUrl||''} onChange={e=>setChaos({...chaos,songUrl:e.target.value})}/></label>
          <label>Duration (ms) <input className='input' type='number' value={chaos?.durationMs||10000} onChange={e=>setChaos({...chaos,durationMs:Number(e.target.value)})}/></label>
          <label>Intensity (0.5–2.0) <input className='input' type='number' step='0.1' value={chaos?.intensity||1} onChange={e=>setChaos({...chaos,intensity:Number(e.target.value)})}/></label>
        </div>
        <div style={{display:'flex',gap:8,marginTop:10}}>
          <button className='btn' onClick={saveAll}>Save All</button>
          <button className='btn' style={{background:'rgba(255,0,0,.2)',borderColor:'rgba(255,0,0,.4)'}} onClick={()=>{try{audioRef.current.play()}catch(e){}}}>🚫 Don’t press this</button>
        </div>
        <div className='small-note'>Plays a sound and animates the page. Cosmetic only.</div>
      </div>
    </div>
  </div>)
}
