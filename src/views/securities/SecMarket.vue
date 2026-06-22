<script setup lang="ts">
import { ref } from 'vue'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const activeList = ref<'watchlist' | 'hsi' | 'hstech'>('watchlist')

const watchlist = [
  { symbol: '0700.HK', name: '騰訊控股', price: 348.60, change: +5.80, pct: +1.69, volume: '12.5M' },
  { symbol: '9988.HK', name: '阿里巴巴', price: 86.20, change: +1.35, pct: +1.59, volume: '45.2M' },
  { symbol: '1810.HK', name: '小米集團', price: 19.80, change: +0.40, pct: +2.06, volume: '88.3M' },
  { symbol: '3690.HK', name: '美團', price: 132.40, change: -1.20, pct: -0.90, volume: '18.7M' },
  { symbol: '2318.HK', name: '中國平安', price: 42.35, change: +0.55, pct: +1.32, volume: '32.1M' },
  { symbol: 'AAPL', name: 'Apple', price: 185.20, change: -0.80, pct: -0.43, volume: '52.4M' },
  { symbol: 'TSLA', name: 'Tesla', price: 238.50, change: +3.20, pct: +1.36, volume: '78.9M' },
  { symbol: 'NVDA', name: 'NVIDIA', price: 128.40, change: +2.10, pct: +1.66, volume: '245.6M' },
]
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('行情報價', 'Market', '行情报价') }}</h2>

    <!-- List Tabs -->
    <div class="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
      <button
        v-for="tab in (['watchlist', 'hsi', 'hstech'] as const)"
        :key="tab"
        class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeList === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
        @click="activeList = tab"
      >
        {{ tab === 'watchlist' ? t('自選股', 'Watchlist', '自选股') : tab === 'hsi' ? t('恒指成份股', 'HSI', '恒指成份股') : t('科技指數', 'HS Tech', '科技指数') }}
      </button>
    </div>

    <!-- Watchlist Table -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-slate-500 border-b border-slate-100 bg-slate-50">
              <th class="px-4 py-3 font-medium">{{ t('代碼', 'Symbol', '代码') }}</th>
              <th class="px-4 py-3 font-medium">{{ t('名稱', 'Name', '名称') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('現價', 'Price', '现价') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('漲跌', 'Change', '涨跌') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('漲跌幅', '%', '涨跌幅') }}</th>
              <th class="px-4 py-3 font-medium text-right">{{ t('成交量', 'Volume', '成交量') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in watchlist" :key="s.symbol" class="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
              <td class="px-4 py-3 font-medium text-blue-600">{{ s.symbol }}</td>
              <td class="px-4 py-3 text-slate-600">{{ s.name }}</td>
              <td class="px-4 py-3 text-right font-medium">{{ s.price.toFixed(2) }}</td>
              <td class="px-4 py-3 text-right" :class="s.change >= 0 ? 'text-green-600' : 'text-red-500'">
                {{ s.change >= 0 ? '+' : '' }}{{ s.change.toFixed(2) }}
              </td>
              <td class="px-4 py-3 text-right" :class="s.pct >= 0 ? 'text-green-600' : 'text-red-500'">
                {{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(2) }}%
              </td>
              <td class="px-4 py-3 text-right text-slate-500">{{ s.volume }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
