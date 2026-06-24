<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useLanguage } from '../../composables/useLanguage'
import { createChart, LineSeries } from 'lightweight-charts'

const { t } = useLanguage()
const router = useRouter()

const isPaper = localStorage.getItem('sec-trade-mode') === 'paper'

interface Holding {
  symbol: string
  name: string
  quantity: number
  avgCost: number
  purchaseDate: string
}

interface QuoteData {
  price: number
  change: number
  changePercent: number
}

const holdings = ref<Holding[]>([])
const quotes = ref<Record<string, QuoteData>>({})
const cash = ref(0)
const chartRef = ref<HTMLElement | null>(null)
const activeInterval = ref('1M')
let chartInstance: ReturnType<typeof createChart> | null = null

const intervals = ['Live', '1D', '1W', '1M', '3M', 'YTD', '1Y', 'All']

function loadData() {
  const raw = localStorage.getItem('sec-holdings')
  holdings.value = raw ? JSON.parse(raw) : []
  const bp = localStorage.getItem('sec-buying-power')
  cash.value = bp ? parseFloat(bp) : (isPaper ? 1000000 : 0)
}

const holdingsMarketValue = computed(() =>
  holdings.value.reduce((sum, h) => {
    const q = quotes.value[h.symbol]
    const price = q ? q.price : h.avgCost
    return sum + h.quantity * price
  }, 0)
)

const totalValue = computed(() => holdingsMarketValue.value + cash.value)

// Store chart data for interval-based change calculation
const lastChartData = ref<{ time: string; value: number }[]>([])

const intervalChange = computed(() => {
  const data = lastChartData.value
  if (data.length < 2) {
    // Fallback to today's quote change
    return holdings.value.reduce((sum, h) => {
      const q = quotes.value[h.symbol]
      if (!q) return sum
      return sum + h.quantity * q.change
    }, 0)
  }
  return data[data.length - 1].value - data[0].value
})

const intervalChangePercent = computed(() => {
  const data = lastChartData.value
  if (data.length < 2) {
    const prev = totalValue.value - intervalChange.value
    if (prev === 0) return 0
    return (intervalChange.value / prev) * 100
  }
  const startVal = data[0].value
  if (startVal === 0) return 0
  return ((data[data.length - 1].value - startVal) / startVal) * 100
})

const intervalLabel = computed(() => {
  const labels: Record<string, string> = {
    'Live': t('今日', 'Today', '今日'),
    '1D': t('今日', 'Today', '今日'),
    '1W': t('本週', 'This Week', '本周'),
    '1M': t('本月', 'This Month', '本月'),
    '3M': t('3個月', '3 Months', '3个月'),
    'YTD': t('今年', 'YTD', '今年'),
    '1Y': t('1年', '1 Year', '1年'),
    'All': t('全部', 'All Time', '全部'),
  }
  return labels[activeInterval.value] || ''
})

async function fetchQuotes() {
  for (const h of holdings.value) {
    try {
      const res = await fetch(`/api/stock-quote?symbol=${encodeURIComponent(h.symbol)}`)
      if (res.ok) {
        const data = await res.json()
        quotes.value[h.symbol] = {
          price: data.price || h.avgCost,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
        }
      }
    } catch { /* silent */ }
  }
}

function generateChartData(interval: string) {
  const total = totalValue.value
  const now = new Date()
  let days = 30
  switch (interval) {
    case 'Live': case '1D': days = 1; break
    case '1W': days = 7; break
    case '1M': days = 30; break
    case '3M': days = 90; break
    case 'YTD': days = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000); break
    case '1Y': days = 365; break
    case 'All': days = 730; break
  }
  if (days < 1) days = 1

  const points: { time: string; value: number }[] = []
  let val = total
  const data: number[] = [val]

  // Random walk backward
  for (let i = 1; i <= days; i++) {
    const noise = (Math.random() - 0.48) * 0.015
    val = val / (1 + noise)
    data.push(val)
  }
  data.reverse()

  for (let i = 0; i <= days; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - days + i)
    points.push({
      time: d.toISOString().slice(0, 10),
      value: Math.round(data[i] * 100) / 100,
    })
  }
  return points
}

function renderChart() {
  if (!chartRef.value) return
  if (chartInstance) {
    chartInstance.remove()
    chartInstance = null
  }

  const width = chartRef.value.clientWidth
  const height = window.innerWidth < 768 ? 200 : 250

  chartInstance = createChart(chartRef.value, {
    width,
    height,
    layout: { background: { color: '#ffffff' }, textColor: '#64748b' },
    grid: { vertLines: { visible: false }, horzLines: { color: '#f1f5f9' } },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false },
    crosshair: { vertLine: { labelVisible: false } },
  })

  const data = generateChartData(activeInterval.value)
  lastChartData.value = data
  const isPositive = data.length >= 2 && data[data.length - 1].value >= data[0].value
  const lineColor = isPositive ? '#10b981' : '#ef4444'

  const series = chartInstance.addSeries(LineSeries, {
    color: lineColor,
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: true,
  })
  series.setData(data)
  chartInstance.timeScale().fitContent()
}

function setInterval2(interval: string) {
  activeInterval.value = interval
  nextTick(renderChart)
}

