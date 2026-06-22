<script setup lang="ts">
import { ref } from 'vue'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const orderSide = ref<'buy' | 'sell'>('buy')
const quantity = ref(100)
const price = ref(348.60)
const searchQuery = ref('')

const virtualBalance = 1000000.00
const usedMargin = 156800.00

const paperPositions = [
  { symbol: '0700.HK', name: '騰訊控股', qty: 200, cost: 342.00, current: 348.60, pnl: 1320.00 },
  { symbol: 'NVDA', name: 'NVIDIA', qty: 30, cost: 125.00, current: 128.40, pnl: 102.00 },
]
</script>

<template>
  <div class="space-y-4">
    <!-- Paper Trade Banner -->
    <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
      <span class="text-2xl">🎮</span>
      <div>
        <p class="font-semibold text-yellow-800">{{ t('模擬交易模式', 'Paper Trading Mode', '模拟交易模式') }}</p>
        <p class="text-sm text-yellow-700">{{ t('使用虛擬資金練習交易，不涉及真實金額', 'Practice trading with virtual funds, no real money involved', '使用虚拟资金练习交易，不涉及真实金额') }}</p>
      </div>
    </div>

    <!-- Virtual Account Summary -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('虛擬餘額', 'Virtual Balance', '虚拟余额') }}</p>
        <p class="text-lg font-semibold text-slate-800">HK$ {{ virtualBalance.toLocaleString('en', { minimumFractionDigits: 2 }) }}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('已用保證金', 'Used Margin', '已用保证金') }}</p>
        <p class="text-lg font-semibold text-slate-800">HK$ {{ usedMargin.toLocaleString('en', { minimumFractionDigits: 2 }) }}</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('模擬盈虧', 'Paper P&L', '模拟盈亏') }}</p>
        <p class="text-lg font-semibold text-green-600">+HK$ 1,422.00</p>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500">{{ t('模擬持倉', 'Paper Positions', '模拟持仓') }}</p>
        <p class="text-lg font-semibold text-slate-800">{{ paperPositions.length }}</p>
      </div>
    </div>

    <!-- Trading Interface -->
    <div class="flex flex-col lg:flex-row gap-4">
      <!-- Left: Positions -->
      <div class="flex-1 space-y-4">
        <div class="bg-white rounded-xl shadow-sm border border-slate-100">
          <div class="px-4 py-3 border-b border-slate-100">
            <h3 class="text-sm font-semibold text-slate-700">{{ t('模擬持倉', 'Paper Positions', '模拟持仓') }}</h3>
          </div>
          <div class="p-4 space-y-3">
            <div v-for="p in paperPositions" :key="p.symbol" class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <span class="font-medium text-sm text-blue-600">{{ p.symbol }}</span>
                <p class="text-xs text-slate-500">{{ p.name }} | {{ p.qty }} {{ t('股', 'shares', '股') }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium">{{ p.current.toFixed(2) }}</p>
                <p class="text-xs" :class="p.pnl >= 0 ? 'text-green-600' : 'text-red-500'">{{ p.pnl >= 0 ? '+' : '' }}{{ p.pnl.toFixed(2) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Chart Placeholder -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100">
          <div class="h-64 flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl">
            {{ t('模擬交易圖表', 'Paper Trade Chart', '模拟交易图表') }}
          </div>
        </div>
      </div>

      <!-- Right: Order Ticket -->
      <div class="w-full lg:w-80 shrink-0">
        <div class="bg-white rounded-xl shadow-sm border border-yellow-200 sticky top-4">
          <div class="bg-yellow-50 px-4 py-2 rounded-t-xl text-center text-xs font-medium text-yellow-700 border-b border-yellow-200">
            {{ t('模擬交易', 'Paper Trade', '模拟交易') }}
          </div>
          <!-- Search -->
          <div class="px-4 pt-3">
            <input v-model="searchQuery" type="text" :placeholder="t('搜尋股票...', 'Search...', '搜索股票...')" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <!-- Buy/Sell -->
          <div class="flex mx-4 mt-3">
            <button class="flex-1 py-2 text-sm font-semibold rounded-l-lg" :class="orderSide === 'buy' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'" @click="orderSide = 'buy'">{{ t('買入', 'Buy', '买入') }}</button>
            <button class="flex-1 py-2 text-sm font-semibold rounded-r-lg" :class="orderSide === 'sell' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'" @click="orderSide = 'sell'">{{ t('賣出', 'Sell', '卖出') }}</button>
          </div>
          <div class="p-4 space-y-3">
            <div>
              <label class="text-xs text-slate-500 block mb-1">{{ t('數量', 'Qty', '数量') }}</label>
              <input v-model.number="quantity" type="number" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none text-center" />
            </div>
            <div>
              <label class="text-xs text-slate-500 block mb-1">{{ t('價格', 'Price', '价格') }}</label>
              <input v-model.number="price" type="number" step="0.2" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none text-center" />
            </div>
            <button class="w-full py-2.5 rounded-lg text-white font-semibold text-sm" :class="orderSide === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'">
              {{ orderSide === 'buy' ? t('模擬買入', 'Paper Buy', '模拟买入') : t('模擬賣出', 'Paper Sell', '模拟卖出') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
