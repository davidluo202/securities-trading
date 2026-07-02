<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLanguage } from '../../composables/useLanguage'
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, CandlestickData, SingleValueData, Time } from 'lightweight-charts'

const { t } = useLanguage()
const route = useRoute()
const router = useRouter()

const symbol = computed(() => (route.params.symbol as string) || '')

// Watchlist
const isInWatchlist = ref(false)
const toastMsg = ref('')

function checkWatchlist() {
  try {
    const list = JSON.parse(localStorage.getItem('sec-watchlist') || '[]')
    isInWatchlist.value = list.some((s: any) => s.symbol === symbol.value)
  } catch { isInWatchlist.value = false }
}

function toggleWatchlist() {
  try {
    let list: { symbol: string; name: string }[] = JSON.parse(localStorage.getItem('sec-watchlist') || '[]')
    if (isInWatchlist.value) {
      list = list.filter(s => s.symbol !== symbol.value)
      isInWatchlist.value = false
      toastMsg.value = t('已移除自選股', 'Removed from watchlist', '已移除自选股')
    } else {
      list.push({ symbol: symbol.value, name: quote.value?.name || symbol.value })
      isInWatchlist.value = true
      toastMsg.value = t('已加入自選股 ✓', 'Added to watchlist ✓', '已加入自选股 ✓')
    }
    localStorage.setItem('sec-watchlist', JSON.stringify(list))
    setTimeout(() => { toastMsg.value = '' }, 2000)
  } catch {}
}

interface QuoteData {
  symbol: string; name: string; price: number; change: number; changePercent: number
  open: number; high: number; low: number; volume: string; prevClose: number
}

interface Candle {
  time: string; open: number; high: number; low: number; close: number; volume: number
}

const quote = ref<QuoteData | null>(null)
const loading = ref(true)
type PeriodKey = 'm1' | 'm5' | 'm15' | 'm30' | 'm60' | 'day' | 'week' | 'month'
const activePeriod = ref<PeriodKey>('day')
const chartContainerRef = ref<HTMLElement | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null
let chart: IChartApi | null = null
let candleSeries: ISeriesApi<'Candlestick'> | null = null
let volumeSeries: ISeriesApi<'Histogram'> | null = null
let ma10Series: ISeriesApi<'Line'> | null = null
let ma20Series: ISeriesApi<'Line'> | null = null
let ma30Series: ISeriesApi<'Line'> | null = null
let ma60Series: ISeriesApi<'Line'> | null = null
let resizeObserver: ResizeObserver | null = null

const periods: { key: PeriodKey; label: () => string }[] = [
  { key: 'm1', label: () => t('1分', '1m', '1分') },
  { key: 'm5', label: () => t('5分', '5m', '5分') },
  { key: 'm15', label: () => t('15分', '15m', '15分') },
  { key: 'm30', label: () => t('30分', '30m', '30分') },
  { key: 'm60', label: () => t('60分', '60m', '60分') },
  { key: 'day', label: () => t('日K', 'Daily', '日K') },
  { key: 'week', label: () => t('周K', 'Weekly', '周K') },
  { key: 'month', label: () => t('月K', 'Monthly', '月K') },
]

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

async function fetchKline(period: string): Promise<Candle[]> {
  if (!symbol.value) return []
  try {
    const res = await fetch(`/api/stock-kline?symbol=${symbol.value}&period=${period}&count=120`)
    if (res.ok) {
      const data = await res.json()
      return data.candles || []
    }
  } catch { /* silent */ }
  return []
}

function calcMA(candles: Candle[], period: number): SingleValueData[] {
  const result: SingleValueData[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) continue
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close
    result.push({ time: candles[i].time as Time, value: Number((sum / period).toFixed(4)) })
  }
  return result
}

function initChart() {
  if (!chartContainerRef.value) return
  if (chart) {
    chart.remove()
    chart = null
  }

  chart = createChart(chartContainerRef.value, {
    width: chartContainerRef.value.clientWidth,
    height: chartContainerRef.value.clientHeight,
    layout: {
      background: { color: '#ffffff' },
      textColor: '#64748b',
      fontSize: 12,
    },
    grid: {
      vertLines: { color: '#f1f5f9' },
      horzLines: { color: '#f1f5f9' },
    },
    crosshair: { mode: 0 },
    rightPriceScale: { borderColor: '#e2e8f0' },
    timeScale: {
      borderColor: '#e2e8f0',
      timeVisible: false,
    },
  })

  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#059669',
    downColor: '#dc2626',
    borderUpColor: '#059669',
    borderDownColor: '#dc2626',
    wickUpColor: '#059669',
    wickDownColor: '#dc2626',
  })

  volumeSeries = chart.addSeries(HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
  }, 1)

  chart.priceScale('volume').applyOptions({
    scaleMargins: { top: 0, bottom: 0 },
  })

  ma10Series = chart.addSeries(LineSeries, {
    color: '#f59e0b',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
  })

  ma20Series = chart.addSeries(LineSeries, {
    color: '#8b5cf6',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
  })

  ma30Series = chart.addSeries(LineSeries, {
    color: '#06b6d4',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
  })

  ma60Series = chart.addSeries(LineSeries, {
    color: '#ec4899',
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: false,
  })

  resizeObserver = new ResizeObserver(() => {
    if (chart && chartContainerRef.value) {
      chart.applyOptions({ width: chartContainerRef.value.clientWidth })
    }
  })
  resizeObserver.observe(chartContainerRef.value)
}

