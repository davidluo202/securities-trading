<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()
const router = useRouter()

function goStock(symbol: string) {
  router.push(`/sec/stock/${encodeURIComponent(symbol)}`)
}

const activeList = ref<'watchlist' | 'hsi' | 'hstech'>('watchlist')

const FALLBACK_WATCHLIST = '0700.HK,9988.HK,9618.HK,1810.HK,0388.HK,2318.HK,3690.HK,AAPL,TSLA,NVDA'

// Read from localStorage sec-watchlist (newest first), fall back to default
const savedWatchlist = (() => {
  try {
    const raw = localStorage.getItem('sec-watchlist')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((s: { symbol: string }) => s.symbol).join(',')
      }
    }
  } catch { /* silent */ }
  return ''
})()
const DEFAULT_WATCHLIST = savedWatchlist || FALLBACK_WATCHLIST

interface StockData {
  symbol: string; name: string; price: number; change: number; changePercent: number
  volume: string; prevClose: number
}

const stocks = ref<StockData[]>([])
const loading = ref(true)
let pollTimer: ReturnType<typeof setInterval> | null = null

async function fetchWatchlist() {
  try {
    const res = await fetch(`/api/stock-quote?symbols=${DEFAULT_WATCHLIST}`)
    if (res.ok) stocks.value = await res.json()
  } catch { /* silent */ }
  loading.value = false
}

const sparklineCache = ref<Record<string, string>>({})

function pricesToSparkline(prices: number[]): string {
  if (prices.length < 2) return ''
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const step = 80 / (prices.length - 1)
  return prices.map((p, i) => {
    const x = (i * step).toFixed(1)
    const y = (29 - ((p - min) / range) * 28).toFixed(1)
    return `${x},${y}`
  }).join(' ')
}

function generateSparkline(price: number, prevClose: number): string {
  const points: string[] = []
  const seed = Math.abs(price * 100) | 0
  let val = prevClose > 0 ? prevClose : price * 0.99
  for (let i = 0; i <= 8; i++) {
    const noise = ((seed * (i + 1) * 7 + 13) % 100 - 50) / 500
    val = val + val * noise
    if (i === 8) val = price
    const x = i * 10
    const range = Math.max(Math.abs(price - (prevClose || price)), price * 0.005) || 1
    const mid = ((prevClose || price) + price) / 2
    const y = 15 - ((val - mid) / range) * 12
    points.push(`${x},${Math.max(1, Math.min(29, y)).toFixed(1)}`)
  }
  return points.join(' ')
}

async function fetchSparklines() {
  const symbolList = DEFAULT_WATCHLIST.split(',').map(s => s.trim())
  for (const sym of symbolList) {
    try {
      const res = await fetch(`/api/stock-history?symbol=${sym}&days=15`)
      if (res.ok) {
        const data = await res.json()
        if (data.prices?.length > 1) {
          sparklineCache.value[sym] = pricesToSparkline(data.prices.map((p: { close: number }) => p.close))
        }
      }
    } catch { /* silent */ }
  }
}

function formatVolume(vol: string): string {
  const n = parseFloat(vol)
  if (isNaN(n) || n === 0) return '--'
  if (n >= 1e8) return (n / 1e8).toFixed(1) + 'B'
  if (n >= 1e4) return (n / 1e4).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return vol
}

const watchlist = computed(() =>
  stocks.value.map(s => ({
    symbol: s.symbol,
    name: s.name || s.symbol,
    price: s.price,
    change: s.change,
    pct: s.changePercent,
    volume: formatVolume(s.volume),
    spark: sparklineCache.value[s.symbol] || generateSparkline(s.price, s.prevClose),
  }))
)

// Split into HK and non-HK for top movers display
const hkStocks = computed(() => watchlist.value.filter(s => s.symbol.endsWith('.HK')).sort((a, b) => b.pct - a.pct).slice(0, 5))
const usStocks = computed(() => watchlist.value.filter(s => !s.symbol.includes('.')).sort((a, b) => b.pct - a.pct).slice(0, 5))

