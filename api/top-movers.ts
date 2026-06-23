import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 's-maxage=60')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const market = (req.query.market as string) || 'hk'

  try {
    let items: any[] = []

    if (market === 'a') {
      // Sina A-share top gainers (works reliably)
      const url = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=5&sort=changepercent&asc=0&node=hs_a'
      const r = await fetch(url, { headers: { 'Referer': 'https://finance.sina.com.cn' } })
      const data = await r.json()
      items = (data || [])
        .filter((s: any) => s.name !== 'FAILED' && parseFloat(s.changepercent) > 0)
        .map((s: any) => {
          const code = s.code || ''
          const sym = s.symbol || ''
          const suffix = sym.startsWith('sh') ? '.SH' : '.SZ'
          return {
            symbol: `${code}${suffix}`,
            name: s.name || '',
            price: parseFloat(s.trade) || 0,
            change: parseFloat(s.pricechange) || 0,
            changePercent: parseFloat(s.changepercent) || 0,
          }
        }).slice(0, 5)
    } else if (market === 'hk') {
      // Use Tencent quotes for a list of popular HK stocks, sort by change%
      const symbols = 'hk00700,hk09988,hk09618,hk01810,hk00388,hk02318,hk03690,hk00005,hk00941,hk01024,hk09999,hk00175,hk02269,hk00027,hk01211,hk00883,hk09888,hk02020,hk01299,hk00016'
      const url = `https://qt.gtimg.cn/q=${symbols}`
      const r = await fetch(url)
      const buf = await r.arrayBuffer()
      const text = new TextDecoder('gbk').decode(buf)
      const lines = text.split(';').filter((l: string) => l.includes('~'))
      items = lines.map((line: string) => {
        const parts = line.split('~')
        if (parts.length < 45) return null
        const code = parts[2] || ''
        return {
          symbol: code.replace(/^hk/i, '') + '.HK',
          name: parts[1] || '',
          price: parseFloat(parts[3]) || 0,
          change: parseFloat(parts[31]) || 0,
          changePercent: parseFloat(parts[32]) || 0,
        }
      }).filter((i: any) => i && i.changePercent > 0)
        .sort((a: any, b: any) => b.changePercent - a.changePercent)
        .slice(0, 5)
    } else if (market === 'us') {
      // Use Tencent quotes for popular US stocks
      const symbols = 'usAAPL,usTSLA,usNVDA,usMSFT,usGOOGL,usAMZN,usMETA,usNFLX,usPDD,usBABA,usJD,usNIO,usBIDU,usXPEV,usLI'
      const url = `https://qt.gtimg.cn/q=${symbols}`
      const r = await fetch(url)
      const buf = await r.arrayBuffer()
      const text = new TextDecoder('gbk').decode(buf)
      const lines = text.split(';').filter((l: string) => l.includes('~'))
      items = lines.map((line: string) => {
        const parts = line.split('~')
        if (parts.length < 45) return null
        return {
          symbol: (parts[2] || '').replace(/^us/i, ''),
          name: parts[1] || '',
          price: parseFloat(parts[3]) || 0,
          change: parseFloat(parts[31]) || 0,
          changePercent: parseFloat(parts[32]) || 0,
        }
      }).filter((i: any) => i && i.changePercent > 0)
        .sort((a: any, b: any) => b.changePercent - a.changePercent)
        .slice(0, 5)
    }

    return res.json({ market, items })
  } catch (error: any) {
    return res.json({ market, items: [], error: error.message })
  }
}
