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

  // Minute-level periods use a different API
  const minutePeriods: Record<string, string> = {
    'm1': '1', 'm5': '5', 'm15': '15', 'm30': '30', 'm60': '60'
  }

  try {
    let candles: any[] = []

    if (minutePeriods[period]) {
      // Intraday minute kline API
      const mins = minutePeriods[period]
      const url = `https://ifzq.gtimg.cn/appstock/app/kline/mkline?param=${qqSymbol},m${mins},,${count}`
      const r = await fetch(url)
      const json = await r.json()
      const dataRoot = json?.data
      const stockData = dataRoot?.[qqSymbol] || (dataRoot ? Object.values(dataRoot)[0] as any : null)
      const rawCandles: any[] = stockData?.[`m${mins}`] || stockData?.['qt']?.[qqSymbol] || []
      candles = rawCandles.map((c: any) => ({
        time: c[0],   // "202606221430" or "2026-06-22 14:30"
        open: parseFloat(c[1]),
        close: parseFloat(c[2]),
        high: parseFloat(c[3]),
        low: parseFloat(c[4]),
        volume: parseFloat(c[5]) || 0,
      }))
    } else {
      // Daily/weekly/monthly kline API
      // Map period names: day, week, month
      const periodMap: Record<string, string> = {
        'day': 'day', 'week': 'week', 'month': 'month'
      }
      const kPeriod = periodMap[period] || 'day'
      const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${qqSymbol},${kPeriod},,,${count},qfq`
      const r = await fetch(url)
      const json = await r.json()
      const dataRoot = json?.data
      const stockData = dataRoot?.[qqSymbol] || (dataRoot ? Object.values(dataRoot)[0] as any : null)
      const rawCandles: any[] = stockData?.[`qfq${kPeriod}`] || stockData?.[kPeriod] || []
      candles = rawCandles.map((c: any) => ({
        time: c[0],
        open: parseFloat(c[1]),
        close: parseFloat(c[2]),
        high: parseFloat(c[3]),
        low: parseFloat(c[4]),
        volume: parseFloat(c[5]) || 0,
      }))
    }

    return res.json({ symbol, period, candles })
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}
