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
      // Tencent quotes for 40+ popular HK stocks, sort by change% to get real top gainers
      const symbols = 'hk00700,hk09988,hk09618,hk01810,hk00388,hk02318,hk03690,hk00005,hk00941,hk01024,hk09999,hk00175,hk02269,hk00027,hk01211,hk00883,hk09888,hk02020,hk01299,hk00016,hk02382,hk01833,hk06060,hk00669,hk01177,hk02628,hk03988,hk01398,hk00857,hk00386,hk02601,hk03968,hk01288,hk00981,hk02388,hk01109,hk00267,hk06618,hk01928,hk01876,hk00241,hk02007,hk06862,hk09626,hk01347,hk02015,hk09961,hk09698,hk01797,hk00020'
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
      // Tencent quotes for 30+ US stocks, use latest close data
      const symbols = 'usAAPL,usTSLA,usNVDA,usMSFT,usGOOGL,usAMZN,usMETA,usNFLX,usPDD,usBABA,usJD,usNIO,usBIDU,usXPEV,usLI,usCOIN,usPLTR,usSOFI,usAMD,usINTC,usTSM,usCRM,usORCL,usABBV,usV,usMA,usJPM,usGS,usWMT,usCOST'
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
