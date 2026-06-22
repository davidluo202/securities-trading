import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const symbol = (req.query.symbol as string) || ''
  const days = Math.min(parseInt(req.query.days as string) || 30, 90)
  if (!symbol) return res.status(400).json({ error: 'Missing symbol param' })

  // First fetch current price from Tencent API to anchor the random walk
  let currentPrice = 100
  try {
    const upper = symbol.toUpperCase()
    let qqSym = ''
    if (upper.endsWith('.HK')) qqSym = 'hk' + upper.replace('.HK', '').padStart(5, '0')
    else if (upper.endsWith('.SH') || upper.endsWith('.SS')) qqSym = 'sh' + upper.replace(/\.(SH|SS)$/, '')
    else if (upper.endsWith('.SZ')) qqSym = 'sz' + upper.replace('.SZ', '')
    else qqSym = 'us' + upper

    const r = await fetch(`https://qt.gtimg.cn/q=${qqSym}`)
    const buffer = await r.arrayBuffer()
    const decoder = new TextDecoder('gbk')
    const text = decoder.decode(buffer)
    const match = text.match(/="([^"]*)"/)
    if (match?.[1]) {
      const parts = match[1].split('~')
      const p = parseFloat(parts[3])
      if (p > 0) currentPrice = p
    }
  } catch { /* use default */ }

  // Generate realistic price history via random walk backward from current price
  const prices: { date: string; close: number }[] = []
  let price = currentPrice
  const dailyVol = 0.015 // 1.5% daily volatility

  // Seed from symbol for deterministic-ish results within the same day
  let seed = 0
  for (let i = 0; i < symbol.length; i++) seed += symbol.charCodeAt(i)
  seed = seed * 31 + new Date().getDate()

  function seededRandom() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }

  // Walk backward from today
  const today = new Date()
  const dateList: string[] = []
  for (let d = 0; d < days; d++) {
    const dt = new Date(today)
    dt.setDate(dt.getDate() - d)
    // Skip weekends
    const dow = dt.getDay()
    if (dow === 0 || dow === 6) continue
    dateList.push(dt.toISOString().slice(0, 10))
  }
  dateList.reverse()

  // Build prices forward from an estimated start
  let val = currentPrice * (1 - dailyVol * Math.sqrt(dateList.length) * (seededRandom() - 0.3))
  for (let i = 0; i < dateList.length; i++) {
    if (i === dateList.length - 1) {
      val = currentPrice // ensure last point matches current
    } else {
      val = val * (1 + dailyVol * (seededRandom() - 0.48))
    }
    prices.push({ date: dateList[i], close: Number(val.toFixed(2)) })
  }

  return res.json({ symbol, prices })
}
