import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
const PORT = process.env.PORT || 10000
const allowOrigin = process.env.CORS_ALLOW_ORIGIN || '*'
app.use(cors({ origin: allowOrigin }))
app.use(express.json())

app.get('/', (_req, res) => res.json({ ok: true }))

app.post('/api/yeet/fetch', async (req, res) => {
  try {
    const { endpoint, startDate, endDate } = req.body || {}
    const apiKey = req.headers['x-forward-yeet-key']
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' })
    if (!apiKey) return res.status(400).json({ error: 'x-forward-yeet-key required' })

    const url = new URL(endpoint)
    if (startDate) url.searchParams.set('startDate', startDate)
    if (endDate) url.searchParams.set('endDate', endDate)

    const r = await fetch(url.toString(), { headers: { 'x-yeet-api-key': apiKey } })
    const text = await r.text()
    res.status(r.status).set('content-type', r.headers.get('content-type') || 'application/json').send(text)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

app.listen(PORT, () => console.log('Proxy listening on', PORT))
