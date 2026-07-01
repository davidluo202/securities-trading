<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLanguage } from '../../composables/useLanguage'
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts'

const { t } = useLanguage()
const route = useRoute()

// Search
const searchQuery = ref('')
const searchResults = ref<{ symbol: string; name: string; pinyin: string }[]>([])
const showResults = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  const q = searchQuery.value.trim()
  if (!q) { searchResults.value = []; showResults.value = false; return }
  searchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/stock-search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        searchResults.value = await res.json()
        showResults.value = searchResults.value.length > 0
      }
    } catch { /* silent */ }
  }, 200)
}

// Selected stock
const selectedStock = ref<{ symbol: string; name: string } | null>(null)

// Quote data
const quote = ref<any>(null)

async function fetchQuote(symbol: string) {
  try {
    const res = await fetch(`/api/stock-quote?symbols=${encodeURIComponent(symbol)}`)
    if (res.ok) {
      const data = await res.json()
      if (data.length > 0) quote.value = data[0]
    }
  } catch { /* silent */ }
}

function selectStock(item: { symbol: string; name: string }) {
  selectedStock.value = item
  searchQuery.value = `${item.symbol} ${item.name}`
  showResults.value = false
  searchResults.value = []
  fetchQuote(item.symbol)
  fetchKline(item.symbol, activePeriod.value)
}

// Toast
const toastMsg = ref('')
const toastType = ref<'success' | 'error'>('success')
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMsg.value = msg
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2000)
}

// Paper mode
const paperMode = ref(localStorage.getItem('sec-trade-mode') === 'paper')

// Watchlist
function addToWatchlist() {
  if (!selectedStock.value) return
  let list: { symbol: string; name: string }[] = JSON.parse(localStorage.getItem('sec-watchlist') || '[]')
  list = list.filter(s => s.symbol !== selectedStock.value!.symbol)
  list.unshift({ symbol: selectedStock.value.symbol, name: selectedStock.value.name })
  localStorage.setItem('sec-watchlist', JSON.stringify(list))
  showToast(t('已加入自選股', 'Added to watchlist', '已加入自选股'))
}

// Chart
const chartContainer = ref<HTMLElement | null>(null)
let chart: IChartApi | null = null
let candleSeries: ISeriesApi<'Candlestick'> | null = null
let volumeSeries: ISeriesApi<'Histogram'> | null = null
let maSeriesList: ISeriesApi<'Line'>[] = []

function calcMA(candles: { close: number }[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close
    result.push(sum / period)
  }
  return result
}

const periods = [
  { key: 'm1', label: '1分' },
  { key: 'm5', label: '5分' },
  { key: 'm15', label: '15分' },
  { key: 'm30', label: '30分' },
  { key: 'm60', label: '60分' },
  { key: 'day', label: '日K' },
  { key: 'week', label: '周K' },
  { key: 'month', label: '月K' },
]
const activePeriod = ref('day')

async function fetchKline(symbol: string, period: string) {
  try {
    const res = await fetch(`/api/stock-kline?symbol=${encodeURIComponent(symbol)}&period=${period}&count=120`)
    if (!res.ok) return
    const data = await res.json()
    renderChart(data.candles || [])
  } catch { /* silent */ }
}