function formatCurrency(value: number, currency = 'HK$') {
  const abs = Math.abs(value)
  return `${currency} ${abs.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const sortedHoldings = computed(() =>
  [...holdings.value].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
)

function holdingWeight(h: Holding) {
  const q = quotes.value[h.symbol]
  const price = q ? q.price : h.avgCost
  const mv = h.quantity * price
  if (holdingsMarketValue.value === 0) return 0
  return (mv / holdingsMarketValue.value) * 100
}

function holdingReturn(h: Holding) {
  const q = quotes.value[h.symbol]
  const price = q ? q.price : h.avgCost
  return h.quantity * price - h.quantity * h.avgCost
}

function holdingReturnPct(h: Holding) {
  if (h.avgCost === 0) return 0
  const q = quotes.value[h.symbol]
  const price = q ? q.price : h.avgCost
  return ((price / h.avgCost) - 1) * 100
}

function goToStock(symbol: string) {
  router.push(`/sec/stock/${encodeURIComponent(symbol)}`)
}

function goTrade() {
  router.push('/sec/trade')
}

let pollTimer: ReturnType<typeof setInterval> | null = null
let resizeHandler: (() => void) | null = null

onMounted(async () => {
  loadData()
  await fetchQuotes()
  nextTick(renderChart)
  pollTimer = setInterval(fetchQuotes, 30000)
  resizeHandler = () => { if (chartInstance && chartRef.value) renderChart() }
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (chartInstance) { chartInstance.remove(); chartInstance = null }
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})
</script>

<template>
  <div class="space-y-6">
    <!-- 1. Total Account Value -->
    <div class="text-center py-4">
      <p class="text-4xl font-bold text-slate-900">
        HK$ {{ totalValue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
      </p>
      <p class="text-base mt-2 font-semibold" :class="intervalChange >= 0 ? 'text-green-600' : 'text-red-600'">
        {{ intervalChange >= 0 ? '+' : '' }}{{ formatCurrency(intervalChange) }}
        ({{ intervalChange >= 0 ? '+' : '' }}{{ intervalChangePercent.toFixed(2) }}%)
        <span class="text-slate-400 font-normal text-sm ml-1">{{ intervalLabel }}</span>
      </p>
    </div>

    <!-- 2. Asset Chart -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div ref="chartRef" class="w-full"></div>
      <div class="flex flex-wrap gap-2 mt-3 justify-center">
        <button
          v-for="iv in intervals"
          :key="iv"
          class="px-3 py-1.5 text-xs font-medium rounded-xl transition-colors"
          :class="activeInterval === iv ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="setInterval2(iv)"
        >
          {{ iv }}
        </button>
      </div>
    </div>

    <!-- 3. Fund Accounts -->
    <div class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-sm">
      <p class="text-sm font-medium opacity-90 mb-1">{{ t('購買力', 'Buying Power', '购买力') }}</p>
      <p class="text-2xl font-bold">HK$ {{ cash.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</p>
      <div class="mt-4 grid grid-cols-3 gap-4 text-sm opacity-90">
        <div>
          <p class="text-xs opacity-75">HKD</p>
          <p class="font-medium">{{ formatCurrency(cash) }}</p>
        </div>
        <div>
          <p class="text-xs opacity-75">USD</p>
          <p class="font-medium">US$ 0.00</p>
        </div>
        <div>
          <p class="text-xs opacity-75">CNY</p>
          <p class="font-medium">¥ 0.00</p>
        </div>
      </div>
    </div>

    <!-- 4. Holdings List -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200">
      <div class="px-6 py-5 border-b border-slate-200">
        <h3 class="text-lg font-semibold text-slate-800">{{ t('持倉', 'Holdings', '持仓') }}</h3>
      </div>

      <!-- Empty state -->
      <div v-if="sortedHoldings.length === 0" class="px-6 py-12 text-center">
        <p class="text-base text-slate-400 mb-4">{{ t('暫無持倉', 'No holdings yet', '暂无持仓') }}</p>
        <button
          class="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all"
          @click="goTrade"
        >
          {{ t('前往交易', 'Go to Trade', '前往交易') }}
        </button>
      </div>

      <!-- Holdings table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-slate-500 border-b border-slate-100">
              <th class="text-left px-6 py-3 font-medium">{{ t('股票', 'Stock', '股票') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ t('數量', 'Qty', '数量') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ t('現價', 'Price', '现价') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ t('市值', 'Mkt Val', '市值') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ t('佔比', 'Weight', '占比') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ t('今日', 'Today', '今日') }}</th>
              <th class="text-right px-4 py-3 font-medium">{{ t('總回報', 'Return', '总回报') }}</th>
              <th class="text-right px-6 py-3 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(h, i) in sortedHoldings"
              :key="h.symbol"
              class="border-b border-slate-50 cursor-pointer transition-colors"
              :class="i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'"
              @click="goToStock(h.symbol)"
            >
              <td class="px-6 py-4">
                <p class="font-medium text-slate-900">{{ h.name }}</p>
                <p class="text-xs text-slate-400">{{ h.symbol }}</p>
              </td>
              <td class="text-right px-4 py-4 text-slate-700">{{ h.quantity }}</td>
              <td class="text-right px-4 py-4 text-slate-700">
                {{ (quotes[h.symbol]?.price || h.avgCost).toFixed(2) }}
              </td>
              <td class="text-right px-4 py-4 text-slate-700">
                {{ formatCurrency(h.quantity * (quotes[h.symbol]?.price || h.avgCost)) }}
              </td>
              <td class="text-right px-4 py-4 text-slate-700">
                {{ holdingWeight(h).toFixed(1) }}%
              </td>
              <td class="text-right px-4 py-4" :class="(quotes[h.symbol]?.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ (quotes[h.symbol]?.changePercent || 0) >= 0 ? '+' : '' }}{{ (quotes[h.symbol]?.changePercent || 0).toFixed(2) }}%
              </td>
              <td class="text-right px-4 py-4" :class="holdingReturn(h) >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ holdingReturn(h) >= 0 ? '+' : '-' }}{{ formatCurrency(holdingReturn(h)) }}
              </td>
              <td class="text-right px-6 py-4" :class="holdingReturnPct(h) >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ holdingReturnPct(h) >= 0 ? '+' : '' }}{{ holdingReturnPct(h).toFixed(2) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
