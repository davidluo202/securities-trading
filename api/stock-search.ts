import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const q = ((req.query.q as string) || '').trim()
  if (!q) return res.json([])

  try {
    // Use Tencent smart search API - searches across all markets (A/HK/US)
    const url = `https://smartbox.gtimg.cn/s3/?v=2&q=${encodeURIComponent(q)}&t=all&c=1`
    const r = await fetch(url)
    const text = await r.text()

    // Response format: v_hint="code~name~market~...|code~name~market~..."
    const match = text.match(/v_hint="(.+)"/)
    if (!match || !match[1]) return res.json([])

    const items = match[1].split('^').filter(Boolean).map(item => {
      const parts = item.split('~')
      if (parts.length < 3) return null
      const code = parts[0] || ''
      const name = parts[1] || ''
      const market = parts[2] || '' // gp (A-share SH), sz (A-share SZ), hk (HK), us (US)

      // Determine market type from the category tag (5th field)
      const category = parts[3] || ''
      const typeTag = parts[4] || '' // GP, GP-A, ZS (index), ETF etc.

      let symbol = ''
      if (market === 'hk') {
        symbol = `${code}.HK`
      } else if (market === 'us') {
        // US codes come as "aapl.oq" or "tsla.oq" - extract ticker
        const ticker = code.split('.')[0].toUpperCase()
        symbol = ticker
      } else if (market === 'sh') {
        symbol = `${code}.SH`
      } else if (market === 'sz') {
        symbol = `${code}.SZ`
      } else {
        // Infer from code format
        if (/^\d{6}$/.test(code)) {
          if (code.startsWith('6')) symbol = `${code}.SH`
          else symbol = `${code}.SZ`
        } else {
          symbol = code.toUpperCase()
        }
      }

      // Skip indices (ZS) and ETFs for now, only show tradeable stocks
      if (typeTag === 'ZS' || typeTag === 'ETF') return null

      return { symbol, name, market }
    }).filter(Boolean).slice(0, 10)

    return res.json(items)
  } catch (error: any) {
    // Fallback to empty
    return res.json([])
  }
}
