<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLanguage } from '../../composables/useLanguage'
const { t } = useLanguage()
const router = useRouter()

const summary = [
  { label: () => t('總資產', 'Total Assets', '总资产'), value: 'HK$ 1,250,800.00', change: '+2.35%', up: true },
  { label: () => t('購買力', 'Buying Power', '购买力'), value: 'HK$ 680,400.00', change: '', up: true },
  { label: () => t('今日盈虧', "Today's P&L", '今日盈亏'), value: '+HK$ 12,350.00', change: '+0.99%', up: true },
  { label: () => t('持倉數量', 'Total Positions', '持仓数量'), value: '8', change: '', up: true },
]

const indices = [
  { name: () => t('恒生指數', 'Hang Seng Index', '恒生指数'), value: '18,430.25', change: '+156.30 (+0.86%)', up: true, spark: '0,22 10,18 20,20 30,14 40,16 50,10 60,12 70,8 80,5' },
  { name: () => t('上證綜指', 'SSE Composite', '上证综指'), value: '3,182.50', change: '+18.75 (+0.59%)', up: true, spark: '0,25 10,22 20,24 30,19 40,20 50,16 60,18 70,12 80,9' },
  { name: () => t('深證成指', 'SZSE Component', '深证成指'), value: '10,456.80', change: '-42.30 (-0.40%)', up: false, spark: '0,8 10,10 20,7 30,12 40,15 50,18 60,16 70,22 80,25' },
  { name: () => 'S&P 500', value: '5,482.10', change: '-18.40 (-0.33%)', up: false, spark: '0,10 10,8 20,12 30,14 40,16 50,20 60,18 70,24 80,26' },
  { name: () => 'NASDAQ', value: '17,856.30', change: '+85.20 (+0.48%)', up: true, spark: '0,24 10,20 20,22 30,16 40,18 50,12 60,14 70,8 80,6' },
  { name: () => t('道瓊斯', 'Dow Jones', '道琼斯'), value: '39,150.40', change: '+120.50 (+0.31%)', up: true, spark: '0,20 10,22 20,18 30,16 40,14 50,12 60,15 70,10 80,7' },
]

const positions = [
  { symbol: '0700.HK', name: () => t('騰訊控股', 'Tencent', '腾讯控股'), qty: 200, price: 348.60, changePct: +1.69, spark: '0,22 10,18 20,20 30,14 40,16 50,10 60,12 70,8 80,5' },
  { symbol: '9988.HK', name: () => t('阿里巴巴', 'Alibaba', '阿里巴巴'), qty: 500, price: 86.20, changePct: +1.59, spark: '0,25 10,20 20,22 30,18 40,15 50,17 60,12 70,10 80,7' },
  { symbol: '1810.HK', name: () => t('小米集團', 'Xiaomi', '小米集团'), qty: 1000, price: 19.80, changePct: +2.06, spark: '0,26 10,24 20,22 30,18 40,20 50,14 60,12 70,8 80,4' },
  { symbol: 'AAPL', name: () => 'Apple Inc.', qty: 50, price: 185.20, changePct: -0.43, spark: '0,10 10,12 20,8 30,14 40,16 50,20 60,18 70,22 80,24' },
  { symbol: 'NVDA', name: () => 'NVIDIA', qty: 100, price: 128.40, changePct: +1.66, spark: '0,28 10,24 20,26 30,20 40,18 50,14 60,10 70,8 80,3' },
  { symbol: '3690.HK', name: () => t('美團', 'Meituan', '美团'), qty: 300, price: 132.40, changePct: -0.90, spark: '0,8 10,10 20,12 30,15 40,14 50,18 60,20 70,24 80,26' },
]

function goMarket() {
  router.push('/sec/market')
}
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-semibold text-slate-800">{{ t('帳戶總覽', 'Account Overview', '账户总览') }}</h2>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="(item, i) in summary" :key="i" class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500 mb-1">{{ item.label() }}</p>
        <p class="text-lg font-semibold text-slate-800">{{ item.value }}</p>
        <p v-if="item.change" class="text-xs mt-1" :class="item.up ? 'text-green-600' : 'text-red-500'">{{ item.change }}</p>
      </div>
    </div>

    <!-- Market Indices -->
    <div>
      <h3 class="text-sm font-semibold text-slate-700 mb-3">{{ t('市場指數', 'Market Indices', '市场指数') }}</h3>
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="(idx, i) in indices" :key="i" class="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p class="text-xs text-slate-500 mb-1">{{ idx.name() }}</p>
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-lg font-semibold text-slate-800">{{ idx.value }}</p>
              <p class="text-xs" :class="idx.up ? 'text-green-600' : 'text-red-500'">{{ idx.change }}</p>
            </div>
            <svg class="w-20 h-8 shrink-0" viewBox="0 0 80 30">
              <polyline fill="none" :stroke="idx.up ? '#22c55e' : '#ef4444'" stroke-width="1.5" :points="idx.spark" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Holdings with Sparklines -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-100">
      <div class="px-5 py-4 border-b border-slate-100">
        <h3 class="text-sm font-semibold text-slate-700">{{ t('主要持倉', 'Top Holdings', '主要持仓') }}</h3>
      </div>
      <div class="divide-y divide-slate-50">
        <div
          v-for="p in positions"
          :key="p.symbol"
          class="flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
          @click="goMarket"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-800">{{ p.name() }}</p>
            <p class="text-xs text-slate-400">{{ p.symbol }}</p>
          </div>
          <div class="flex items-center gap-4">
            <svg class="w-20 h-8 shrink-0" viewBox="0 0 80 30">
              <polyline fill="none" :stroke="p.changePct >= 0 ? '#22c55e' : '#ef4444'" stroke-width="1.5" :points="p.spark" />
            </svg>
            <div class="text-right min-w-[80px]">
              <p class="text-sm font-medium text-slate-800">{{ p.price.toFixed(2) }}</p>
              <p class="text-xs" :class="p.changePct >= 0 ? 'text-green-600' : 'text-red-500'">
                {{ p.changePct >= 0 ? '+' : '' }}{{ p.changePct.toFixed(2) }}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