onMounted(() => {
  fetchWatchlist()
  fetchSparklines()
  pollTimer = setInterval(fetchWatchlist, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('行情報價', 'Market', '行情报价') }}</h2>

    <!-- Top Movers: HK + US -->
    <div v-if="!loading" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- HK Top -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 class="text-sm font-semibold text-slate-700">{{ t('港股排行', 'HK Top Movers', '港股排行') }}</h3>
        </div>
        <div class="divide-y divide-slate-50">
          <div v-for="(s, idx) in hkStocks" :key="s.symbol" class="flex items-center px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors" @click="goStock(s.symbol)">
            <span class="w-6 text-xs font-bold text-slate-400">{{ idx + 1 }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">{{ s.name }}</p>
              <p class="text-xs text-slate-400">{{ s.symbol }}</p>
            </div>
            <span class="text-sm font-medium text-slate-700 mx-3">{{ s.price.toFixed(2) }}</span>
            <svg class="w-20 h-8 shrink-0 mx-2" viewBox="0 0 80 30">
              <polyline fill="none" :stroke="s.pct >= 0 ? '#22c55e' : '#ef4444'" stroke-width="1.5" :points="s.spark" />
            </svg>
            <span class="text-sm font-semibold min-w-[60px] text-right" :class="s.pct >= 0 ? 'text-green-600' : 'text-red-500'">
              {{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(2) }}%
            </span>
          </div>
          <div v-if="hkStocks.length === 0" class="px-4 py-4 text-sm text-slate-400 text-center">{{ t('暫無數據', 'No data', '暂无数据') }}</div>
        </div>
      </div>

      <!-- US Top -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 class="text-sm font-semibold text-slate-700">{{ t('美股排行', 'US Top Movers', '美股排行') }}</h3>
        </div>
        <div class="divide-y divide-slate-50">
          <div v-for="(s, idx) in usStocks" :key="s.symbol" class="flex items-center px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors" @click="goStock(s.symbol)">
            <span class="w-6 text-xs font-bold text-slate-400">{{ idx + 1 }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">{{ s.name }}</p>
              <p class="text-xs text-slate-400">{{ s.symbol }}</p>
            </div>
            <span class="text-sm font-medium text-slate-700 mx-3">{{ s.price.toFixed(2) }}</span>
            <svg class="w-20 h-8 shrink-0 mx-2" viewBox="0 0 80 30">
              <polyline fill="none" :stroke="s.pct >= 0 ? '#22c55e' : '#ef4444'" stroke-width="1.5" :points="s.spark" />
            </svg>
            <span class="text-sm font-semibold min-w-[60px] text-right" :class="s.pct >= 0 ? 'text-green-600' : 'text-red-500'">
              {{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(2) }}%
            </span>
          </div>
          <div v-if="usStocks.length === 0" class="px-4 py-4 text-sm text-slate-400 text-center">{{ t('暫無數據', 'No data', '暂无数据') }}</div>
        </div>
      </div>
    </div>
    <div v-else class="text-sm text-slate-400 py-4 text-center">{{ t('載入中...', 'Loading...', '加载中...') }}</div>

    <!-- Watchlist Tabs -->
    <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
      <button
        v-for="tab in (['watchlist', 'hsi', 'hstech'] as const)"
        :key="tab"
        class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeList === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
        @click="activeList = tab"
      >
        {{ tab === 'watchlist' ? t('自選股', 'Watchlist', '自选股') : tab === 'hsi' ? t('恒指成份股', 'HSI', '恒指成份股') : t('科技指數', 'HS Tech', '科技指数') }}
      </button>
    </div>

    <!-- Watchlist Table -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
              <th class="px-4 py-3 font-medium">{{ t('代碼', 'Symbol', '代码') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('名稱', 'Name', '名称') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('現價', 'Price', '现价') }}</th>
              <th class="px-4 py-3 font-medium text-center">{{ t('走勢', 'Trend', '走势') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('漲跌', 'Change', '涨跌') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('漲跌幅', '%', '涨跌幅') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('成交量', 'Volume', '成交量') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="px-4 py-6 text-center text-slate-400">{{ t('載入中...', 'Loading...', '加载中...') }}</td>
            </tr>
            <tr v-else-if="watchlist.length === 0">
              <td colspan="7" class="px-4 py-6 text-center text-slate-400">{{ t('暫無數據', 'No data', '暂无数据') }}</td>
            </tr>
            <tr v-for="s in watchlist" v-else :key="s.symbol" class="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" @click="goStock(s.symbol)">
              <td class="px-4 py-3 font-medium text-blue-600">{{ s.symbol }}</td>
              <td class="px-4 py-3 text-slate-600">{{ s.name }}</td>
              <td class="px-4 py-3 text-right font-medium">{{ s.price > 0 ? s.price.toFixed(2) : '--' }}</td>
              <td class="px-4 py-3 text-center">
                <svg v-if="s.price > 0" class="w-20 h-8 inline-block" viewBox="0 0 80 30">
                  <polyline fill="none" :stroke="s.pct >= 0 ? '#22c55e' : '#ef4444'" stroke-width="1.5" :points="s.spark" />
                </svg>
              </td>
              <td class="px-4 py-3 text-right" :class="s.change >= 0 ? 'text-green-600' : 'text-red-500'">
                {{ s.price > 0 ? (s.change >= 0 ? '+' : '') + s.change.toFixed(2) : '--' }}
              </td>
              <td class="px-4 py-3 text-right" :class="s.pct >= 0 ? 'text-green-600' : 'text-red-500'">
                {{ s.price > 0 ? (s.pct >= 0 ? '+' : '') + s.pct.toFixed(2) + '%' : '--' }}
              </td>
              <td class="px-4 py-3 text-right text-slate-500">{{ s.volume }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