async function loadChartData() {
  const candles = await fetchKline(activePeriod.value)
  if (!chart || !candleSeries || !volumeSeries || !ma10Series || !ma20Series || !ma30Series || !ma60Series) return
  if (candles.length === 0) return

  const candleData: CandlestickData[] = candles.map(c => ({
    time: c.time as Time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }))
  candleSeries.setData(candleData)

  const volumeData = candles.map(c => ({
    time: c.time as Time,
    value: c.volume,
    color: c.close >= c.open ? 'rgba(5,150,105,0.4)' : 'rgba(220,38,38,0.4)',
  }))
  volumeSeries.setData(volumeData)

  ma10Series.setData(calcMA(candles, 10))
  ma20Series.setData(calcMA(candles, 20))
  ma30Series.setData(calcMA(candles, 30))
  ma60Series.setData(calcMA(candles, 60))

  chart.timeScale().fitContent()
}

function switchPeriod(p: PeriodKey) {
  activePeriod.value = p
  loadChartData()
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

function goBack() {
  router.back()
}

onMounted(async () => {
  checkWatchlist()
  await fetchQuote()
  await nextTick()
  initChart()
  await loadChartData()
  pollTimer = setInterval(fetchQuote, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (resizeObserver) resizeObserver.disconnect()
  if (chart) {
    chart.remove()
    chart = null
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <button
        class="p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 border border-slate-200"
        @click="goBack"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div v-if="!loading && quote" class="flex-1">
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold text-slate-900">{{ quote.name || symbol }}</h2>
          <span class="text-sm text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">{{ symbol }}</span>
          <button
            class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
            :class="isInWatchlist ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'"
            @click="toggleWatchlist"
          >
            {{ isInWatchlist ? t('已自選 ★', '★ Watching', '已自选 ★') : t('+ 加自選', '+ Watch', '+ 加自选') }}
          </button>
        </div>
        <div class="flex items-center gap-4 mt-2">
          <span class="text-3xl font-bold tracking-tight" :class="quote.change >= 0 ? 'text-green-600' : 'text-red-600'">
            {{ quote.price > 0 ? quote.price.toFixed(2) : '--' }}
          </span>
          <span v-if="quote.price > 0" class="text-sm font-bold px-3 py-1.5 rounded-xl" :class="quote.change >= 0 ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'">
            {{ quote.change >= 0 ? '+' : '' }}{{ quote.change.toFixed(2) }} ({{ quote.changePercent >= 0 ? '+' : '' }}{{ quote.changePercent.toFixed(2) }}%)
          </span>
        </div>
      </div>
      <div v-else-if="loading" class="text-base text-slate-400">{{ t('載入中...', 'Loading...', '加载中...') }}</div>
    </div>

    <!-- Period Tabs + Chart -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="flex items-center gap-1.5 px-6 pt-4 pb-3 border-b border-slate-100">
        <button
          v-for="p in periods"
          :key="p.key"
          class="px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all"
          :class="activePeriod === p.key
            ? 'bg-blue-700 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'"
          @click="switchPeriod(p.key)"
        >
          {{ p.label() }}
        </button>
        <div class="ml-auto flex items-center gap-4 text-xs text-slate-400">
          <span class="flex items-center gap-1.5"><span class="inline-block w-4 h-0.5 bg-amber-500 rounded"></span>MA10</span>
          <span class="flex items-center gap-1.5"><span class="inline-block w-4 h-0.5 bg-violet-500 rounded"></span>MA20</span>
          <span class="flex items-center gap-1.5"><span class="inline-block w-4 h-0.5 bg-cyan-500 rounded"></span>MA30</span>
          <span class="flex items-center gap-1.5"><span class="inline-block w-4 h-0.5 bg-pink-500 rounded"></span>MA60</span>
        </div>
      </div>
      <div
        ref="chartContainerRef"
        class="h-[320px] md:h-[420px] w-full"
      ></div>
    </div>

    <!-- OHLC Data Grid -->
    <div class="grid grid-cols-3 lg:grid-cols-6 gap-4">
      <div v-for="item in ohlcItems" :key="item.label" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 text-center">
        <p class="text-sm text-slate-500 mb-2">{{ item.label }}</p>
        <p class="text-lg font-bold text-slate-900">{{ item.value }}</p>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toastMsg" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium">
      {{ toastMsg }}
    </div>
  </div>
</template>
