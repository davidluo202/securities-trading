<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLanguage } from '../../composables/useLanguage'

const { t } = useLanguage()
const route = useRoute()
const router = useRouter()

const symbol = computed(() => (route.params.symbol as string) || '')

interface QuoteData {
  symbol: string; name: string; price: number; change: number; changePercent: number
  open: number; high: number; low: number; volume: string; prevClose: number
}

const quote = ref<QuoteData | null>(null)
const loading = ref(true)
let pollTimer: ReturnType<typeof setInterval> | null = null

function toTradingViewSymbol(sym: string): string {
  const upper = sym.toUpperCase()
  if (upper.endsWith('.HK')) return 'HKEX:' + upper.replace('.HK', '').replace(/^0+/, '')
  if (upper.endsWith('.SH') || upper.endsWith('.SS')) return 'SSE:' + upper.replace(/\.(SH|SS)$/, '')
  if (upper.endsWith('.SZ')) return 'SZSE:' + upper.replace('.SZ', '')
  // US stocks - default to NASDAQ
  return 'NASDAQ:' + upper
}

function formatVolume(vol: string): string {
  const n = parseFloat(vol)
  if (isNaN(n) || n === 0) return '--'
  if (n >= 1e8) return (n / 1e8).toFixed(2) + t('億', 'B', '亿')
  if (n >= 1e4) return (n / 1e4).toFixed(2) + t('萬', 'M', '万')
  return vol
}

function formatAmount(vol: string, price: number): string {
  const n = parseFloat(vol)
  if (isNaN(n) || n === 0 || price === 0) return '--'
  const amount = n * price
  if (amount >= 1e8) return (amount / 1e8).toFixed(2) + t('億', 'B', '亿')
  if (amount >= 1e4) return (amount / 1e4).toFixed(2) + t('萬', 'M', '万')
  return amount.toFixed(0)
}

async function fetchQuote() {
  if (!symbol.value) return
  try {
    const res = await fetch(`/api/stock-quote?symbols=${symbol.value}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) quote.value = data[0]
    }
  } catch { /* silent */ }
  loading.value = false
}

const ohlcItems = computed(() => {
  if (!quote.value) return []
  const q = quote.value
  return [
    { label: t('今開', 'Open', '今开'), value: q.open > 0 ? q.open.toFixed(2) : '--' },
    { label: t('最高', 'High', '最高'), value: q.high > 0 ? q.high.toFixed(2) : '--' },
    { label: t('最低', 'Low', '最低'), value: q.low > 0 ? q.low.toFixed(2) : '--' },
    { label: t('昨收', 'Prev Close', '昨收'), value: q.prevClose > 0 ? q.prevClose.toFixed(2) : '--' },
    { label: t('成交量', 'Volume', '成交量'), value: formatVolume(q.volume) },
    { label: t('成交額', 'Turnover', '成交额'), value: formatAmount(q.volume, q.price) },
  ]
})

let chartInitialized = false

function initChart() {
  if (chartInitialized) return
  const container = document.getElementById('tradingview-chart')
  if (!container) return
  chartInitialized = true

  const tvSymbol = toTradingViewSymbol(symbol.value)
  const widgetContainer = document.createElement('div')
  widgetContainer.className = 'tradingview-widget-container'
  widgetContainer.style.height = '100%'
  widgetContainer.style.width = '100%'

  const widgetDiv = document.createElement('div')
  widgetDiv.className = 'tradingview-widget-container__widget'
  widgetDiv.style.height = 'calc(100% - 32px)'
  widgetDiv.style.width = '100%'
  widgetContainer.appendChild(widgetDiv)

  const script = document.createElement('script')
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
  script.type = 'text/javascript'
  script.async = true
  script.innerHTML = JSON.stringify({
    autosize: true,
    symbol: tvSymbol,
    interval: 'D',
    timezone: 'Asia/Hong_Kong',
    theme: 'light',
    style: '1',
    locale: 'zh_CN',
    toolbar_bg: '#f1f3f6',
    enable_publishing: false,
    hide_side_toolbar: false,
    allow_symbol_change: true,
    studies: ['MASimple@tv-basicstudies'],
    container_id: 'tradingview-chart',
  })
  widgetContainer.appendChild(script)
  container.appendChild(widgetContainer)
}

function goBack() {
  router.back()
}

onMounted(() => {
  fetchQuote().then(() => {
    // Small delay to ensure DOM is rendered
    setTimeout(initChart, 100)
  })
  pollTimer = setInterval(fetchQuote, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  chartInitialized = false
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button
        class="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
        @click="goBack"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div v-if="!loading && quote">
        <div class="flex items-center gap-3">
          <h2 class="text-xl font-semibold text-slate-800">{{ quote.name || symbol }}</h2>
          <span class="text-sm text-slate-400">{{ symbol }}</span>
        </div>
        <div class="flex items-center gap-3 mt-1">
          <span class="text-2xl font-bold" :class="quote.change >= 0 ? 'text-green-600' : 'text-red-500'">
            {{ quote.price > 0 ? quote.price.toFixed(2) : '--' }}
          </span>
          <span class="text-sm font-medium" :class="quote.change >= 0 ? 'text-green-600' : 'text-red-500'">
            {{ quote.price > 0 ? `${quote.change >= 0 ? '+' : ''}${quote.change.toFixed(2)} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)` : '--' }}
          </span>
        </div>
      </div>
      <div v-else-if="loading" class="text-sm text-slate-400">{{ t('載入中...', 'Loading...', '加载中...') }}</div>
    </div>

    <!-- TradingView Chart -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div id="tradingview-chart" style="height: 450px;"></div>
    </div>

    <!-- OHLC Data Grid -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <div class="grid grid-cols-3 lg:grid-cols-6 gap-4">
        <div v-for="item in ohlcItems" :key="item.label" class="text-center">
          <p class="text-xs text-slate-500 mb-1">{{ item.label }}</p>
          <p class="text-sm font-semibold text-slate-800">{{ item.value }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
