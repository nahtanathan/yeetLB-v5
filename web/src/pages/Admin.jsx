// web/src/pages/Admin.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useKV } from '../components/Shared'

function getStoredTheme(){ return localStorage.getItem('theme') || 'dark' }
function applyTheme(t){ document.documentElement.setAttribute('data-theme', t) }
function ThemeBoot(){ useEffect(()=>{ applyTheme(getStoredTheme()) },[]); return null }
function ThemeToggle(){
  const [t,setT]=useState(getStoredTheme())
  useEffect(()=>applyTheme(t),[t])
  const onToggle=()=>{
    const next=t==='dark'?'light':'dark'
    localStorage.setItem('theme',next)
    setT(next)
    window.location.reload()
  }
  return <button className="btn pill" onClick={onToggle}>{t==='dark'?'Light Mode':'Dark Mode'}</button>
}

export default function Admin(){
  /* -------- Auth -------- */
  const [session,setSession]=useState(null)
  const [email,setEmail]=useState(''); 
  const [password,setPassword]=useState(''); 
  const [authError,setAuthError]=useState('')

  useEffect(()=>{
    let mounted = true
    supabase.auth.getSession().then(({data})=>{
      if (mounted) setSession(data.session||null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return ()=>{ mounted=false; sub?.subscription?.unsubscribe?.() }
  },[])

  async function signIn(e){
    e.preventDefault()
    setAuthError('')
    const {error} = await supabase.auth.signInWithPassword({email,password})
    if (error) setAuthError(error.message||'Login failed')
  }
  async function signOut(){ await supabase.auth.signOut() }

  /* -------- KV stores -------- */
  const uiKV           = useKV('ui')
  const prizesKV       = useKV('prizes')
  const chaosKV        = useKV('chaos')
  const integrationsKV = useKV('integrations')
  const countdownKV    = useKV('countdown')
  const rewardKV       = useKV('reward')   // <— NEW
  const linksKV        = useKV('links')    // <— from earlier add

  /* Local state */
  const [ui,setUI] = useState({ title:'', subtitle:'', timeframe:'24h', timezone:'CST', theme:'dark', backgroundImage:'' })
  const [prizes,setPrizes] = useState([])
  const [chaos,setChaos] = useState({enabled:true,songUrl:'/chaos.wav',durationMs:10000,intensity:1})
  const [integrations,setIntegrations] = useState({yeetApis:[]})
  const [countdown,setCountdown] = useState({enabled:false,label:'Ends in',endAt:''})
  const [reward,setReward] = useState({
    enabled:true,
    logoUrl:'/YEET-logo.png', logoSize:72, logoPadding:8,
    title:'$10 Free Balance', subtitle:'Claim a free $10 on-site balance',
    frequencyLabel:'DAILY', copyText:'',
    requirements:[{text:'Deposit $20+'},{text:'Wager $100+'},{text:'Open a ticket to claim your prize!'}],
    ctaLabel:'REDEEM REWARD', ctaHref:'#', ctaTarget:' _blank '
  })
  const [links,setLinks] = useState([])

  // hydrate
  useEffect(()=>{ if (uiKV.data) setUI(prev=>({...prev,...uiKV.data})) },[uiKV.data])
  useEffect(()=>{ if (Array.isArray(prizesKV.data)) setPrizes(prizesKV.data) },[prizesKV.data])
  useEffect(()=>{ if (chaosKV.data) setChaos(chaosKV.data) },[chaosKV.data])
  useEffect(()=>{ if (integrationsKV.data) setIntegrations(integrationsKV.data) },[integrationsKV.data])
  useEffect(()=>{ if (countdownKV.data) setCountdown(countdownKV.data) },[countdownKV.data])
  useEffect(()=>{ if (rewardKV.data) setReward(prev=>({...prev,...rewardKV.data})) },[rewardKV.data])
  useEffect(()=>{ if (Array.isArray(linksKV.data)) setLinks(linksKV.data) },[linksKV.data])

  const saveAll = async ()=>{
    await uiKV.save(ui||{})
    await prizesKV.save(prizes||[])
    await chaosKV.save(chaos||{})
    await integrationsKV.save(integrations||{yeetApis:[]})
    await countdownKV.save(countdown||{enabled:false})
    await rewardKV.save(reward||{})   // <— NEW
    await linksKV.save(links||[])     // <— keep
    alert('Saved to Supabase ✅')
  }

  /* helpers */
  const addPrize     = ()=> setPrizes([...(prizes||[]), {name:'', amount:''}])
  const updatePrize  = (i,f,v)=>{ const n=prizes.slice(); n[i]={...n[i],[f]:v}; setPrizes(n) }
  const removePrize  = (i)=> setPrizes(prizes.filter((_,idx)=>idx!==i))

  const addApi = ()=> setIntegrations({
    ...integrations,
    yeetApis:[...(integrations.yeetApis||[]),{
      name:'Referrals Volume',
      endpoint:'https://api.yeet.com/concierge/public/affiliate/referrals',
      apiKey:'', startDate:'', endDate:'', useProxy:true, proxyBase:(import.meta.env.VITE_PROXY_BASE||'')
    }]
  })
  const updateApi = (i,f,v)=>{ const n=(integrations.yeetApis||[]).slice(); n[i]={...n[i],[f]:v}; setIntegrations({...integrations, yeetApis:n}) }
  const removeApi = (i)=>{ const n=(integrations.yeetApis||[]).filter((_,idx)=>idx!==i); setIntegrations({...integrations, yeetApis:n}) }

  const addReq = ()=> setReward({...reward, requirements:[...(reward.requirements||[]), {text:''}]})
  const updateReq = (i,v)=>{ const n=(reward.requirements||[]).slice(); n[i]={...n[i],text:v}; setReward({...reward, requirements:n}) }
  const removeReq = (i)=> setReward({...reward, requirements:(reward.requirements||[]).filter((_,idx)=>idx!==i)})

  const KNOWN = ['discord','x','telegram','youtube','tiktok','instagram','website']
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
  const addLink = ()=> setLinks([...(links||[]), { title:'Discord', url:'', kind:'discord' }])
  const updateLink = (i,f,v)=>{
    const n=links.slice()
    const row={...n[i],[f]:v}
    if (f==='url' && (!row.kind || row.kind==='website')) row.kind = detectKind(v)
    n[i]=row; setLinks(n)
  }
  const removeLink = (i)=> setLinks(links.filter((_,idx)=>idx!==i))

  /* -------- Auth gate -------- */
  if (!session){
    return (
      <div className='glass card' style={{maxWidth:520,margin:'40px auto'}}>
        <ThemeBoot />
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <h2 style={{margin:0}}>Admin Login</h2>
          <ThemeToggle />
        </div>
        <form onSubmit={signIn} style={{display:'grid',gap:10}}>
          <input className='input' type='email' placeholder='Email' value={email} onChange={e=>setEmail(e.target.value)} required/>
          <input className='input' type='password' placeholder='Password' value={password} onChange={e=>setPassword(e.target.value)} required/>
          {authError && <div style={{color:'#ff6b6b'}}>{authError}</div>}
          <button className='btn accent' type='submit'>Sign in</button>
        </form>
        <div className='small-note' style={{marginTop:10}}>
          Enable Email auth in Supabase and create a user. (Writes are restricted by RLS to <code>public.admins</code>.)
        </div>
      </div>
    )
  }

  /* -------- Dashboard -------- */
  return (
    <div>
      <ThemeBoot />
      <div className='glass card' style={{marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h2 style={{marginTop:0}}>Admin</h2>
          <div className='small-note'>Signed in as {session.user.email}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <ThemeToggle />
          <button className='btn' onClick={signOut}>Sign out</button>
        </div>
      </div>

      <div className='grid'>
        {/* UI */}
        <div className='glass card' style={{gridColumn:'span 6'}}>
          <h3>UI</h3>
          <div style={{display:'grid',gap:8}}>
            <label>Title <input className='input' value={ui?.title||''} onChange={e=>setUI({...ui,title:e.target.value})}/></label>
            <label>Subtitle <input className='input' value={ui?.subtitle||''} onChange={e=>setUI({...ui,subtitle:e.target.value})}/></label>
            <label>Timeframe label <input className='input' value={ui?.timeframe||''} onChange={e=>setUI({...ui,timeframe:e.target.value})}/></label>
            <label>Timezone label <input className='input' value={ui?.timezone||''} onChange={e=>setUI({...ui,timezone:e.target.value})}/></label>
            <label>Theme
              <select className='select' value={ui?.theme||'dark'} onChange={e=>setUI({...ui,theme:e.target.value})}>
                <option value='dark'>dark</option><option value='light'>light</option>
              </select>
            </label>
            <label>Background Image URL
              <input className='input' value={ui?.backgroundImage||''} onChange={e=>setUI({...ui,backgroundImage:e.target.value})}/>
            </label>
          </div>
        </div>

        {/* Prizes */}
        <div className='glass card' style={{gridColumn:'span 6'}}>
          <h3>Prizes</h3>
          <div style={{display:'grid',gap:8}}>
            {(prizes||[]).map((p,i)=>(
              <div key={i} className='glass' style={{padding:10}}>
                <div style={{display:'grid',gap:6}}>
                  <input className='input' placeholder='Name (e.g., $175)' value={p.name||''}
                         onChange={e=>updatePrize(i,'name',e.target.value)}/>
                  <input className='input' placeholder='Amount or note (optional)' value={p.amount||''}
                         onChange={e=>updatePrize(i,'amount',e.target.value)}/>
                  <button className='btn' onClick={()=>removePrize(i)}>Remove</button>
                </div>
              </div>
            ))}
            <button className='btn' onClick={addPrize}>+ Add Prize</button>
          </div>
        </div>

        {/* Integrations */}
        <div className='glass card' style={{gridColumn:'span 12'}}>
          <h3>Integrations — Yeet APIs</h3>
          <div className='small-note'>Add multiple APIs. The leaderboard merges results by username.</div>
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
                  <input className='input' placeholder='Proxy Base' value={api.proxyBase||''} onChange={e=>updateApi(i,'proxyBase',e.target.value)}/>
                  <button className='btn' onClick={()=>removeApi(i)}>Remove</button>
                </div>
              </div>
            ))}
            <button className='btn' onClick={addApi}>+ Add API</button>
          </div>
        </div>

        {/* Countdown */}
        <div className='glass card' style={{gridColumn:'span 12'}}>
          <h3>Countdown</h3>
          <label style={{display:'block',marginBottom:8}}>
            <input type='checkbox' checked={!!countdown.enabled}
                   onChange={e=>setCountdown({...countdown,enabled:e.target.checked})}/> Enabled
          </label>
          <div style={{display:'grid',gap:8,maxWidth:560}}>
            <label>Label <input className='input' value={countdown.label||''} onChange={e=>setCountdown({...countdown,label:e.target.value})}/></label>
            <label>End date/time
              <input className='input' type='datetime-local'
                     value={(countdown.endAt ? new Date(countdown.endAt) : new Date()).toISOString().slice(0,16)}
                     onChange={e=>setCountdown({...countdown,endAt:new Date(e.target.value).toISOString()})}/>
            </label>
          </div>
        </div>

        {/* Reward Card (Admin) */}
        <div className='glass card' style={{gridColumn:'span 12'}}>
          <h3>Reward Card</h3>
          <label style={{display:'block',marginBottom:8}}>
            <input type='checkbox' checked={!!reward.enabled}
                   onChange={e=>setReward({...reward,enabled:e.target.checked})}/> Enabled
          </label>
          <div style={{display:'grid',gap:8,maxWidth:900}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:8}}>
              <label>Logo URL <input className='input' value={reward.logoUrl||''} onChange={e=>setReward({...reward,logoUrl:e.target.value})}/></label>
              <label>Logo Size (px) <input className='input' type='number' value={Number(reward.logoSize ?? 72)} onChange={e=>setReward({...reward,logoSize:Number(e.target.value)})}/></label>
              <label>Logo Padding (px) <input className='input' type='number' value={Number(reward.logoPadding ?? 8)} onChange={e=>setReward({...reward,logoPadding:Number(e.target.value)})}/></label>
            </div>
            <label>Title <input className='input' value={reward.title||''} onChange={e=>setReward({...reward,title:e.target.value})}/></label>
            <label>Subtitle <input className='input' value={reward.subtitle||''} onChange={e=>setReward({...reward,subtitle:e.target.value})}/></label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <label>Frequency label <input className='input' value={reward.frequencyLabel||''} onChange={e=>setReward({...reward,frequencyLabel:e.target.value})}/></label>
              <label>Copy-to-clipboard text <input className='input' value={reward.copyText||''} onChange={e=>setReward({...reward,copyText:e.target.value})}/></label>
            </div>
            <div>
              <div style={{fontWeight:700, margin:'8px 0'}}>Checklist</div>
              <div style={{display:'grid',gap:8}}>
                {(reward.requirements||[]).map((r,i)=>(
                  <div key={i} className='glass' style={{padding:10, display:'grid', gap:6}}>
                    <input className='input' placeholder='Requirement text' value={r.text||''} onChange={e=>{
                      const n=(reward.requirements||[]).slice(); n[i]={...n[i],text:e.target.value}; setReward({...reward,requirements:n})
                    }}/>
                    <button className='btn' onClick={()=>{
                      setReward({...reward, requirements:(reward.requirements||[]).filter((_,idx)=>idx!==i)})
                    }}>Remove</button>
                  </div>
                ))}
                <button className='btn' onClick={()=>setReward({...reward, requirements:[...(reward.requirements||[]), {text:''}]})}>+ Add Requirement</button>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <label>CTA Label <input className='input' value={reward.ctaLabel||''} onChange={e=>setReward({...reward,ctaLabel:e.target.value})}/></label>
              <label>CTA Link <input className='input' value={reward.ctaHref||''} onChange={e=>setReward({...reward,ctaHref:e.target.value})}/></label>
              <label>CTA Target
                <select className='select' value={reward.ctaTarget||'_blank'} onChange={e=>setReward({...reward,ctaTarget:e.target.value})}>
                  <option value='_self'>_self</option><option value='_blank'>_blank</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* Links / Socials (from previous step) */}
        <div className='glass card' style={{gridColumn:'span 12'}}>
          <h3>Links / Socials</h3>
          <div className='small-note'>Add Discord, X/Twitter, Telegram, YouTube, TikTok, Instagram, or any website.</div>
          <div style={{display:'grid',gap:8}}>
            {(links||[]).map((row,i)=>(
              <div key={i} className='glass' style={{padding:10}}>
                <div style={{display:'grid',gap:6, gridTemplateColumns:'2fr 3fr 1fr auto', alignItems:'center'}}>
                  <input className='input' placeholder='Title (e.g., Discord)' value={row.title||''}
                         onChange={e=>updateLink(i,'title',e.target.value)}/>
                  <input className='input' placeholder='https://...' value={row.url||''}
                         onChange={e=>updateLink(i,'url',e.target.value)}/>
                  <select className='select' value={row.kind||'website'} onChange={e=>updateLink(i,'kind',e.target.value)}>
                    {KNOWN.map(k=> <option key={k} value={k}>{k}</option>)}
                  </select>
                  <button className='btn' onClick={()=>removeLink(i)}>Remove</button>
                </div>
              </div>
            ))}
            <button className='btn' onClick={addLink}>+ Add Link</button>
          </div>
        </div>

        {/* Save */}
        <div className='glass card' style={{gridColumn:'span 12', textAlign:'right'}}>
          <button className='btn accent' onClick={saveAll}>Save All</button>
        </div>
      </div>
    </div>
  )
}