function renderChart(candles: any[]) {
  if (!chartContainer.value) return

  if (chart) {
    chart.remove()
    chart = null
    candleSeries = null
    volumeSeries = null
    maSeriesList = []
  }

  chart = createChart(chartContainer.value, {
    width: chartContainer.value.clientWidth,
    height: 360,
    layout: { background: { color: '#ffffff' }, textColor: '#64748b' },
    grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
    timeScale: { borderColor: '#e2e8f0' },
  })

  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#059669', downColor: '#dc2626',
    borderUpColor: '#059669', borderDownColor: '#dc2626',
    wickUpColor: '#059669', wickDownColor: '#dc2626',
  })

  volumeSeries = chart.addSeries(HistogramSeries, {
    color: '#94a3b8',
    priceFormat: { type: 'volume' },
    priceScaleId: '',
  })

  if (candles.length === 0) return

  const isIntraday = candles[0].time && candles[0].time.length === 4

  const candleData = candles.map((c: any) => {
    let time: any
    if (isIntraday) {
      const today = new Date()
      const hh = parseInt(c.time.slice(0, 2))
      const mm = parseInt(c.time.slice(2, 4))
      today.setHours(hh, mm, 0, 0)
      time = Math.floor(today.getTime() / 1000)
    } else {
      time = c.time
    }
    return { time, open: c.open, high: c.high, low: c.low, close: c.close }
  })

  const volumeData = candles.map((c: any, i: number) => ({
    time: candleData[i].time,
    value: c.volume || 0,
    color: c.close >= c.open ? 'rgba(5,150,105,0.3)' : 'rgba(220,38,38,0.3)',
  }))

  candleSeries.setData(candleData)
  volumeSeries.setData(volumeData)

  const maConfigs = [
    { period: 10, color: '#f59e0b' },
    { period: 20, color: '#3b82f6' },
    { period: 30, color: '#8b5cf6' },
    { period: 60, color: '#ef4444' },
  ]
  for (const mc of maConfigs) {
    if (candles.length < mc.period) continue
    const maValues = calcMA(candles, mc.period)
    const maSeries = chart.addSeries(LineSeries, {
      color: mc.color,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    const maData: { time: any; value: number }[] = []
    for (let i = 0; i < maValues.length; i++) {
      if (maValues[i] !== null) {
        maData.push({ time: candleData[i].time, value: maValues[i]! })
      }
    }
    maSeries.setData(maData)
    maSeriesList.push(maSeries)
  }

  chart.timeScale().fitContent()
}

function switchPeriod(key: string) {
  activePeriod.value = key
  if (selectedStock.value) fetchKline(selectedStock.value.symbol, key)
}

function onResize() {
  if (chart && chartContainer.value) {
    chart.applyOptions({ width: chartContainer.value.clientWidth })
  }
}

onMounted(() => {
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (chart) chart.remove()
})

// Order entry
const orderSide = ref<'buy' | 'sell'>('buy')
const orderType = ref(localStorage.getItem('sec-default-order-type') || 'limit')
const quantity = ref(100)
const price = ref(0)
const shortSell = ref(false)

watch(quote, (q) => {
  if (q && q.price > 0) price.value = q.price
})

// Reset short sell when switching to buy
watch(orderSide, (side) => {
  if (side === 'buy') shortSell.value = false
})

const orderTypes = [
  { value: 'limit', label: () => t('限價單', 'Limit', '限价单') },
  { value: 'market', label: () => t('市價單', 'Market', '市价单') },
  { value: 'stop', label: () => t('止損單', 'Stop', '止损单') },
  { value: 'stop-limit', label: () => t('止損限價', 'Stop Limit', '止损限价') },
]

// Buying power
const buyingPower = computed(() => {
  const raw = localStorage.getItem('sec-buying-power')
  if (raw !== null) return parseFloat(raw) || 0
  return paperMode.value ? 1000000 : 0
})

// Effective price for calculations
const effectivePrice = computed(() => {
  if (orderType.value === 'market' && quote.value?.price > 0) return quote.value.price
  return price.value
})

// Estimated fees
const estFees = computed(() => {
  return Math.max(50, quantity.value * effectivePrice.value * 0.001)
})

// Estimated total for buy
const estTotal = computed(() => {
  return quantity.value * effectivePrice.value + estFees.value
})

// Insufficient balance check
const insufficientBalance = computed(() => {
  if (orderSide.value !== 'buy') return false
  return estTotal.value > buyingPower.value
})

// Currency prefix
const currencyPrefix = computed(() => {
  const sym = selectedStock.value?.symbol || ''
  if (sym.endsWith('.SH') || sym.endsWith('.SZ')) return 'CNY'
  if (sym.endsWith('.HK')) return 'HK$'
  return 'US$'
})

// Holdings for sell side
const currentHoldings = computed(() => {
  if (!selectedStock.value) return 0
  try {
    const raw = localStorage.getItem('sec-holdings')
    if (!raw) return 0
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return 0
    const found = arr.find((h: any) => h.symbol === selectedStock.value!.symbol)
    return found ? (found.quantity || 0) : 0
  } catch { return 0 }
})

// Is A-share (no short selling for A-shares)
const isAShare = computed(() => {
  const sym = selectedStock.value?.symbol || ''
  return sym.endsWith('.SH') || sym.endsWith('.SZ')
})

// Short sell authorization
const hasShortAuth = computed(() => {
  return localStorage.getItem('sec-short-auth') === 'true'
})

// Can submit sell
const canSubmitSell = computed(() => {
  if (currentHoldings.value > 0) return true
  if (!isAShare.value && shortSell.value && hasShortAuth.value) return true
  return false
})

// Can submit buy
const canSubmitBuy = computed(() => {
  return !insufficientBalance.value && quantity.value > 0 && effectivePrice.value > 0
})

// Generate order reference
function generateOrderRef(): string {
  const sym = selectedStock.value?.symbol || ''
  let prefix = 'EXTH' // default HK
  if (sym.endsWith('.SH') || sym.endsWith('.SZ')) prefix = 'EXTA'
  else if (!sym.includes('.')) prefix = 'EXTU'

  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 999999)).padStart(6, '0')
  return `${prefix}-${yy}${mm}${dd}-${seq}`
}

