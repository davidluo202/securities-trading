<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useLanguage } from '../../composables/useLanguage'
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts'

const { t } = useLanguage()

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
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(msg: string) {
  toastMsg.value = msg
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
  showToast('已加入自選股 ✓')
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
    height: 320,
    layout: { background: { color: '#ffffff' }, textColor: '#64748b' },
    grid: { vertLines: { color: '#f1f5f9' }, horzLines: { color: '#f1f5f9' } },
    timeScale: { borderColor: '#e2e8f0' },
  })

  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#22c55e', downColor: '#ef4444',
    borderUpColor: '#22c55e', borderDownColor: '#ef4444',
    wickUpColor: '#22c55e', wickDownColor: '#ef4444',
  })

  volumeSeries = chart.addSeries(HistogramSeries, {
    color: '#94a3b8',
    priceFormat: { type: 'volume' },
    priceScaleId: '',
  })

  if (candles.length === 0) return

  // Determine if time-based (intraday) or date-based
  const isIntraday = candles[0].time && candles[0].time.length === 4

  const candleData = candles.map((c: any) => {
    let time: any
    if (isIntraday) {
      // Convert "HHMM" to Unix timestamp for lightweight-charts
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
    color: c.close >= c.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
  }))

  candleSeries.setData(candleData)
  volumeSeries.setData(volumeData)

  // MA lines
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

// Resize handler
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
const orderType = ref('limit')
const quantity = ref(100)
const price = ref(0)

watch(quote, (q) => {
  if (q && q.price > 0) price.value = q.price
})

const orderTypes = [
  { value: 'limit', label: () => t('限價單', 'Limit', '限价单') },
  { value: 'market', label: () => t('市價單', 'Market', '市价单') },
  { value: 'stop', label: () => t('止損單', 'Stop', '止损单') },
  { value: 'stop-limit', label: () => t('止損限價', 'Stop Limit', '止损限价') },
]

// Submit order
function submitOrder() {
  if (!selectedStock.value || !quote.value) return
  const order = {
    id: Date.now().toString(),
    symbol: selectedStock.value.symbol,
    name: selectedStock.value.name,
    side: orderSide.value,
    type: orderType.value,
    quantity: quantity.value,
    price: orderType.value === 'market' ? quote.value.price : price.value,
    paper: paperMode.value,
    time: new Date().toISOString(),
    status: 'pending',
  }
  const orders: any[] = JSON.parse(localStorage.getItem('sec-orders') || '[]')
  orders.unshift(order)
  localStorage.setItem('sec-orders', JSON.stringify(orders))
  showToast(paperMode.value ? '模擬訂單已提交' : '訂單已提交')
  // Reset form
  quantity.value = 100
  price.value = quote.value.price
}

// Close dropdown on outside click
function onBodyClick() {
  showResults.value = false
}
onMounted(() => { document.addEventListener('click', onBodyClick) })
onUnmounted(() => { document.removeEventListener('click', onBodyClick) })
</script>

