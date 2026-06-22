<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()
const router = useRouter()

const isPaper = localStorage.getItem('sec-trade-mode') === 'paper'

interface IndexData {
  symbol: string; name: string; price: number; change: number; changePercent: number
}

const indicesData = ref<IndexData[]>([])
const loading = ref(true)
let pollTimer: ReturnType<typeof setInterval> | null = null

const INDEX_NAMES: Record<string, () => string> = {
  HSI: () => t('恒生指數', 'Hang Seng Index', '恒生指数'),
  SSE: () => t('上證綜指', 'SSE Composite', '上证综指'),
  SZSE: () => t('深證成指', 'SZSE Component', '深证成指'),
  SPX: () => 'S&P 500',
  IXIC: () => 'NASDAQ',
  DJI: () => t('道瓊斯', 'Dow Jones', '道琼斯'),
}

async function fetchIndices() {
  try {
    const res = await fetch('/api/market-indices')
    if (res.ok) indicesData.value = await res.json()
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
  // Fetch history for index-like symbols using stock-history API
  const symbols = ['HSI', '000001.SH', '399001.SZ']
  for (const sym of symbols) {
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

const INDEX_HISTORY_MAP: Record<string, string> = {
  HSI: 'HSI',
  SSE: '000001.SH',
  SZSE: '399001.SZ',
}

const indices = computed(() =>
  indicesData.value.map(idx => ({
    name: INDEX_NAMES[idx.symbol]?.() || idx.name || idx.symbol,
    value: idx.price > 0 ? idx.price.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--',
    change: idx.price > 0 ? `${idx.change >= 0 ? '+' : ''}${idx.change.toFixed(2)} (${idx.changePercent >= 0 ? '+' : ''}${idx.changePercent.toFixed(2)}%)` : '--',
    up: idx.change >= 0,
    spark: sparklineCache.value[INDEX_HISTORY_MAP[idx.symbol] || ''] || generateSparkline(idx.price, idx.price - idx.change),
  }))
)

const buyingPower = computed(() => isPaper ? 1000000 : 0)

const summary = computed(() => [
  { label: () => t('總資產', 'Total Assets', '总资产'), value: isPaper ? 'HK$ 1,000,000.00' : 'HK$ 0.00', change: '', up: true },
  { label: () => t('購買力', 'Buying Power', '购买力'), value: `HK$ ${buyingPower.value.toLocaleString('en', { minimumFractionDigits: 2 })}`, change: '', up: true },
  { label: () => t('今日盈虧', "Today's P&L", '今日盈亏'), value: 'HK$ 0.00', change: '', up: true },
  { label: () => t('持倉數量', 'Total Positions', '持仓数量'), value: '0', change: '', up: true },
])

function goMarket() {
  router.push('/sec/market')
}

onMounted(() => {
  fetchIndices()
  fetchSparklines()
  pollTimer = setInterval(fetchIndices, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('帳戶總覽', 'Account Overview', '账户总览') }}</h2>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="(item, i) in summary" :key="i" class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500 mb-1">{{ item.label() }}</p>
        <p class="text-lg font-semibold text-slate-800">{{ item.value }}</p>
        <p v-if="item.change" class="text-xs mt-1" :class="item.up ? 'text-green-600' : 'text-red-500'">{{ item.change }}</p>
      </div>
    </div>

    <!-- Market Indices -->
    <div>
      <h3 class="text-sm font-semibold text-slate-700 mb-3">{{ t('市場指數', 'Market Indices', '市场指数') }}</h3>
      <div v-if="loading" class="text-sm text-slate-400 py-4 text-center">{{ t('載入中...', 'Loading...', '加载中...') }}</div>
      <div v-else-if="indices.length === 0" class="text-sm text-slate-400 py-4 text-center">{{ t('暫無數據', 'No data available', '暂无数据') }}</div>
      <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(idx, i) in indices" :key="i" class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p class="text-xs text-slate-500 mb-1">{{ idx.name }}</p>
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-lg font-semibold text-slate-800">{{ idx.value }}</p>
              <p class="text-xs" :class="idx.up ? 'text-green-600' : 'text-red-500'">{{ idx.change }}</p>
            </div>
            <svg class="w-20 h-8 shrink-0" viewBox="0 0 80 30">
              <polyline fill="none" :stroke="idx.up ? '#22c55e' : '#ef4444'" stroke-width="1.5" :points="idx.spark" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Holdings -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100">
      <div class="px-5 py-4 border-b border-slate-100">
        <h3 class="text-sm font-semibold text-slate-700">{{ t('主要持倉', 'Top Holdings', '主要持仓') }}</h3>
      </div>
      <div class="px-5 py-8 text-center text-slate-400 text-sm">
        <p>{{ t('暫無持倉', 'No holdings yet', '暂无持仓') }}</p>
        <button class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors" @click="goMarket">
          {{ t('瀏覽行情', 'Browse Market', '浏览行情') }}
        </button>
      </div>
    </div>
  </div>
</template>
