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
  { label: () => t('總資產', 'Total Assets', '总资产'), value: isPaper ? 'HK$ 1,000,000.00' : 'HK$ 0.00', icon: 'assets', gradient: 'from-blue-600 to-blue-800' },
  { label: () => t('購買力', 'Buying Power', '购买力'), value: `HK$ ${buyingPower.value.toLocaleString('en', { minimumFractionDigits: 2 })}`, icon: 'power', gradient: 'from-emerald-600 to-emerald-800' },
  { label: () => t('今日盈虧', "Today's P&L", '今日盈亏'), value: 'HK$ 0.00', icon: 'pnl', gradient: 'from-amber-500 to-orange-600' },
  { label: () => t('持倉數量', 'Total Positions', '持仓数量'), value: '0', icon: 'positions', gradient: 'from-violet-600 to-purple-800' },
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
  <div class="space-y-8">
    <!-- Page Title -->
    <div>
      <h2 class="text-2xl font-bold text-slate-900" style="font-family: Inter, system-ui, -apple-system, sans-serif;">{{ t('帳戶總覽', 'Account Overview', '账户总览') }}</h2>
      <p class="text-sm text-slate-500 mt-1">{{ t('查看您的資產摘要和市場動態', 'View your portfolio summary and market activity', '查看您的资产摘要和市场动态') }}</p>
    </div>

    <!-- Summary Cards with Gradients -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="(item, i) in summary" :key="i" class="rounded-2xl p-6 shadow-sm text-white bg-gradient-to-br" :class="item.gradient">
        <div class="flex items-center gap-2 mb-3">
          <svg v-if="item.icon === 'assets'" class="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <svg v-else-if="item.icon === 'power'" class="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          <svg v-else-if="item.icon === 'pnl'" class="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
          <svg v-else class="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          <span class="text-sm font-medium opacity-90">{{ item.label() }}</span>
        </div>
        <p class="text-xl font-bold tracking-tight">{{ item.value }}</p>
      </div>
    </div>

    <!-- Market Indices -->
    <div>
      <h3 class="text-lg font-semibold text-slate-800 mb-4">{{ t('市場指數', 'Market Indices', '市场指数') }}</h3>
      <div v-if="loading" class="text-sm text-slate-400 py-6 text-center">{{ t('載入中...', 'Loading...', '加载中...') }}</div>
      <div v-else-if="indices.length === 0" class="text-sm text-slate-400 py-6 text-center">{{ t('暫無數據', 'No data available', '暂无数据') }}</div>
      <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="(idx, i) in indices" :key="i" class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <p class="text-sm text-slate-500 mb-2 font-medium">{{ idx.name }}</p>
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xl font-bold text-slate-900">{{ idx.value }}</p>
              <p class="text-sm font-medium mt-1" :class="idx.up ? 'text-green-600' : 'text-red-600'">{{ idx.change }}</p>
            </div>
            <svg class="w-24 h-10 shrink-0" viewBox="0 0 80 30">
              <polyline fill="none" :stroke="idx.up ? '#059669' : '#dc2626'" stroke-width="1.5" :points="idx.spark" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Holdings -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div class="px-6 py-5 border-b border-slate-200">
        <h3 class="text-lg font-semibold text-slate-800">{{ t('主要持倉', 'Top Holdings', '主要持仓') }}</h3>
      </div>
      <div class="px-6 py-12 text-center">
        <svg class="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p class="text-base text-slate-400 mb-4">{{ t('暫無持倉', 'No holdings yet', '暂无持仓') }}</p>
        <button class="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all" @click="goMarket">
          {{ t('瀏覽行情', 'Browse Market', '浏览行情') }}
        </button>
      </div>
    </div>
  </div>
</template>
