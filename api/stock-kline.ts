import type { VercelRequest, VercelResponse } from '@vercel/node'

function toTencentSymbol(symbol: string): string {
  const upper = symbol.toUpperCase()
  if (upper.endsWith('.HK')) return 'hk' + upper.replace('.HK', '').padStart(5, '0')
  if (upper.endsWith('.SH') || upper.endsWith('.SS')) return 'sh' + upper.replace(/\.(SH|SS)$/, '')
  if (upper.endsWith('.SZ')) return 'sz' + upper.replace('.SZ', '')
  return 'us' + upper
}

// Aggregate 1-min ticks into N-minute OHLC candles
function aggregateTicks(ticks: { time: string; price: number; volume: number }[], intervalMin: number) {
  if (ticks.length === 0) return []
  const candles: any[] = []
  let bucket: typeof ticks = []
  let bucketStart = ''

  for (const tick of ticks) {
    // tick.time = "HHMM"
    const hh = parseInt(tick.time.slice(0, 2))
    const mm = parseInt(tick.time.slice(2, 4))
    const totalMin = hh * 60 + mm
    const bucketMin = Math.floor(totalMin / intervalMin) * intervalMin
    const bHH = String(Math.floor(bucketMin / 60)).padStart(2, '0')
    const bMM = String(bucketMin % 60).padStart(2, '0')
    const key = `${bHH}${bMM}`

    if (bucketStart && key !== bucketStart) {
      // Flush bucket
      const prices = bucket.map(t => t.price)
      const vol = bucket.reduce((s, t) => s + t.volume, 0)
      candles.push({
        time: bucketStart,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
        volume: vol,
      })
      bucket = []
    }
    bucketStart = key
    bucket.push(tick)
  }
  // Flush last bucket
  if (bucket.length > 0) {
    const prices = bucket.map(t => t.price)
    const vol = bucket.reduce((s, t) => s + t.volume, 0)
    candles.push({
      time: bucketStart,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume: vol,
    })
  }
  return candles
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

  const minutePeriods: Record<string, number> = {
    'm1': 1, 'm5': 5, 'm15': 15, 'm30': 30, 'm60': 60
  }

  try {
    let candles: any[] = []

    if (minutePeriods[period]) {
      // Fetch intraday tick data from Tencent minute API
      const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${qqSymbol}`
      const r = await fetch(url)
      const json = await r.json()
      const stockData = json?.data?.[qqSymbol]?.data?.data

      if (stockData && typeof stockData === 'string') {
        // Single string with newline-separated ticks
        const lines = stockData.split('\n').filter((l: string) => l.trim())
        const ticks = lines.map((line: string) => {
          const parts = line.trim().split(' ')
          return { time: parts[0], price: parseFloat(parts[1]), volume: parseFloat(parts[2]) || 0 }
        }).filter((t: any) => !isNaN(t.price))

        candles = aggregateTicks(ticks, minutePeriods[period])
      } else if (Array.isArray(stockData)) {
        // Array of "HHMM price volume turnover" strings
        const ticks = stockData.map((line: string) => {
          const parts = line.trim().split(' ')
          return { time: parts[0], price: parseFloat(parts[1]), volume: parseFloat(parts[2]) || 0 }
        }).filter((t: any) => !isNaN(t.price))

        candles = aggregateTicks(ticks, minutePeriods[period])
      }
    } else {
      // Daily/weekly/monthly kline
      const periodMap: Record<string, string> = { 'day': 'day', 'week': 'week', 'month': 'month' }
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
