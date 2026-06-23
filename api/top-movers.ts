import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 's-maxage=60')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const market = (req.query.market as string) || 'hk' // hk, a, us

  try {
    let items: any[] = []

    if (market === 'hk') {
      // Tencent HK top gainers
      const url = 'https://proxy.finance.qq.com/ifzqgtimg/appstock/app/HkRank/HkRankList?type=rise&market=00&page=0&num=5'
      const r = await fetch(url)
      const json = await r.json()
      const list = json?.data?.rank_data || []
      items = list.map((item: any) => ({
        symbol: item.code ? `${item.code}.HK` : '',
        name: item.name || '',
        price: parseFloat(item.price) || 0,
        change: parseFloat(item.change) || 0,
        changePercent: parseFloat(item.changepercent) || 0,
      })).filter((i: any) => i.symbol && i.changePercent > 0).slice(0, 5)
    } else if (market === 'a') {
      // Tencent A-share top gainers (SH + SZ)
      const url = 'https://proxy.finance.qq.com/ifzqgtimg/appstock/app/mktRank/rank?type=rise&market=sh&page=0&num=5'
      const r = await fetch(url)
      const text = await r.text()
      try {
        const json = JSON.parse(text)
        const list = json?.data?.rank_data || []
        items = list.map((item: any) => {
          const code = item.code || ''
          const suffix = code.startsWith('6') ? '.SH' : '.SZ'
          return {
            symbol: `${code}${suffix}`,
            name: item.name || '',
            price: parseFloat(item.price) || 0,
            change: parseFloat(item.change) || 0,
            changePercent: parseFloat(item.changepercent) || 0,
          }
        }).filter((i: any) => i.changePercent > 0).slice(0, 5)
      } catch {
        // Fallback: use Sina API
        const sinaUrl = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=1&num=5&sort=changepercent&asc=0&node=hs_a&symbol=&_s_r_a=sort'
        try {
          const sr = await fetch(sinaUrl, { headers: { 'Referer': 'https://finance.sina.com.cn' } })
          const stext = await sr.text()
          const sdata = JSON.parse(stext)
          items = (sdata || []).map((s: any) => ({
            symbol: s.symbol?.startsWith('sh') ? `${s.symbol.slice(2)}.SH` : `${s.symbol?.slice(2)}.SZ`,
            name: s.name || '',
            price: parseFloat(s.trade) || 0,
            change: parseFloat(s.pricechange) || 0,
            changePercent: parseFloat(s.changepercent) || 0,
          })).filter((i: any) => i.changePercent > 0).slice(0, 5)
        } catch { /* silent */ }
      }
    } else if (market === 'us') {
      // Use a simple approach: fetch popular US stocks and sort
      const symbols = 'usAAPL,usTSLA,usNVDA,usMSFT,usGOOGL,usAMZN,usMETA,usNFLX,usPDD,usBABA,usJD,usNIO,usBIDU'
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
