import type { VercelRequest, VercelResponse } from '@vercel/node'

interface StockEntry {
  symbol: string
  name: string
  pinyin: string
}

const STOCKS: StockEntry[] = [
  // HK stocks
  { symbol: '0700.HK', name: '腾讯控股', pinyin: 'txkg' },
  { symbol: '9988.HK', name: '阿里巴巴-SW', pinyin: 'albb' },
  { symbol: '9618.HK', name: '京东集团-SW', pinyin: 'jdjt' },
  { symbol: '1810.HK', name: '小米集团-W', pinyin: 'xmjt' },
  { symbol: '0388.HK', name: '香港交易所', pinyin: 'xgjys' },
  { symbol: '2318.HK', name: '中国平安', pinyin: 'zgpa' },
  { symbol: '3690.HK', name: '美团-W', pinyin: 'mt' },
  { symbol: '0005.HK', name: '汇丰控股', pinyin: 'hfkg' },
  { symbol: '0941.HK', name: '中国移动', pinyin: 'zgyd' },
  { symbol: '1024.HK', name: '快手-W', pinyin: 'ks' },
  { symbol: '9999.HK', name: '网易-S', pinyin: 'wy' },
  { symbol: '0175.HK', name: '吉利汽车', pinyin: 'jlqc' },
  { symbol: '2269.HK', name: '药明生物', pinyin: 'ymsw' },
  { symbol: '0027.HK', name: '银河娱乐', pinyin: 'yhyl' },
  { symbol: '1211.HK', name: '比亚迪股份', pinyin: 'bydgf' },
  { symbol: '0883.HK', name: '中国海洋石油', pinyin: 'zghysy' },
  { symbol: '0016.HK', name: '新鸿基地产', pinyin: 'xhjdc' },
  { symbol: '0001.HK', name: '长和', pinyin: 'ch' },
  { symbol: '9888.HK', name: '百度集团-SW', pinyin: 'bdjt' },
  { symbol: '2020.HK', name: '安踏体育', pinyin: 'atty' },
  // US stocks
  { symbol: 'AAPL', name: '苹果', pinyin: 'pg' },
  { symbol: 'TSLA', name: '特斯拉', pinyin: 'tsl' },
  { symbol: 'NVDA', name: '英伟达', pinyin: 'ywd' },
  { symbol: 'MSFT', name: '微软', pinyin: 'wr' },
  { symbol: 'GOOGL', name: '谷歌', pinyin: 'gg' },
  { symbol: 'AMZN', name: '亚马逊', pinyin: 'yms' },
  { symbol: 'META', name: '脸书', pinyin: 'ls' },
  { symbol: 'NFLX', name: '奈飞', pinyin: 'nf' },
  { symbol: 'BABA', name: '阿里巴巴', pinyin: 'albb' },
  { symbol: 'JD', name: '京东', pinyin: 'jd' },
  { symbol: 'PDD', name: '拼多多', pinyin: 'pdd' },
  { symbol: 'NIO', name: '蔚来', pinyin: 'wl' },
  { symbol: 'XPEV', name: '小鹏汽车', pinyin: 'xpqc' },
  { symbol: 'LI', name: '理想汽车', pinyin: 'lxqc' },
  { symbol: 'BIDU', name: '百度', pinyin: 'bd' },
]

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const q = ((req.query.q as string) || '').trim().toLowerCase()
  if (!q) return res.json([])

  const results = STOCKS.filter(s => {
    const code = s.symbol.toLowerCase()
    if (code.includes(q)) return true
    if (s.name.includes(q)) return true
    if (s.pinyin.startsWith(q)) return true
    return false
  }).slice(0, 10)

  return res.json(results.map(s => ({ symbol: s.symbol, name: s.name, pinyin: s.pinyin })))
}