async function submitOrder() {
  if (!selectedStock.value || !quote.value) return

  // Validate
  if (orderSide.value === 'buy' && !canSubmitBuy.value) return
  if (orderSide.value === 'sell' && !canSubmitSell.value) return

  const orderPrice = orderType.value === 'market' ? quote.value.price : price.value
  const orderRef = generateOrderRef()

  const order = {
    orderRef,
    symbol: selectedStock.value.symbol,
    name: selectedStock.value.name,
    side: orderSide.value,
    type: orderType.value,
    quantity: quantity.value,
    price: orderPrice,
    paper: paperMode.value,
    status: paperMode.value ? 'filled' : 'pending_review',
    timestamp: new Date().toISOString(),
    shortSell: orderSide.value === 'sell' && shortSell.value,
  }

  // Save order to DB (and localStorage as fallback)
  try {
    const token = localStorage.getItem('sec-auth-token') || ''
    const apiRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        symbol: selectedStock.value!.symbol,
        name: selectedStock.value!.name,
        side: orderSide.value,
        orderType: orderType.value,
        quantity: quantity.value,
        price: orderPrice,
        isPaper: paperMode.value,
        shortSell: orderSide.value === 'sell' && shortSell.value,
      }),
    })
    const apiData = await apiRes.json()
    if (apiData.success && apiData.data?.order_ref) {
      order.orderRef = apiData.data.order_ref
    }
  } catch { /* fallback to localStorage */ }
  const orders: any[] = JSON.parse(localStorage.getItem('sec-orders') || '[]')
  orders.unshift(order)
  localStorage.setItem('sec-orders', JSON.stringify(orders))

  // Paper mode: immediately execute
  if (paperMode.value) {
    if (orderSide.value === 'buy') {
      // Deduct buying power
      const newBp = buyingPower.value - (quantity.value * orderPrice + estFees.value)
      localStorage.setItem('sec-buying-power', String(Math.max(0, newBp)))

      // Update holdings
      const holdings: any[] = JSON.parse(localStorage.getItem('sec-holdings') || '[]')
      const idx = holdings.findIndex((h: any) => h.symbol === selectedStock.value!.symbol)
      if (idx >= 0) {
        holdings[idx].quantity += quantity.value
        holdings[idx].avgCost = ((holdings[idx].avgCost * (holdings[idx].quantity - quantity.value)) + (orderPrice * quantity.value)) / holdings[idx].quantity
      } else {
        holdings.push({ symbol: selectedStock.value.symbol, name: selectedStock.value.name, quantity: quantity.value, avgCost: orderPrice })
      }
      localStorage.setItem('sec-holdings', JSON.stringify(holdings))
    } else {
      // Sell: add proceeds to buying power
      if (!shortSell.value) {
        const proceeds = quantity.value * orderPrice - estFees.value
        const newBp = buyingPower.value + proceeds
        localStorage.setItem('sec-buying-power', String(newBp))

        // Reduce holdings
        const holdings: any[] = JSON.parse(localStorage.getItem('sec-holdings') || '[]')
        const idx = holdings.findIndex((h: any) => h.symbol === selectedStock.value!.symbol)
        if (idx >= 0) {
          holdings[idx].quantity -= quantity.value
          if (holdings[idx].quantity <= 0) holdings.splice(idx, 1)
          localStorage.setItem('sec-holdings', JSON.stringify(holdings))
        }
      }
    }
  }

  showToast(t('交易已成功下單', 'Order placed successfully', '交易已成功下单'))
  quantity.value = 100
  price.value = quote.value.price
  shortSell.value = false
}

