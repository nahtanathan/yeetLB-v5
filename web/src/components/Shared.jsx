import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useKV(key){
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(null)
  const refresh=useCallback(async()=>{
    setLoading(true)
    const {data,error}=await supabase.from('kv_settings').select('value').eq('key',key).maybeSingle()
    if(error) setError(error); setData(data?.value ?? null); setLoading(false)
  },[key])
  useEffect(()=>{refresh()},[refresh])
  const save=useCallback(async(value)=>{const {error}=await supabase.from('kv_settings').upsert({key,value}); if(error) throw error; setData(value)},[key])
  return {data,loading,error,save,refresh}
}

export function ThemeToggle(){
  const {data:ui,save}=useKV('ui'); const theme=ui?.theme||'dark'; const opposite=theme==='dark'?'light':'dark'
  return <button className='btn' onClick={async()=>{await save({...ui, theme: opposite})}}>{theme==='dark'?'Light':'Dark'} Mode</button>
}

export function BGImage({url}){ return <div className='bg-image' style={{backgroundImage:`url(${url})`}}/> }
