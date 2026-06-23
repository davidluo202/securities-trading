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
  quantity.value = 100
  price.value = quote.value.price
}

function onBodyClick() {
  showResults.value = false
}
onMounted(() => { document.addEventListener('click', onBodyClick) })
onUnmounted(() => { document.removeEventListener('click', onBodyClick) })
</script>

<template>
  <div class="space-y-6">
    <!-- Toast -->
    <div v-if="toastMsg" class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-8 py-3 rounded-xl shadow-lg text-base font-bold">
      {{ toastMsg }}
    </div>

    <!-- Search Bar -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative" @click.stop>
      <div class="flex items-center gap-4">
        <div class="flex flex-1 max-w-xl border-2 border-slate-300 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t('輸入股票代碼或名稱拼音首字母', 'Enter stock code or pinyin initials', '输入股票代码或名称拼音首字母')"
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
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-slate-50 rounded-xl px-4 py-3"><span class="text-xs text-slate-400 block mb-1">{{ t('開', 'Open', '开') }}</span><span class="text-sm font-semibold text-slate-700">{{ quote.open || '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-4 py-3"><span class="text-xs text-slate-400 block mb-1">{{ t('高', 'High', '高') }}</span><span class="text-sm font-semibold text-slate-700">{{ quote.high || '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-4 py-3"><span class="text-xs text-slate-400 block mb-1">{{ t('低', 'Low', '低') }}</span><span class="text-sm font-semibold text-slate-700">{{ quote.low || '--' }}</span></div>
            <div class="bg-slate-50 rounded-xl px-4 py-3"><span class="text-xs text-slate-400 block mb-1">{{ t('量', 'Vol', '量') }}</span><span class="text-sm font-semibold text-slate-700">{{ quote.volume || '--' }}</span></div>
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

            <!-- Order Summary -->
            <div class="bg-slate-50 rounded-xl p-4 space-y-2.5">
              <div class="flex justify-between text-sm text-slate-500">
                <span>{{ t('預估金額', 'Est. Amount', '预估金额') }}</span>
                <span class="text-slate-800 font-bold">{{ quote?.symbol?.endsWith('.HK') ? 'HK' : 'US' }}$ {{ (quantity * price).toLocaleString('en', { minimumFractionDigits: 2 }) }}</span>
              </div>
              <div class="flex justify-between text-sm text-slate-500">
                <span>{{ t('佣金', 'Commission', '佣金') }}</span>
                <span class="text-slate-700 font-medium">~{{ quote?.symbol?.endsWith('.HK') ? 'HK' : 'US' }}$ {{ Math.max(50, quantity * price * 0.001).toFixed(2) }}</span>
              </div>
            </div>

            <!-- Submit -->
            <button
              class="w-full py-4 rounded-xl text-white font-bold text-base shadow-sm hover:shadow transition-all"
              :class="orderSide === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'"
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
