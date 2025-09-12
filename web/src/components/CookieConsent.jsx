import React, { useEffect, useState } from 'react'

const KEY = 'cookieConsent:v1'

export default function CookieConsent(){
  const [open, setOpen] = useState(false)

  useEffect(()=>{
    try {
      const v = localStorage.getItem(KEY)
      if (!v) setOpen(true)
    } catch {}
  },[])

  if (!open) return null

  const accept = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ acceptedAt: Date.now() })) } catch {}
    setOpen(false)
  }

  return (
    <div className="cookie-bar glass">
      <div className="cookie-text">
        We use local storage and cookies to keep your preferences (theme, settings) and improve your experience.
      </div>
      <div className="cookie-actions">
        <a className="btn" href="https://www.cookiesandyou.com/" target="_blank" rel="noreferrer">Learn more</a>
        <button className="btn accent" onClick={accept}>Accept</button>
      </div>
    </div>
  )
}
