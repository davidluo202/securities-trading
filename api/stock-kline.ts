import type { VercelRequest, VercelResponse } from '@vercel/node'

function toTencentSymbol(symbol: string): string {
  const upper = symbol.toUpperCase()
  if (upper.endsWith('.HK')) return 'hk' + upper.replace('.HK', '').padStart(5, '0')
  if (upper.endsWith('.SH') || upper.endsWith('.SS')) return 'sh' + upper.replace(/\.(SH|SS)$/, '')
  if (upper.endsWith('.SZ')) return 'sz' + upper.replace('.SZ', '')
  return 'us' + upper
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const symbol = (req.query.symbol as string) || ''
  const period = (req.query.period as string) || 'day'
  const count = Math.min(parseInt(req.query.count as string) || 120, 500)
  if (!symbol) return res.status(400).json({ error: 'Missing symbol param' })

  const qqSymbol = toTencentSymbol(symbol)
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${qqSymbol},${period},,,${count},qfq`

  try {
    const r = await fetch(url)
    const json = await r.json()

    // Response shape: { code: 0, data: { "hk00700": { day: [...], qfqday: [...] } } }
    const dataRoot = json?.data
    if (!dataRoot) return res.json({ symbol, period, candles: [] })

    // The key is the tencent symbol
    const stockData = dataRoot[qqSymbol] || Object.values(dataRoot)[0] as any
    if (!stockData) return res.json({ symbol, period, candles: [] })

    // Try qfqday first (forward-adjusted), then the period key
    const rawCandles: any[] = stockData[`qfq${period}`] || stockData[period] || []

    const candles = rawCandles.map((c: any) => ({
      time: c[0],                      // "2026-01-15"
      open: parseFloat(c[1]),
      close: parseFloat(c[2]),
      high: parseFloat(c[3]),
      low: parseFloat(c[4]),
      volume: parseFloat(c[5]) || 0,
    }))

    return res.json({ symbol, period, candles })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}