function onBodyClick() {
  showResults.value = false
}
onMounted(() => {
  document.addEventListener('click', onBodyClick)
  // Auto-select stock from query parameter (from watchlist "下单" button)
  const sym = route.query.symbol as string
  if (sym) {
    fetch(`/api/stock-search?q=${encodeURIComponent(sym.replace('.HK','').replace('.SH','').replace('.SZ',''))}`)
      .then(r => r.json())
      .then(results => {
        const match = results.find((r: any) => r.symbol === sym) || results[0]
        if (match) selectStock({ symbol: match.symbol, name: match.name })
      })
      .catch(() => {})
  }
})
onUnmounted(() => { document.removeEventListener('click', onBodyClick) })
</script>

<template>
  <div class="space-y-6">
    <!-- Toast -->
    <div v-if="toastMsg" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-8 py-3 rounded-xl shadow-lg text-base font-bold text-white"
      :class="toastType === 'success' ? 'bg-emerald-600' : 'bg-red-600'">
      {{ toastMsg }}
    </div>

    <!-- Search Bar -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative" @click.stop>
      <div class="flex items-center gap-4">
        <div class="flex flex-1 max-w-xl border-2 border-slate-300 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('輸入股票代碼或名稱 (HK .HK / A股 .SH .SZ / 美股)', 'Enter stock code (HK .HK / A-share .SH .SZ / US)', '输入股票代码或名称 (HK .HK / A股 .SH .SZ / 美股)')"
            class="flex-1 text-base outline-none text-slate-700 placeholder-slate-400 px-4 py-3"
            @input="onSearchInput"
            @keydown.enter="onSearchInput"
            @focus="showResults = searchResults.length > 0"
          />
          <button
            class="px-4 py-3 bg-blue-700 text-white hover:bg-blue-800 transition-colors"
            @click="onSearchInput"
            :title="t('搜索', 'Search', '搜索')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </button>
        </div>
        <button
          v-if="selectedStock"
          class="text-sm px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold whitespace-nowrap transition-colors"
          @click="addToWatchlist"
        >
          {{ t('加入自選股', 'Add to Watchlist', '加入自选股') }}
        </button>
      </div>
      <!-- Search Results Dropdown -->
      <div v-if="showResults && searchResults.length" class="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-lg border border-slate-200 py-2 z-50 max-h-80 overflow-y-auto">
        <button
          v-for="item in searchResults"
          :key="item.symbol"
          class="w-full text-left px-5 py-3 hover:bg-slate-50 flex items-center gap-4 text-base transition-colors"
          @click="selectStock(item)"
        >
          <span class="font-bold text-blue-700 min-w-[90px]">{{ item.symbol }}</span>
          <span class="text-slate-700">{{ item.name }}</span>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!selectedStock" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-20 text-center">
      <svg class="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
      <p class="text-lg text-slate-400">{{ t('請搜索並選擇一個標的', 'Search and select a stock', '请搜索并选择一个标的') }}</p>
    </div>

    <!-- Main Trading Area -->
    <div v-else class="flex flex-col lg:flex-row gap-6">
      <!-- Left Panel -->
      <div class="flex-1 space-y-6">
        <!-- Quote Card -->
        <div v-if="quote" class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div class="flex items-start justify-between mb-5">
            <div>
              <h3 class="text-xl font-bold text-slate-900">{{ quote.symbol }}</h3>
              <p class="text-sm text-slate-500 mt-0.5">{{ quote.name }}</p>
            </div>
            <div class="text-right">
              <p class="text-3xl font-bold tracking-tight" :class="quote.change >= 0 ? 'text-green-600' : 'text-red-600'">{{ quote.price > 0 ? quote.price.toFixed(2) : '--' }}</p>
              <p v-if="quote.price > 0" class="text-sm font-semibold mt-1 px-3 py-1 rounded-lg inline-block" :class="quote.change >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'">
                {{ quote.change >= 0 ? '+' : '' }}{{ quote.change.toFixed(2) }} ({{ quote.change >= 0 ? '+' : '' }}{{ quote.changePercent.toFixed(2) }}%)
              </p>
            </div>
          </div>
          <div class="grid grid-cols-3 lg:grid-cols-5 gap-2">
            <div class="bg-slate-50 rounded-xl px-3 py-2"><span class="text-xs text-slate-400 block mb-0.5">{{ t('昨收', 'Prev Close', '昨收') }}</span><span class="text-sm font-semibold text-slate-700">{{ quote.prevClose || '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-3 py-2"><span class="text-xs text-slate-400 block mb-0.5">{{ t('今開', 'Open', '今开') }}</span><span class="text-sm font-semibold text-slate-700">{{ quote.open || '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-3 py-2"><span class="text-xs text-slate-400 block mb-0.5">{{ t('最高', 'High', '最高') }}</span><span class="text-sm font-semibold text-green-600">{{ quote.high || '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-3 py-2"><span class="text-xs text-slate-400 block mb-0.5">{{ t('最低', 'Low', '最低') }}</span><span class="text-sm font-semibold text-red-600">{{ quote.low || '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-3 py-2"><span class="text-xs text-slate-400 block mb-0.5">{{ t('成交量', 'Volume', '成交量') }}</span><span class="text-sm font-semibold text-slate-700">{{ quote.volume || '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-3 py-2"><span class="text-xs text-slate-400 block mb-0.5">{{ t('成交額', 'Turnover', '成交额') }}</span><span class="text-sm font-semibold text-slate-700">{{ quote.turnover ? (Number(quote.turnover) > 1e8 ? (Number(quote.turnover)/1e8).toFixed(2) + '亿' : (Number(quote.turnover)/1e4).toFixed(0) + '万') : '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-3 py-2"><span class="text-xs text-slate-400 block mb-0.5">{{ t('52週高', '52W High', '52周高') }}</span><span class="text-sm font-semibold text-green-600">{{ quote.high52w || '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-3 py-2"><span class="text-xs text-slate-400 block mb-0.5">{{ t('52週低', '52W Low', '52周低') }}</span><span class="text-sm font-semibold text-red-600">{{ quote.low52w || '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-3 py-2"><span class="text-xs text-slate-400 block mb-0.5">{{ t('總市值', 'Mkt Cap', '总市值') }}</span><span class="text-sm font-semibold text-slate-700">{{ quote.marketCap ? (Number(quote.marketCap) > 1e8 ? (Number(quote.marketCap)/1e8).toFixed(0) + '亿' : quote.marketCap) : '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-3 py-2"><span class="text-xs text-slate-400 block mb-0.5">{{ t('總股本', 'Shares', '总股本') }}</span><span class="text-sm font-semibold text-slate-700">{{ quote.totalShares ? (Number(quote.totalShares) > 1e8 ? (Number(quote.totalShares)/1e8).toFixed(2) + '亿' : (Number(quote.totalShares)/1e4).toFixed(0) + '万') : '--' }}</span></div>
          </div>
        </div>

        <!-- Chart Area -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="flex items-center gap-1.5 px-6 py-4 border-b border-slate-200 flex-wrap">
            <button
              v-for="p in periods"
              :key="p.key"
              class="px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-colors"
              :class="activePeriod === p.key ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'"
              @click="switchPeriod(p.key)"
            >{{ p.label }}</button>
          </div>
          <div ref="chartContainer" class="h-[360px] bg-white"></div>
        </div>
      </div>

      <!-- Right Panel: Order Ticket -->
      <div class="w-full lg:w-96 shrink-0">
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 sticky top-4 overflow-hidden">
          <!-- Buy/Sell Tabs -->
          <div class="flex">
            <button
              class="flex-1 py-4 text-base font-bold text-center transition-colors"
              :class="orderSide === 'buy' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
              @click="orderSide = 'buy'"
            >{{ t('買入', 'Buy', '买入') }}</button>
            <button
              class="flex-1 py-4 text-base font-bold text-center transition-colors"
              :class="orderSide === 'sell' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
              @click="orderSide = 'sell'"
            >{{ t('賣出', 'Sell', '卖出') }}</button>
          </div>

          <div class="p-6 space-y-5">
            <!-- Buy: Buying Power -->
            <div v-if="orderSide === 'buy'" class="bg-emerald-50 rounded-xl px-4 py-3">
              <span class="text-xs text-emerald-600 block mb-1">{{ t('可用購買力 / Buying Power', 'Buying Power', '可用购买力 / Buying Power') }}</span>
              <span class="text-lg font-bold text-emerald-700">{{ currencyPrefix }} {{ buyingPower.toLocaleString('en', { minimumFractionDigits: 2 }) }}</span>
            </div>

            <!-- Sell: Current Holdings -->
            <div v-if="orderSide === 'sell'" class="bg-blue-50 rounded-xl px-4 py-3">
              <span class="text-xs text-blue-600 block mb-1">{{ t('當前持倉 / Current Holdings', 'Current Holdings', '当前持仓 / Current Holdings') }}</span>
              <span class="text-lg font-bold text-blue-700">{{ currentHoldings }} {{ t('股', 'shares', '股') }}</span>
            </div>

            <!-- Order Type -->
            <div>
              <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('委託類型', 'Order Type', '委托类型') }}</label>
              <select v-model="orderType" class="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-base text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
                <option v-for="ot in orderTypes" :key="ot.value" :value="ot.value">{{ ot.label() }}</option>
              </select>
            </div>

            <!-- Quantity -->
            <div>
              <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('數量', 'Quantity', '数量') }}</label>
              <div class="flex items-center border-2 border-slate-300 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <button class="px-4 py-3 text-slate-500 hover:bg-slate-50 text-lg font-bold" @click="quantity = Math.max(0, quantity - 100)">-</button>
                <input v-model.number="quantity" type="number" class="flex-1 text-center text-base py-3 outline-none font-semibold" />
                <button class="px-4 py-3 text-slate-500 hover:bg-slate-50 text-lg font-bold" @click="quantity += 100">+</button>
              </div>
              <div class="flex gap-2 mt-3">
                <button v-for="q in [100, 500, 1000, 5000]" :key="q" class="flex-1 text-sm py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold transition-colors" @click="quantity = q">{{ q }}</button>
              </div>
            </div>

            <!-- Price -->
            <div v-if="orderType !== 'market'">
              <label class="text-sm font-semibold text-slate-700 block mb-2">{{ t('價格', 'Price', '价格') }}</label>
              <div class="flex items-center border-2 border-slate-300 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <button class="px-4 py-3 text-slate-500 hover:bg-slate-50 text-lg font-bold" @click="price = Math.max(0, price - 0.2)">-</button>
                <input v-model.number="price" type="number" step="0.2" class="flex-1 text-center text-base py-3 outline-none font-semibold" />
                <button class="px-4 py-3 text-slate-500 hover:bg-slate-50 text-lg font-bold" @click="price += 0.2">+</button>
              </div>
            </div>

            <!-- Short Sell Checkbox (sell side, HK/US only) -->
            <div v-if="orderSide === 'sell' && !isAShare" class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="shortSell" class="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500" />
                <span class="text-sm font-semibold text-slate-700">{{ t('賣空 / Short Sell', 'Short Sell', '卖空 / Short Sell') }}</span>
              </label>
              <span v-if="shortSell && !hasShortAuth" class="text-xs text-red-500 font-medium">{{ t('未授權', 'Not authorized', '未授权') }}</span>
            </div>
            <!-- Short sell warning -->
            <div v-if="orderSide === 'sell' && shortSell && hasShortAuth" class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
              {{ t('借券安排，需在T+2日內歸還', 'Securities borrowing, must return within T+2', '借券安排，需在T+2日内归还') }}
            </div>

            <!-- Order Summary -->
            <div class="bg-slate-50 rounded-xl p-4 space-y-2.5">
              <div class="flex justify-between text-sm text-slate-500">
                <span>{{ t('預估買入金額 / Est. Total', 'Est. Total', '预估买入金额 / Est. Total') }}</span>
                <span class="text-slate-800 font-bold">{{ currencyPrefix }} {{ estTotal.toLocaleString('en', { minimumFractionDigits: 2 }) }}</span>
              </div>
              <div class="flex justify-between text-sm text-slate-500">
                <span>{{ t('佣金', 'Commission', '佣金') }}</span>
                <span class="text-slate-700 font-medium">~{{ currencyPrefix }} {{ estFees.toFixed(2) }}</span>
              </div>
            </div>

            <!-- Insufficient balance warning -->
            <div v-if="orderSide === 'buy' && insufficientBalance" class="text-sm font-bold text-red-600 text-center">
              {{ t('餘額不足', 'Insufficient balance', '余额不足') }}
            </div>

            <!-- Submit -->
            <button
              v-if="orderSide === 'buy'"
              class="w-full py-4 rounded-xl text-white font-bold text-base shadow-sm transition-all"
              :class="canSubmitBuy ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow' : 'bg-emerald-300 cursor-not-allowed'"
              :disabled="!canSubmitBuy"
              @click="submitOrder"
            >
              {{ t('確認買入', 'Confirm Buy', '确认买入') }}
            </button>
            <button
              v-else
              class="w-full py-4 rounded-xl text-white font-bold text-base shadow-sm transition-all"
              :class="canSubmitSell ? 'bg-red-600 hover:bg-red-700 hover:shadow' : 'bg-red-300 cursor-not-allowed'"
              :disabled="!canSubmitSell"
              @click="submitOrder"
            >
              {{ t('確認賣出', 'Confirm Sell', '确认卖出') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
