<script setup lang="ts">
import { ref } from 'vue'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const searchQuery = ref('')
const selectedSymbol = ref('0700.HK')
const orderSide = ref<'buy' | 'sell'>('buy')
const orderType = ref('limit')
const quantity = ref(100)
const price = ref(348.60)

const quote = {
  symbol: '0700.HK',
  name: '騰訊控股',
  last: 348.60,
  change: +5.80,
  changePct: +1.69,
  high: 350.20,
  low: 342.00,
  open: 343.40,
  volume: '12.5M',
  turnover: '4.35B',
  bid: 348.40,
  ask: 348.60,
  bidVol: 2800,
  askVol: 1500,
}

const orderBook = [
  { price: 349.00, askVol: 1200 },
  { price: 348.80, askVol: 3400 },
  { price: 348.60, askVol: 1500 },
  { price: 348.40, bidVol: 2800 },
  { price: 348.20, bidVol: 5600 },
  { price: 348.00, bidVol: 4200 },
]

const orderTypes = [
  { value: 'limit', label: () => t('限價單', 'Limit', '限价单') },
  { value: 'market', label: () => t('市價單', 'Market', '市价单') },
  { value: 'stop', label: () => t('止損單', 'Stop', '止损单') },
  { value: 'stop-limit', label: () => t('止損限價', 'Stop Limit', '止损限价') },
]
</script>

<template>
  <div class="space-y-4">
    <!-- Search Bar -->
    <div class="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
      <div class="flex items-center gap-3">
        <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('搜尋股票代碼或名稱...', 'Search symbol or name...', '搜索股票代码或名称...')"
          class="flex-1 text-sm outline-none text-slate-700 placeholder-slate-400"
        />
        <span class="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">{{ selectedSymbol }}</span>
      </div>
    </div>

    <!-- Main Trading Area: Left (Quote+Chart) + Right (Order Ticket) -->
    <div class="flex flex-col lg:flex-row gap-4">
      <!-- Left Panel -->
      <div class="flex-1 space-y-4">
        <!-- Quote Card -->
        <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold text-slate-800">{{ quote.symbol }}</h3>
              <p class="text-sm text-slate-500">{{ quote.name }}</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold" :class="quote.change >= 0 ? 'text-green-600' : 'text-red-500'">{{ quote.last.toFixed(2) }}</p>
              <p class="text-sm" :class="quote.change >= 0 ? 'text-green-600' : 'text-red-500'">
                {{ quote.change >= 0 ? '+' : '' }}{{ quote.change.toFixed(2) }} ({{ quote.change >= 0 ? '+' : '' }}{{ quote.changePct.toFixed(2) }}%)
              </p>
            </div>
          </div>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div><span class="text-slate-400">{{ t('開', 'Open', '开') }}</span> <span class="ml-1 text-slate-700">{{ quote.open }}</span></div>
            <div><span class="text-slate-400">{{ t('高', 'High', '高') }}</span> <span class="ml-1 text-slate-700">{{ quote.high }}</span></div>
            <div><span class="text-slate-400">{{ t('低', 'Low', '低') }}</span> <span class="ml-1 text-slate-700">{{ quote.low }}</span></div>
            <div><span class="text-slate-400">{{ t('量', 'Vol', '量') }}</span> <span class="ml-1 text-slate-700">{{ quote.volume }}</span></div>
          </div>
        </div>

        <!-- Chart Area -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <button class="px-2.5 py-1 text-xs rounded bg-blue-600 text-white">1D</button>
            <button class="px-2.5 py-1 text-xs rounded text-slate-500 hover:bg-slate-100">5D</button>
            <button class="px-2.5 py-1 text-xs rounded text-slate-500 hover:bg-slate-100">1M</button>
            <button class="px-2.5 py-1 text-xs rounded text-slate-500 hover:bg-slate-100">3M</button>
            <button class="px-2.5 py-1 text-xs rounded text-slate-500 hover:bg-slate-100">1Y</button>
          </div>
          <div class="h-64 lg:h-80 flex items-center justify-center text-slate-400 text-sm bg-slate-50">
            {{ t('圖表區域 (接入 lightweight-charts)', 'Chart Area (lightweight-charts integration)', '图表区域 (接入 lightweight-charts)') }}
          </div>
        </div>

        <!-- Order Book -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100">
          <div class="px-4 py-3 border-b border-slate-100">
            <h4 class="text-sm font-semibold text-slate-700">{{ t('買賣盤', 'Order Book', '买卖盘') }}</h4>
          </div>
          <div class="p-4">
            <div class="grid grid-cols-3 text-xs text-slate-400 mb-2">
              <span>{{ t('賣量', 'Ask Vol', '卖量') }}</span>
              <span class="text-center">{{ t('價格', 'Price', '价格') }}</span>
              <span class="text-right">{{ t('買量', 'Bid Vol', '买量') }}</span>
            </div>
            <div v-for="(row, i) in orderBook" :key="i" class="grid grid-cols-3 text-xs py-1.5 border-b border-slate-50">
              <span class="text-red-400">{{ row.askVol || '' }}</span>
              <span class="text-center font-medium text-slate-700">{{ row.price.toFixed(2) }}</span>
              <span class="text-right text-green-500">{{ row.bidVol || '' }}</span>
            </div>
          </div>
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
                <span class="text-slate-700 font-medium">HK$ {{ (quantity * price).toLocaleString('en', { minimumFractionDigits: 2 }) }}</span>
              </div>
              <div class="flex justify-between text-slate-500">
                <span>{{ t('佣金', 'Commission', '佣金') }}</span>
                <span class="text-slate-700">~HK$ {{ Math.max(50, quantity * price * 0.001).toFixed(2) }}</span>
              </div>
            </div>

            <!-- Submit -->
            <button
              class="w-full py-3 rounded-lg text-white font-semibold text-sm transition-colors"
              :class="orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'"
            >
              {{ orderSide === 'buy' ? t('確認買入', 'Confirm Buy', '确认买入') : t('確認賣出', 'Confirm Sell', '确认卖出') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