<template>
  <div class="space-y-4">
    <!-- Toast -->
    <div v-if="toastMsg" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium">
      {{ toastMsg }}
    </div>

    <!-- Search Bar -->
    <div class="bg-white rounded-xl p-3 shadow-sm border border-slate-100 relative" @click.stop>
      <div class="flex items-center gap-3">
        <div class="flex max-w-md border-2 border-slate-400 rounded-lg overflow-hidden">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('輸入股票代碼或名稱拼音首字母', 'Enter stock code or pinyin initials', '输入股票代码或名称拼音首字母')"
            class="flex-1 text-sm outline-none text-slate-700 placeholder-slate-400 px-3 py-2"
            @input="onSearchInput"
            @keydown.enter="onSearchInput"
            @focus="showResults = searchResults.length > 0"
          />
          <button
            class="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            @click="onSearchInput"
            :title="t('搜索', 'Search', '搜索')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </button>
        </div>
        <button
          v-if="selectedStock"
          class="text-xs px-3 py-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium whitespace-nowrap"
          @click="addToWatchlist"
        >
          {{ t('加入自選股', 'Add to Watchlist', '加入自选股') }}
        </button>
      </div>
      <!-- Search Results Dropdown -->
      <div v-if="showResults && searchResults.length" class="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 max-h-80 overflow-y-auto">
        <button
          v-for="item in searchResults"
          :key="item.symbol"
          class="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 text-sm"
          @click="selectStock(item)"
        >
          <span class="font-medium text-blue-600 min-w-[80px]">{{ item.symbol }}</span>
          <span class="text-slate-700">{{ item.name }}</span>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!selectedStock" class="bg-white rounded-xl shadow-sm border border-slate-100 p-16 text-center">
      <p class="text-lg text-slate-400">{{ t('請搜索並選擇一個標的', 'Search and select a stock', '请搜索并选择一个标的') }}</p>
    </div>

    <!-- Main Trading Area -->
    <div v-else class="flex flex-col lg:flex-row gap-4">
      <!-- Left Panel -->
      <div class="flex-1 space-y-4">
        <!-- Quote Card -->
        <div v-if="quote" class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-800">{{ quote.symbol }}</h3>
              <p class="text-sm text-slate-500">{{ quote.name }}</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold" :class="quote.change >= 0 ? 'text-green-600' : 'text-red-500'">{{ quote.price > 0 ? quote.price.toFixed(2) : '--' }}</p>
              <p v-if="quote.price > 0" class="text-sm" :class="quote.change >= 0 ? 'text-green-600' : 'text-red-500'">
                {{ quote.change >= 0 ? '+' : '' }}{{ quote.change.toFixed(2) }} ({{ quote.change >= 0 ? '+' : '' }}{{ quote.changePercent.toFixed(2) }}%)
              </p>
            </div>
          </div>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div><span class="text-slate-400">{{ t('開', 'Open', '开') }}</span> <span class="ml-1 text-slate-700">{{ quote.open || '--' }}</span></div>
            <div><span class="text-slate-400">{{ t('高', 'High', '高') }}</span> <span class="ml-1 text-slate-700">{{ quote.high || '--' }}</span></div>
            <div><span class="text-slate-400">{{ t('低', 'Low', '低') }}</span> <span class="ml-1 text-slate-700">{{ quote.low || '--' }}</span></div>
            <div><span class="text-slate-400">{{ t('量', 'Vol', '量') }}</span> <span class="ml-1 text-slate-700">{{ quote.volume || '--' }}</span></div>
          </div>
        </div>

        <!-- Chart Area -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="flex items-center gap-1 px-4 py-3 border-b border-slate-100 flex-wrap">
            <button
              v-for="p in periods"
              :key="p.key"
              class="px-2.5 py-1 text-xs rounded transition-colors"
              :class="activePeriod === p.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'"
              @click="switchPeriod(p.key)"
            >{{ p.label }}</button>
          </div>
          <div ref="chartContainer" class="h-80 bg-white"></div>
        </div>
      </div>

      <!-- Right Panel: Order Ticket -->
      <div class="w-full lg:w-80 shrink-0">
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 sticky top-4">
          <!-- Buy/Sell Tabs -->
          <div class="flex">
            <button
              class="flex-1 py-3 text-sm font-semibold text-center rounded-tl-xl transition-colors"
              :class="orderSide === 'buy' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              @click="orderSide = 'buy'"
            >{{ t('買入', 'Buy', '买入') }}</button>
            <button
              class="flex-1 py-3 text-sm font-semibold text-center rounded-tr-xl transition-colors"
              :class="orderSide === 'sell' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              @click="orderSide = 'sell'"
            >{{ t('賣出', 'Sell', '卖出') }}</button>
          </div>

          <div class="p-4 space-y-4">
            <!-- Order Type -->
            <div>
              <label class="text-xs text-slate-500 block mb-1.5">{{ t('委託類型', 'Order Type', '委托类型') }}</label>
              <select v-model="orderType" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500">
                <option v-for="ot in orderTypes" :key="ot.value" :value="ot.value">{{ ot.label() }}</option>
              </select>
            </div>

            <!-- Quantity -->
            <div>
              <label class="text-xs text-slate-500 block mb-1.5">{{ t('數量', 'Quantity', '数量') }}</label>
              <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button class="px-3 py-2 text-slate-500 hover:bg-slate-50" @click="quantity = Math.max(0, quantity - 100)">-</button>
                <input v-model.number="quantity" type="number" class="flex-1 text-center text-sm py-2 outline-none" />
                <button class="px-3 py-2 text-slate-500 hover:bg-slate-50" @click="quantity += 100">+</button>
              </div>
              <div class="flex gap-2 mt-2">
                <button v-for="q in [100, 500, 1000, 5000]" :key="q" class="flex-1 text-xs py-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100" @click="quantity = q">{{ q }}</button>
              </div>
            </div>

            <!-- Price -->
            <div v-if="orderType !== 'market'">
              <label class="text-xs text-slate-500 block mb-1.5">{{ t('價格', 'Price', '价格') }}</label>
              <div class="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button class="px-3 py-2 text-slate-500 hover:bg-slate-50" @click="price = Math.max(0, price - 0.2)">-</button>
                <input v-model.number="price" type="number" step="0.2" class="flex-1 text-center text-sm py-2 outline-none" />
                <button class="px-3 py-2 text-slate-500 hover:bg-slate-50" @click="price += 0.2">+</button>
              </div>
            </div>

            <!-- Order Summary -->
            <div class="bg-slate-50 rounded-lg p-3 text-xs space-y-1.5">
              <div class="flex justify-between text-slate-500">
                <span>{{ t('預估金額', 'Est. Amount', '预估金额') }}</span>
                <span class="text-slate-700 font-medium">{{ quote?.symbol?.endsWith('.HK') ? 'HK' : 'US' }}$ {{ (quantity * price).toLocaleString('en', { minimumFractionDigits: 2 }) }}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>{{ t('佣金', 'Commission', '佣金') }}</span>
                <span class="text-slate-700">~{{ quote?.symbol?.endsWith('.HK') ? 'HK' : 'US' }}$ {{ Math.max(50, quantity * price * 0.001).toFixed(2) }}</span>
              </div>
            </div>

            <!-- Submit -->
            <button
              class="w-full py-3 rounded-lg text-white font-semibold text-sm transition-colors"
              :class="orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'"
              @click="submitOrder"
            >
              {{ orderSide === 'buy' ? t('確認買入', 'Confirm Buy', '确认买入') : t('確認賣出', 'Confirm Sell', '确认卖出') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
