import type { VercelRequest, VercelResponse } from '@vercel/node'

// Common HK stock name mappings for English name search
const HK_NAME_MAP: Record<string, string> = {
  'hsbc': '00005.HK', 'tencent': '00700.HK', 'alibaba': '09988.HK', 'meituan': '03690.HK',
  'jd': '09618.HK', 'xiaomi': '01810.HK', 'byd': '01211.HK', 'aia': '01299.HK',
  'ping an': '02318.HK', 'icbc': '01398.HK', 'ccb': '00939.HK', 'boc': '03988.HK',
  'china mobile': '00941.HK', 'petrochina': '00857.HK', 'sinopec': '00386.HK',
  'cnooc': '00883.HK', 'lenovo': '00992.HK', 'geely': '00175.HK', 'li auto': '02015.HK',
  'nio': '09866.HK', 'netease': '09999.HK', 'baidu': '09888.HK', 'kuaishou': '01024.HK',
  'citic': '00267.HK', 'ck hutchison': '00001.HK', 'sun hung kai': '00016.HK',
  'henderson': '00012.HK', 'new world': '00017.HK', 'wharf': '00004.HK',
  'galaxy entertainment': '00027.HK', 'sands china': '01928.HK',
}

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
      // Tencent format: market~code~name~pinyin~typeTag
      const market = parts[0] || ''
      const code = parts[1] || ''
      const name = parts[2] || ''
      const typeTag = parts[4] || ''

      let symbol = ''
      if (market === 'hk') {
        symbol = `${code}.HK`
      } else if (market === 'us') {
        const ticker = code.split('.')[0].toUpperCase()
        symbol = ticker
      } else if (market === 'sh') {
        symbol = `${code}.SH`
      } else if (market === 'sz') {
        symbol = `${code}.SZ`
      } else {
        if (/^\d{6}$/.test(code)) {
          if (code.startsWith('6')) symbol = `${code}.SH`
          else symbol = `${code}.SZ`
        } else {
          symbol = code.toUpperCase()
        }
      }

      if (typeTag === 'ZS' || typeTag === 'ETF') return null
      return { symbol, name, market }
    }).filter(Boolean) as { symbol: string; name: string; market: string }[]

    // Pure numeric query: prioritize HK stocks (pad with leading zeros for HK format)
    const isNumeric = /^\d+$/.test(q)
    if (isNumeric) {
      // Sort HK stocks first, then A-shares, then US
      items.sort((a, b) => {
        const aHK = a.symbol.endsWith('.HK') ? 0 : 1
        const bHK = b.symbol.endsWith('.HK') ? 0 : 1
        return aHK - bHK
      })
    }

    // English name search: check local HK name map first
    const qLower = q.toLowerCase()
    const localMatch = HK_NAME_MAP[qLower]
    if (localMatch && !items.some(i => i.symbol === localMatch)) {
      // Prepend the local match
      const code = localMatch.replace('.HK', '')
      items.unshift({ symbol: localMatch, name: `${qLower.toUpperCase()} (${code}.HK)`, market: 'hk' })
    }

    return res.json(items.slice(0, 10))
  } catch (error: any) {
    return res.json([])
  }
}
