import React, { useEffect } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import Leaderboard from './pages/Leaderboard'
import Admin from './pages/Admin'
import { useKV, ThemeToggle, BGImage } from './components/Shared'
import './styles.css'

export default function App(){
  const {data:ui}=useKV('ui')
  const theme=ui?.theme||'dark'
  const bg=ui?.backgroundImage||import.meta.env.VITE_DEFAULT_BG_IMAGE
  useEffect(()=>{document.documentElement.setAttribute('data-theme',theme)},[theme])
  return (
    <div className='app'>
      <BGImage url={bg}/><div className='bg-overlay'/>
      <div className='header glass'>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:'var(--accent)'}}>{ui?.title??'Yeet Leaderboard'}</div>
          <div style={{opacity:.8}}>{ui?.subtitle??'Daily Wagers'}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Link className='btn' to='/'>Leaderboard</Link>
          <Link className='btn accent' to='/admin'>Admin</Link>
          <ThemeToggle/>
        </div>
      </div>
      <div className='container'>
        <Routes>
          <Route path='/' element={<Leaderboard/>}/>
          <Route path='/admin' element={<Admin/>}/>
        </Routes>
      </div>
    </div>
  )
}
