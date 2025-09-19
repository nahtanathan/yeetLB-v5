// web/src/pages/Admin.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useKV } from '../components/Shared'

export default function Admin(){
  /* -------- Auth -------- */
  const [session,setSession]=useState(null)
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
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
  const rewardKV       = useKV('reward')   // NEW

  /* -------- Local state -------- */
  const [ui,setUI] = useState({
    title:'', subtitle:'', timeframe:'24h', timezone:'CST',
    theme:'dark',
    // NEW theme knobs (premium palette)
    bg:'#0B1020', fg:'#E7ECF5', primary:'#6DA8FF', accent2:'#56E1FF',
    borderOpacity:0.12, radius:16,
    backgroundImage:''
  })
  const [prizes,setPrizes] = useState([])
  const [chaos,setChaos] = useState({enabled:true,songUrl:'/chaos.wav',durationMs:10000,intensity:1})
  const [integrations,setIntegrations] = useState({yeetApis:[]})
  const [countdown,setCountdown] = useState({enabled:false,label:'Ends in',endAt:''})
  const [reward,setReward] = useState({
    enabled:true,
    logoUrl:'/YEET-logo.png',
    logoSize:72,
    logoPadding:8,
    title:'$10 Free Balance',
    subtitle:'Claim a free $10 on-site balance',
    frequencyLabel:'DAILY',
    copyText:'',
    requirements:[
      { text:'Deposit $20+' },
      { text:'Wager $100+' },
      { text:'Open a ticket to claim your prize!' }
    ],
    ctaLabel:'REDEEM REWARD',
    ctaHref:'#',
    ctaTarget:'_blank'
  })

  // hydrate from KV
  useEffect(()=>{ if (uiKV.data) setUI({ ...ui, ...uiKV.data }) },[uiKV.data])
  useEffect(()=>{ if (Array.isArray(prizesKV.data)) setPrizes(prizesKV.data) },[prizesKV.data])
  useEffect(()=>{ if (chaosKV.data) setChaos(chaosKV.data) },[chaosKV.data])
  useEffect(()=>{ if (integrationsKV.data) setIntegrations(integrationsKV.data) },[integrationsKV.data])
  useEffect(()=>{ if (countdownKV.data) setCountdown(countdownKV.data) },[countdownKV.data])
  useEffect(()=>{ if (rewardKV.data) setReward({ ...reward, ...rewardKV.data }) },[rewardKV.data])

  const saveAll = async ()=>{
    await uiKV.save(ui||{})
    await prizesKV.save(prizes||[])
    await chaosKV.save(chaos||{})
    await integrationsKV.save(integrations||{yeetApis:[]})
    await countdownKV.save(countdown||{enabled:false})
    await rewardKV.save(reward||{})
    alert('Saved to Supabase ✅')
  }

  /* -------- helpers (Prizes & APIs) -------- */
  const addPrize     = ()=> setPrizes([...(prizes||[]), {name:'', amount:''}])
  const updatePrize  = (i,f,v)=>{ const n=prizes.slice(); n[i]={...n[i],[f]:v}; setPrizes(n) }
  const removePrize  = (i)=> setPrizes(prizes.filter((_,idx)=>idx!==i))

  const addApi = ()=> setIntegrations({
    ...integrations,
    yeetApis:[
      ...(integrations.yeetApis||[]),
      {
        name:'Referrals Volume',
        endpoint:'https://api.yeet.com/concierge/public/affiliate/referrals',
        apiKey:'',
        startDate:'',
        endDate:'',
        useProxy:true,
        proxyBase:(import.meta.env.VITE_PROXY_BASE||'')
      }
    ]
  })
  const updateApi = (i,f,v)=>{ 
    const n=(integrations.yeetApis||[]).slice()
    n[i]={...n[i],[f]:v}
    setIntegrations({...integrations, yeetApis:n})
  }
  const removeApi = (i)=>{
    const n=(integrations.yeetApis||[]).filter((_,idx)=>idx!==i)
    setIntegrations({...integrations, yeetApis:n})
  }

  // reward helpers
  const addReq = ()=> setReward({...reward, requirements:[...(reward.requirements||[]), {text:''}]})
  const updateReq = (i,v)=> {
    const n=(reward.requirements||[]).slice()
    n[i]={...n[i], text:v}
    setReward({...reward, requirements:n})
  }
  const removeReq = (i)=> setReward({...reward, requirements:(reward.requirements||[]).filter((_,idx)=>idx!==i)})

  /* -------- Login screen -------- */
  if (!session){
    return (
      <div className='glass card' style={{maxWidth:420,margin:'40px auto'}}>
        <h2 style={{marginTop:0}}>Admin Login</h2>
        <form onSubmit={signIn} style={{display:'grid',gap:10}}>
          <input className='input' type='email' placeholder='Email' value={email} onChange={e=>setEmail(e.target.value)} required/>
          <input className='input' type='password' placeholder='Password' value={password} onChange={e=>setPassword(e.target.value)} required/>
          {authError && <div style={{color:'#ff6b6b'}}>{authError}</div>}
          <button className='btn accent' type='submit'>Sign in</button>
        </form>
        <div className='small-note' style={{marginTop:10}}>
          Enable Email auth in Supabase and create a user.  
          (Writes are restricted by RLS to <code>public.admins</code>.)
        </div>
      </div>
    )
  }

  /* -------- Admin dashboard -------- */
  return (
    <div>
      <div className='glass card' style={{marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h2 style={{marginTop:0}}>Admin</h2>
          <div className='small-note'>Signed in as {session.user.email}</div>
        </div>
        <button className='btn' onClick={signOut}>Sign out</button>
      </div>

      <div className='grid'>
        {/* UI */}
        <div className='glass card' style={{gridColumn:'span 6'}}>
          <h3>UI</h3>
          <div style={{display:'grid',gap:8}}>
            <label>Title
              <input className='input' value={ui?.title||''} onChange={e=>setUI({...ui,title:e.target.value})}/>
            </label>
            <label>Subtitle
              <input className='input' value={ui?.subtitle||''} onChange={e=>setUI({...ui,subtitle:e.target.value})}/>
            </label>
            <label>Timeframe label
              <input className='input' value={ui?.timeframe||''} onChange={e=>setUI({...ui,timeframe:e.target.value})}/>
            </label>
            <label>Timezone label
              <input className='input' value={ui?.timezone||''} onChange={e=>setUI({...ui,timezone:e.target.value})}/>
            </label>
            <label>Theme
              <select className='select' value={ui?.theme||'dark'} onChange={e=>setUI({...ui,theme:e.target.value})}>
                <option value='dark'>dark</option>
                <option value='light'>light</option>
              </select>
            </label>
            <label>Background Image URL
              <input className='input' value={ui?.backgroundImage||''} onChange={e=>setUI({...ui,backgroundImage:e.target.value})}/>
            </label>

            <div className='section-divider' />

            <div style={{fontWeight:700}}>Premium Palette</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2, minmax(0,1fr))',gap:8}}>
              <label>Background
                <input className='input' value={ui?.bg||''} onChange={e=>setUI({...ui,bg:e.target.value})}/>
              </label>
              <label>Foreground
                <input className='input' value={ui?.fg||''} onChange={e=>setUI({...ui,fg:e.target.value})}/>
              </label>
              <label>Primary / Accent
                <input className='input' value={ui?.primary||''} onChange={e=>setUI({...ui,primary:e.target.value})}/>
              </label>
              <label>Accent 2
                <input className='input' value={ui?.accent2||''} onChange={e=>setUI({...ui,accent2:e.target.value})}/>
              </label>
              <label>Border Opacity (0–.3)
                <input className='input' type='number' step='0.01' value={ui?.borderOpacity ?? 0.12}
                       onChange={e=>setUI({...ui,borderOpacity:Number(e.target.value)})}/>
              </label>
              <label>Radius (px)
                <input className='input' type='number' value={ui?.radius ?? 16}
                       onChange={e=>setUI({...ui,radius:Number(e.target.value)})}/>
              </label>
            </div>
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
          <div className='small-note'>
            Add multiple APIs. Each can call directly or via proxy. The leaderboard merges results by username.
          </div>
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
                  <label>
                    <input type='checkbox' checked={!!api.useProxy} onChange={e=>updateApi(i,'useProxy',e.target.checked)}/> Use Proxy
                  </label>
                  <input className='input' placeholder='Proxy Base (e.g., https://your-proxy.onrender.com)'
                         value={api.proxyBase||''} onChange={e=>updateApi(i,'proxyBase',e.target.value)}/>
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
            <label>Label
              <input className='input' placeholder='Ends in'
                     value={countdown.label||''}
                     onChange={e=>setCountdown({...countdown,label:e.target.value})}/>
            </label>
            <label>End date/time
              <input
                className='input'
                type='datetime-local'
                value={(countdown.endAt ? new Date(countdown.endAt) : new Date()).toISOString().slice(0,16)}
                onChange={e=>{
                  const iso = new Date(e.target.value).toISOString()
                  setCountdown({...countdown,endAt:iso})
                }}
              />
            </label>
          </div>
        </div>

        {/* Reward Card Config */}
        <div className='glass card' style={{gridColumn:'span 12'}}>
          <h3>Reward Card</h3>
          <label style={{display:'block',marginBottom:8}}>
            <input type='checkbox' checked={!!reward.enabled}
                   onChange={e=>setReward({...reward,enabled:e.target.checked})}/> Enabled
          </label>

          <div style={{display:'grid',gap:8, maxWidth:900}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:8}}>
              <label>Logo URL
                <input className='input' placeholder='/YEET-logo.png' value={reward.logoUrl||''}
                       onChange={e=>setReward({...reward,logoUrl:e.target.value})}/>
              </label>
              <label>Logo Size (px)
                <input className='input' type='number' value={Number(reward.logoSize ?? 72)}
                       onChange={e=>setReward({...reward,logoSize:Number(e.target.value)})}/>
              </label>
              <label>Logo Padding (px)
                <input className='input' type='number' value={Number(reward.logoPadding ?? 8)}
                       onChange={e=>setReward({...reward,logoPadding:Number(e.target.value)})}/>
              </label>
            </div>

            <label>Title
              <input className='input' value={reward.title||''}
                     onChange={e=>setReward({...reward,title:e.target.value})}/>
            </label>
            <label>Subtitle
              <input className='input' value={reward.subtitle||''}
                     onChange={e=>setReward({...reward,subtitle:e.target.value})}/>
            </label>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <label>Frequency label
                <input className='input' placeholder='DAILY'
                       value={reward.frequencyLabel||''}
                       onChange={e=>setReward({...reward,frequencyLabel:e.target.value})}/>
              </label>
              <label>Copy text (optional)
                <input className='input' placeholder='RAZED2025'
                       value={reward.copyText||''}
                       onChange={e=>setReward({...reward,copyText:e.target.value})}/>
              </label>
            </div>

            <div>
              <div style={{fontWeight:700, margin:'8px 0'}}>Checklist</div>
              <div style={{display:'grid',gap:8}}>
                {(reward.requirements||[]).map((r,i)=>(
                  <div key={i} className='glass' style={{padding:10, display:'grid', gap:6}}>
                    <input className='input' placeholder='Requirement text' value={r.text||''}
                           onChange={e=>updateReq(i, e.target.value)}/>
                    <button className='btn' onClick={()=>removeReq(i)}>Remove</button>
                  </div>
                ))}
                <button className='btn' onClick={addReq}>+ Add Requirement</button>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              <label>CTA Label
                <input className='input' placeholder='REDEEM REWARD'
                       value={reward.ctaLabel||''}
                       onChange={e=>setReward({...reward,ctaLabel:e.target.value})}/>
              </label>
              <label>CTA Link
                <input className='input' placeholder='https://...'
                       value={reward.ctaHref||''}
                       onChange={e=>setReward({...reward,ctaHref:e.target.value})}/>
              </label>
              <label>CTA Target
                <select className='select' value={reward.ctaTarget||'_blank'}
                        onChange={e=>setReward({...reward,ctaTarget:e.target.value})}>
                  <option value='_self'>_self</option>
                  <option value='_blank'>_blank</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* Chaos (settings only) */}
        <div className='glass card' style={{gridColumn:'span 12'}}>
          <h3>Chaos Button (settings only)</h3>
          <label style={{display:'block',marginBottom:8}}>
            <input type='checkbox' checked={!!chaos?.enabled}
                   onChange={e=>setChaos({...chaos,enabled:e.target.checked})}/> Enabled
          </label>
          <div style={{display:'grid',gap:8,maxWidth:600}}>
            <label>Song URL
              <input className='input' value={chaos?.songUrl||''}
                     onChange={e=>setChaos({...chaos,songUrl:e.target.value})}/>
            </label>
            <label>Duration (ms)
              <input className='input' type='number' value={chaos?.durationMs||10000}
                     onChange={e=>setChaos({...chaos,durationMs:Number(e.target.value)})}/>
            </label>
            <label>Intensity (0.5–2.0)
              <input className='input' type='number' step='0.1' value={chaos?.intensity||1}
                     onChange={e=>setChaos({...chaos,intensity:Number(e.target.value)})}/>
            </label>
          </div>
          <div className='small-note' style={{marginTop:10}}>
            The red “Don’t press this” trigger appears on the public Leaderboard page.
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
