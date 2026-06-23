<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()
const router = useRouter()

function goStock(symbol: string) {
  router.push(`/sec/stock/${encodeURIComponent(symbol)}`)
}

const activeSection = ref<'movers' | 'watchlist'>('movers')

// Add-to-watchlist modal
const showAddModal = ref(false)
const addSearchQuery = ref('')
const addSearchResults = ref<{ symbol: string; name: string; pinyin: string }[]>([])
let addSearchTimer: ReturnType<typeof setTimeout> | null = null
const toastMsg = ref('')
const showToastFlag = ref(false)

function onAddSearchInput() {
  if (addSearchTimer) clearTimeout(addSearchTimer)
  const q = addSearchQuery.value.trim()
  if (!q) { addSearchResults.value = []; return }
  addSearchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/stock-search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        addSearchResults.value = await res.json()
      }
    } catch { /* silent */ }
  }, 300)
}

function getMarketTag(symbol: string): string {
  if (symbol.endsWith('.HK')) return 'HK'
  if (symbol.endsWith('.SH') || symbol.endsWith('.SZ')) return 'A'
  return 'US'
}

function addStockToWatchlist(item: { symbol: string; name: string }) {
  let list: { symbol: string; name: string }[] = JSON.parse(localStorage.getItem('sec-watchlist') || '[]')
  list = list.filter(s => s.symbol !== item.symbol)
  list.unshift({ symbol: item.symbol, name: item.name })
  localStorage.setItem('sec-watchlist', JSON.stringify(list))
  watchlistVersion.value++
  fetchAll()
  showAddModal.value = false
  addSearchQuery.value = ''
  addSearchResults.value = []
  // Toast
  toastMsg.value = t('已加入自選股 ✓', 'Added to watchlist ✓', '已加入自选股 ✓')
  showToastFlag.value = true
  setTimeout(() => { showToastFlag.value = false }, 2000)
}

function removeFromWatchlist(symbol: string) {
  let list: { symbol: string; name: string }[] = JSON.parse(localStorage.getItem('sec-watchlist') || '[]')
  list = list.filter(s => s.symbol !== symbol)
  localStorage.setItem('sec-watchlist', JSON.stringify(list))
  watchlistVersion.value++
  fetchAll()
}

const FALLBACK_WATCHLIST = '0700.HK,9988.HK,9618.HK,1810.HK,0388.HK,2318.HK,3690.HK,AAPL,TSLA,NVDA,600519.SH,601318.SH,000001.SZ,300750.SZ,002594.SZ,MSFT,GOOGL'

function getWatchlistSymbols(): string {
  try {
    const raw = localStorage.getItem('sec-watchlist')
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((s: { symbol: string }) => s.symbol).join(',')
      }
    }
  } catch { /* silent */ }
  return FALLBACK_WATCHLIST
}

// All symbols to fetch (watchlist + top mover candidates)
function getAllFetchSymbols(): string {
  const watchlistSyms = getWatchlistSymbols().split(',').map(s => s.trim())
  const extraSyms = [
    // A-share
    '600519.SH', '601318.SH', '000001.SZ', '300750.SZ', '002594.SZ',
    '600036.SH', '000858.SZ', '600900.SH', '601899.SH', '600276.SH',
    // HK
    '0700.HK', '9988.HK', '9618.HK', '1810.HK', '0388.HK', '2318.HK', '3690.HK',
    '0005.HK', '0941.HK', '1024.HK', '1211.HK', '0883.HK',
    // US
    'AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX', 'PDD', 'BABA',
  ]
  const all = new Set([...watchlistSyms, ...extraSyms])
  return Array.from(all).join(',')
}

interface StockData {
  symbol: string; name: string; price: number; change: number; changePercent: number
  volume: string; prevClose: number
}

const stocks = ref<StockData[]>([])
const loading = ref(true)
let pollTimer: ReturnType<typeof setInterval> | null = null

