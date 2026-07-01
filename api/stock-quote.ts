import type { VercelRequest, VercelResponse } from '@vercel/node'

function toTencentSymbol(symbol: string): string {
  const upper = symbol.toUpperCase()
  if (upper.endsWith('.HK')) return 'hk' + upper.replace('.HK', '').padStart(5, '0')
  if (upper.endsWith('.SH') || upper.endsWith('.SS')) return 'sh' + upper.replace(/\.(SH|SS)$/, '')
  if (upper.endsWith('.SZ')) return 'sz' + upper.replace('.SZ', '')
  // US stock
  return 'us' + upper
}

interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  volume: string
  turnover: string
  prevClose: number
  high52w: number
  low52w: number
  marketCap: string
  totalShares: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const symbols = (req.query.symbols as string) || ''
  if (!symbols) return res.status(400).json({ error: 'Missing symbols param' })

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean)
  const qqSymbols = symbolList.map(toTencentSymbol)
  const url = `https://qt.gtimg.cn/q=${qqSymbols.join(',')}`

  try {
    const r = await fetch(url)
    const buffer = await r.arrayBuffer()
    const decoder = new TextDecoder('gbk')
    const text = decoder.decode(buffer)

    const results: StockQuote[] = []
    // Each quote is a separate v_xxx="..." line
    const lines = text.split(';').filter(l => l.includes('="'))

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/="([^"]*)"/)
      if (!match || !match[1]) {
        results.push({ symbol: symbolList[i] || '', name: '', price: 0, change: 0, changePercent: 0, open: 0, high: 0, low: 0, volume: '', turnover: '', prevClose: 0, high52w: 0, low52w: 0, marketCap: '', totalShares: '' })
        continue
      }
      const parts = match[1].split('~')
      const sym = symbolList[i] || ''
      const name = parts[1] || ''
      const price = parseFloat(parts[3]) || 0
      const prevClose = parseFloat(parts[4]) || 0
      const open = parseFloat(parts[5]) || 0
      const high = parseFloat(parts[33]) || parseFloat(parts[41]) || 0
      const low = parseFloat(parts[34]) || parseFloat(parts[42]) || 0
      const volume = parts[6] || parts[36] || '0'
      const turnover = parts[37] || parts[35] || '0'
      const high52w = parseFloat(parts[33]) || parseFloat(parts[48]) || 0
      const low52w = parseFloat(parts[34]) || parseFloat(parts[49]) || 0
      const totalShares = parts[38] || parts[44] || ''
      const marketCap = parts[45] || ''
      const change = price - prevClose
      const changePercent = prevClose > 0 ? Number((change / prevClose * 100).toFixed(2)) : 0

      results.push({
        symbol: sym,
        name,
        price,
        change: Number(change.toFixed(4)),
        changePercent,
        open,
        high,
        low,
        volume,
        turnover,
        prevClose,
        high52w,
        low52w,
        marketCap,
        totalShares,
      })
    }

    return res.json(results)
  } catch (error: any) {
    return res.status(500).json({ error: error.message })
  }
}
