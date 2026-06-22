<script setup lang="ts">
import { ref } from 'vue'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()

const activeList = ref<'watchlist' | 'hsi' | 'hstech'>('watchlist')

const watchlist = [
  { symbol: '0700.HK', name: '騰訊控股', price: 348.60, change: +5.80, pct: +1.69, volume: '12.5M', spark: '0,22 10,18 20,20 30,14 40,16 50,10 60,12 70,8 80,5' },
  { symbol: '9988.HK', name: '阿里巴巴', price: 86.20, change: +1.35, pct: +1.59, volume: '45.2M', spark: '0,25 10,20 20,22 30,18 40,15 50,17 60,12 70,10 80,7' },
  { symbol: '1810.HK', name: '小米集團', price: 19.80, change: +0.40, pct: +2.06, volume: '88.3M', spark: '0,26 10,24 20,22 30,18 40,20 50,14 60,12 70,8 80,4' },
  { symbol: '3690.HK', name: '美團', price: 132.40, change: -1.20, pct: -0.90, volume: '18.7M', spark: '0,8 10,10 20,12 30,15 40,14 50,18 60,20 70,24 80,26' },
  { symbol: '2318.HK', name: '中國平安', price: 42.35, change: +0.55, pct: +1.32, volume: '32.1M', spark: '0,24 10,22 20,20 30,16 40,18 50,14 60,10 70,8 80,6' },
  { symbol: 'AAPL', name: 'Apple', price: 185.20, change: -0.80, pct: -0.43, volume: '52.4M', spark: '0,10 10,12 20,8 30,14 40,16 50,20 60,18 70,22 80,24' },
  { symbol: 'TSLA', name: 'Tesla', price: 238.50, change: +3.20, pct: +1.36, volume: '78.9M', spark: '0,24 10,20 20,22 30,16 40,18 50,12 60,14 70,8 80,6' },
  { symbol: 'NVDA', name: 'NVIDIA', price: 128.40, change: +2.10, pct: +1.66, volume: '245.6M', spark: '0,28 10,24 20,26 30,20 40,18 50,14 60,10 70,8 80,3' },
]

const aShareTop = [
  { rank: 1, name: '寒武紀', code: '688256', price: 285.40, pct: +9.88, spark: '0,28 10,26 20,22 30,18 40,16 50,12 60,8 70,5 80,2' },
  { rank: 2, name: '中芯國際', code: '688981', price: 142.80, pct: +7.52, spark: '0,26 10,24 20,20 30,18 40,14 50,12 60,10 70,6 80,4' },
  { rank: 3, name: '北方華創', code: '002371', price: 368.20, pct: +6.35, spark: '0,24 10,22 20,20 30,16 40,14 50,10 60,8 70,6 80,3' },
  { rank: 4, name: '海光信息', code: '688041', price: 98.60, pct: +5.82, spark: '0,25 10,22 20,24 30,18 40,16 50,12 60,10 70,7 80,4' },
  { rank: 5, name: '瀾起科技', code: '688008', price: 76.50, pct: +5.14, spark: '0,26 10,24 20,22 30,20 40,16 50,14 60,10 70,8 80,5' },
]

const hkShareTop = [
  { rank: 1, name: '小米集團', code: '1810.HK', price: 19.80, pct: +4.21, spark: '0,26 10,24 20,22 30,18 40,20 50,14 60,12 70,8 80,4' },
  { rank: 2, name: '理想汽車', code: '2015.HK', price: 98.50, pct: +3.68, spark: '0,28 10,24 20,26 30,20 40,18 50,14 60,10 70,8 80,3' },
  { rank: 3, name: '騰訊控股', code: '0700.HK', price: 348.60, pct: +1.69, spark: '0,22 10,18 20,20 30,14 40,16 50,10 60,12 70,8 80,5' },
  { rank: 4, name: '阿里巴巴', code: '9988.HK', price: 86.20, pct: +1.59, spark: '0,25 10,20 20,22 30,18 40,15 50,17 60,12 70,10 80,7' },
  { rank: 5, name: '中國平安', code: '2318.HK', price: 42.35, pct: +1.32, spark: '0,24 10,22 20,20 30,16 40,18 50,14 60,10 70,8 80,6' },
]
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('行情報價', 'Market', '行情报价') }}</h2>

    <!-- Top Movers: A股 + 港股 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- A股 升幅榜 -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 class="text-sm font-semibold text-slate-700">{{ t('A股 升幅榜 Top 5', 'A-Share Top Gainers', 'A股 升幅榜 Top 5') }}</h3>
        </div>
        <div class="divide-y divide-slate-50">
          <div v-for="s in aShareTop" :key="s.code" class="flex items-center px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
            <span class="w-6 text-xs font-bold text-slate-400">{{ s.rank }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">{{ s.name }}</p>
              <p class="text-xs text-slate-400">{{ s.code }}</p>
            </div>
            <span class="text-sm font-medium text-slate-700 mx-3">{{ s.price.toFixed(2) }}</span>
            <svg class="w-20 h-8 shrink-0 mx-2" viewBox="0 0 80 30">
              <polyline fill="none" :stroke="s.pct >= 0 ? '#22c55e' : '#ef4444'" stroke-width="1.5" :points="s.spark" />
            </svg>
            <span class="text-sm font-semibold min-w-[60px] text-right" :class="s.pct >= 0 ? 'text-green-600' : 'text-red-500'">
              {{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(2) }}%
            </span>
          </div>
        </div>
      </div>

      <!-- 港股 升幅榜 -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 class="text-sm font-semibold text-slate-700">{{ t('港股 升幅榜 Top 5', 'HK Stock Top Gainers', '港股 升幅榜 Top 5') }}</h3>
        </div>
        <div class="divide-y divide-slate-50">
          <div v-for="s in hkShareTop" :key="s.code" class="flex items-center px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
            <span class="w-6 text-xs font-bold text-slate-400">{{ s.rank }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">{{ s.name }}</p>
              <p class="text-xs text-slate-400">{{ s.code }}</p>
            </div>
            <span class="text-sm font-medium text-slate-700 mx-3">{{ s.price.toFixed(2) }}</span>
            <svg class="w-20 h-8 shrink-0 mx-2" viewBox="0 0 80 30">
              <polyline fill="none" :stroke="s.pct >= 0 ? '#22c55e' : '#ef4444'" stroke-width="1.5" :points="s.spark" />
            </svg>
            <span class="text-sm font-semibold min-w-[60px] text-right" :class="s.pct >= 0 ? 'text-green-600' : 'text-red-500'">
              {{ s.pct >= 0 ? '+' : '' }}{{ s.pct.toFixed(2) }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Watchlist Tabs -->
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
              <th class="px-4 py-3 font-medium text-center">{{ t('走勢', 'Trend', '走势') }}</th>
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
              <td class="px-4 py-3 text-center">
                <svg class="w-20 h-8 inline-block" viewBox="0 0 80 30">
                  <polyline fill="none" :stroke="s.pct >= 0 ? '#22c55e' : '#ef4444'" stroke-width="1.5" :points="s.spark" />
                </svg>
              </td>
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