async function fetchAll() {
  try {
    const symbols = getAllFetchSymbols()
    const res = await fetch(`/api/stock-quote?symbols=${symbols}`)
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
  const symbolList = getAllFetchSymbols().split(',').map(s => s.trim())
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

function toDisplayItem(s: StockData) {
  return {
    symbol: s.symbol,
    name: s.name || s.symbol,
    price: s.price,
    change: s.change,
    pct: s.changePercent,
    volume: formatVolume(s.volume),
    spark: sparklineCache.value[s.symbol] || generateSparkline(s.price, s.prevClose),
  }
}

const allItems = computed(() => stocks.value.map(toDisplayItem))

// Top movers from API (real market rankings)
const aShareTop = ref<any[]>([])
const hkTop = ref<any[]>([])
const usTop = ref<any[]>([])
const moversLoading = ref(true)

async function fetchTopMovers() {
  moversLoading.value = true
  try {
    const [aRes, hkRes, usRes] = await Promise.all([
      fetch('/api/top-movers?market=a'),
      fetch('/api/top-movers?market=hk'),
      fetch('/api/top-movers?market=us'),
    ])
    const aData = await aRes.json()
    const hkData = await hkRes.json()
    const usData = await usRes.json()
    aShareTop.value = (aData.items || []).map((i: any) => ({ symbol: i.symbol, name: i.name, price: i.price, pct: i.changePercent, spark: '' }))
    hkTop.value = (hkData.items || []).map((i: any) => ({ symbol: i.symbol, name: i.name, price: i.price, pct: i.changePercent, spark: '' }))
    usTop.value = (usData.items || []).map((i: any) => ({ symbol: i.symbol, name: i.name, price: i.price, pct: i.changePercent, spark: '' }))
  } catch { /* silent */ }
  moversLoading.value = false
}

// Watchlist: only symbols from user's watchlist / fallback
const watchlistVersion = ref(0)
const watchlist = computed(() => {
  void watchlistVersion.value // reactive dependency
  const syms = getWatchlistSymbols().split(',').map(s => s.trim())
  return allItems.value.filter(s => syms.includes(s.symbol))
})

onMounted(() => {
  fetchAll()
  fetchSparklines()
  fetchTopMovers()
  pollTimer = setInterval(() => { fetchAll(); fetchTopMovers() }, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-2xl font-bold text-slate-900">{{ t('行情報價', 'Market', '行情报价') }}</h2>
      <p class="text-sm text-slate-500 mt-1">{{ t('即時行情和自選股列表', 'Real-time quotes and watchlist', '即时行情和自选股列表') }}</p>
    </div>

    <!-- Section Tabs -->
    <div class="flex gap-2">
      <button
        class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
        :class="activeSection === 'movers' ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
        @click="activeSection = 'movers'"
      >{{ t('漲幅榜', 'Top Movers', '涨幅榜') }}</button>
      <button
        class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
        :class="activeSection === 'watchlist' ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
        @click="activeSection = 'watchlist'"
      >{{ t('自選股', 'Watchlist', '自选股') }}</button>
    </div>

    <!-- Top Movers: 3 Markets -->
    <div v-if="activeSection === 'movers'">
      <div v-if="!loading" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- A-Share Top -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-red-600 to-red-800">
            <h3 class="text-base font-bold text-white">{{ t('A股 Top 5', 'A-Share Top 5', 'A股 Top 5') }}</h3>
          </div>
          <div class="divide-y divide-slate-100">
            <div v-for="(s, idx) in aShareTop" :key="s.symbol" class="flex items-center px-6 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors" @click="goStock(s.symbol)">
              <span class="w-7 text-sm font-bold text-slate-400">{{ idx + 1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-base font-semibold text-slate-800 truncate">{{ s.name }}</p>
                <p class="text-xs text-slate-400">{{ s.symbol }}</p>
              </div>
              <span class="text-base font-semibold text-slate-800 mx-4">{{ s.price.toFixed(2) }}</span>
              <svg class="w-20 h-8 shrink-0 mx-2" viewBox="0 0 80 30">
                <polyline fill="none" :stroke="s.pct >= 0 ? '#059669' : '#dc2626'" stroke-width="1.5" :points="s.spark" />
              </svg>
              <span class="text-sm font-bold min-w-[70px] text-right px-2.5 py-1 rounded-lg" :class="s.pct >= 0 ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'">
                {{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(2) }}%
              </span>
            </div>
            <div v-if="aShareTop.length === 0" class="px-6 py-6 text-base text-slate-400 text-center">{{ t('今日暫無上漲標的', 'No gainers today', '今日暂无上涨标的') }}</div>
          </div>
        </div>

        <!-- HK Top -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-800">
            <h3 class="text-base font-bold text-white">{{ t('港股 Top 5', 'HK Top 5', '港股 Top 5') }}</h3>
          </div>
          <div class="divide-y divide-slate-100">
            <div v-for="(s, idx) in hkTop" :key="s.symbol" class="flex items-center px-6 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors" @click="goStock(s.symbol)">
              <span class="w-7 text-sm font-bold text-slate-400">{{ idx + 1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-base font-semibold text-slate-800 truncate">{{ s.name }}</p>
                <p class="text-xs text-slate-400">{{ s.symbol }}</p>
              </div>
              <span class="text-base font-semibold text-slate-800 mx-4">{{ s.price.toFixed(2) }}</span>
              <svg class="w-20 h-8 shrink-0 mx-2" viewBox="0 0 80 30">
                <polyline fill="none" :stroke="s.pct >= 0 ? '#059669' : '#dc2626'" stroke-width="1.5" :points="s.spark" />
              </svg>
              <span class="text-sm font-bold min-w-[70px] text-right px-2.5 py-1 rounded-lg" :class="s.pct >= 0 ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'">
                {{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(2) }}%
              </span>
            </div>
            <div v-if="hkTop.length === 0" class="px-6 py-6 text-base text-slate-400 text-center">{{ t('今日暫無上漲標的', 'No gainers today', '今日暂无上涨标的') }}</div>
          </div>
        </div>

        <!-- US Top -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-emerald-800">
            <h3 class="text-base font-bold text-white">{{ t('美股 Top 5', 'US Top 5', '美股 Top 5') }}</h3>
          </div>
          <div class="divide-y divide-slate-100">
            <div v-for="(s, idx) in usTop" :key="s.symbol" class="flex items-center px-6 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors" @click="goStock(s.symbol)">
              <span class="w-7 text-sm font-bold text-slate-400">{{ idx + 1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-base font-semibold text-slate-800 truncate">{{ s.name }}</p>
                <p class="text-xs text-slate-400">{{ s.symbol }}</p>
              </div>
              <span class="text-base font-semibold text-slate-800 mx-4">{{ s.price.toFixed(2) }}</span>
              <svg class="w-20 h-8 shrink-0 mx-2" viewBox="0 0 80 30">
                <polyline fill="none" :stroke="s.pct >= 0 ? '#059669' : '#dc2626'" stroke-width="1.5" :points="s.spark" />
              </svg>
              <span class="text-sm font-bold min-w-[70px] text-right px-2.5 py-1 rounded-lg" :class="s.pct >= 0 ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'">
                {{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(2) }}%
              </span>
            </div>
            <div v-if="usTop.length === 0" class="px-6 py-6 text-base text-slate-400 text-center">{{ t('今日暫無上漲標的', 'No gainers today', '今日暂无上涨标的') }}</div>
          </div>
        </div>
      </div>
      <div v-else class="text-base text-slate-400 py-6 text-center">{{ t('載入中...', 'Loading...', '加载中...') }}</div>
    </div>

    <!-- Watchlist Table -->
    <div v-if="activeSection === 'watchlist'">
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 class="text-base font-bold text-slate-700">{{ t('自選股列表', 'Watchlist', '自选股列表') }}</h3>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-lg font-bold"
            @click="showAddModal = true"
            :title="t('添加自選股', 'Add to Watchlist', '添加自选股')"
          >+</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-base">
            <thead>
              <tr class="text-left text-sm text-slate-500 border-b border-slate-200 bg-slate-50">
                <th class="px-6 py-4 font-semibold">{{ t('代碼', 'Symbol', '代码') }}</th>
                <th class="px-6 py-4 font-semibold">{{ t('名稱', 'Name', '名称') }}</th>
                <th class="px-6 py-4 font-semibold text-right">{{ t('現價', 'Price', '现价') }}</th>
                <th class="px-6 py-4 font-semibold text-center">{{ t('走勢', 'Trend', '走势') }}</th>
                <th class="px-6 py-4 font-semibold text-right">{{ t('漲跌', 'Change', '涨跌') }}</th>
                <th class="px-6 py-4 font-semibold text-right">{{ t('漲跌幅', '%', '涨跌幅') }}</th>
                <th class="px-6 py-4 font-semibold text-right">{{ t('成交量', 'Volume', '成交量') }}</th>
                <th class="px-6 py-4 font-semibold text-center w-16">{{ t('操作', 'Action', '操作') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="8" class="px-6 py-8 text-center text-slate-400">{{ t('載入中...', 'Loading...', '加载中...') }}</td>
              </tr>
              <tr v-else-if="watchlist.length === 0">
                <td colspan="8" class="px-6 py-8 text-center text-slate-400">{{ t('暫無自選股，點擊 + 添加', 'No watchlist stocks. Click + to add.', '暂无自选股，点击 + 添加') }}</td>
              </tr>
              <tr v-for="(s, idx) in watchlist" v-else :key="s.symbol" class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" :class="idx % 2 === 1 ? 'bg-slate-50/50' : ''" @click="goStock(s.symbol)">
                <td class="px-6 py-4 font-bold text-blue-700">{{ s.symbol }}</td>
                <td class="px-6 py-4 text-slate-700">{{ s.name }}</td>
                <td class="px-6 py-4 text-right font-bold">{{ s.price > 0 ? s.price.toFixed(2) : '--' }}</td>
                <td class="px-6 py-4 text-center">
                  <svg v-if="s.price > 0" class="w-20 h-8 inline-block" viewBox="0 0 80 30">
                    <polyline fill="none" :stroke="s.pct >= 0 ? '#059669' : '#dc2626'" stroke-width="1.5" :points="s.spark" />
                  </svg>
                </td>
                <td class="px-6 py-4 text-right font-semibold" :class="s.change >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ s.price > 0 ? (s.change >= 0 ? '+' : '') + s.change.toFixed(2) : '--' }}
                </td>
                <td class="px-6 py-4 text-right font-semibold" :class="s.pct >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ s.price > 0 ? (s.pct >= 0 ? '+' : '') + s.pct.toFixed(2) + '%' : '--' }}
                </td>
                <td class="px-6 py-4 text-right text-slate-500">{{ s.volume }}</td>
                <td class="px-6 py-4 text-center">
                  <button
                    class="text-slate-400 hover:text-red-500 transition-colors"
                    :title="t('刪除', 'Remove', '删除')"
                    @click.stop="removeFromWatchlist(s.symbol)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Watchlist Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="showAddModal = false">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 relative">
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 class="text-lg font-bold text-slate-800">{{ t('添加自選股', 'Add to Watchlist', '添加自选股') }}</h3>
            <button class="text-slate-400 hover:text-slate-600 transition-colors" @click="showAddModal = false; addSearchQuery = ''; addSearchResults = []">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <!-- Search Input -->
          <div class="px-6 pt-4 pb-2">
            <div class="flex border-2 border-slate-300 rounded-xl overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <input
                v-model="addSearchQuery"
                type="text"
                :placeholder="t('輸入股票代碼或名稱', 'Enter stock code or name', '输入股票代码或名称')"
                class="flex-1 text-base outline-none text-slate-700 placeholder-slate-400 px-4 py-3"
                @input="onAddSearchInput"
              />
              <button
                class="px-4 py-3 bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                @click="onAddSearchInput"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </button>
            </div>
          </div>
          <!-- Search Results -->
          <div class="max-h-72 overflow-y-auto px-2 pb-4">
            <div v-if="addSearchResults.length === 0 && addSearchQuery.trim()" class="px-4 py-6 text-center text-slate-400 text-sm">
              {{ t('未找到結果', 'No results found', '未找到结果') }}
            </div>
            <button
              v-for="item in addSearchResults"
              :key="item.symbol"
              class="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-base transition-colors rounded-xl"
              @click="addStockToWatchlist(item)"
            >
              <span class="font-bold text-blue-700 min-w-[90px]">{{ item.symbol }}</span>
              <span class="text-slate-700 flex-1 truncate">{{ item.name }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full font-semibold"
                :class="{
                  'bg-blue-100 text-blue-700': getMarketTag(item.symbol) === 'HK',
                  'bg-red-100 text-red-700': getMarketTag(item.symbol) === 'A',
                  'bg-emerald-100 text-emerald-700': getMarketTag(item.symbol) === 'US',
                }"
              >{{ getMarketTag(item.symbol) }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <div v-if="showToastFlag" class="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl text-white text-sm font-bold shadow-lg bg-emerald-600 transition-all">
        {{ toastMsg }}
      </div>
    </Teleport>
  </div>
</template>
